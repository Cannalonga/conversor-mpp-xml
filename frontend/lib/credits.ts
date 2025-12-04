import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import prisma from './prisma';

/**
 * Get or create user credits
 */
export async function getUserCredits(userId: string) {
  // First check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  let credits = await prisma.userCredits.findUnique({
    where: { userId },
  });

  // Create credits record if doesn't exist (new user gets 10 free credits)
  if (!credits) {
    credits = await prisma.userCredits.create({
      data: {
        userId,
        balance: 10, // Welcome bonus
      },
    });

    // Record welcome bonus transaction
    await prisma.creditTransaction.create({
      data: {
        userId,
        amount: 10,
        type: 'BONUS',
        description: 'Bônus de boas-vindas',
      },
    });
  }

  return credits;
}

/**
 * Check if user has enough credits
 */
export async function hasEnoughCredits(userId: string, cost: number): Promise<boolean> {
  const credits = await getUserCredits(userId);
  return credits.balance >= cost;
}

/**
 * Deduct credits from user
 */
export async function deductCredits(
  userId: string, 
  amount: number, 
  description: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const credits = await getUserCredits(userId);

  if (credits.balance < amount) {
    return { 
      success: false, 
      newBalance: credits.balance, 
      error: 'INSUFFICIENT_CREDITS' 
    };
  }

  // Update balance
  const updated = await prisma.userCredits.update({
    where: { userId },
    data: { balance: credits.balance - amount },
  });

  // Create transaction
  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: -amount,
      type: 'CONVERSION',
      description,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });

  return { success: true, newBalance: updated.balance };
}

/**
 * Add credits to user (atomic transaction)
 */
export async function addCredits(
  userId: string, 
  amount: number, 
  type: 'PURCHASE' | 'REFUND' | 'BONUS',
  description: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; newBalance: number }> {
  // Use atomic transaction to ensure consistency
  const result = await prisma.$transaction(async (tx) => {
    // Get or create user credits
    let credits = await tx.userCredits.findUnique({
      where: { userId },
    });

    if (!credits) {
      // Create new credits record with welcome bonus + amount
      credits = await tx.userCredits.create({
        data: {
          userId,
          balance: 10 + amount,
        },
      });

      // Record welcome bonus
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: 10,
          type: 'BONUS',
          description: 'Bônus de boas-vindas',
        },
      });
    } else {
      // Update existing balance atomically
      credits = await tx.userCredits.update({
        where: { userId },
        data: { balance: { increment: amount } },
      });
    }

    // Create transaction record
    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        type,
        description,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return credits.balance;
  });

  return { success: true, newBalance: result };
}

/**
 * Get user's transaction history
 */
export async function getTransactionHistory(
  userId: string, 
  limit = 50, 
  offset = 0
) {
  return prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Helper to get authenticated user ID from request
 */
export async function getAuthUserId(request: NextRequest): Promise<string | null> {
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });
  return token?.id as string | null;
}

/**
 * API response helpers
 */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function apiError(message: string, code: string, status = 400) {
  return NextResponse.json({ success: false, error: code, message }, { status });
}
