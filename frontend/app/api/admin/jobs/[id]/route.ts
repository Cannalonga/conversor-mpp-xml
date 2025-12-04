/**
 * Admin Job Detail API
 * GET /api/admin/jobs/[id] - Get job details
 * PATCH /api/admin/jobs/[id] - Update job (reprocess, force fail, etc.)
 * DELETE /api/admin/jobs/[id] - Delete job
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession, ADMIN_SESSION_COOKIE, logAdminAction } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        }
      }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get related credit transaction
    const creditTransaction = await prisma.creditTransaction.findFirst({
      where: { jobId: id }
    });

    // Get related refund request if any
    const refundRequest = await prisma.refundRequest.findFirst({
      where: { jobId: id }
    });

    // Calculate processing time
    let processingTime = null;
    if (job.startedAt && job.finishedAt) {
      processingTime = new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime();
    }

    // Parse metadata
    let metadata = null;
    if (job.metadata) {
      try {
        metadata = JSON.parse(job.metadata);
      } catch {
        metadata = job.metadata;
      }
    }

    return NextResponse.json({
      job: {
        ...job,
        processingTime,
        parsedMetadata: metadata
      },
      creditTransaction,
      refundRequest
    });
  } catch (error) {
    console.error('Get job error:', error);
    return NextResponse.json(
      { error: 'Failed to get job details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await validateAdminSession(token);
    if (!admin) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    switch (action) {
      case 'reprocess': {
        // Reset job to queued status for reprocessing
        const updatedJob = await prisma.job.update({
          where: { id },
          data: {
            status: 'queued',
            progress: 0,
            error: null,
            startedAt: null,
            finishedAt: null,
            attempts: { increment: 1 }
          }
        });

        await logAdminAction({
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'REPROCESS_JOB',
          entityType: 'JOB',
          entityId: id,
          changes: {
            before: { status: job.status },
            after: { status: 'queued' }
          },
          severity: 'INFO'
        });

        // TODO: Add job back to queue (call backend API)

        return NextResponse.json({
          success: true,
          job: updatedJob,
          message: 'Job queued for reprocessing'
        });
      }

      case 'force-fail': {
        const { reason } = body;
        
        const updatedJob = await prisma.job.update({
          where: { id },
          data: {
            status: 'failed',
            error: reason || 'Manually failed by admin',
            finishedAt: new Date()
          }
        });

        await logAdminAction({
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'FORCE_FAIL_JOB',
          entityType: 'JOB',
          entityId: id,
          changes: {
            before: { status: job.status },
            after: { status: 'failed', error: reason }
          },
          severity: 'WARNING'
        });

        return NextResponse.json({
          success: true,
          job: updatedJob
        });
      }

      case 'refund': {
        // Create refund for this job
        if (job.status !== 'failed') {
          return NextResponse.json(
            { error: 'Can only refund failed jobs' },
            { status: 400 }
          );
        }

        // Check if already refunded
        const existingRefund = await prisma.refundRequest.findFirst({
          where: { jobId: id, status: { in: ['APPROVED', 'AUTO_APPROVED'] } }
        });

        if (existingRefund) {
          return NextResponse.json(
            { error: 'Job already refunded' },
            { status: 400 }
          );
        }

        // Create refund request and approve it
        const refund = await prisma.refundRequest.create({
          data: {
            userId: job.userId,
            jobId: id,
            amount: job.cost,
            reason: 'Admin-initiated refund',
            status: 'APPROVED',
            autoRefund: false,
            adminNotes: `Refunded by ${admin.email}`,
            processedAt: new Date(),
            processedBy: admin.id
          }
        });

        // Add credits back
        await prisma.userCredits.upsert({
          where: { userId: job.userId },
          create: { userId: job.userId, balance: job.cost },
          update: { balance: { increment: job.cost } }
        });

        // Create credit transaction
        await prisma.creditTransaction.create({
          data: {
            userId: job.userId,
            amount: job.cost,
            type: 'REFUND',
            description: `Refund for failed job ${id}`,
            jobId: id
          }
        });

        await logAdminAction({
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'REFUND_JOB',
          entityType: 'JOB',
          entityId: id,
          metadata: { refundId: refund.id, amount: job.cost },
          severity: 'INFO'
        });

        return NextResponse.json({
          success: true,
          refund,
          creditsRefunded: job.cost
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Update job error:', error);
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await validateAdminSession(token);
    if (!admin) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const { id } = await params;

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Don't delete processing jobs
    if (job.status === 'processing') {
      return NextResponse.json(
        { error: 'Cannot delete job while processing' },
        { status: 400 }
      );
    }

    await prisma.job.delete({ where: { id } });

    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'DELETE_JOB',
      entityType: 'JOB',
      entityId: id,
      changes: { before: job },
      severity: 'WARNING'
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete job error:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}
