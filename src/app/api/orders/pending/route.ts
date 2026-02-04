import { NextResponse } from 'next/server';
import { requireCustomerSession } from '@/lib/authHelpers';
import { json500 } from '@/lib/helpers/apiResponse';
import { connectMongo } from '@/lib/mongoose';
import Order from '@/models/Order';

export const runtime = 'nodejs';
/**
 * Lightweight check: does the current user have at least one order
 * with PENDING + UNPAID + MoMo/VNPay/Banking (for badge in UserMenu).
 * Does NOT run ensureBankingExpiresAt / expirePendingOrders.
 */
export async function GET() {
  try {
    const auth = await requireCustomerSession();
    if ('kind' in auth && auth.kind === 'unauthorized') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if ('kind' in auth && auth.kind === 'forbidden') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    await connectMongo();

    const exists = await Order.exists({
      customerId: auth.userId,
      orderStatus: 'PENDING',
      paymentStatus: 'UNPAID',
      paymentMethod: { $in: ['MoMo', 'VNPay', 'Banking'] },
    });

    return NextResponse.json({ hasPendingPayment: !!exists });
  } catch (err) {
    return json500(err);
  }
}
