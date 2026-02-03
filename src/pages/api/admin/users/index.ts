import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { isAdminFromSession, getUserIdFromSession } from '@/lib/authHelpers';

// User Admin Management - Scoped to Admin Panel only
// Do NOT reuse for Customer logic
// Do NOT change auth core
// AUTH AUDIT FIX
// AUTH REFACTOR: Use NextAuth session instead of cookie-based auth

type ErrorResponse = { message: string };

type UserResponse = {
  _id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  phone?: string;
  avatar?: string;
  createdAt?: string;
};

type ListResponse = {
  items: UserResponse[];
  total: number;
  page: number;
  limit: number;
};

async function ensureAdminNotBlocked(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdFromSession(req, res);
  if (!userId) return;
  const admin = await User.findById(userId).select('status role').lean<{ _id: unknown; status?: string; role?: string } | null>();
  if (admin && admin.status === 'blocked') {
    const err = new Error('User is blocked');
    (err as any).status = 403;
    throw err;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse | UserResponse | ErrorResponse>
) {
  if (!(await isAdminFromSession(req, res))) return res.status(401).json({ message: 'Unauthorized' });
  await dbConnect();
  try {
    await ensureAdminNotBlocked(req, res);
  } catch (err: any) {
    const status = err?.status || 500;
    return res.status(status).json({ message: err?.message || 'Server error' });
  }

  if (req.method === 'GET') {
    const {
      page = '1',
      limit = '10',
      search = '',
      role,
      status,
      sort = 'createdAt_desc',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.max(1, Math.min(50, parseInt(limit || '10', 10)));

    // Admin-side: hiển thị tất cả users (cả deleted) trừ khi filter status cụ thể
    const filter: any = {};
    if (role) filter.role = role;
    if (status) {
      // Nếu filter status cụ thể, áp dụng filter đó
      filter.status = status;
    }
    // Nếu không filter status, hiển thị tất cả (bao gồm cả deleted)
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const sortMap: Record<string, any> = {
      createdAt_desc: { createdAt: -1 },
      createdAt_asc: { createdAt: 1 },
      name_asc: { name: 1 },
      name_desc: { name: -1 },
      email_asc: { email: 1 },
      email_desc: { email: -1 },
    };
    const sortOpt = sortMap[sort] || sortMap.createdAt_desc;

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort(sortOpt)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .select('name email role status phone avatar createdAt')
      .lean();

    return res.status(200).json({
      items: users.map((u: any) => ({
        _id: String(u._id),
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        phone: u.phone,
        avatar: u.avatar,
        createdAt: u.createdAt,
      })),
      total,
      page: pageNum,
      limit: limitNum,
    });
  }

  if (req.method === 'POST') {
    // FIX: Ensure admin creation persists to MongoDB
    // Scope: Admin user creation only
    // Do NOT affect auth/customer logic
    const {
      name,
      email,
      role = 'admin',
      status = 'active',
      phone,
      avatar,
      password,
    } = req.body || {};
    if (!name || !email) return res.status(400).json({ message: 'name and email are required' });
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(409).json({ message: 'Email already exists' });

    if ((role === 'admin' || role === 'staff') && !password) {
      return res.status(400).json({ message: 'password required for admin/staff' });
    }

    const payload: any = {
      name,
      email: normalizedEmail,
      role,
      status,
      phone,
      avatar,
      provider: 'local',
    };

    if (password) {
      payload.password = bcrypt.hashSync(password, 10);
    }

    const created = await User.create(payload);
    console.log('[ADMIN CREATE]', created?._id, created?.email);

    return res.status(201).json({
      _id: String(created._id),
      name: created.name,
      email: created.email,
      role: created.role,
      status: created.status,
      phone: created.phone,
      avatar: created.avatar,
      createdAt: created.createdAt,
    });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
