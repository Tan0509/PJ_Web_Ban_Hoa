import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { isAdminFromSession, getUserIdFromSession } from '@/lib/authHelpers';

// User Admin Management - Scoped to Admin Panel only
// Do NOT reuse for Customer logic
// Do NOT change auth core
// AUTH REFACTOR: Use NextAuth session instead of cookie-based auth

type ErrorResponse = { message: string };

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

export default async function handler(req: NextApiRequest, res: NextApiResponse<any | ErrorResponse>) {
  if (!(await isAdminFromSession(req, res))) return res.status(401).json({ message: 'Unauthorized' });
  await dbConnect();
  try {
    await ensureAdminNotBlocked(req, res);
  } catch (err: any) {
    const status = err?.status || 500;
    return res.status(status).json({ message: err?.message || 'Server error' });
  }

  const { id } = req.query;
  const selfId = await getUserIdFromSession(req, res);

  if (req.method === 'GET') {
    // MIGRATION: Return full user data including googleId, facebookId, address[]
    type UserLean = {
      _id: unknown;
      name: string;
      email: string;
      role: string;
      status?: string;
      phone?: string;
      avatar?: string;
      provider?: string;
      googleId?: string;
      facebookId?: string;
      address?: unknown[];
      createdAt: Date;
      deletedAt?: Date;
    };
    const user = await User.findById(id)
      .select('name email role status phone avatar provider googleId facebookId address createdAt deletedAt')
      .lean<UserLean | null>();
    if (!user || !user._id || user.status === 'deleted') return res.status(404).json({ message: 'Not found' });
    
    // Check if user has orders (for email readonly logic)
    const Order = (await import('@/models/Order')).default;
    const hasOrders = await Order.exists({ customerId: String(user._id) });
    
    return res.status(200).json({
      _id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.phone || '',
      avatar: user.avatar || '',
      provider: user.provider || 'local',
      googleId: user.googleId || null,
      facebookId: user.facebookId || null,
      address: user.address || [],
      createdAt: user.createdAt,
      hasOrders: !!hasOrders, // For email readonly logic
    });
  }

  if (req.method === 'PATCH') {
    const { name, role, status, phone, avatar, address, password } = req.body || {};

    // prevent admin editing own role
    if (selfId && String(selfId) === String(id) && role && role !== 'admin') {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    // Check if user has orders - if yes, email should be readonly (not in payload, but validation)
    const Order = (await import('@/models/Order')).default;
    const hasOrders = await Order.exists({ customerId: String(id) });

    const payload: any = {};
    if (name) payload.name = name;
    if (role) payload.role = role;
    if (status) payload.status = status;
    if (status === 'deleted') payload.deletedAt = new Date();
    if (status && status !== 'deleted') payload.deletedAt = undefined;
    if (phone !== undefined) payload.phone = phone;
    if (avatar !== undefined) payload.avatar = avatar;
    // MIGRATION: Handle address[] update
    if (Array.isArray(address)) {
      payload.address = address;
    }
    // Handle password change (hash before saving)
    if (password && typeof password === 'string' && password.trim().length > 0) {
      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
      }
      payload.password = bcrypt.hashSync(password.trim(), 10);
      // If setting password, ensure provider is 'local' (or allow multi-provider)
      payload.provider = 'local';
    }

    const updated = await User.findByIdAndUpdate(id, payload, { 
      new: true,
      projection: 'name email role status phone avatar provider googleId facebookId address createdAt deletedAt'
    });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    
    // Return full user data
    const userObj = updated.toObject();
    return res.status(200).json({
      _id: String(userObj._id),
      name: userObj.name,
      email: userObj.email,
      role: userObj.role,
      status: userObj.status,
      phone: userObj.phone || '',
      avatar: userObj.avatar || '',
      provider: userObj.provider || 'local',
      googleId: userObj.googleId || null,
      facebookId: userObj.facebookId || null,
      address: userObj.address || [],
      createdAt: userObj.createdAt,
      hasOrders: !!hasOrders,
    });
  }

  if (req.method === 'DELETE') {
    if (selfId && String(selfId) === String(id)) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }
    // Hard delete - xóa thật sự khỏi database
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    return res.status(200).json({ message: 'Đã xóa người dùng vĩnh viễn', success: true });
  }

  // Hide/Unhide endpoint
  if (req.method === 'POST') {
    const { action } = req.body || {};
    if (action === 'hide') {
      const updated = await User.findByIdAndUpdate(
        id,
        { status: 'deleted', deletedAt: new Date() },
        { new: true, projection: 'name email role status phone avatar provider googleId facebookId address createdAt deletedAt' }
      );
      if (!updated) return res.status(404).json({ message: 'Not found' });
      const userObj = updated.toObject();
      return res.status(200).json({
        _id: String(userObj._id),
        name: userObj.name,
        email: userObj.email,
        role: userObj.role,
        status: userObj.status,
        phone: userObj.phone || '',
        avatar: userObj.avatar || '',
        provider: userObj.provider || 'local',
        googleId: userObj.googleId || null,
        facebookId: userObj.facebookId || null,
        address: userObj.address || [],
        createdAt: userObj.createdAt,
        message: 'Đã ẩn người dùng',
      });
    }
    if (action === 'unhide') {
      const updated = await User.findByIdAndUpdate(
        id,
        { status: 'active', deletedAt: undefined },
        { new: true, projection: 'name email role status phone avatar provider googleId facebookId address createdAt deletedAt' }
      );
      if (!updated) return res.status(404).json({ message: 'Not found' });
      const userObj = updated.toObject();
      return res.status(200).json({
        _id: String(userObj._id),
        name: userObj.name,
        email: userObj.email,
        role: userObj.role,
        status: userObj.status,
        phone: userObj.phone || '',
        avatar: userObj.avatar || '',
        provider: userObj.provider || 'local',
        googleId: userObj.googleId || null,
        facebookId: userObj.facebookId || null,
        address: userObj.address || [],
        createdAt: userObj.createdAt,
        message: 'Đã hiển thị người dùng',
      });
    }
    return res.status(400).json({ message: 'Invalid action' });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
