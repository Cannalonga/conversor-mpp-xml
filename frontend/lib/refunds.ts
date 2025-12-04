/**
 * Refund System Library
 * Handles credit refunds for failed jobs and Stripe-initiated refunds
 */

import prisma from './prisma';

// Configuration from environment
const REFUND_WINDOW_DAYS = parseInt(process.env.REFUND_WINDOW_DAYS || '30', 10);
const AUTO_REFUND = process.env.AUTO_REFUND === 'true';

export interface RefundRequestInput {
  userId: string;
  jobId?: string;
  reason: string;
  amount?: number;
  failureStage?: 'PRE_PROCESS' | 'DURING_PROCESS' | 'POST_PROCESS';
}

export interface RefundResult {
  success: boolean;
  refundRequestId?: string;
  autoRefunded?: boolean;
  newBalance?: number;
  error?: string;
  message?: string;
}

/**
 * Check if a refund request is within the allowed time window
 */
export function isWithinRefundWindow(createdAt: Date): boolean {
  const now = new Date();
  const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= REFUND_WINDOW_DAYS;
}

/**
 * Find the charge transaction for a job
 * Since we don't have a direct jobId field, we search in metadata
 */
export async function findJobChargeTransaction(jobId: string) {
  // Search for conversion transactions that include this jobId in metadata
  const transactions = await prisma.creditTransaction.findMany({
    where: {
      type: 'CONVERSION',
      amount: { lt: 0 }, // Negative = charge
    },
    orderBy: { createdAt: 'desc' },
    take: 100, // Limit search scope
  });

  // Find transaction with matching jobId in metadata
  for (const tx of transactions) {
    if (tx.metadata) {
      try {
        const meta = JSON.parse(tx.metadata);
        if (meta.jobId === jobId && !meta.refunded) {
          return tx;
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  }
  
  return null;
}

/**
 * Execute a refund - add credits back to user
 */
export async function executeRefund(
  userId: string,
  amount: number,
  description: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; newBalance?: number; transactionId?: string; error?: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create refund transaction (positive amount)
      const transaction = await tx.creditTransaction.create({
        data: {
          userId,
          amount: Math.abs(amount), // Ensure positive for refund
          type: 'REFUND',
          description,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });

      // Update user balance
      const userCredits = await tx.userCredits.upsert({
        where: { userId },
        create: {
          userId,
          balance: Math.abs(amount),
        },
        update: {
          balance: { increment: Math.abs(amount) },
        },
      });

      return { transaction, userCredits };
    });

    return {
      success: true,
      newBalance: result.userCredits.balance,
      transactionId: result.transaction.id,
    };
  } catch (error) {
    console.error('Failed to execute refund:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mark original transaction as refunded (via metadata)
 */
export async function markTransactionRefunded(transactionId: string): Promise<void> {
  const tx = await prisma.creditTransaction.findUnique({
    where: { id: transactionId },
  });
  
  if (tx) {
    let metadata: Record<string, unknown> = {};
    if (tx.metadata) {
      try {
        metadata = JSON.parse(tx.metadata);
      } catch {
        // Start fresh if invalid JSON
      }
    }
    metadata.refunded = true;
    metadata.refundedAt = new Date().toISOString();
    
    await prisma.creditTransaction.update({
      where: { id: transactionId },
      data: { metadata: JSON.stringify(metadata) },
    });
  }
}

/**
 * Create a refund request
 */
export async function createRefundRequest(input: RefundRequestInput): Promise<RefundResult> {
  const { userId, jobId, reason, amount, failureStage } = input;

  try {
    // If jobId provided, validate the job exists and is failed
    let job = null;
    let chargeTransaction = null;
    let refundAmount = amount || 0;

    if (jobId) {
      job = await prisma.job.findUnique({ where: { id: jobId } });
      
      if (!job) {
        return { success: false, error: 'JOB_NOT_FOUND', message: 'Job não encontrado' };
      }

      if (!['failed', 'error'].includes(job.status.toLowerCase())) {
        return { 
          success: false, 
          error: 'JOB_NOT_FAILED', 
          message: 'Apenas jobs com falha podem ser reembolsados' 
        };
      }

      // Check refund window
      if (!isWithinRefundWindow(job.createdAt)) {
        return {
          success: false,
          error: 'REFUND_WINDOW_EXPIRED',
          message: `Reembolsos só são permitidos em até ${REFUND_WINDOW_DAYS} dias`,
        };
      }

      // Find the charge transaction
      chargeTransaction = await findJobChargeTransaction(jobId);
      
      if (!chargeTransaction) {
        return {
          success: false,
          error: 'NO_CHARGE_FOUND',
          message: 'Nenhuma cobrança encontrada para este job',
        };
      }

      refundAmount = Math.abs(chargeTransaction.amount);
    }

    if (refundAmount <= 0) {
      return { success: false, error: 'INVALID_AMOUNT', message: 'Valor de reembolso inválido' };
    }

    // Check for existing pending refund request
    const existingRequest = await prisma.refundRequest.findFirst({
      where: {
        jobId,
        status: { in: ['PENDING', 'AUTO_APPROVED'] },
      },
    });

    if (existingRequest) {
      return {
        success: false,
        error: 'REFUND_ALREADY_REQUESTED',
        message: 'Já existe uma solicitação de reembolso para este job',
      };
    }

    // Determine if auto-refund should be applied
    const shouldAutoRefund = AUTO_REFUND && failureStage === 'PRE_PROCESS';

    // Create refund request
    const refundRequest = await prisma.refundRequest.create({
      data: {
        userId,
        jobId,
        transactionId: chargeTransaction?.id,
        amount: refundAmount,
        reason,
        failureStage,
        status: shouldAutoRefund ? 'AUTO_APPROVED' : 'PENDING',
        autoRefund: shouldAutoRefund,
        processedAt: shouldAutoRefund ? new Date() : null,
        processedBy: shouldAutoRefund ? 'SYSTEM' : null,
      },
    });

    // If auto-refund, execute immediately
    if (shouldAutoRefund) {
      const refundResult = await executeRefund(
        userId,
        refundAmount,
        `Reembolso automático - Job ${jobId} falhou em pré-processamento`,
        { jobId, refundRequestId: refundRequest.id, failureStage }
      );

      if (refundResult.success && chargeTransaction) {
        await markTransactionRefunded(chargeTransaction.id);
      }

      return {
        success: true,
        refundRequestId: refundRequest.id,
        autoRefunded: true,
        newBalance: refundResult.newBalance,
        message: 'Reembolso automático processado com sucesso',
      };
    }

    return {
      success: true,
      refundRequestId: refundRequest.id,
      autoRefunded: false,
      message: 'Solicitação de reembolso criada e aguardando aprovação',
    };
  } catch (error) {
    console.error('Failed to create refund request:', error);
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Erro interno',
    };
  }
}

/**
 * Approve a refund request (admin action)
 */
export async function approveRefundRequest(
  refundRequestId: string,
  adminId: string,
  notes?: string
): Promise<RefundResult> {
  try {
    const request = await prisma.refundRequest.findUnique({
      where: { id: refundRequestId },
    });

    if (!request) {
      return { success: false, error: 'REQUEST_NOT_FOUND' };
    }

    if (request.status !== 'PENDING') {
      return { success: false, error: 'REQUEST_NOT_PENDING', message: 'Solicitação já foi processada' };
    }

    // Execute the refund
    const refundResult = await executeRefund(
      request.userId,
      request.amount,
      `Reembolso aprovado - ${request.reason}`,
      { refundRequestId, approvedBy: adminId, jobId: request.jobId }
    );

    if (!refundResult.success) {
      return { success: false, error: 'REFUND_FAILED', message: refundResult.error };
    }

    // Update refund request
    await prisma.refundRequest.update({
      where: { id: refundRequestId },
      data: {
        status: 'APPROVED',
        processedAt: new Date(),
        processedBy: adminId,
        adminNotes: notes,
      },
    });

    // Mark original transaction as refunded
    if (request.transactionId) {
      await markTransactionRefunded(request.transactionId);
    }

    return {
      success: true,
      refundRequestId,
      newBalance: refundResult.newBalance,
      message: 'Reembolso aprovado e processado',
    };
  } catch (error) {
    console.error('Failed to approve refund:', error);
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Erro interno',
    };
  }
}

/**
 * Reject a refund request (admin action)
 */
export async function rejectRefundRequest(
  refundRequestId: string,
  adminId: string,
  notes: string
): Promise<RefundResult> {
  try {
    const request = await prisma.refundRequest.findUnique({
      where: { id: refundRequestId },
    });

    if (!request) {
      return { success: false, error: 'REQUEST_NOT_FOUND' };
    }

    if (request.status !== 'PENDING') {
      return { success: false, error: 'REQUEST_NOT_PENDING' };
    }

    await prisma.refundRequest.update({
      where: { id: refundRequestId },
      data: {
        status: 'REJECTED',
        processedAt: new Date(),
        processedBy: adminId,
        adminNotes: notes,
      },
    });

    return {
      success: true,
      refundRequestId,
      message: 'Solicitação de reembolso rejeitada',
    };
  } catch (error) {
    console.error('Failed to reject refund:', error);
    return {
      success: false,
      error: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Handle Stripe-initiated refund
 * This is called when Stripe processes a refund (e.g., customer dispute)
 */
export async function handleStripeRefund(params: {
  userId: string;
  stripeEventId: string;
  creditsToDeduct: number;
  amountRefunded: number;
  reason: string;
}): Promise<{ 
  success: boolean; 
  action: string; 
  creditsDeducted?: number;
  accountBlocked?: boolean;
  recoveryCreated?: boolean;
  error?: string;
}> {
  const { userId, stripeEventId, creditsToDeduct, amountRefunded, reason } = params;
  
  try {
    // Get user and their credits balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { credits: true },
    });

    if (!user) {
      return { success: false, action: 'USER_NOT_FOUND', error: 'User not found' };
    }

    const userBalance = user.credits?.balance || 0;

    // Check if user has sufficient balance to deduct
    if (userBalance >= creditsToDeduct) {
      // Deduct credits
      await prisma.$transaction(async (tx) => {
        // Create negative transaction
        await tx.creditTransaction.create({
          data: {
            userId: user.id,
            amount: -creditsToDeduct,
            type: 'REFUND',
            description: `Reembolso Stripe - ${reason}`,
            metadata: JSON.stringify({ stripeEventId, amountRefunded, reason }),
          },
        });

        // Update balance
        await tx.userCredits.update({
          where: { userId: user.id },
          data: { balance: { decrement: creditsToDeduct } },
        });
      });

      return { 
        success: true, 
        action: 'CREDITS_DEDUCTED',
        creditsDeducted: creditsToDeduct,
        accountBlocked: false,
        recoveryCreated: false,
      };
    } else {
      // User doesn't have enough credits - block account and create recovery record
      await prisma.$transaction(async (tx) => {
        // Create recovery record
        await tx.refundRecovery.create({
          data: {
            userId: user.id,
            stripeEventId,
            creditsOwed: creditsToDeduct - userBalance,
            originalAmount: creditsToDeduct,
            notes: `User balance: ${userBalance}, Refund amount: ${creditsToDeduct}, Reason: ${reason}`,
          },
        });

        // Deduct whatever balance exists
        if (userBalance > 0) {
          await tx.creditTransaction.create({
            data: {
              userId: user.id,
              amount: -userBalance,
              type: 'REFUND',
              description: `Reembolso Stripe parcial - ${reason}`,
              metadata: JSON.stringify({ stripeEventId, amountRefunded, reason, partial: true }),
            },
          });

          await tx.userCredits.update({
            where: { userId: user.id },
            data: { balance: 0 },
          });
        }
      });

      return { 
        success: true, 
        action: 'ACCOUNT_BLOCKED',
        creditsDeducted: userBalance,
        accountBlocked: true,
        recoveryCreated: true,
      };
    }
  } catch (error) {
    console.error('Failed to handle Stripe refund:', error);
    return {
      success: false,
      action: 'ERROR',
      creditsDeducted: 0,
      accountBlocked: false,
      recoveryCreated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Worker helper: Auto-refund for pre-processing failures
 */
export async function autoRefundForJobFailure(
  jobId: string,
  userId: string,
  failureStage: 'PRE_PROCESS' | 'DURING_PROCESS' | 'POST_PROCESS',
  errorMessage: string
): Promise<RefundResult> {
  return createRefundRequest({
    userId,
    jobId,
    reason: `Falha automática: ${errorMessage}`,
    failureStage,
  });
}

/**
 * Get pending refund requests for admin
 */
export async function getPendingRefundRequests(limit = 50, offset = 0) {
  return prisma.refundRequest.findMany({
    where: { status: 'PENDING' },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Get all refund requests with filters
 */
export async function getRefundRequests(
  filters: { status?: string; userId?: string } = {},
  limit = 50,
  offset = 0
) {
  return prisma.refundRequest.findMany({
    where: filters,
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}
