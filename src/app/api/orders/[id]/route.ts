import { NextResponse } from 'next/server';
import { requireCustomerSession } from '@/lib/authHelpers';
import { json500 } from '@/lib/helpers/apiResponse';
import { connectMongo } from '@/lib/mongoose';
import Order from '@/models/Order';

// Customer order detail (for Banking instruction page)
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const auth = await requireCustomerSession();
    if ('kind' in auth && auth.kind === 'unauthorized') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if ('kind' in auth && auth.kind === 'forbidden') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    await connectMongo();
    let order: any = await Order.findById(id).lean();
    if (!order) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (String(order.customerId) !== auth.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Backward compatibility: if Banking (or legacy Stripe) order has no expiresAt, attach it.
    const pmUpper = String(order.paymentMethod || '').toUpperCase();
    const isPending = String(order.orderStatus || '').toUpperCase() === 'PENDING';
    const isUnpaid = String(order.paymentStatus || '').toUpperCase() === 'UNPAID';
    const hasNoExpiresAt = !order.expiresAt;
    if (isPending && isUnpaid && hasNoExpiresAt && (pmUpper === 'BANKING' || pmUpper === 'STRIPE')) {
      const createdAtMs = order?.createdAt ? new Date(order.createdAt).getTime() : Date.now();
      const expiresAt = new Date(createdAtMs + 10 * 60 * 1000);
      await Order.updateOne(
        { _id: order._id, $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }] },
        { $set: { expiresAt } }
      );
      order = await Order.findById(id).lean();
    }

    // If order has expiresAt and is overdue, auto-expire it here as well
    // (so /checkout/banking doesn't keep showing a "payable" order forever)
    const exp = order.expiresAt ? new Date(order.expiresAt).getTime() : NaN;
    if (isPending && isUnpaid && !Number.isNaN(exp) && exp <= Date.now()) {
      await Order.updateOne(
        { _id: order._id, orderStatus: 'PENDING', paymentStatus: 'UNPAID' },
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
      );
      order = await Order.findById(id).lean();
    }

    return NextResponse.json({ success: true, data: order });
  } catch (err) {
    return json500(err);
  }
}

// Customer cancels Banking payment (no more countdown, order -> CANCELLED)
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const auth = await requireCustomerSession();
    if ('kind' in auth && auth.kind === 'unauthorized') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if ('kind' in auth && auth.kind === 'forbidden') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    // Optional guard: only allow cancellation when called from Banking UI
    const body = await req.json().catch(() => ({}));
    const action = String((body as any)?.action || '').toLowerCase();
    if (action && action !== 'cancel') {
      return NextResponse.json({ message: 'Bad request' }, { status: 400 });
    }

    await connectMongo();
    const order: any = await Order.findById(id);
    if (!order) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (String(order.customerId) !== auth.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const pm = String(order.paymentMethod || '').toUpperCase();
    if (pm !== 'BANKING' && pm !== 'STRIPE') {
      return NextResponse.json({ message: 'Order payment method is not Banking' }, { status: 400 });
    }

    const ps = String(order.paymentStatus || '').toUpperCase();
    const os = String(order.orderStatus || '').toUpperCase();
    if (ps === 'PAID') return NextResponse.json({ message: 'Order already paid' }, { status: 400 });
    if (ps === 'EXPIRED') return NextResponse.json({ message: 'Order payment expired' }, { status: 400 });
    if (os === 'CANCELLED') return NextResponse.json({ success: true, data: order });
    if (os !== 'PENDING' || ps !== 'UNPAID') {
      return NextResponse.json({ message: 'Order is not cancellable' }, { status: 400 });
    }

    const prevStatus = String(order.orderStatus || 'PENDING');
    order.orderStatus = 'CANCELLED';
    // keep paymentStatus UNPAID (do not set EXPIRED)
    order.history = [
      ...(order.history || []),
      {
        by: { role: 'system', id: auth.userId },
        from: prevStatus,
        to: 'CANCELLED',
        note: 'Banking: Người dùng huỷ thanh toán',
        createdAt: new Date(),
      },
    ];
    await order.save();

    return NextResponse.json({ success: true, data: order });
  } catch (err) {
    return json500(err);
  }
}

