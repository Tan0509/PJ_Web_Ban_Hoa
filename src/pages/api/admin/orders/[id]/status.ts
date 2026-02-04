import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { getAllowedNextStates, validateTransition, OrderStatus } from '@/domain/order/orderStateMachine';
import { isAdminFromSession, getUserIdFromSession, getNextAuthSession } from '@/lib/authHelpers';
import { methodNotAllowed } from '@/lib/helpers/pagesApi';
import { sendEmailSendGrid } from '@/lib/sendgrid';
import { renderUserOrderStatusUpdatedEmail } from '@/lib/emailTemplates';

type ErrorResponse = { message: string };

// AUTH REFACTOR: Use NextAuth session instead of cookie-based auth

async function updateStatus(id: string, nextStatus: OrderStatus, note?: string, actor?: { id?: string; name?: string }) {
  const order: any = await Order.findById(id);
  if (!order) {
    const err = new Error('Not found');
    (err as any).status = 404;
    throw err;
  }
  const current: OrderStatus = order.orderStatus || 'PENDING';
  if (!validateTransition(current, nextStatus)) {
    const err = new Error('Invalid transition');
    (err as any).status = 400;
    throw err;
  }

  order.orderStatus = nextStatus;
  order.history = [
    ...(order.history || []),
    {
      from: current,
      to: nextStatus,
      by: { role: 'admin', id: actor?.id, name: actor?.name },
      note,
      createdAt: new Date(),
    },
  ];
  await order.save();

  const allowedNext = getAllowedNextStates(order.orderStatus as OrderStatus);
  return { order, allowedNext };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | ErrorResponse>
) {
  if (!(await isAdminFromSession(req, res))) return res.status(401).json({ message: 'Unauthorized' });
  if (req.method !== 'PATCH') return methodNotAllowed(res);
  
  // AUTH REFACTOR: Get actor info from NextAuth session instead of cookies
  const session = await getNextAuthSession(req, res);
  const actor = {
    id: (session?.user as any)?.id || undefined,
    name: (session?.user as any)?.name || undefined,
  };

  await dbConnect();
  const { id } = req.query;
  const { nextStatus, note } = req.body || {};

  try {
    const updated = await updateStatus(id as string, nextStatus, note, actor);

    // Step 2: Send email to customer on status update (non-blocking)
    try {
      const o: any = updated?.order;
      const customerEmail = o?.customerEmail;
      const customerName = o?.customerName || 'Quý khách';
      if (customerEmail) {
        await sendEmailSendGrid({
          to: customerEmail,
          subject: `Cập nhật đơn hàng ${o.orderCode || o._id} – Hoa Tươi NyNa`,
          html: renderUserOrderStatusUpdatedEmail({
            orderCode: o.orderCode || String(o._id),
            customerName,
            orderStatus: o.orderStatus || 'PENDING',
            paymentStatus: o.paymentStatus || 'UNPAID',
            paymentMethod: o.paymentMethod || '',
            totalAmount: o.totalAmount || 0,
          }),
        });
      }
    } catch {
      // ignore email failure
    }

    return res.status(200).json(updated);
  } catch (err: any) {
    const status = err?.status || 500;
    return res.status(status).json({ message: err?.message || 'Server error' });
  }
}
