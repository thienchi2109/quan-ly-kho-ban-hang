
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authTokenCookie = request.cookies.get('firebaseAuthToken'); // Placeholder for potential future use

  // Define public paths that don't require authentication
  const publicPaths = ['/login']; 

  // Allow direct access to public paths, API routes, and static assets
  if (
    publicPaths.includes(pathname) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') || // Next.js internal paths
    pathname.includes('.') // Typically files like .ico, .png, etc.
  ) {
    // If user is authenticated (cookie exists) AND trying to access a public path (like /login),
    // redirect them to the dashboard.
    if (authTokenCookie && publicPaths.includes(pathname) && pathname !== '/dashboard') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next(); // Allow access
  }

  // For all other paths (assumed protected):
  // If user is not authenticated (no cookie), redirect to login.
  if (!authTokenCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user is authenticated, allow access to the protected path.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes are handled by the logic above)
     *
     * This ensures middleware runs on page navigations.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)',
  ],
};
