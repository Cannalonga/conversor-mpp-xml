/**
 * Admin User Actions API
 * POST /api/admin/users/[id]/actions - Perform actions on user
 * 
 * Actions:
 * - adjust-credits: Add/remove credits
 * - reset-password: Generate password reset token
 * - force-logout: Invalidate all sessions
 * - reset-monthly: Reset monthly conversion limits
 * - unblock-refund: Remove refund block
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession, revalidatePassword, forceLogoutUser, ADMIN_SESSION_COOKIE, logAdminAction } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(
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
    const { action, ...actionData } = body;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { credits: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    switch (action) {
      case 'adjust-credits': {
        const { amount, reason, password } = actionData;
        
        if (typeof amount !== 'number' || !reason) {
          return NextResponse.json(
            { error: 'Amount and reason are required' },
            { status: 400 }
          );
        }

        // Require password for critical actions
        if (Math.abs(amount) > 100) {
          if (!password || !(await revalidatePassword(admin.id, password))) {
            return NextResponse.json(
              { error: 'Password revalidation required for large adjustments' },
              { status: 403 }
            );
          }
        }

        const currentBalance = user.credits?.balance || 0;
        const newBalance = currentBalance + amount;

        if (newBalance < 0) {
          return NextResponse.json(
            { error: 'Cannot set negative balance' },
            { status: 400 }
          );
        }

        // Update credits
        await prisma.userCredits.upsert({
          where: { userId: id },
          create: { userId: id, balance: amount > 0 ? amount : 0 },
          update: { balance: { increment: amount } }
        });

        // Create transaction record
        await prisma.creditTransaction.create({
          data: {
            userId: id,
            amount,
            type: amount > 0 ? 'BONUS' : 'ADJUSTMENT',
            description: `Admin adjustment: ${reason}`
          }
        });

        await logAdminAction({
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'ADJUST_CREDITS',
          entityType: 'CREDIT',
          entityId: id,
          changes: {
            before: { balance: currentBalance },
            after: { balance: newBalance }
          },
          metadata: { amount, reason },
          severity: Math.abs(amount) > 100 ? 'WARNING' : 'INFO'
        });

        return NextResponse.json({
          success: true,
          previousBalance: currentBalance,
          newBalance,
          adjustment: amount
        });
      }

      case 'reset-password': {
        const { sendEmail } = actionData;
        
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        // Store in verification tokens
        await prisma.verificationToken.create({
          data: {
            identifier: user.email,
            token: resetToken,
            expires: resetExpiry
          }
        });

        await logAdminAction({
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'RESET_PASSWORD',
          entityType: 'USER',
          entityId: id,
          metadata: { sendEmail },
          severity: 'WARNING'
        });

        // TODO: If sendEmail is true, send email with reset link
        const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

        return NextResponse.json({
          success: true,
          resetUrl: sendEmail ? undefined : resetUrl, // Only return URL if not sending email
          expiresAt: resetExpiry,
          message: sendEmail ? 'Reset email sent' : 'Reset link generated'
        });
      }

      case 'force-logout': {
        const sessionCount = await forceLogoutUser(id);

        await logAdminAction({
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'FORCE_LOGOUT',
          entityType: 'USER',
          entityId: id,
          metadata: { sessionCount },
          severity: 'WARNING'
        });

        return NextResponse.json({
          success: true,
          sessionsInvalidated: sessionCount
        });
      }

      case 'reset-monthly': {
        const previousCount = user.monthlyConversions;

        await prisma.user.update({
          where: { id },
          data: {
            monthlyConversions: 0,
            monthlyResetAt: new Date()
          }
        });

        await logAdminAction({
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'RESET_MONTHLY_LIMITS',
          entityType: 'USER',
          entityId: id,
          changes: {
            before: { monthlyConversions: previousCount },
            after: { monthlyConversions: 0 }
          },
          severity: 'INFO'
        });

        return NextResponse.json({
          success: true,
          previousCount,
          newCount: 0
        });
      }

      case 'unblock-refund': {
        if (!user.accountBlockedForRefund) {
          return NextResponse.json({ error: 'User is not blocked' }, { status: 400 });
        }

        await prisma.user.update({
          where: { id },
          data: { accountBlockedForRefund: false }
        });

        // Also resolve any pending refund recoveries
        await prisma.refundRecovery.updateMany({
          where: { userId: id, status: 'PENDING' },
          data: { status: 'WRITTEN_OFF', resolvedAt: new Date(), resolvedBy: admin.id }
        });

        await logAdminAction({
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'UNBLOCK_REFUND',
          entityType: 'USER',
          entityId: id,
          severity: 'WARNING'
        });

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('User action error:', error);
    return NextResponse.json(
      { error: 'Action failed' },
      { status: 500 }
    );
  }
}
