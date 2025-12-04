/**
 * Admin User Detail API
 * GET /api/admin/users/[id] - Get user details
 * PATCH /api/admin/users/[id] - Update user
 * DELETE /api/admin/users/[id] - Delete user
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

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        credits: true,
        creditTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        refundRequests: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        refundRecoveries: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get Stripe events related to this user
    const stripeEvents = await prisma.stripeEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Get alerts related to this user
    const alerts = await prisma.alertDeliveryLog.findMany({
      where: {
        OR: [
          { payload: { contains: user.email } },
          { payload: { contains: user.id } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Calculate stats
    const stats = {
      totalTransactions: await prisma.creditTransaction.count({ where: { userId: id } }),
      totalJobs: await prisma.job.count({ where: { userId: id } }),
      completedJobs: await prisma.job.count({ where: { userId: id, status: 'completed' } }),
      failedJobs: await prisma.job.count({ where: { userId: id, status: 'failed' } }),
      totalPurchased: await prisma.creditTransaction.aggregate({
        where: { userId: id, type: 'PURCHASE' },
        _sum: { amount: true }
      }),
      totalUsed: await prisma.creditTransaction.aggregate({
        where: { userId: id, type: 'CONVERSION' },
        _sum: { amount: true }
      }),
      totalRefunded: await prisma.creditTransaction.aggregate({
        where: { userId: id, type: 'REFUND' },
        _sum: { amount: true }
      })
    };

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        accountBlockedForRefund: user.accountBlockedForRefund,
        lastLoginAt: user.lastLoginAt,
        lastActivityAt: user.lastActivityAt,
        monthlyConversions: user.monthlyConversions,
        monthlyResetAt: user.monthlyResetAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      credits: user.credits,
      transactions: user.creditTransactions,
      jobs: user.jobs,
      refundRequests: user.refundRequests,
      refundRecoveries: user.refundRecoveries,
      stripeEvents,
      alerts,
      stats: {
        totalTransactions: stats.totalTransactions,
        totalJobs: stats.totalJobs,
        completedJobs: stats.completedJobs,
        failedJobs: stats.failedJobs,
        totalPurchased: stats.totalPurchased._sum.amount || 0,
        totalUsed: Math.abs(stats.totalUsed._sum.amount || 0),
        totalRefunded: stats.totalRefunded._sum.amount || 0
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user details' },
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

    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        accountBlockedForRefund: true
      }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.accountBlockedForRefund !== undefined) {
      updateData.accountBlockedForRefund = body.accountBlockedForRefund;
    }
    if (body.monthlyConversions !== undefined) {
      updateData.monthlyConversions = body.monthlyConversions;
    }

    // Role changes require SUPER_ADMIN
    if (body.role !== undefined && body.role !== currentUser.role) {
      if (admin.role !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Only super admins can change user roles' },
          { status: 403 }
        );
      }
      updateData.role = body.role;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        accountBlockedForRefund: true,
        monthlyConversions: true
      }
    });

    // Log action
    const action = body.status === 'SUSPENDED' ? 'SUSPEND_USER' :
                   body.status === 'BANNED' ? 'BAN_USER' :
                   'UPDATE_USER';
    
    const severity = (body.status === 'BANNED' || body.role === 'ADMIN' || body.role === 'SUPER_ADMIN') 
                      ? 'CRITICAL' : 'INFO';

    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action,
      entityType: 'USER',
      entityId: id,
      changes: { before: currentUser, after: updatedUser },
      severity
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
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

    // Only super admins can delete users
    if (admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only super admins can delete users' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting other super admins
    if (user.role === 'SUPER_ADMIN' && user.id !== admin.id) {
      return NextResponse.json(
        { error: 'Cannot delete other super admins' },
        { status: 403 }
      );
    }

    await prisma.user.delete({ where: { id } });

    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'DELETE_USER',
      entityType: 'USER',
      entityId: id,
      changes: { before: user },
      severity: 'CRITICAL'
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
