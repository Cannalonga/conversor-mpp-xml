/**
 * Admin Authentication System
 * Separate auth layer for admin panel access
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface AdminSession {
  id: string;
  adminId: string;
  token: string;
  expiresAt: Date;
}

/**
 * Authenticate admin with email/password or ADMIN_PASSWORD
 */
export async function authenticateAdmin(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; session?: AdminSession; error?: string }> {
  // Check for super admin password first
  const superAdminPassword = process.env.ADMIN_PASSWORD;
  if (superAdminPassword && password === superAdminPassword) {
    // Super admin login - check if user exists with admin email
    let adminUser = await prisma.user.findFirst({
      where: { email, role: { in: ['ADMIN', 'SUPER_ADMIN'] } }
    });

    if (!adminUser) {
      // Check if any admin email matches
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@cannaconvert.com';
      if (email === adminEmail) {
        // Create super admin user if doesn't exist
        adminUser = await prisma.user.upsert({
          where: { email: adminEmail },
          update: { role: 'SUPER_ADMIN' },
          create: {
            email: adminEmail,
            name: 'Super Admin',
            role: 'SUPER_ADMIN',
            password: await bcrypt.hash(superAdminPassword, 12)
          }
        });
      } else {
        return { success: false, error: 'Invalid credentials' };
      }
    }

    return createAdminSession(adminUser.id, ipAddress, userAgent);
  }

  // Regular admin login
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    return { success: false, error: 'Invalid credentials' };
  }

  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Access denied. Admin privileges required.' };
  }

  if (user.status !== 'ACTIVE') {
    return { success: false, error: 'Account is suspended or banned' };
  }

  if (!user.password) {
    return { success: false, error: 'Password not set' };
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return { success: false, error: 'Invalid credentials' };
  }

  return createAdminSession(user.id, ipAddress, userAgent);
}

/**
 * Create a new admin session
 */
async function createAdminSession(
  adminId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; session: AdminSession }> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  const session = await prisma.adminSession.create({
    data: {
      adminId,
      token,
      ipAddress,
      userAgent,
      expiresAt
    }
  });

  // Update user's last login
  await prisma.user.update({
    where: { id: adminId },
    data: { lastLoginAt: new Date() }
  });

  return { success: true, session };
}

/**
 * Validate admin session from token
 */
export async function validateAdminSession(token: string): Promise<AdminUser | null> {
  if (!token) return null;

  const session = await prisma.adminSession.findUnique({
    where: { token }
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    // Session expired, delete it
    await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // Update last activity
  await prisma.adminSession.update({
    where: { id: session.id },
    data: { lastActivity: new Date() }
  });

  // Get admin user
  const user = await prisma.user.findUnique({
    where: { id: session.adminId },
    select: { id: true, email: true, name: true, role: true, status: true }
  });

  if (!user || user.status !== 'ACTIVE') return null;
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return null;

  return user;
}

/**
 * Get current admin from cookies (for server components) or from request (for API routes)
 */
export async function getCurrentAdmin(request?: NextRequest): Promise<AdminUser | null> {
  let token: string | undefined;
  
  if (request) {
    // API route: get token from cookies in request
    token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value ||
            request.headers.get('Authorization')?.replace('Bearer ', '');
  } else {
    // Server component: use cookies()
    const cookieStore = await cookies();
    token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  }
  
  if (!token) return null;
  return validateAdminSession(token);
}

/**
 * Logout admin - delete session
 */
export async function logoutAdmin(token: string): Promise<void> {
  await prisma.adminSession.deleteMany({
    where: { token }
  });
}

/**
 * Log admin action to audit log
 */
export async function logAdminAction(params: {
  adminId: string;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: { before?: unknown; after?: unknown };
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      changes: params.changes ? JSON.stringify(params.changes) : null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      severity: params.severity || 'INFO'
    }
  });
}

/**
 * Middleware wrapper for admin API routes
 */
export function withAdminAuth(
  handler: (req: NextRequest, admin: AdminUser) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value ||
                  req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const admin = await validateAdminSession(token);
    if (!admin) {
      return NextResponse.json(
        { error: 'Session expired or invalid' },
        { status: 401 }
      );
    }

    return handler(req, admin);
  };
}

/**
 * Require password revalidation for critical actions
 */
export async function revalidatePassword(
  adminId: string,
  password: string
): Promise<boolean> {
  // Check super admin password
  const superAdminPassword = process.env.ADMIN_PASSWORD;
  if (superAdminPassword && password === superAdminPassword) {
    return true;
  }

  // Check user password
  const user = await prisma.user.findUnique({
    where: { id: adminId },
    select: { password: true }
  });

  if (!user?.password) return false;
  return bcrypt.compare(password, user.password);
}

/**
 * Force logout all sessions for a user
 */
export async function forceLogoutUser(userId: string): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: { userId }
  });
  return result.count;
}

/**
 * Force logout admin sessions
 */
export async function forceLogoutAdmin(adminId: string): Promise<number> {
  const result = await prisma.adminSession.deleteMany({
    where: { adminId }
  });
  return result.count;
}

export { ADMIN_SESSION_COOKIE };
