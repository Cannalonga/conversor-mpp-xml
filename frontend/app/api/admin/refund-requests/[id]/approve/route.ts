/**
 * POST /api/admin/refund-requests/[id]/approve
 * Approve a refund request (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { approveRefundRequest, rejectRefundRequest } from '@/lib/refunds';

// Simple admin authentication via env variable
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function isAdminAuthenticated(request: NextRequest): boolean {
  const authHeader = request.headers.get('x-admin-password');
  return authHeader === ADMIN_PASSWORD;
}

// Approve refund
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check admin auth
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json(
      { success: false, error: 'UNAUTHORIZED', message: 'Admin access required' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { notes, adminId } = body;

    const result = await approveRefundRequest(
      id,
      adminId || 'ADMIN',
      notes
    );

    if (!result.success) {
      const statusCode = 
        result.error === 'REQUEST_NOT_FOUND' ? 404 :
        result.error === 'REQUEST_NOT_PENDING' ? 400 :
        500;

      return NextResponse.json(
        { success: false, error: result.error, message: result.message },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      refundRequestId: result.refundRequestId,
      newBalance: result.newBalance,
      message: result.message,
    });
  } catch (error) {
    console.error('Error approving refund:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// Reject refund (using DELETE method)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check admin auth
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json(
      { success: false, error: 'UNAUTHORIZED', message: 'Admin access required' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { notes, adminId } = body;

    if (!notes) {
      return NextResponse.json(
        { success: false, error: 'MISSING_NOTES', message: 'Notes required for rejection' },
        { status: 400 }
      );
    }

    const result = await rejectRefundRequest(id, adminId || 'ADMIN', notes);

    if (!result.success) {
      const statusCode = 
        result.error === 'REQUEST_NOT_FOUND' ? 404 :
        result.error === 'REQUEST_NOT_PENDING' ? 400 :
        500;

      return NextResponse.json(
        { success: false, error: result.error, message: result.message },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      refundRequestId: result.refundRequestId,
      message: result.message,
    });
  } catch (error) {
    console.error('Error rejecting refund:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
