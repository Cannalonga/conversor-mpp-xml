/**
 * GET /api/admin/refund-requests
 * List all refund requests (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession, ADMIN_SESSION_COOKIE } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Check new admin auth system
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value ||
                  request.headers.get('Authorization')?.replace('Bearer ', '');
    
    // Fallback to legacy auth for backwards compatibility
    const legacyAuth = request.headers.get('x-admin-password');
    const legacyValid = legacyAuth === process.env.ADMIN_PASSWORD;
    
    if (!token && !legacyValid) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Admin access required' },
        { status: 401 }
      );
    }

    if (token) {
      const admin = await validateAdminSession(token);
      if (!admin) {
        return NextResponse.json(
          { success: false, error: 'SESSION_EXPIRED' },
          { status: 401 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const format = searchParams.get('format');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [requests, total, stats] = await Promise.all([
      prisma.refundRequest.findMany({
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
      prisma.refundRequest.count({ where }),
      prisma.refundRequest.groupBy({
        by: ['status'],
        _count: true,
        _sum: { amount: true }
      })
    ]);

    // Get refund recoveries
    const recoveries = await prisma.refundRecovery.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: {
          select: { id: true, email: true }
        }
      }
    });

    // CSV export
    if (format === 'csv') {
      const csv = [
        'ID,User Email,Amount,Reason,Status,Auto Refund,Created At,Processed At,Processed By',
        ...requests.map(r => 
          `${r.id},${r.user.email},${r.amount},"${r.reason}",${r.status},${r.autoRefund},${r.createdAt.toISOString()},${r.processedAt?.toISOString() || ''},${r.processedBy || ''}`
        )
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="refund-requests-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json({
      success: true,
      requests,
      recoveries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        byStatus: Object.fromEntries(
          stats.map(s => [s.status, { count: s._count, amount: s._sum.amount }])
        )
      }
    });
  } catch (error) {
    console.error('Error listing refund requests:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
