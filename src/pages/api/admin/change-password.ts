import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { isAdminFromSession, getUserIdFromSession } from '@/lib/authHelpers';

// Admin-only API
// JSON response only – no redirect
// AUTH REFACTOR: Use NextAuth session instead of cookie-based auth

type ErrorResponse = { message: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<any | ErrorResponse>) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!(await isAdminFromSession(req, res))) return res.status(401).json({ message: 'Unauthorized' });

  const userId = await getUserIdFromSession(req, res);
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const { oldPassword, newPassword, confirmPassword } = req.body || {};
  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Thiếu thông tin mật khẩu' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Mật khẩu mới không khớp' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Mật khẩu mới phải từ 8 ký tự' });
  }
  if (newPassword === oldPassword) {
    return res.status(400).json({ message: 'Mật khẩu mới phải khác mật khẩu cũ' });
  }

  await dbConnect();
  const user: any = await User.findById(userId).select('password status role');
  if (!user) return res.status(404).json({ message: 'Not found' });
  if (user.status === 'blocked') return res.status(403).json({ message: 'User is blocked' });

  const isMatch = user.password ? bcrypt.compareSync(oldPassword, user.password) : false;
  if (!isMatch) return res.status(400).json({ message: 'Mật khẩu cũ không đúng' });

  const hashed = bcrypt.hashSync(newPassword, 10);
  user.password = hashed;
  await user.save();

  return res.status(200).json({ message: 'Đổi mật khẩu thành công' });
}
