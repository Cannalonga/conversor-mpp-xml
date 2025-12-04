/**
 * Admin Converter Costs API
 * GET /api/admin/config/converters - List converter costs
 * PUT /api/admin/config/converters/[id] - Update converter cost
 * POST /api/admin/config/converters - Add new converter
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession, ADMIN_SESSION_COOKIE, logAdminAction } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

// Default converters
const DEFAULT_CONVERTERS = [
  { converterId: 'mpp-to-xml', displayName: 'MPP to XML', creditCost: 1, processingTime: 30, maxFileSize: 100 },
  { converterId: 'mpp-to-json', displayName: 'MPP to JSON', creditCost: 1, processingTime: 30, maxFileSize: 100 },
  { converterId: 'mpp-to-xlsx', displayName: 'MPP to Excel', creditCost: 2, processingTime: 45, maxFileSize: 100 },
  { converterId: 'mpp-to-pdf', displayName: 'MPP to PDF', creditCost: 3, processingTime: 60, maxFileSize: 100 },
  { converterId: 'mpp-to-csv', displayName: 'MPP to CSV', creditCost: 1, processingTime: 20, maxFileSize: 100 },
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

    // Get converters from database
    let converters = await prisma.converterCost.findMany({
      orderBy: { displayName: 'asc' }
    });

    // If empty, seed with defaults
    if (converters.length === 0) {
      await prisma.converterCost.createMany({
        data: DEFAULT_CONVERTERS.map(c => ({
          ...c,
          isActive: true,
          supportedInputs: JSON.stringify(['.mpp'])
        }))
      });
      converters = await prisma.converterCost.findMany({
        orderBy: { displayName: 'asc' }
      });
    }

    // Get usage stats for each converter
    const usageStats = await prisma.job.groupBy({
      by: ['converterId'],
      _count: true,
      _avg: { cost: true }
    });

    const convertersWithStats = converters.map(c => {
      const stats = usageStats.find(s => s.converterId === c.converterId);
      return {
        ...c,
        supportedInputs: c.supportedInputs ? JSON.parse(c.supportedInputs) : [],
        usage: {
          totalJobs: stats?._count || 0,
          avgCost: stats?._avg.cost || c.creditCost
        }
      };
    });

    return NextResponse.json({
      converters: convertersWithStats
    });
  } catch (error) {
    console.error('Get converters error:', error);
    return NextResponse.json(
      { error: 'Failed to get converters' },
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

    if (admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Super admin privileges required' },
        { status: 403 }
      );
    }

    const { converterId, displayName, description, creditCost, processingTime, maxFileSize, supportedInputs, isActive } = await req.json();

    if (!converterId || !displayName) {
      return NextResponse.json(
        { error: 'converterId and displayName are required' },
        { status: 400 }
      );
    }

    // Check if exists
    const existing = await prisma.converterCost.findUnique({ where: { converterId } });
    if (existing) {
      return NextResponse.json(
        { error: 'Converter already exists' },
        { status: 409 }
      );
    }

    const converter = await prisma.converterCost.create({
      data: {
        converterId,
        displayName,
        description,
        creditCost: creditCost || 1,
        processingTime,
        maxFileSize,
        supportedInputs: supportedInputs ? JSON.stringify(supportedInputs) : null,
        isActive: isActive !== false,
        lastModifiedBy: admin.id
      }
    });

    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'CREATE_CONVERTER',
      entityType: 'CONFIG',
      entityId: converterId,
      changes: { after: converter },
      severity: 'INFO'
    });

    return NextResponse.json({ success: true, converter }, { status: 201 });
  } catch (error) {
    console.error('Create converter error:', error);
    return NextResponse.json(
      { error: 'Failed to create converter' },
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

    if (admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Super admin privileges required' },
        { status: 403 }
      );
    }

    const { converterId, ...updates } = await req.json();

    if (!converterId) {
      return NextResponse.json(
        { error: 'converterId is required' },
        { status: 400 }
      );
    }

    const current = await prisma.converterCost.findUnique({ where: { converterId } });
    if (!current) {
      return NextResponse.json({ error: 'Converter not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { lastModifiedBy: admin.id };
    if (updates.displayName !== undefined) updateData.displayName = updates.displayName;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.creditCost !== undefined) updateData.creditCost = updates.creditCost;
    if (updates.processingTime !== undefined) updateData.processingTime = updates.processingTime;
    if (updates.maxFileSize !== undefined) updateData.maxFileSize = updates.maxFileSize;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.supportedInputs !== undefined) {
      updateData.supportedInputs = JSON.stringify(updates.supportedInputs);
    }

    const converter = await prisma.converterCost.update({
      where: { converterId },
      data: updateData
    });

    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UPDATE_CONVERTER',
      entityType: 'CONFIG',
      entityId: converterId,
      changes: { before: current, after: converter },
      severity: 'INFO'
    });

    return NextResponse.json({ success: true, converter });
  } catch (error) {
    console.error('Update converter error:', error);
    return NextResponse.json(
      { error: 'Failed to update converter' },
      { status: 500 }
    );
  }
}
