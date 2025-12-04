/**
 * Admin Monitoring API
 * GET /api/admin/monitoring - Get system monitoring data
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

    const now = new Date();
    const last1h = new Date(now.getTime() - 60 * 60 * 1000);
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Parallel queries for monitoring data
    const [
      // Job queue stats
      queuedJobs,
      processingJobs,
      completedLast1h,
      failedLast1h,
      
      // Job timing stats
      recentCompletedJobs,
      
      // Converter stats
      converterStats,
      
      // Alert stats
      alertsLast24h,
      criticalAlerts,
      
      // System health indicators
      failedJobsLast24h,
      
      // Active sessions
      activeSessions
    ] = await Promise.all([
      prisma.job.count({ where: { status: 'queued' } }),
      prisma.job.count({ where: { status: 'processing' } }),
      prisma.job.count({ where: { status: 'completed', finishedAt: { gte: last1h } } }),
      prisma.job.count({ where: { status: 'failed', finishedAt: { gte: last1h } } }),
      
      // Get recent completed jobs for timing analysis
      prisma.job.findMany({
        where: {
          status: 'completed',
          startedAt: { not: null },
          finishedAt: { not: null, gte: last24h }
        },
        select: {
          id: true,
          converterId: true,
          startedAt: true,
          finishedAt: true,
          inputSize: true
        },
        take: 100
      }),
      
      // Jobs per converter last 24h
      prisma.job.groupBy({
        by: ['converterId', 'status'],
        where: { createdAt: { gte: last24h } },
        _count: true
      }),
      
      // Alerts last 24h
      prisma.alertDeliveryLog.count({
        where: { createdAt: { gte: last24h } }
      }),
      
      // Critical alerts count
      prisma.alertDeliveryLog.count({
        where: { severity: 'critical', createdAt: { gte: last24h } }
      }),
      
      // Failed jobs for error rate
      prisma.job.count({
        where: { status: 'failed', createdAt: { gte: last24h } }
      }),
      
      // Active admin sessions
      prisma.adminSession.count({
        where: { expiresAt: { gt: now } }
      })
    ]);

    // Calculate processing time statistics
    const processingTimes = recentCompletedJobs
      .filter(j => j.startedAt && j.finishedAt)
      .map(j => new Date(j.finishedAt!).getTime() - new Date(j.startedAt!).getTime());
    
    const avgProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
      : 0;
    
    const p95ProcessingTime = processingTimes.length > 0
      ? processingTimes.sort((a, b) => a - b)[Math.floor(processingTimes.length * 0.95)]
      : 0;

    // Calculate jobs per minute (last hour)
    const jobsPerMinute = completedLast1h / 60;

    // Build converter breakdown
    const converterBreakdown: Record<string, { completed: number; failed: number; queued: number }> = {};
    converterStats.forEach(stat => {
      if (!converterBreakdown[stat.converterId]) {
        converterBreakdown[stat.converterId] = { completed: 0, failed: 0, queued: 0 };
      }
      if (stat.status === 'completed') converterBreakdown[stat.converterId].completed = stat._count;
      if (stat.status === 'failed') converterBreakdown[stat.converterId].failed = stat._count;
      if (stat.status === 'queued') converterBreakdown[stat.converterId].queued = stat._count;
    });

    // Try to get Prometheus metrics (if available)
    let prometheusMetrics = null;
    try {
      const prometheusUrl = process.env.PROMETHEUS_URL || 'http://localhost:9090';
      const metricsResponse = await fetch(`${prometheusUrl}/api/v1/query?query=up`, {
        signal: AbortSignal.timeout(2000)
      });
      if (metricsResponse.ok) {
        prometheusMetrics = await metricsResponse.json();
      }
    } catch {
      // Prometheus not available
    }

    // Calculate health scores
    const totalJobsLast24h = completedLast1h * 24 + failedJobsLast24h;
    const successRate = totalJobsLast24h > 0 
      ? ((totalJobsLast24h - failedJobsLast24h) / totalJobsLast24h) * 100 
      : 100;

    const healthScore = Math.min(100, Math.max(0,
      (successRate * 0.4) +
      (queuedJobs < 10 ? 30 : queuedJobs < 50 ? 20 : 10) +
      (criticalAlerts === 0 ? 30 : criticalAlerts < 3 ? 15 : 0)
    ));

    return NextResponse.json({
      queue: {
        queued: queuedJobs,
        processing: processingJobs,
        completedLastHour: completedLast1h,
        failedLastHour: failedLast1h,
        jobsPerMinute: Math.round(jobsPerMinute * 100) / 100
      },
      performance: {
        avgProcessingTimeMs: Math.round(avgProcessingTime),
        p95ProcessingTimeMs: Math.round(p95ProcessingTime),
        avgProcessingTimeSec: Math.round(avgProcessingTime / 1000 * 10) / 10,
        p95ProcessingTimeSec: Math.round(p95ProcessingTime / 1000 * 10) / 10
      },
      converters: converterBreakdown,
      alerts: {
        last24h: alertsLast24h,
        critical: criticalAlerts
      },
      health: {
        score: Math.round(healthScore),
        successRate: Math.round(successRate * 10) / 10,
        status: healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'degraded' : 'unhealthy'
      },
      sessions: {
        activeAdmin: activeSessions
      },
      prometheus: prometheusMetrics ? {
        available: true,
        targets: prometheusMetrics.data?.result?.length || 0
      } : {
        available: false
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Monitoring error:', error);
    return NextResponse.json(
      { error: 'Failed to get monitoring data' },
      { status: 500 }
    );
  }
}
