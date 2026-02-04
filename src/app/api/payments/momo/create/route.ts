import { NextResponse } from 'next/server';
import { requireCustomerSession } from '@/lib/authHelpers';
import { json500 } from '@/lib/helpers/apiResponse';
import { connectMongo } from '@/lib/mongoose';
import Order from '@/models/Order';
import { buildMomoCreateSignatureRaw, hmacSha256Hex } from '@/lib/momo';
import { getRequestBaseUrl } from '@/lib/siteUrl';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const auth = await requireCustomerSession();
    if ('kind' in auth && auth.kind === 'unauthorized') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if ('kind' in auth && auth.kind === 'forbidden') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => null);
    const orderId = String(body?.orderId || '').trim();
    if (!orderId) return NextResponse.json({ message: 'Missing orderId' }, { status: 400 });

    const partnerCode = process.env.MOMO_PARTNER_CODE || '';
    const accessKey = process.env.MOMO_ACCESS_KEY || '';
    const secretKey = process.env.MOMO_SECRET_KEY || '';
    const endpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';
    if (!partnerCode || !accessKey || !secretKey) {
      return NextResponse.json({ message: 'Missing MoMo config (MOMO_PARTNER_CODE/MOMO_ACCESS_KEY/MOMO_SECRET_KEY)' }, { status: 500 });
    }

    await connectMongo();
    const order: any = await Order.findOne({ _id: orderId, customerId: auth.userId });
    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });

    if (order.paymentStatus === 'PAID') return NextResponse.json({ message: 'Order already paid' }, { status: 400 });
    if (order.orderStatus !== 'PENDING') return NextResponse.json({ message: 'Order is not payable' }, { status: 400 });
    if (order.expiresAt && new Date(order.expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ message: 'Order payment expired' }, { status: 400 });
    }
    if (String(order.paymentMethod) !== 'MoMo') {
      return NextResponse.json({ message: 'Order payment method is not MoMo' }, { status: 400 });
    }

    const baseUrl = getRequestBaseUrl(req);
    const redirectUrl = `${baseUrl}/checkout/momo/return`;
    const ipnUrl = `${baseUrl}/api/payments/momo/ipn`;

    const momoOrderId = String(order._id);
    const requestId = `${momoOrderId}-${Date.now()}`;
    const amount = String(Math.max(0, Math.round(Number(order.totalAmount || 0))));
    const orderInfo = `Thanh toán đơn ${order.orderCode || momoOrderId}`;
    const extraData = ''; // optional
    const requestType = 'captureWallet';

    const raw = buildMomoCreateSignatureRaw({
      accessKey,
      amount,
      extraData,
      ipnUrl,
      orderId: momoOrderId,
      orderInfo,
      partnerCode,
      redirectUrl,
      requestId,
      requestType,
    });
    const signature = hmacSha256Hex(secretKey, raw);

    const momoRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerCode,
        accessKey,
        requestId,
        amount,
        orderId: momoOrderId,
        orderInfo,
        redirectUrl,
        ipnUrl,
        extraData,
        requestType,
        signature,
        lang: 'vi',
      }),
    });

    const momoJson: any = await momoRes.json().catch(() => null);
    if (!momoRes.ok) {
      return NextResponse.json({ message: momoJson?.message || `MoMo error ${momoRes.status}` }, { status: 502 });
    }
    if (!momoJson || momoJson.resultCode !== 0 || !momoJson.payUrl) {
      return NextResponse.json({ message: momoJson?.message || 'Failed to create MoMo payment' }, { status: 502 });
    }

    const momoMeta = {
      partnerCode,
      requestId,
      momoOrderId,
      amount,
      payUrl: momoJson.payUrl,
      deeplink: momoJson.deeplink,
      deeplinkMiniApp: momoJson.deeplinkMiniApp,
      qrCodeUrl: momoJson.qrCodeUrl,
      message: momoJson.message,
      resultCode: momoJson.resultCode,
      createdAt: new Date(),
    };

    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          paymentMeta: {
            ...(order.paymentMeta || {}),
            momo: momoMeta,
          },
        },
      }
    );

    return NextResponse.json({ success: true, data: { payUrl: momoJson.payUrl, orderId: momoOrderId } });
  } catch (err) {
    return json500(err, { key: 'message' });
  }
}

