/**
 * Admin Users API
 * GET /api/admin/users - List users with pagination and filters
 * POST /api/admin/users - Create user (admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession, ADMIN_SESSION_COOKIE, logAdminAction } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const email = searchParams.get('email');
    const status = searchParams.get('status');
    const role = searchParams.get('role');
    const minCredits = searchParams.get('minCredits');
    const maxCredits = searchParams.get('maxCredits');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (email) {
      where.email = { contains: email };
    }
    if (status) {
      where.status = status;
    }
    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          accountBlockedForRefund: true,
          lastLoginAt: true,
          lastActivityAt: true,
          monthlyConversions: true,
          createdAt: true,
          credits: {
            select: { balance: true }
          },
          _count: {
            select: {
              creditTransactions: true,
              refundRequests: true,
              jobs: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    // Filter by credits if needed (post-query filter since it's a relation)
    let filteredUsers = users;
    if (minCredits || maxCredits) {
      filteredUsers = users.filter(u => {
        const balance = u.credits?.balance || 0;
        if (minCredits && balance < parseInt(minCredits)) return false;
        if (maxCredits && balance > parseInt(maxCredits)) return false;
        return true;
      });
    }

    return NextResponse.json({
      users: filteredUsers.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status,
        accountBlockedForRefund: u.accountBlockedForRefund,
        credits: u.credits?.balance || 0,
        lastLoginAt: u.lastLoginAt,
        lastActivityAt: u.lastActivityAt,
        monthlyConversions: u.monthlyConversions,
        createdAt: u.createdAt,
        stats: {
          transactions: u._count.creditTransactions,
          refunds: u._count.refundRequests,
          jobs: u._count.jobs
        }
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json(
      { error: 'Failed to list users' },
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

    // Only super admins can create users
    if (admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 });
    }

    const { email, name, password, role, credits } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role || 'USER',
        credits: {
          create: { balance: credits || 0 }
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'CREATE_USER',
      entityType: 'USER',
      entityId: user.id,
      changes: { after: { email, name, role } },
      severity: 'INFO'
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
