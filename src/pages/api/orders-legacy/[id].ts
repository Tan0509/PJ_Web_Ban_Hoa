import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { methodNotAllowed } from '@/lib/helpers/pagesApi';

// LEGACY: Kept to avoid route conflict with App Router
// Previously: src/pages/api/orders/[id].ts (PUT update order)
// Current /api/orders/[id] is handled by: src/app/api/orders/[id]/route.ts

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const { id } = req.query;
  if (req.method === 'PUT') {
    const { orderStatus, paymentStatus } = req.body || {};
    const payload: any = {};
    if (orderStatus) payload.orderStatus = orderStatus;
    if (paymentStatus) payload.paymentStatus = paymentStatus;
    const updated = await Order.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });
    return res.status(200).json({ success: true, data: updated });
  }
  return methodNotAllowed(res, 'successError');
}

