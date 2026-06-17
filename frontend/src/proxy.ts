import { NextRequest, NextResponse } from 'next/server';

/**
 * Lightweight middleware. Since tokens live in localStorage 
 * (not accessible here), this only handles the most basic 
 * redirect cases using a non-httpOnly cookie mirror of the 
 * user's role, which we set client-side after login for this 
 * exact purpose (see AuthContext — to be extended in Phase 9 
 * to also set this cookie).
 * 
 * Full enforcement happens in the (dashboard) layout component
 * client-side, which is the actual source of truth.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const roleCookie = request.cookies.get('user_role')?.value;

  const isAdminRoute = pathname.startsWith('/admin');
  const isLoginRoute = pathname === '/login';

  if (isLoginRoute && roleCookie) {
    const redirectPath = roleCookie === 'admin' ? '/admin/instruments' : '/dashboard';
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  if (isAdminRoute && roleCookie && roleCookie !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/login'],
};
