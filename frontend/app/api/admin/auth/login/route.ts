/**
 * Admin Login API
 * POST /api/admin/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin, ADMIN_SESSION_COOKIE, logAdminAction } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = req.headers.get('user-agent') || undefined;

    const result = await authenticateAdmin(email, password, ipAddress, userAgent);

    if (!result.success) {
      // Log failed attempt
      await logAdminAction({
        adminId: 'ANONYMOUS',
        adminEmail: email,
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        metadata: { reason: result.error },
        ipAddress,
        userAgent,
        severity: 'WARNING'
      }).catch(() => {});

      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    // Log successful login
    await logAdminAction({
      adminId: result.session!.adminId,
      adminEmail: email,
      action: 'LOGIN_SUCCESS',
      entityType: 'AUTH',
      ipAddress,
      userAgent,
      severity: 'INFO'
    });

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login successful'
    });

    response.cookies.set(ADMIN_SESSION_COOKIE, result.session!.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: result.session!.expiresAt,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
