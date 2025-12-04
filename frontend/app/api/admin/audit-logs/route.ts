/**
 * Admin Audit Logs API
 * GET /api/admin/audit-logs - List audit logs
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
    const adminId = searchParams.get('adminId');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const severity = searchParams.get('severity');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (adminId) where.adminId = adminId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (severity) where.severity = severity;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate);
    }

    const [logs, total, stats] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
        orderBy: { _count: { action: 'desc' } },
        take: 10
      })
    ]);

    // Get distinct values for filters
    const [actions, entityTypes, admins] = await Promise.all([
      prisma.auditLog.findMany({
        select: { action: true },
        distinct: ['action']
      }),
      prisma.auditLog.findMany({
        select: { entityType: true },
        distinct: ['entityType']
      }),
      prisma.auditLog.findMany({
        select: { adminId: true, adminEmail: true },
        distinct: ['adminId']
      })
    ]);

    return NextResponse.json({
      logs: logs.map(log => ({
        ...log,
        changes: log.changes ? JSON.parse(log.changes) : null,
        metadata: log.metadata ? JSON.parse(log.metadata) : null
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        actions: actions.map(a => a.action),
        entityTypes: entityTypes.map(e => e.entityType),
        admins: admins.map(a => ({ id: a.adminId, email: a.adminEmail }))
      },
      stats: {
        topActions: stats.map(s => ({ action: s.action, count: s._count }))
      }
    });
  } catch (error) {
    console.error('List audit logs error:', error);
    return NextResponse.json(
      { error: 'Failed to list audit logs' },
      { status: 500 }
    );
  }
}
