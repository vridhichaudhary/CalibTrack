import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js 16 Proxy (equivalent of middleware for this version).
 * Runs on the Edge before any page renders.
 *
 * Since tokens live in localStorage (inaccessible here), we rely
 * on the `user_role` cookie set in AuthContext immediately after
 * login. This gives instant server-side redirects with no flicker:
 *
 *  - Unauthenticated → /admin/* or /dashboard/* : redirect to /login
 *  - Authenticated admin → / or /login          : redirect to /admin/instruments
 *  - Authenticated user → / or /login           : redirect to /dashboard
 *  - Authenticated non-admin → /admin/*         : redirect to /dashboard
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const roleCookie = request.cookies.get('user_role')?.value;

  const isAuthenticated = !!roleCookie;
  const isAdmin = roleCookie === 'admin';

  const isLoginRoute = pathname === '/login';
  const isRootRoute = pathname === '/';
  const isAdminRoute = pathname.startsWith('/admin');
  const isDashboardRoute = pathname.startsWith('/dashboard');

  // Already logged in → skip login / root page directly to dashboard
  if (isAuthenticated && (isLoginRoute || isRootRoute)) {
    const dest = isAdmin ? '/admin/instruments' : '/dashboard';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Not logged in → redirect protected routes to login
  if (!isAuthenticated && (isAdminRoute || isDashboardRoute)) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Non-admin trying to access /admin/* → kick to /dashboard
  if (isAuthenticated && !isAdmin && isAdminRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/admin/:path*',
    '/dashboard/:path*',
  ],
};
