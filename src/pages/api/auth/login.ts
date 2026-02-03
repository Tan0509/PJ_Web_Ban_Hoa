// ⚠️ LEGACY AUTH ENDPOINT - DEPRECATED
// Authentication is handled by NextAuth via signIn('credentials')
// This file is kept for backward compatibility only
// DO NOT USE FOR NEW CODE - Use NextAuth signIn() on frontend instead

import type { NextApiRequest, NextApiResponse } from 'next';

// AUTH REFACTOR: This endpoint is deprecated
// Frontend should use NextAuth signIn('credentials') instead
// This file only returns error to guide developers

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  
  // AUTH REFACTOR: Return 410 Gone to indicate this endpoint is deprecated
  // Frontend should use NextAuth signIn('credentials') from 'next-auth/react'
  return res.status(410).json({ 
    success: false, 
    error: 'This endpoint is deprecated. Use NextAuth signIn("credentials") instead.',
    message: 'Please use signIn("credentials") from next-auth/react on the frontend'
  });
}
