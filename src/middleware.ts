
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow direct access to login, API routes, static assets, and Next.js internal paths.
  // AppLayout.tsx will handle redirecting *away* from /login if already authenticated client-side,
  // and redirecting *to* /login if not authenticated for protected routes.
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.') // Catches files like .ico, .png, but also explicit manifest.json etc.
                           // The matcher config below is more robust for excluding specific files/folders.
  ) {
    return NextResponse.next();
  }

  // For all other paths, by default, allow the request to proceed.
  // AppLayout.tsx, running on the client-side, will use AuthContext
  // to determine if the user is authenticated and then perform
  // necessary redirects (e.g., to '/login' if not authenticated for a protected route).
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - icons/ (folder for PWA icons)
     *
     * This ensures middleware runs on page navigations but avoids static assets
     * that shouldn't typically be involved in auth redirection loops or cause
     * environment-specific CORS issues when proxied.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)',
  ],
};
