import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  const isOnDashboard = request.nextUrl.pathname.startsWith('/dashboard');
  const isOnLogin = request.nextUrl.pathname === '/login';
  const isOnRegister = request.nextUrl.pathname === '/register';
  
  // Redirect logged-in users away from login/register
  if (token && (isOnLogin || isOnRegister)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Protect dashboard routes
  if (isOnDashboard && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
