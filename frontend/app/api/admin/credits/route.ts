/**
 * Admin Credits API
 * GET /api/admin/credits - List all credit transactions
 * POST /api/admin/credits - Create manual transaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession, ADMIN_SESSION_COOKIE, logAdminAction } from '@/lib/admin-auth';
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
    const type = searchParams.get('type');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    const format = searchParams.get('format'); // csv for export

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (type) where.type = type;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate);
    }
    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) (where.amount as Record<string, number>).gte = parseInt(minAmount);
      if (maxAmount) (where.amount as Record<string, number>).lte = parseInt(maxAmount);
    }

    const [transactions, total, stats] = await Promise.all([
      prisma.creditTransaction.findMany({
        where,
        skip: format === 'csv' ? 0 : skip,
        take: format === 'csv' ? undefined : limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, name: true }
          }
        }
      }),
      prisma.creditTransaction.count({ where }),
      // Aggregate stats
      prisma.creditTransaction.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
        _count: true
      })
    ]);

    // CSV export
    if (format === 'csv') {
      const csv = [
        'ID,User Email,Type,Amount,Description,Job ID,Created At',
        ...transactions.map(t => 
          `${t.id},${t.user.email},${t.type},${t.amount},"${t.description}",${t.jobId || ''},${t.createdAt.toISOString()}`
        )
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="credit-transactions-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        byType: Object.fromEntries(
          stats.map(s => [s.type, { count: s._count, sum: s._sum.amount }])
        )
      }
    });
  } catch (error) {
    console.error('List credits error:', error);
    return NextResponse.json(
      { error: 'Failed to list credit transactions' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await validateAdminSession(token);
    if (!admin) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const { userId, amount, type, description } = await req.json();

    if (!userId || amount === undefined || !type || !description) {
      return NextResponse.json(
        { error: 'userId, amount, type, and description are required' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['PURCHASE', 'CONVERSION', 'REFUND', 'BONUS', 'ADJUSTMENT'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user credits
    const updatedCredits = await prisma.userCredits.upsert({
      where: { userId },
      create: { userId, balance: amount > 0 ? amount : 0 },
      update: { balance: { increment: amount } }
    });

    // Create transaction
    const transaction = await prisma.creditTransaction.create({
      data: {
        userId,
        amount,
        type,
        description: `[ADMIN] ${description}`,
        metadata: JSON.stringify({ adminId: admin.id, adminEmail: admin.email })
      }
    });

    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'CREATE_TRANSACTION',
      entityType: 'CREDIT',
      entityId: transaction.id,
      metadata: { userId, amount, type, description },
      severity: Math.abs(amount) > 100 ? 'WARNING' : 'INFO'
    });

    return NextResponse.json({
      success: true,
      transaction,
      newBalance: updatedCredits.balance
    }, { status: 201 });
  } catch (error) {
    console.error('Create transaction error:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
