import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import Order from '@/models/Order';
import AppSetting from '@/models/AppSetting';
import { sendEmailSendGrid } from '@/lib/sendgrid';
import { renderAdminNewOrderEmail, renderUserPaymentSuccessEmail } from '@/lib/emailTemplates';
import { sortObject, verifyVnpaySignature } from '@/lib/vnpay';

export const runtime = 'nodejs';

function getVnpParamsFromUrl(url: string) {
  const u = new URL(url);
  const out: Record<string, string> = {};
  u.searchParams.forEach((v, k) => {
    if (k.startsWith('vnp_')) out[k] = v;
  });
  return out;
}

async function handle(req: Request) {
  const secretKey = process.env.VNPAY_HASH_SECRET || '';
  if (!secretKey) return NextResponse.json({ RspCode: '99', Message: 'Missing config' }, { status: 500 });

  const allParams = getVnpParamsFromUrl(req.url);
  const secureHash = allParams.vnp_SecureHash || '';

  // Remove hash fields before verifying
  delete allParams.vnp_SecureHash;
  delete allParams.vnp_SecureHashType;

  const params = sortObject(allParams);
  const isValid = verifyVnpaySignature({ params, secureHash, secretKey });
  if (!isValid) return NextResponse.json({ RspCode: '97', Message: 'Invalid signature' });

  const txnRef = params.vnp_TxnRef || '';
  const amount = Number(params.vnp_Amount || 0); // x100
  const responseCode = params.vnp_ResponseCode || '';
  const txnStatus = params.vnp_TransactionStatus || '';

  await connectMongo();
  const order: any = await Order.findById(txnRef);
  if (!order) return NextResponse.json({ RspCode: '01', Message: 'Order not found' });

  // Amount check
  const expected = Math.max(0, Math.round(Number(order.totalAmount || 0))) * 100;
  if (expected !== amount) return NextResponse.json({ RspCode: '04', Message: 'Amount invalid' });

  if (order.paymentStatus === 'PAID') {
    return NextResponse.json({ RspCode: '02', Message: 'Order already confirmed' });
  }

  const isSuccess = responseCode === '00' && txnStatus === '00';
  const isCancelled = responseCode === '24';

  // Save callback info
  const vnpayCb = {
    ...params,
    receivedAt: new Date(),
  };

  if (isSuccess) {
    order.paymentStatus = 'PAID';
    order.paidAt = new Date();
    order.paymentMeta = { ...(order.paymentMeta || {}), vnpay: { ...(order.paymentMeta?.vnpay || {}), callback: vnpayCb } };
    order.history = [
      ...(order.history || []),
      {
        by: { role: 'system' },
        to: order.orderStatus || 'PENDING',
        note: `VNPay: Thanh toán thành công (vnp_TransactionNo: ${params.vnp_TransactionNo || '—'})`,
        createdAt: new Date(),
      },
    ];
    await order.save();

    // Email (non-blocking): user + admin list
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
            paymentMethod: order.paymentMethod || 'VNPay',
          }),
        });
      }

      if (adminEmails.length) {
        const orderData = {
          orderCode: order.orderCode || String(order._id),
          totalAmount: order.totalAmount || 0,
          paymentMethod: order.paymentMethod || 'VNPay',
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
          subject: `Thanh toán VNPay thành công ${orderData.orderCode} – ${orderData.totalAmount.toLocaleString('vi-VN')} VNĐ`,
          html: renderAdminNewOrderEmail(orderData as any),
        });
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ RspCode: '00', Message: 'Confirm Success' });
  }

  // User cancelled: mark order cancelled (do NOT mark as EXPIRED)
  if (isCancelled) {
    const isPaid = String(order.paymentStatus || '').toUpperCase() === 'PAID';
    if (!isPaid && String(order.orderStatus || '').toUpperCase() !== 'CANCELLED') {
      const prevStatus = String(order.orderStatus || 'PENDING');
      order.orderStatus = 'CANCELLED';
      // keep paymentStatus UNPAID
      order.paymentMeta = { ...(order.paymentMeta || {}), vnpay: { ...(order.paymentMeta?.vnpay || {}), callback: vnpayCb } };
      order.history = [
        ...(order.history || []),
        {
          by: { role: 'system' },
          from: prevStatus,
          to: 'CANCELLED',
          note: 'VNPay: Người dùng huỷ giao dịch',
          createdAt: new Date(),
        },
      ];
      await order.save();
      return NextResponse.json({ RspCode: '00', Message: 'Confirm Success' });
    }
  }

  // Not success: only record callback for debugging
  await Order.updateOne(
    { _id: order._id },
    { $set: { paymentMeta: { ...(order.paymentMeta || {}), vnpay: { ...(order.paymentMeta?.vnpay || {}), callback: vnpayCb } } } }
  );

  return NextResponse.json({ RspCode: '00', Message: 'Confirm Success' });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  // VNPay IPN is normally GET; support POST defensively
  return handle(req);
}

