/**
 * POST /api/refunds/request
 * Create a refund request for a failed job
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createRefundRequest } from '@/lib/refunds';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { jobId, reason } = body;

    // Validate input
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_JOB_ID', message: 'jobId é obrigatório' },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'MISSING_REASON', message: 'Motivo deve ter pelo menos 5 caracteres' },
        { status: 400 }
      );
    }

    // Create refund request
    const result = await createRefundRequest({
      userId: session.user.id,
      jobId,
      reason: reason.trim(),
    });

    if (!result.success) {
      const statusCode = 
        result.error === 'JOB_NOT_FOUND' ? 404 :
        result.error === 'JOB_NOT_FAILED' ? 400 :
        result.error === 'REFUND_WINDOW_EXPIRED' ? 400 :
        result.error === 'NO_CHARGE_FOUND' ? 400 :
        result.error === 'REFUND_ALREADY_REQUESTED' ? 409 :
        500;

      return NextResponse.json(
        { success: false, error: result.error, message: result.message },
        { status: statusCode }
      );
    }

    // Return 202 Accepted for pending, 200 for auto-approved
    const statusCode = result.autoRefunded ? 200 : 202;

    return NextResponse.json(
      {
        success: true,
        refundRequestId: result.refundRequestId,
        autoRefunded: result.autoRefunded,
        newBalance: result.newBalance,
        message: result.message,
      },
      { status: statusCode }
    );
  } catch (error) {
    console.error('Refund request error:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
