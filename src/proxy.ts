import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * AUTH: Proxy uses NextAuth JWT token (single source of truth)
 * SECURITY: Fail secure - block access if NEXTAUTH_SECRET is missing
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/admin')) {
    const secret = process.env.NEXTAUTH_SECRET;

    if (!secret) {
      console.error('[PROXY SECURITY] NEXTAUTH_SECRET is missing - blocking admin access (fail secure)');
      const url = req.nextUrl.clone();
      url.pathname = '/auth/signin';
      return NextResponse.redirect(url);
    }

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
