import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * AUTH REFACTOR: Middleware uses NextAuth JWT token ONLY (single source of truth)
 * SECURITY: Fail secure - block access if NEXTAUTH_SECRET is missing
 * No cookie-based fallback (prevents auth bypass)
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/admin')) {
    const secret = process.env.NEXTAUTH_SECRET;
    
    // SECURITY: NEXTAUTH_SECRET is required - fail secure, no fallback
    if (!secret) {
      console.error('[MIDDLEWARE SECURITY] NEXTAUTH_SECRET is missing - blocking admin access (fail secure)');
      const url = req.nextUrl.clone();
      url.pathname = '/auth/signin';
      return NextResponse.redirect(url);
    }

    // Use NextAuth JWT token as single source of truth
    const token = await getToken({ req, secret });
    const role = (token?.role as string) || null;
    
    if (role !== 'admin' && role !== 'staff') {
      const url = req.nextUrl.clone();
      url.pathname = '/auth/signin';
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
