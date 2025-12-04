/**
 * Admin Dashboard Stats API
 * GET /api/admin/dashboard/stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession, ADMIN_SESSION_COOKIE } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Auth check
    const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value ||
                  req.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await validateAdminSession(token);
    if (!admin) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const _last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Parallel queries for performance
    const [
      totalUsers,
      activeUsers24h,
      activeUsers7d,
      totalJobs,
      jobsLast24h,
      completedJobs,
      failedJobs,
      jobsByConverter,
      totalCreditsBalance,
      creditsPurchased,
      creditsUsed,
      pendingRefunds,
      criticalAlerts,
      recentFailures
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active users last 24h
      prisma.user.count({
        where: { lastActivityAt: { gte: last24h } }
      }),
      
      // Active users last 7 days
      prisma.user.count({
        where: { lastActivityAt: { gte: last7d } }
      }),
      
      // Total jobs
      prisma.job.count(),
      
      // Jobs last 24h
      prisma.job.count({
        where: { createdAt: { gte: last24h } }
      }),
      
      // Completed jobs
      prisma.job.count({
        where: { status: 'completed' }
      }),
      
      // Failed jobs
      prisma.job.count({
        where: { status: 'failed' }
      }),
      
      // Jobs by converter type
      prisma.job.groupBy({
        by: ['converterId'],
        _count: true,
        orderBy: { _count: { converterId: 'desc' } },
        take: 10
      }),
      
      // Total credits balance across all users
      prisma.userCredits.aggregate({
        _sum: { balance: true }
      }),
      
      // Total credits purchased (Stripe)
      prisma.creditTransaction.aggregate({
        where: { type: 'PURCHASE' },
        _sum: { amount: true }
      }),
      
      // Total credits used
      prisma.creditTransaction.aggregate({
        where: { type: 'CONVERSION', amount: { lt: 0 } },
        _sum: { amount: true }
      }),
      
      // Pending refund requests
      prisma.refundRequest.count({
        where: { status: 'PENDING' }
      }),
      
      // Critical alerts (last 24h)
      prisma.alertDeliveryLog.count({
        where: {
          severity: 'critical',
          createdAt: { gte: last24h }
        }
      }),
      
      // Recent failures (last 5)
      prisma.job.findMany({
        where: { status: 'failed' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          converterId: true,
          error: true,
          createdAt: true,
          user: { select: { email: true } }
        }
      })
    ]);

    // Get hourly activity for heatmap (last 7 days)
    const hourlyActivity = await getHourlyActivity();

    // Get last 5 critical alerts
    const recentAlerts = await prisma.alertDeliveryLog.findMany({
      where: { severity: { in: ['critical', 'high'] } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        alertname: true,
        severity: true,
        service: true,
        summary: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      users: {
        total: totalUsers,
        active24h: activeUsers24h,
        active7d: activeUsers7d
      },
      jobs: {
        total: totalJobs,
        last24h: jobsLast24h,
        completed: completedJobs,
        failed: failedJobs,
        byConverter: jobsByConverter.map(j => ({
          converter: j.converterId,
          count: j._count
        }))
      },
      credits: {
        totalBalance: totalCreditsBalance._sum.balance || 0,
        purchased: creditsPurchased._sum.amount || 0,
        used: Math.abs(creditsUsed._sum.amount || 0)
      },
      refunds: {
        pending: pendingRefunds
      },
      alerts: {
        critical24h: criticalAlerts,
        recent: recentAlerts
      },
      recentFailures,
      hourlyActivity,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}

async function getHourlyActivity(): Promise<{ hour: number; day: number; count: number }[]> {
  const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  // SQLite doesn't have great date functions, so we'll process in JS
  const jobs = await prisma.job.findMany({
    where: { createdAt: { gte: last7d } },
    select: { createdAt: true }
  });

  const heatmap: Record<string, number> = {};
  
  jobs.forEach(job => {
    const date = new Date(job.createdAt);
    const day = date.getDay(); // 0-6
    const hour = date.getHours(); // 0-23
    const key = `${day}-${hour}`;
    heatmap[key] = (heatmap[key] || 0) + 1;
  });

  const result: { hour: number; day: number; count: number }[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      result.push({
        day,
        hour,
        count: heatmap[`${day}-${hour}`] || 0
      });
    }
  }

  return result;
}
