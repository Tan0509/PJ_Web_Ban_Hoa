// ⚠️ LEGACY AUTH ENDPOINT
// Authentication is handled by NextAuth
// This file is kept for backward compatibility only
// Frontend calls signIn('credentials') after successful signup
// MIGRATION: Customer model → User model (single source of truth)

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

// AUTH REFACTOR: This API only creates user, does NOT set cookies
// NextAuth session is created via signIn('credentials') on frontend
// MIGRATION: Creates User with role='customer' instead of Customer model

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  await dbConnect();
  // AUTH AUDIT FIX: lowercase email, enforce status/provider defaults
  // MIGRATION: Customer model → User model
  const { name, email, password } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
  if (!name || !normalizedEmail || !password) return res.status(400).json({ success: false, error: 'Missing fields' });
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) return res.status(400).json({ success: false, error: 'Email đã tồn tại' });
  const hash = bcrypt.hashSync(password, 10);
  const user = await User.create({ 
    name, 
    email: normalizedEmail, 
    password: hash, 
    provider: 'local', 
    role: 'customer',
    status: 'active' 
  });

  // AUTH REFACTOR: Do NOT set cookies - NextAuth handles session via signIn('credentials')
  // Frontend will call signIn('credentials') after receiving success response

  return res.status(201).json({ success: true, data: { role: 'customer', name: user.name } });
}
