import type { NextApiRequest, NextApiResponse } from 'next';

// Admin-only API
// JSON response only – no redirect

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  res.setHeader('Set-Cookie', [
    'role=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
    'role_client=; Path=/; Max-Age=0; SameSite=Lax',
    'userId=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
    'username=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
    'username_client=; Path=/; Max-Age=0; SameSite=Lax',
  ]);

  return res.status(200).json({ message: 'Logged out' });
}
