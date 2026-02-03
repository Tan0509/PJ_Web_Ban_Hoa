import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import Order from '@/models/Order';
import AppSetting from '@/models/AppSetting';
import { sendEmailSendGrid } from '@/lib/sendgrid';
import { renderAdminNewOrderEmail, renderUserPaymentSuccessEmail } from '@/lib/emailTemplates';
import { buildMomoIpnSignatureRaw, hmacSha256Hex } from '@/lib/momo';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const secretKey = process.env.MOMO_SECRET_KEY || '';
    const accessKey = process.env.MOMO_ACCESS_KEY || '';
    if (!secretKey || !accessKey) {
      return NextResponse.json({ message: 'Missing MoMo config' }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ message: 'Invalid body' }, { status: 400 });

    const partnerCode = String(body.partnerCode || '');
    const amount = String(body.amount ?? '');
    const extraData = String(body.extraData ?? '');
    const message = String(body.message ?? '');
    const orderId = String(body.orderId ?? '');
    const orderInfo = String(body.orderInfo ?? '');
    const orderType = String(body.orderType ?? '');
    const payType = String(body.payType ?? '');
    const requestId = String(body.requestId ?? '');
    const responseTime = String(body.responseTime ?? '');
    const resultCode = String(body.resultCode ?? '');
    const transId = String(body.transId ?? '');
    const signature = String(body.signature ?? '');

    const raw = buildMomoIpnSignatureRaw({
      accessKey,
      amount,
      extraData,
      message,
      orderId,
      orderInfo,
      orderType,
      partnerCode,
      payType,
      requestId,
      responseTime,
      resultCode,
      transId,
    });
    const expected = hmacSha256Hex(secretKey, raw);
    if (!signature || signature !== expected) {
      return NextResponse.json({ message: 'Invalid signature' }, { status: 400 });
    }

    await connectMongo();

    const order: any = await Order.findById(orderId);
    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });

    // Only handle MoMo orders
    if (String(order.paymentMethod) !== 'MoMo') {
      return NextResponse.json({ message: 'Not a MoMo order' }, { status: 400 });
    }

    // Persist latest MoMo callback data
    const momoUpdate = {
      ...(order.paymentMeta?.momo || {}),
      partnerCode,
      requestId,
      momoOrderId: orderId,
      amount,
      transId,
      orderInfo,
      message,
      resultCode: Number(resultCode || 0),
      responseTime,
      payType,
      orderType,
      updatedAt: new Date(),
    };

    // MoMo: resultCode === 0 means success
    const isSuccess = String(resultCode) === '0';
    const msgLower = String(message || '').toLowerCase();
    const isCancelled =
      ['1006', '1005'].includes(String(resultCode || '')) ||
      msgLower.includes('hủy') ||
      msgLower.includes('huy') ||
      msgLower.includes('cancel');

    if (isSuccess && order.paymentStatus !== 'PAID') {
      order.paymentStatus = 'PAID';
      order.paidAt = new Date();
      order.paymentMeta = { ...(order.paymentMeta || {}), momo: momoUpdate };
      order.history = [
        ...(order.history || []),
        {
          by: { role: 'system' },
          to: order.orderStatus || 'PENDING',
          note: `MoMo: Thanh toán thành công (transId: ${transId || '—'})`,
          createdAt: new Date(),
        },
      ];
      await order.save();

      // Email (non-blocking): notify user + admin list about payment success
      try {
        const setting: any = await AppSetting.findOne({ key: 'singleton' }).lean();
        const adminEmails: string[] = Array.isArray(setting?.adminOrderNotifyEmails) ? setting.adminOrderNotifyEmails : [];
        const customerEmail = order.customerEmail || '';
        const customerName = order.customerName || 'Quý khách';

        if (customerEmail) {
          await sendEmailSendGrid({
            to: customerEmail,
            subject: `Thanh toán thành công ${order.orderCode || order._id} – Hoa Tươi NyNa`,
            html: renderUserPaymentSuccessEmail({
              orderCode: order.orderCode || String(order._id),
              customerName,
              totalAmount: order.totalAmount || 0,
              paymentMethod: order.paymentMethod || 'MoMo',
            }),
          });
        }
        if (adminEmails.length) {
          const orderData = {
            orderCode: order.orderCode || String(order._id),
            totalAmount: order.totalAmount || 0,
            paymentMethod: order.paymentMethod || 'MoMo',
            paymentStatus: order.paymentStatus || 'PAID',
            orderStatus: order.orderStatus || 'PENDING',
            shippingAddress: order.shippingAddress || '',
            customerName: order.customerName || '',
            customerEmail: order.customerEmail || '',
            customerPhone: order.customerPhone || '',
            items: (order.items || []).map((it: any) => ({
              name: it.name,
              quantity: it.quantity,
              price: it.price,
              image: it.image,
            })),
          };
          await sendEmailSendGrid({
            to: adminEmails,
            subject: `Thanh toán MoMo thành công ${orderData.orderCode} – ${orderData.totalAmount.toLocaleString('vi-VN')} VNĐ`,
            html: renderAdminNewOrderEmail(orderData as any),
          });
        }
      } catch {
        // ignore email failure
      }
    } else if (isCancelled) {
      // User cancelled payment: mark order cancelled (do NOT mark as EXPIRED)
      if (String(order.paymentStatus || '').toUpperCase() === 'PAID') {
        // If already paid, ignore cancel callback
        await Order.updateOne(
          { _id: order._id },
          {
            $set: { paymentMeta: { ...(order.paymentMeta || {}), momo: momoUpdate } },
          }
        );
      } else if (String(order.orderStatus || '').toUpperCase() !== 'CANCELLED') {
        const prevStatus = String(order.orderStatus || 'PENDING');
        order.orderStatus = 'CANCELLED';
        // keep paymentStatus as UNPAID (do not set EXPIRED)
        order.paymentMeta = { ...(order.paymentMeta || {}), momo: momoUpdate };
        order.history = [
          ...(order.history || []),
          {
            by: { role: 'system' },
            from: prevStatus,
            to: 'CANCELLED',
            note: 'MoMo: Người dùng huỷ giao dịch',
            createdAt: new Date(),
          },
        ];
        await order.save();
      } else {
        await Order.updateOne(
          { _id: order._id },
          {
            $set: { paymentMeta: { ...(order.paymentMeta || {}), momo: momoUpdate } },
          }
        );
      }
    } else {
      // Save callback info even on failure (no status change)
      await Order.updateOne(
        { _id: order._id },
        {
          $set: { paymentMeta: { ...(order.paymentMeta || {}), momo: momoUpdate } },
        }
      );
    }

    // MoMo expects 200 OK
    return NextResponse.json({ message: 'OK' });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || 'Server error' }, { status: 500 });
  }
}

