import { NextResponse } from 'next/server';
import { requireCustomerSession } from '@/lib/authHelpers';
import { json500 } from '@/lib/helpers/apiResponse';
import { connectMongo } from '@/lib/mongoose';
import Order from '@/models/Order';
import AppSetting from '@/models/AppSetting';
import AdminNotification from '@/models/AdminNotification';
import { sendEmailSendGrid } from '@/lib/sendgrid';
import { renderAdminNewOrderEmail, renderUserOrderCreatedEmail } from '@/lib/emailTemplates';

export const runtime = 'nodejs';
type PaymentMethod = 'cod' | 'stripe' | 'vnpay' | 'momo';

const PAYMENT_METHOD_MAP: Record<PaymentMethod, string> = {
  cod: 'COD',
  stripe: 'Banking',
  vnpay: 'VNPay',
  momo: 'MoMo',
};

function computeExpiresAt(paymentMethod: PaymentMethod) {
  // Payable methods should expire if not paid/confirmed within cooldown window
  // (used to unblock users from being stuck with pending orders forever)
  if (paymentMethod === 'vnpay' || paymentMethod === 'momo' || paymentMethod === 'stripe') {
    return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  }
  return undefined;
}

async function ensureBankingExpiresAt(customerId: string) {
  // Backward compatibility: older Banking (or legacy Stripe) orders may have no expiresAt.
  // To avoid users being blocked forever, attach expiresAt based on createdAt.
  const candidates = await Order.find({
    customerId,
    orderStatus: 'PENDING',
    paymentStatus: 'UNPAID',
    paymentMethod: { $in: ['Banking', 'Stripe'] },
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }],
  })
    .select('_id createdAt')
    .limit(50)
    .lean();

  if (!candidates.length) return;

  await Promise.all(
    candidates.map((o: any) => {
      const createdAtMs = o?.createdAt ? new Date(o.createdAt).getTime() : Date.now();
      const expiresAt = new Date(createdAtMs + 10 * 60 * 1000);
      return Order.updateOne(
        { _id: o._id, $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }] },
        { $set: { expiresAt } }
      );
    })
  );
}

async function expirePendingOrders(customerId: string) {
  const now = new Date();
  const candidates = await Order.find({
    customerId,
    orderStatus: 'PENDING',
    paymentStatus: 'UNPAID',
    expiresAt: { $lte: now },
  })
    .select('_id orderStatus paymentStatus')
    .limit(50)
    .lean();

  if (!candidates.length) return;

  await Promise.all(
    candidates.map((o: any) =>
      Order.updateOne(
        { _id: o._id, orderStatus: 'PENDING', paymentStatus: 'UNPAID' },
        {
          $set: { orderStatus: 'CANCELLED', paymentStatus: 'EXPIRED' },
          $push: {
            history: {
              from: 'PENDING',
              to: 'CANCELLED',
              by: { role: 'system' },
              note: 'Hết hạn thanh toán',
              createdAt: new Date(),
            },
          },
        }
      )
    )
  );
}

export async function GET() {
  try {
    const auth = await requireCustomerSession();
    if ('kind' in auth && auth.kind === 'unauthorized') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if ('kind' in auth && auth.kind === 'forbidden') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    await connectMongo();
    await ensureBankingExpiresAt(auth.userId);
    await expirePendingOrders(auth.userId);

    const orders = await Order.find({ customerId: auth.userId })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({ success: true, data: orders });
  } catch (err) {
    return json500(err);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireCustomerSession();
    if ('kind' in auth && auth.kind === 'unauthorized') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if ('kind' in auth && auth.kind === 'forbidden') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    await connectMongo();
    // Ensure pending banking orders have expiresAt, then expire overdue ones
    await ensureBankingExpiresAt(auth.userId);
    await expirePendingOrders(auth.userId);

    // Business rule: user must finish/cancel pending payable order before creating a new one
    const blockingOrder = await Order.findOne({
      customerId: auth.userId,
      orderStatus: 'PENDING',
      paymentStatus: 'UNPAID',
      paymentMethod: { $in: ['MoMo', 'VNPay', 'Banking', 'Stripe'] },
    })
      .select('_id orderCode paymentMethod expiresAt')
      .lean();

    if (blockingOrder) {
      return NextResponse.json(
        {
          message: 'Bạn đang có đơn hàng chờ thanh toán. Vui lòng tiếp tục thanh toán hoặc huỷ đơn để tạo đơn hàng mới',
        },
        { status: 409 }
      );
    }

    const body = await req.json().catch(() => null);
    const items = Array.isArray(body?.items) ? body.items : [];
    const paymentMethod = (body?.paymentMethod || 'cod') as PaymentMethod;
    const customer = body?.customer || {};

    if (!items.length) return NextResponse.json({ message: 'Giỏ hàng trống' }, { status: 400 });
    if (!PAYMENT_METHOD_MAP[paymentMethod]) {
      return NextResponse.json({ message: 'Phương thức thanh toán không hợp lệ' }, { status: 400 });
    }

    const fullName = String(customer?.fullName || '').trim();
    const phone = String(customer?.phone || '').trim();
    const email = String(customer?.email || '').trim();
    const address = String(customer?.address || '').trim();
    if (!fullName || !phone || !email || !address) {
      return NextResponse.json({ message: 'Thiếu thông tin khách hàng' }, { status: 400 });
    }

    const mappedItems = items.map((it: any) => ({
      productId: String(it?.product?._id || it?.product?.id || it?.productId || it?._id || ''),
      name: String(it?.product?.name || it?.name || ''),
      price: Number(it?.product?.salePrice ?? it?.product?.price ?? it?.price ?? 0),
      quantity: Math.max(1, Number(it?.quantity || 1)),
      image: String((it?.product?.images && it.product.images[0]) || it?.image || ''),
    }));

    const invalidItem = mappedItems.find((x: any) => !x.name || !x.quantity || !x.price);
    if (invalidItem) {
      return NextResponse.json({ message: 'Sản phẩm trong giỏ hàng không hợp lệ' }, { status: 400 });
    }

    const totalAmount = mappedItems.reduce((sum: number, it: any) => sum + it.price * it.quantity, 0);
    const expiresAt = computeExpiresAt(paymentMethod);

    const customerNote = String(customer?.note || '').trim() || undefined;
    const giftMessage = String(customer?.giftMessage || '').trim() || undefined;
    const deliveryTime = String(customer?.deliveryTime || '').trim() || undefined;

    const created = await Order.create({
      customerId: auth.userId,
      customerName: fullName,
      customerEmail: email,
      customerPhone: phone,
      items: mappedItems,
      totalAmount,
      paymentMethod: PAYMENT_METHOD_MAP[paymentMethod],
      paymentStatus: 'UNPAID',
      orderStatus: 'PENDING',
      shippingAddress: address,
      deliveryTime,
      customerNote,
      giftMessage,
      expiresAt,
      history: [
        {
          to: 'PENDING',
          by: { role: 'system' },
          note: paymentMethod === 'cod' ? 'Tạo đơn hàng (COD - thanh toán khi nhận hàng)' : 'Tạo đơn hàng (chờ thanh toán)',
          createdAt: new Date(),
        },
      ],
    });

    // Step 5: Admin panel bell notification (non-blocking)
    try {
      await AdminNotification.create({
        type: 'ORDER_CREATED',
        title: `Đơn hàng mới ${created.orderCode || String(created._id)}`,
        body: `${(created.totalAmount || totalAmount).toLocaleString('vi-VN')} VNĐ • ${created.paymentMethod || PAYMENT_METHOD_MAP[paymentMethod]} • ${fullName}`,
        orderId: String(created._id),
        orderCode: created.orderCode || String(created._id),
        meta: {
          totalAmount: created.totalAmount || totalAmount,
          paymentMethod: created.paymentMethod || PAYMENT_METHOD_MAP[paymentMethod],
          paymentStatus: created.paymentStatus || 'UNPAID',
          orderStatus: created.orderStatus || 'PENDING',
          customerName: fullName,
          customerEmail: email,
          customerPhone: phone,
        },
        readBy: [],
      });
    } catch {
      // don't block order creation if notification fails
    }

    // Step 2: Send emails (user + admin notify list)
    try {
      const setting: any = await AppSetting.findOne({ key: 'singleton' }).lean();
      const adminEmails: string[] = Array.isArray(setting?.adminOrderNotifyEmails) ? setting.adminOrderNotifyEmails : [];

      const orderData = {
        orderCode: created.orderCode || String(created._id),
        totalAmount: created.totalAmount || totalAmount,
        paymentMethod: created.paymentMethod || PAYMENT_METHOD_MAP[paymentMethod],
        paymentStatus: created.paymentStatus || 'UNPAID',
        orderStatus: created.orderStatus || 'PENDING',
        shippingAddress: created.shippingAddress || address,
        customerName: created.customerName || fullName,
        customerEmail: created.customerEmail || email,
        customerPhone: created.customerPhone || phone,
        items: mappedItems.map((it: any) => ({
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          image: it.image,
        })),
      };

      // User email: always send order created
      await sendEmailSendGrid({
        to: orderData.customerEmail,
        subject: `Xác nhận đơn hàng ${orderData.orderCode} – Hoa Tươi NyNa`,
        html: renderUserOrderCreatedEmail(orderData as any),
      });

      // Admin email(s): if configured
      if (adminEmails.length) {
        await sendEmailSendGrid({
          to: adminEmails,
          subject: `Đơn hàng mới ${orderData.orderCode} – ${orderData.totalAmount.toLocaleString('vi-VN')} VNĐ`,
          html: renderAdminNewOrderEmail(orderData as any),
        });
      }
    } catch {
      // Don't block order creation if email fails
    }

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    return json500(err);
  }
}
