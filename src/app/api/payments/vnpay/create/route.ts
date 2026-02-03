import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { connectMongo } from '@/lib/mongoose';
import Order from '@/models/Order';
import { buildVnpaySignData, formatVnpayDate, hmacSha512Hex, sortObject } from '@/lib/vnpay';
import { getEnvSiteOrigin } from '@/lib/siteUrl';

export const runtime = 'nodejs';

function getBaseUrl(req: Request) {
  const fromEnv = getEnvSiteOrigin();
  if (fromEnv) return fromEnv;

  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

function getClientIp(req: Request) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || '127.0.0.1';
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    const role = (session?.user as any)?.role as string | undefined;
    if (!userId || !session?.user?.email) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (role && role !== 'customer') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => null);
    const orderId = String(body?.orderId || '').trim();
    if (!orderId) return NextResponse.json({ message: 'Missing orderId' }, { status: 400 });

    const vnpUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const tmnCode = process.env.VNPAY_TMNCODE || '';
    const secretKey = process.env.VNPAY_HASH_SECRET || '';
    if (!tmnCode || !secretKey) {
      return NextResponse.json({ message: 'Missing VNPay config (VNPAY_TMNCODE/VNPAY_HASH_SECRET)' }, { status: 500 });
    }

    await connectMongo();
    const order: any = await Order.findOne({ _id: orderId, customerId: String(userId) });
    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });

    if (order.paymentStatus === 'PAID') return NextResponse.json({ message: 'Order already paid' }, { status: 400 });
    if (order.orderStatus !== 'PENDING') return NextResponse.json({ message: 'Order is not payable' }, { status: 400 });
    if (order.expiresAt && new Date(order.expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ message: 'Order payment expired' }, { status: 400 });
    }
    if (String(order.paymentMethod) !== 'VNPay') {
      return NextResponse.json({ message: 'Order payment method is not VNPay' }, { status: 400 });
    }

    const baseUrl = getBaseUrl(req);
    const returnUrl = `${baseUrl}/checkout/vnpay/return`;

    const now = new Date();
    const expireAt: Date = order.expiresAt ? new Date(order.expiresAt) : new Date(Date.now() + 30 * 60 * 1000);

    const amountVnd = Math.max(0, Math.round(Number(order.totalAmount || 0)));
    const params = sortObject({
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: String(amountVnd * 100),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: String(order._id),
      vnp_OrderInfo: `Thanh toan don ${order.orderCode || order._id}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: getClientIp(req),
      vnp_CreateDate: formatVnpayDate(now),
      vnp_ExpireDate: formatVnpayDate(expireAt),
    });

    const signData = buildVnpaySignData(params);
    const secureHash = hmacSha512Hex(secretKey, signData);

    const paymentUrl = `${vnpUrl}?${signData}&vnp_SecureHash=${secureHash}`;

    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          paymentMeta: {
            ...(order.paymentMeta || {}),
            vnpay: {
              tmnCode,
              txnRef: String(order._id),
              amount: amountVnd,
              paymentUrl,
              createdAt: new Date(),
              expiresAt: expireAt,
            },
          },
        },
      }
    );

    return NextResponse.json({ success: true, data: { paymentUrl, orderId: String(order._id) } });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || 'Server error' }, { status: 500 });
  }
}

