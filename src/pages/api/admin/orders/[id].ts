import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import Customer from '@/models/Customer';
import User from '@/models/User';
import { getAllowedNextStates, OrderStatus as DomainOrderStatus } from '@/domain/order/orderStateMachine';
import { getNextAuthSession, isAdminFromSession } from '@/lib/authHelpers';
import { sendEmailSendGrid } from '@/lib/sendgrid';
import { renderUserPaymentSuccessEmail } from '@/lib/emailTemplates';

type ErrorResponse = { message: string };

const ALLOWED_STATUS = ['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED'] as const;
type OrderStatus = (typeof ALLOWED_STATUS)[number];

// This module follows the same pattern as Product/Category admin
// Keep logic and structure consistent with Product Admin
// AUTH REFACTOR: Use NextAuth session instead of cookie-based auth

function canTransition(current: OrderStatus, next: OrderStatus) {
  if (current === next) return true;
  if (current === 'PENDING') return next === 'CONFIRMED' || next === 'CANCELLED';
  if (current === 'CONFIRMED') return next === 'SHIPPING' || next === 'CANCELLED';
  if (current === 'SHIPPING') return next === 'COMPLETED';
  return false; // COMPLETED or CANCELLED are terminal
}

async function getOrderDetail(id: string) {
  const order: any = await Order.findById(id).lean();
  if (!order) {
    const err = new Error('Not found');
    (err as any).status = 404;
    throw err;
  }
  let customer: any = null;
  // Prefer snapshot fields stored on Order (works for migrated User-based checkout)
  if (order.customerName || order.customerEmail || order.customerPhone) {
    customer = {
      name: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone,
    };
  } else if (order.customerId) {
    // Fallback: support both legacy Customer collection and migrated User collection
    const [user, legacyCustomer] = await Promise.all([
      User.findById(order.customerId).select('name email phone').lean(),
      Customer.findById(order.customerId).select('name email phone').lean(),
    ]);
    customer = user || legacyCustomer || null;
  }
  const history = (order.history || []).sort(
    (a: any, b: any) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );
  const allowedNext = getAllowedNextStates((order.orderStatus || 'PENDING') as OrderStatus);
  return { order, customer, history, allowedNext };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | ErrorResponse>
) {
  if (!(await isAdminFromSession(req, res))) return res.status(401).json({ message: 'Unauthorized' });
  await dbConnect();
  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const detail = await getOrderDetail(id as string);
      return res.status(200).json(detail);
    }

    // Allow admin to update payment status for COD & Banking orders (Banking is admin-confirmed)
    if (req.method === 'PATCH') {
      const { paymentStatus } = req.body || {};
      const next = String(paymentStatus || '').toUpperCase();
      if (!['PAID', 'UNPAID'].includes(next)) {
        return res.status(400).json({ message: 'Invalid payment status' });
      }

      const order: any = await Order.findById(id);
      if (!order) return res.status(404).json({ message: 'Not found' });
      const paymentMethodUpper = String(order.paymentMethod || '').toUpperCase();
      if (paymentMethodUpper !== 'COD' && paymentMethodUpper !== 'BANKING') {
        return res.status(400).json({ message: 'Only COD/Banking orders can update payment status here' });
      }

      const prevPaid = String(order.paymentStatus || '').toUpperCase() === 'PAID';

      // Actor info (for audit/history)
      const session = await getNextAuthSession(req, res);
      const actor = {
        id: (session?.user as any)?.id || undefined,
        name: (session?.user as any)?.name || undefined,
      };

      order.paymentStatus = next;
      if (next === 'PAID') {
        if (!order.paidAt) order.paidAt = new Date();
      } else {
        order.paidAt = undefined;
      }
      order.history = [
        ...(order.history || []),
        {
          by: { role: 'admin', id: actor.id, name: actor.name },
          to: order.orderStatus || 'PENDING',
          note:
            paymentMethodUpper === 'BANKING'
              ? next === 'PAID'
                ? 'Banking: Admin xác nhận đã thanh toán'
                : 'Banking: Admin chuyển về chưa thanh toán'
              : next === 'PAID'
              ? 'COD: Admin xác nhận đã thanh toán'
              : 'COD: Admin chuyển về chưa thanh toán',
          createdAt: new Date(),
        },
      ];
      await order.save();

      // Banking: when admin confirms PAID, notify user via email (template same as MoMo/VNPay)
      if (paymentMethodUpper === 'BANKING' && next === 'PAID' && !prevPaid) {
        try {
          const customerEmail = String(order.customerEmail || '').trim();
          const customerName = String(order.customerName || '').trim() || 'Quý khách';
          if (customerEmail) {
            await sendEmailSendGrid({
              to: customerEmail,
              subject: `Thanh toán thành công ${order.orderCode || order._id} – Hoa Tươi NyNa`,
              html: renderUserPaymentSuccessEmail({
                orderCode: order.orderCode || String(order._id),
                customerName,
                totalAmount: Number(order.totalAmount || 0),
                paymentMethod: order.paymentMethod || 'Banking',
              }),
            });
          }
        } catch {
          // ignore email failure
        }
      }

      const detail = await getOrderDetail(id as string);
      return res.status(200).json(detail);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err: any) {
    const status = err?.status || 500;
    return res.status(status).json({ message: err?.message || 'Server error' });
  }
}
