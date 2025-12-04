/**
 * Admin System Configuration API
 * GET /api/admin/config - Get all configurations
 * PUT /api/admin/config - Update configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession, ADMIN_SESSION_COOKIE, logAdminAction } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

// Default configurations
const DEFAULT_CONFIGS = [
  // Features
  { key: 'AUTO_REFUND', value: 'true', type: 'BOOLEAN', category: 'FEATURES', description: 'Enable automatic refunds for failed jobs' },
  { key: 'DEMO_CREDITS', value: '5', type: 'NUMBER', category: 'FEATURES', description: 'Credits given to new users' },
  { key: 'STRIPE_ENABLED', value: 'true', type: 'BOOLEAN', category: 'FEATURES', description: 'Enable Stripe payments' },
  { key: 'OBSERVABILITY_ENABLED', value: 'true', type: 'BOOLEAN', category: 'FEATURES', description: 'Enable Prometheus metrics' },
  
  // Limits
  { key: 'FREE_MONTHLY_CONVERSIONS', value: '3', type: 'NUMBER', category: 'LIMITS', description: 'Free conversions per month' },
  { key: 'MAX_FILE_SIZE_MB', value: '100', type: 'NUMBER', category: 'LIMITS', description: 'Maximum upload file size in MB' },
  { key: 'MAX_CONCURRENT_JOBS', value: '5', type: 'NUMBER', category: 'LIMITS', description: 'Max concurrent jobs per user' },
  { key: 'JOB_TIMEOUT_SECONDS', value: '300', type: 'NUMBER', category: 'LIMITS', description: 'Job processing timeout' },
  
  // Billing
  { key: 'CREDIT_PRICE_CENTS', value: '10', type: 'NUMBER', category: 'BILLING', description: 'Price per credit in cents' },
  { key: 'MIN_PURCHASE_CREDITS', value: '10', type: 'NUMBER', category: 'BILLING', description: 'Minimum credits to purchase' },
  { key: 'MAX_PURCHASE_CREDITS', value: '1000', type: 'NUMBER', category: 'BILLING', description: 'Maximum credits to purchase' },
  
  // Security
  { key: 'SESSION_DURATION_HOURS', value: '24', type: 'NUMBER', category: 'SECURITY', description: 'User session duration' },
  { key: 'ADMIN_SESSION_HOURS', value: '8', type: 'NUMBER', category: 'SECURITY', description: 'Admin session duration' },
  { key: 'RATE_LIMIT_REQUESTS', value: '100', type: 'NUMBER', category: 'SECURITY', description: 'Rate limit per 15 minutes' },
];

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

    // Get all configs from database
    const dbConfigs = await prisma.systemConfig.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }]
    });

    // Merge with defaults for any missing configs
    const configMap = new Map(dbConfigs.map(c => [c.key, c]));
    const allConfigs = DEFAULT_CONFIGS.map(def => {
      const existing = configMap.get(def.key);
      return existing || {
        id: null,
        ...def,
        lastModifiedBy: null,
        createdAt: null,
        updatedAt: null
      };
    });

    // Group by category
    const byCategory: Record<string, typeof allConfigs> = {};
    allConfigs.forEach(config => {
      if (!byCategory[config.category]) {
        byCategory[config.category] = [];
      }
      byCategory[config.category].push(config);
    });

    // Get converter costs
    const converterCosts = await prisma.converterCost.findMany({
      orderBy: { converterId: 'asc' }
    });

    return NextResponse.json({
      configs: allConfigs,
      byCategory,
      converterCosts,
      categories: ['FEATURES', 'LIMITS', 'BILLING', 'SECURITY', 'GENERAL']
    });
  } catch (error) {
    console.error('Get config error:', error);
    return NextResponse.json(
      { error: 'Failed to get configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await validateAdminSession(token);
    if (!admin) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    // Only super admins can change config
    if (admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Super admin privileges required' },
        { status: 403 }
      );
    }

    const { key, value, type, category, description } = await req.json();

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      );
    }

    // Get current value for audit log
    const current = await prisma.systemConfig.findUnique({ where: { key } });

    // Upsert the config
    const config = await prisma.systemConfig.upsert({
      where: { key },
      create: {
        key,
        value: String(value),
        type: type || 'STRING',
        category: category || 'GENERAL',
        description,
        lastModifiedBy: admin.id
      },
      update: {
        value: String(value),
        type: type || undefined,
        category: category || undefined,
        description: description || undefined,
        lastModifiedBy: admin.id
      }
    });

    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UPDATE_CONFIG',
      entityType: 'CONFIG',
      entityId: key,
      changes: {
        before: current ? { value: current.value } : null,
        after: { value: String(value) }
      },
      severity: 'WARNING'
    });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Update config error:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}
