// ⚠️ LEGACY AUTH ENDPOINT - DEPRECATED
// Authentication is handled by NextAuth
// Admin login should use NextAuth CredentialsProvider
// This file is kept for backward compatibility only
// DO NOT USE FOR NEW CODE - Use NextAuth signIn('credentials') instead

import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed } from '@/lib/helpers/pagesApi';

// AUTH REFACTOR: This endpoint is deprecated
// Admin login should use NextAuth signIn('credentials') on frontend
// NextAuth CredentialsProvider already handles admin/staff login (see [...nextauth].ts)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'successError');
  
  // AUTH REFACTOR: Return 410 Gone to indicate this endpoint is deprecated
  // Frontend should use NextAuth signIn('credentials') from 'next-auth/react'
  // NextAuth CredentialsProvider in [...nextauth].ts handles both admin and customer login
  return res.status(410).json({ 
    success: false, 
    error: 'This endpoint is deprecated. Use NextAuth signIn("credentials") instead.',
    message: 'Please use signIn("credentials") from next-auth/react on the frontend. NextAuth handles admin/staff login automatically.'
  });
}
