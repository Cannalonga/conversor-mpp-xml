/**
 * Admin Logout API
 * POST /api/admin/auth/logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { logoutAdmin, getCurrentAdmin, ADMIN_SESSION_COOKIE, logAdminAction } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;

    if (token) {
      const admin = await getCurrentAdmin();
      
      await logoutAdmin(token);

      if (admin) {
        await logAdminAction({
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'LOGOUT',
          entityType: 'AUTH',
          severity: 'INFO'
        });
      }
    }

    const response = NextResponse.json({ success: true });
    
    response.cookies.delete(ADMIN_SESSION_COOKIE);

    return response;
  } catch (error) {
    console.error('Admin logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
