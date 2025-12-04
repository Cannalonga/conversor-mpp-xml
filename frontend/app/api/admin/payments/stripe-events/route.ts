/**
 * Admin Stripe Events API
 * GET /api/admin/payments/stripe-events - List Stripe events
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession, ADMIN_SESSION_COOKIE } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value ||
                  req.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await validateAdminSession(token);
    if (!admin) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const eventType = searchParams.get('eventType');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (eventType) where.eventType = eventType;
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate);
    }

    const [events, total, eventTypes, stats] = await Promise.all([
      prisma.stripeEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.stripeEvent.count({ where }),
      // Get distinct event types for filter
      prisma.stripeEvent.findMany({
        select: { eventType: true },
        distinct: ['eventType']
      }),
      // Aggregate stats
      prisma.stripeEvent.groupBy({
        by: ['status'],
        where,
        _count: true,
        _sum: { amountPaid: true, creditsAdded: true }
      })
    ]);

    // Check for suspicious events (duplicates, inconsistencies)
    const suspiciousEvents = await findSuspiciousEvents();

    // Match Stripe events to credit transactions
    const eventsWithMatches = await Promise.all(
      events.map(async (event) => {
        const matchingTransaction = await prisma.creditTransaction.findFirst({
          where: { stripeEventId: event.id }
        });
        return {
          ...event,
          matchedTransaction: matchingTransaction ? {
            id: matchingTransaction.id,
            amount: matchingTransaction.amount,
            type: matchingTransaction.type
          } : null,
          isSuspicious: suspiciousEvents.some(s => s.id === event.id)
        };
      })
    );

    return NextResponse.json({
      events: eventsWithMatches,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      eventTypes: eventTypes.map(e => e.eventType),
      stats: {
        byStatus: Object.fromEntries(
          stats.map(s => [s.status, {
            count: s._count,
            amountPaid: s._sum.amountPaid,
            creditsAdded: s._sum.creditsAdded
          }])
        )
      },
      suspiciousCount: suspiciousEvents.length
    });
  } catch (error) {
    console.error('List Stripe events error:', error);
    return NextResponse.json(
      { error: 'Failed to list Stripe events' },
      { status: 500 }
    );
  }
}

async function findSuspiciousEvents(): Promise<{ id: string; reason: string }[]> {
  const suspicious: { id: string; reason: string }[] = [];

  // Find events without matching credit transactions (for completed purchases)
  const unmatchedPurchases = await prisma.stripeEvent.findMany({
    where: {
      eventType: 'checkout.session.completed',
      status: 'processed'
    },
    select: { id: true, stripeEventId: true }
  });

  for (const event of unmatchedPurchases) {
    const hasTransaction = await prisma.creditTransaction.findFirst({
      where: { stripeEventId: event.id }
    });
    if (!hasTransaction) {
      suspicious.push({
        id: event.id,
        reason: 'Processed checkout without matching credit transaction'
      });
    }
  }

  // Find duplicate session IDs
  const duplicateSessions = await prisma.$queryRaw`
    SELECT stripeSessionId, COUNT(*) as count 
    FROM StripeEvent 
    WHERE stripeSessionId IS NOT NULL 
    GROUP BY stripeSessionId 
    HAVING COUNT(*) > 1
  ` as { stripeSessionId: string; count: number }[];

  for (const dup of duplicateSessions) {
    const events = await prisma.stripeEvent.findMany({
      where: { stripeSessionId: dup.stripeSessionId }
    });
    events.forEach(e => {
      suspicious.push({
        id: e.id,
        reason: `Duplicate session ID (${dup.count} occurrences)`
      });
    });
  }

  return suspicious;
}
