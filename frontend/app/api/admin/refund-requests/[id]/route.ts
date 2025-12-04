/**
 * PUT /api/admin/refund-requests/[id]
 * Approve or reject a refund request
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentAdmin, logAdminAction } from '@/lib/admin-auth';

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, adminNotes } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Find the refund request
    const refundRequest = await prisma.refundRequest.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!refundRequest) {
      return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });
    }

    if (refundRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Refund request is not pending' },
        { status: 400 }
      );
    }

    const oldValue = { status: refundRequest.status };

    if (action === 'approve') {
      // Approve: return credits to user
      await prisma.$transaction(async (tx) => {
        // Update refund request
        await tx.refundRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            adminNotes,
            processedAt: new Date(),
            processedBy: admin.email
          }
        });

        // Return credits to user via UserCredits
        await tx.userCredits.upsert({
          where: { userId: refundRequest.userId },
          update: { balance: { increment: refundRequest.amount } },
          create: { userId: refundRequest.userId, balance: refundRequest.amount }
        });

        // Create credit transaction
        await tx.creditTransaction.create({
          data: {
            userId: refundRequest.userId,
            amount: refundRequest.amount,
            type: 'REFUND',
            description: `Refund approved: ${adminNotes || 'No notes'}`
          }
        });
      });

      await logAdminAction({
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'REFUND_APPROVE',
        entityType: 'RefundRequest',
        entityId: id,
        changes: { before: oldValue, after: { status: 'APPROVED', credits: refundRequest.amount } }
      });

      return NextResponse.json({
        success: true,
        message: `Refund approved. ${refundRequest.amount} credits returned to user.`
      });
    } else {
      // Reject: just update status
      await prisma.refundRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          adminNotes,
          processedAt: new Date(),
          processedBy: admin.email
        }
      });

      await logAdminAction({
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'REFUND_REJECT',
        entityType: 'RefundRequest',
        entityId: id,
        changes: { before: oldValue, after: { status: 'REJECTED' } }
      });

      return NextResponse.json({
        success: true,
        message: 'Refund request rejected.'
      });
    }
  } catch (error) {
    console.error('Error processing refund request:', error);
    return NextResponse.json(
      { error: 'Failed to process refund request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const refundRequest = await prisma.refundRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: { 
            id: true, 
            email: true, 
            name: true, 
            credits: true 
          }
        }
      }
    });

    if (!refundRequest) {
      return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });
    }

    return NextResponse.json({ request: refundRequest });
  } catch (error) {
    console.error('Error fetching refund request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch refund request' },
      { status: 500 }
    );
  }
}
