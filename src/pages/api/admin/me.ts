import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { isAdminFromSession, getUserIdFromSession } from '@/lib/authHelpers';
import { methodNotAllowed } from '@/lib/helpers/pagesApi';

// Admin-only API
// JSON response only – no redirect
// AUTH REFACTOR: Use NextAuth session instead of cookie-based auth

type ErrorResponse = { message: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<any | ErrorResponse>) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  if (!(await isAdminFromSession(req, res))) return res.status(401).json({ message: 'Unauthorized' });

  const userId = await getUserIdFromSession(req, res);
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  await dbConnect();
  const user = await User.findById(userId).select('name email role status').lean<{ _id: unknown; name: string; email: string; role: string; status?: string } | null>();
  if (!user || !user._id) return res.status(404).json({ message: 'Not found' });
  if (user.status === 'blocked') return res.status(403).json({ message: 'User is blocked' });

  return res.status(200).json({
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status || 'active',
  });
}
