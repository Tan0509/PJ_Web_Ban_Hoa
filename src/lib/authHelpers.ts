import type { NextApiRequest, NextApiResponse } from 'next';
import type { Session } from 'next-auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { getToken } from 'next-auth/jwt';

// --- App Router (no req/res) ---

/**
 * Get session in App Router route handlers (getServerSession(authOptions) with no args).
 */
export async function getSessionForAppRouter(): Promise<Session | null> {
  return await getServerSession(authOptions);
}

/**
 * Require a logged-in user in App Router. Returns { session, userId } or null if unauthorized.
 * Route decides 401 response body (e.g. { message: 'Unauthorized' } or { success: false, error: 'Unauthorized' }).
 */
export async function requireSession(): Promise<{ session: Session; userId: string } | null> {
  const session = await getSessionForAppRouter();
  const email = session?.user?.email;
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!email || !id) return null;
  return { session, userId: String(id) };
}

/**
 * Require customer role in App Router (for orders, payments). Returns session+userId or reason (unauthorized/forbidden).
 * Route decides 401/403 response bodies.
 */
export async function requireCustomerSession(): Promise<
  { session: Session; userId: string } | { kind: 'unauthorized' } | { kind: 'forbidden' }
> {
  const session = await getSessionForAppRouter();
  const email = session?.user?.email;
  const id = (session?.user as { id?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!email || !id) return { kind: 'unauthorized' };
  if (role && role !== 'customer') return { kind: 'forbidden' };
  return { session, userId: String(id) };
}

// --- Pages Router (req, res) ---

/**
 * AUTH REFACTOR: Get NextAuth session in Pages Router API handlers
 * This replaces cookie-based auth checks (req.cookies.role)
 * Source of truth: NextAuth JWT session
 */
export async function getNextAuthSession(req: NextApiRequest, res: NextApiResponse) {
  // getServerSession for Pages Router requires req/res context
  return await getServerSession(req, res, authOptions);
}

/**
 * AUTH REFACTOR: Get NextAuth JWT token directly (faster for role checks)
 * Use this when you only need role/id, not full session
 */
export async function getNextAuthToken(req: NextApiRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  return await getToken({ req, secret });
}

/**
 * AUTH REFACTOR: Check if user is admin/staff from NextAuth session
 * Replaces: req.cookies?.role === 'admin'
 */
export async function isAdminFromSession(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  const token = await getNextAuthToken(req);
  if (token) {
    const role = token.role as string;
    return role === 'admin' || role === 'staff';
  }
  // Fallback to full session check if token fails
  const session = await getNextAuthSession(req, res);
  const role = (session?.user as any)?.role;
  return role === 'admin' || role === 'staff';
}

/**
 * AUTH REFACTOR: Get user role from NextAuth session
 * Returns: 'admin' | 'staff' | 'customer' | null
 */
export async function getRoleFromSession(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const token = await getNextAuthToken(req);
  if (token) {
    return (token.role as string) || null;
  }
  // Fallback to full session check
  const session = await getNextAuthSession(req, res);
  return (session?.user as any)?.role || null;
}

/**
 * AUTH REFACTOR: Get user ID from NextAuth session
 */
export async function getUserIdFromSession(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const token = await getNextAuthToken(req);
  if (token) {
    return (token.id as string) || null;
  }
  // Fallback to full session check
  const session = await getNextAuthSession(req, res);
  return (session?.user as any)?.id || null;
}
