/**
 * GET /api/admin/refund-requests
 * List all refund requests (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRefundRequests, getPendingRefundRequests } from '@/lib/refunds';

// Simple admin authentication via env variable
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function isAdminAuthenticated(request: NextRequest): boolean {
  const authHeader = request.headers.get('x-admin-password');
  return authHeader === ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  // Check admin auth
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json(
      { success: false, error: 'UNAUTHORIZED', message: 'Admin access required' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const pendingOnly = searchParams.get('pending') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let requests;

    if (pendingOnly) {
      requests = await getPendingRefundRequests(limit, offset);
    } else {
      const filters: { status?: string; userId?: string } = {};
      if (status) filters.status = status;
      if (userId) filters.userId = userId;
      requests = await getRefundRequests(filters, limit, offset);
    }

    return NextResponse.json({
      success: true,
      requests,
      count: requests.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error listing refund requests:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
