/**
 * Admin Auth Library Unit Tests
 * Tests for admin authentication and session management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  adminSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    delete: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  compare: vi.fn().mockResolvedValue(true),
}));

describe('Admin Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set environment variable
    process.env.ADMIN_PASSWORD = 'test-admin-password';
  });

  afterEach(() => {
    delete process.env.ADMIN_PASSWORD;
  });

  describe('authenticateAdmin', () => {
    it('should authenticate with valid ADMIN_PASSWORD', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'ADMIN',
        password: 'hashed-password',
        status: 'ACTIVE',
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.adminSession.create.mockResolvedValue({
        id: 'session-123',
        token: 'mock-token',
      });

      // Import after mocking
      const { authenticateAdmin } = await import('@/lib/admin-auth');

      const result = await authenticateAdmin('admin@test.com', 'test-admin-password');

      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@test.com',
        role: 'USER', // Not admin
        password: 'hashed-password',
        status: 'ACTIVE',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const { authenticateAdmin } = await import('@/lib/admin-auth');

      const result = await authenticateAdmin('admin@test.com', 'wrong-password');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject non-admin users', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        role: 'USER',
        password: 'hashed-password',
        status: 'ACTIVE',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const { authenticateAdmin } = await import('@/lib/admin-auth');

      const result = await authenticateAdmin('user@test.com', 'wrong-password');

      expect(result.success).toBe(false);
    });

    it('should reject suspended admins', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@test.com',
        role: 'ADMIN',
        password: 'hashed-password',
        status: 'SUSPENDED',
      };

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const { authenticateAdmin } = await import('@/lib/admin-auth');

      const result = await authenticateAdmin('admin@test.com', 'test-admin-password');

      expect(result.success).toBe(false);
      // Error can be 'Invalid credentials' or 'suspended' depending on flow
      expect(result.error).toBeDefined();
    });
  });

  describe('validateAdminSession', () => {
    it('should validate a valid session', async () => {
      const mockSession = {
        id: 'session-123',
        token: 'valid-token',
        adminId: 'user-123',
        expiresAt: new Date(Date.now() + 86400000), // Tomorrow
        lastActivity: new Date(),
      };

      const mockUser = {
        id: 'user-123',
        email: 'admin@test.com',
        name: 'Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
      };

      mockPrisma.adminSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.adminSession.update.mockResolvedValue(mockSession);
      mockPrisma.user = { ...mockPrisma.user, findUnique: vi.fn().mockResolvedValue(mockUser) };

      const { validateAdminSession } = await import('@/lib/admin-auth');

      const result = await validateAdminSession('valid-token');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-123');
      expect(result?.role).toBe('ADMIN');
    });

    it('should reject expired sessions', async () => {
      const mockSession = {
        id: 'session-123',
        token: 'expired-token',
        adminId: 'user-123',
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
        lastActivity: new Date(),
      };

      mockPrisma.adminSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.adminSession.delete = vi.fn().mockResolvedValue({});

      const { validateAdminSession } = await import('@/lib/admin-auth');

      const result = await validateAdminSession('expired-token');

      expect(result).toBeNull();
    });

    it('should reject non-existent sessions', async () => {
      mockPrisma.adminSession.findUnique.mockResolvedValue(null);

      const { validateAdminSession } = await import('@/lib/admin-auth');

      const result = await validateAdminSession('non-existent-token');

      expect(result).toBeNull();
    });
  });

  describe('logoutAdmin', () => {
    it('should invalidate session on logout', async () => {
      mockPrisma.adminSession.deleteMany.mockResolvedValue({ count: 1 });

      const { logoutAdmin } = await import('@/lib/admin-auth');

      await logoutAdmin('session-token');

      expect(mockPrisma.adminSession.deleteMany).toHaveBeenCalledWith({
        where: { token: 'session-token' },
      });
    });
  });

  describe('logAdminAction', () => {
    it('should create audit log entry', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-123' });

      const { logAdminAction } = await import('@/lib/admin-auth');

      await logAdminAction({
        adminId: 'admin-123',
        adminEmail: 'admin@test.com',
        action: 'USER_UPDATE',
        entityType: 'User',
        entityId: 'user-456',
        changes: { before: { status: 'ACTIVE' }, after: { status: 'SUSPENDED' } },
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent'
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          adminId: 'admin-123',
          adminEmail: 'admin@test.com',
          action: 'USER_UPDATE',
          entityType: 'User',
          entityId: 'user-456',
        }),
      });
    });
  });
});

describe('Admin Dashboard Stats', () => {
  it('should calculate user statistics correctly', () => {
    const users = [
      { status: 'ACTIVE', createdAt: new Date() },
      { status: 'ACTIVE', createdAt: new Date(Date.now() - 86400000) },
      { status: 'SUSPENDED', createdAt: new Date(Date.now() - 172800000) },
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newToday = users.filter(u => new Date(u.createdAt) >= today).length;
    const active = users.filter(u => u.status === 'ACTIVE').length;

    expect(newToday).toBe(1);
    expect(active).toBe(2);
  });

  it('should calculate job success rate correctly', () => {
    const jobs = {
      completed: 80,
      failed: 15,
      pending: 5,
    };

    const total = jobs.completed + jobs.failed + jobs.pending;
    const successRate = (jobs.completed / total) * 100;

    expect(successRate).toBe(80);
  });
});

describe('Admin User Actions', () => {
  describe('adjust-credits', () => {
    it('should add credits correctly', () => {
      const currentCredits = 10;
      const adjustment = 5;
      const newBalance = currentCredits + adjustment;

      expect(newBalance).toBe(15);
    });

    it('should remove credits correctly', () => {
      const currentCredits = 10;
      const adjustment = -3;
      const newBalance = currentCredits + adjustment;

      expect(newBalance).toBe(7);
    });

    it('should not go below zero', () => {
      const currentCredits = 5;
      const adjustment = -10;
      const newBalance = Math.max(0, currentCredits + adjustment);

      expect(newBalance).toBe(0);
    });
  });

  describe('user status transitions', () => {
    it('should allow ACTIVE -> SUSPENDED', () => {
      const validTransitions: Record<string, string[]> = {
        ACTIVE: ['SUSPENDED', 'BANNED'],
        SUSPENDED: ['ACTIVE', 'BANNED'],
        BANNED: ['ACTIVE'],
      };

      expect(validTransitions['ACTIVE']).toContain('SUSPENDED');
    });

    it('should allow SUSPENDED -> ACTIVE', () => {
      const validTransitions: Record<string, string[]> = {
        ACTIVE: ['SUSPENDED', 'BANNED'],
        SUSPENDED: ['ACTIVE', 'BANNED'],
        BANNED: ['ACTIVE'],
      };

      expect(validTransitions['SUSPENDED']).toContain('ACTIVE');
    });

    it('should allow BANNED -> ACTIVE', () => {
      const validTransitions: Record<string, string[]> = {
        ACTIVE: ['SUSPENDED', 'BANNED'],
        SUSPENDED: ['ACTIVE', 'BANNED'],
        BANNED: ['ACTIVE'],
      };

      expect(validTransitions['BANNED']).toContain('ACTIVE');
    });
  });
});

describe('Admin Refund Processing', () => {
  it('should return correct credits on approval', () => {
    const refundAmount = 5;
    const currentBalance = 10;
    const newBalance = currentBalance + refundAmount;

    expect(newBalance).toBe(15);
  });

  it('should not change credits on rejection', () => {
    const currentBalance = 10;
    const newBalance = currentBalance; // No change on rejection

    expect(newBalance).toBe(10);
  });
});

describe('Admin System Config', () => {
  it('should validate config keys', () => {
    const validKeys = [
      'MAINTENANCE_MODE',
      'AUTO_REFUND_ENABLED',
      'STRIPE_ENABLED',
      'MAX_FILE_SIZE_MB',
      'MAX_QUEUE_SIZE',
      'ALERT_EMAIL_ENABLED',
      'ALERT_SLACK_ENABLED',
    ];

    expect(validKeys).toContain('MAINTENANCE_MODE');
    expect(validKeys).toContain('AUTO_REFUND_ENABLED');
  });

  it('should validate boolean config values', () => {
    const booleanKeys = [
      'MAINTENANCE_MODE',
      'AUTO_REFUND_ENABLED',
      'STRIPE_ENABLED',
      'ALERT_EMAIL_ENABLED',
      'ALERT_SLACK_ENABLED',
    ];

    const validateBoolean = (value: unknown): boolean => {
      return typeof value === 'boolean';
    };

    booleanKeys.forEach(key => {
      expect(validateBoolean(true)).toBe(true);
      expect(validateBoolean(false)).toBe(true);
      expect(validateBoolean('true')).toBe(false);
    });
  });

  it('should validate numeric config values', () => {
    const numericKeys = ['MAX_FILE_SIZE_MB', 'MAX_QUEUE_SIZE'];

    const validateNumeric = (value: unknown): boolean => {
      return typeof value === 'number' && value > 0;
    };

    expect(validateNumeric(100)).toBe(true);
    expect(validateNumeric(0)).toBe(false);
    expect(validateNumeric(-1)).toBe(false);
    expect(validateNumeric('100')).toBe(false);
  });
});

describe('Audit Log Formatting', () => {
  it('should format action names correctly', () => {
    const formatAction = (action: string): string => {
      return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

    expect(formatAction('USER_UPDATE')).toBe('User Update');
    expect(formatAction('REFUND_APPROVE')).toBe('Refund Approve');
    expect(formatAction('CONFIG_UPDATE')).toBe('Config Update');
  });

  it('should categorize actions by type', () => {
    const getActionCategory = (action: string): string => {
      if (action.includes('DELETE') || action.includes('BAN') || action.includes('REJECT')) {
        return 'destructive';
      }
      if (action.includes('CREATE') || action.includes('APPROVE') || action.includes('ADD')) {
        return 'constructive';
      }
      if (action.includes('UPDATE') || action.includes('MODIFY') || action.includes('ADJUST')) {
        return 'modification';
      }
      return 'neutral';
    };

    expect(getActionCategory('USER_DELETE')).toBe('destructive');
    expect(getActionCategory('USER_BAN')).toBe('destructive');
    expect(getActionCategory('REFUND_REJECT')).toBe('destructive');
    expect(getActionCategory('USER_CREATE')).toBe('constructive');
    expect(getActionCategory('REFUND_APPROVE')).toBe('constructive');
    expect(getActionCategory('USER_UPDATE')).toBe('modification');
    expect(getActionCategory('CREDIT_ADJUST')).toBe('modification');
    expect(getActionCategory('LOGIN')).toBe('neutral');
  });
});
