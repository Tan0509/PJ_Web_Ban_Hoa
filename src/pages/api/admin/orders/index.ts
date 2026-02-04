import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import Customer from '@/models/Customer';
import User from '@/models/User';
import { isAdminFromSession } from '@/lib/authHelpers';
import { methodNotAllowed } from '@/lib/helpers/pagesApi';

type ErrorResponse = { message: string };

type OrderListItem = {
  _id: string;
  orderCode?: string;
  customerName?: string;
  customerEmail?: string;
  totalAmount: number;
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus?: string;
  createdAt: string;
};

type ListResponse = {
  items: OrderListItem[];
  total: number;
  page: number;
  limit: number;
};

const ALLOWED_PAYMENT_METHODS = ['COD', 'Banking', 'VNPay', 'MoMo'];
const ALLOWED_STATUS = ['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED'];

// AUTH REFACTOR: Use NextAuth session instead of cookie-based auth

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse | ErrorResponse>
) {
  if (!(await isAdminFromSession(req, res))) return res.status(401).json({ message: 'Unauthorized' });
  if (req.method !== 'GET') return methodNotAllowed(res);

  await dbConnect();

  const {
    page = '1',
    limit = '10',
    status,
    paymentMethod,
    from,
    to,
    search = '',
    minTotal,
    maxTotal,
    sort = 'createdAt_desc',
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page || '1', 10));
  const limitNum = Math.max(1, Math.min(50, parseInt(limit || '10', 10)));

  const filter: any = {};
  if (status && ALLOWED_STATUS.includes(status)) {
    filter.orderStatus = status;
  }
  if (paymentMethod && ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
    filter.paymentMethod = paymentMethod;
  }

  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = fromDate;
    if (toDate) {
      const end = new Date(toDate);
      end.setUTCHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  if (minTotal) {
    const minVal = Number(minTotal);
    if (!Number.isNaN(minVal)) {
      filter.totalAmount = { ...(filter.totalAmount || {}), $gte: minVal };
    }
  }
  if (maxTotal) {
    const maxVal = Number(maxTotal);
    if (!Number.isNaN(maxVal)) {
      filter.totalAmount = { ...(filter.totalAmount || {}), $lte: maxVal };
    }
  }

  let customerIdSearch: string[] = [];
  if (search) {
    const regex = new RegExp(search, 'i');
    const customers = await Customer.find({
      $or: [{ name: regex }, { email: regex }, { phone: regex }],
    })
      .select('_id')
      .lean();
    customerIdSearch = customers.map((c: any) => String(c._id));
    filter.$or = [
      { orderCode: regex },
      { shippingAddress: regex },
      ...(customerIdSearch.length ? [{ customerId: { $in: customerIdSearch } }] : []),
    ];
  }

  const sortMap: Record<string, any> = {
    createdAt_desc: { createdAt: -1 },
    createdAt_asc: { createdAt: 1 },
    total_desc: { totalAmount: -1 },
    total_asc: { totalAmount: 1 },
  };
  const sortOpt = sortMap[sort] || sortMap.createdAt_desc;

  const total = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .sort(sortOpt)
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .lean();

  const customerIds = Array.from(new Set(orders.map((o: any) => o.customerId).filter(Boolean)));
  const customerMap: Record<string, any> = {};
  if (customerIds.length) {
    // Support both legacy Customer collection and migrated User collection
    const [customers, users] = await Promise.all([
      Customer.find({ _id: { $in: customerIds } }).select('name email phone').lean(),
      User.find({ _id: { $in: customerIds } }).select('name email phone').lean(),
    ]);
    customers.forEach((c: any) => {
      customerMap[String(c._id)] = c;
    });
    users.forEach((u: any) => {
      // Do not overwrite an existing Customer record; just fill gaps
      const k = String(u._id);
      if (!customerMap[k]) customerMap[k] = u;
    });
  }

  const items: OrderListItem[] = orders.map((o: any) => {
    const customer = o.customerId ? customerMap[String(o.customerId)] : null;
    return {
      _id: String(o._id),
      orderCode: o.orderCode,
      customerName: customer?.name || o.customerName,
      customerEmail: customer?.email || o.customerEmail,
      totalAmount: o.totalAmount || 0,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      orderStatus: o.orderStatus,
      createdAt: o.createdAt?.toISOString?.() || new Date().toISOString(),
    };
  });

  return res.status(200).json({ items, total, page: pageNum, limit: limitNum });
}
