/**
 * Admin Jobs API
 * GET /api/admin/jobs - List all jobs with filters
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
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const converterId = searchParams.get('converterId');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (status) where.status = status;
    if (converterId) where.converterId = converterId;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate);
    }

    const [jobs, total, stats] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: { id: true, email: true, name: true }
          }
        }
      }),
      prisma.job.count({ where }),
      // Get stats for the filtered jobs
      prisma.job.groupBy({
        by: ['status'],
        where,
        _count: true
      })
    ]);

    // Calculate processing times for completed jobs
    const jobsWithProcessingTime = jobs.map(job => {
      let processingTime = null;
      if (job.startedAt && job.finishedAt) {
        processingTime = new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime();
      }
      
      return {
        ...job,
        processingTime
      };
    });

    return NextResponse.json({
      jobs: jobsWithProcessingTime,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        byStatus: Object.fromEntries(
          stats.map(s => [s.status, s._count])
        )
      }
    });
  } catch (error) {
    console.error('List jobs error:', error);
    return NextResponse.json(
      { error: 'Failed to list jobs' },
      { status: 500 }
    );
  }
}
