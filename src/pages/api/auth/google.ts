// ⚠️ LEGACY AUTH ENDPOINT - DEPRECATED
// Authentication is handled by NextAuth GoogleProvider
// This file is kept for backward compatibility only
// DO NOT USE FOR NEW CODE - Use NextAuth signIn('google') instead

import type { NextApiRequest, NextApiResponse } from 'next';

// AUTH REFACTOR: This endpoint is deprecated
// Google OAuth should use NextAuth GoogleProvider via signIn('google')
// NextAuth handles Google OAuth flow automatically (see [...nextauth].ts)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  
  // AUTH REFACTOR: Return 410 Gone to indicate this endpoint is deprecated
  // Frontend should use NextAuth signIn('google') from 'next-auth/react'
  // NextAuth GoogleProvider handles OAuth flow automatically
  return res.status(410).json({ 
    success: false, 
    error: 'This endpoint is deprecated. Use NextAuth signIn("google") instead.',
    message: 'Please use signIn("google") from next-auth/react on the frontend. NextAuth handles Google OAuth flow automatically.'
  });
}
