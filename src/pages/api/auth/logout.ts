import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed } from '@/lib/helpers/pagesApi';

// AUTH AUDIT FIX: single handler, clear all auth cookies
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'successError');

  res.setHeader('Set-Cookie', [
    `role=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
    `userId=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
    `username=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
    `role_client=; Path=/; Max-Age=0; SameSite=Lax`,
    `username_client=; Path=/; Max-Age=0; SameSite=Lax`,
  ]);

  return res.status(200).json({ success: true });
}
