/**
 * Admin Panel E2E Tests
 * Tests for the admin dashboard and management features
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'test-admin-password';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/admin/login`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL(`${BASE_URL}/admin`, { timeout: 10000 });
}

test.describe('Admin Login', () => {
  test('should show login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/login`);
    
    // Check page elements
    await expect(page.locator('text=Admin Panel')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/login`);
    
    await page.fill('input[type="email"]', 'wrong@email.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to dashboard on successful login', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Should be on dashboard
    await expect(page).toHaveURL(`${BASE_URL}/admin`);
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/login`);
    
    const passwordInput = page.locator('input[type="password"]');
    const toggleButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    
    // Initially password type
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click toggle
    await toggleButton.click();
    
    // Should now be text type
    await expect(page.locator('input[id="password"]')).toHaveAttribute('type', 'text');
  });
});

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display stats cards', async ({ page }) => {
    // Check for stat cards
    await expect(page.locator('text=Total Users')).toBeVisible();
    await expect(page.locator('text=Total Jobs')).toBeVisible();
    await expect(page.locator('text=Total Revenue')).toBeVisible();
    await expect(page.locator('text=Active Alerts')).toBeVisible();
  });

  test('should display charts', async ({ page }) => {
    // Check for chart sections
    await expect(page.locator('text=Conversions (Last 7 Days)')).toBeVisible();
    await expect(page.locator('text=Job Distribution')).toBeVisible();
    await expect(page.locator('text=Revenue (Last 30 Days)')).toBeVisible();
  });

  test('should have working refresh button', async ({ page }) => {
    const refreshButton = page.locator('button:has-text("Refresh")');
    await expect(refreshButton).toBeVisible();
    
    // Click refresh
    await refreshButton.click();
    
    // Button should show loading state
    await expect(page.locator('svg.animate-spin')).toBeVisible();
  });

  test('should show recent jobs', async ({ page }) => {
    await expect(page.locator('text=Recent Jobs')).toBeVisible();
    await expect(page.locator('text=View all →').first()).toBeVisible();
  });

  test('should show recent alerts', async ({ page }) => {
    await expect(page.locator('text=Recent Alerts')).toBeVisible();
  });
});

test.describe('Admin Users Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/users`);
  });

  test('should display users table', async ({ page }) => {
    await expect(page.locator('text=Users')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    
    // Type in search
    await searchInput.fill('test@example.com');
    
    // Wait for results
    await page.waitForTimeout(500);
  });

  test('should have role filter', async ({ page }) => {
    const roleFilter = page.locator('select').first();
    await expect(roleFilter).toBeVisible();
    
    // Open dropdown
    await roleFilter.selectOption('ADMIN');
  });

  test('should have status filter', async ({ page }) => {
    const statusFilter = page.locator('select').nth(1);
    await expect(statusFilter).toBeVisible();
    
    // Open dropdown
    await statusFilter.selectOption('ACTIVE');
  });

  test('should open action dropdown', async ({ page }) => {
    // Click on first action button
    const actionButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    
    if (await actionButton.isVisible()) {
      await actionButton.click();
      
      // Should show dropdown menu
      await expect(page.locator('text=Adjust Credits')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Admin Jobs Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/jobs`);
  });

  test('should display jobs table', async ({ page }) => {
    await expect(page.locator('text=Jobs')).toBeVisible();
  });

  test('should have status filter', async ({ page }) => {
    const statusFilter = page.locator('select').first();
    await expect(statusFilter).toBeVisible();
    
    await statusFilter.selectOption('COMPLETED');
  });

  test('should have type filter', async ({ page }) => {
    const typeFilter = page.locator('select').nth(1);
    await expect(typeFilter).toBeVisible();
  });
});

test.describe('Admin Credits Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/credits`);
  });

  test('should display credits page', async ({ page }) => {
    await expect(page.locator('text=Credits')).toBeVisible();
  });

  test('should have manual credit button', async ({ page }) => {
    await expect(page.locator('text=Manual Credit')).toBeVisible();
  });

  test('should have export CSV button', async ({ page }) => {
    await expect(page.locator('text=Export CSV')).toBeVisible();
  });

  test('should open manual credit modal', async ({ page }) => {
    await page.click('text=Manual Credit');
    
    await expect(page.locator('text=Add Manual Credits')).toBeVisible();
    await expect(page.locator('input[placeholder*="user@example.com"]')).toBeVisible();
  });
});

test.describe('Admin Refunds Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/refunds`);
  });

  test('should display refunds page', async ({ page }) => {
    await expect(page.locator('text=Refunds')).toBeVisible();
  });

  test('should have stats cards', async ({ page }) => {
    await expect(page.locator('text=Pending')).toBeVisible();
    await expect(page.locator('text=Approved')).toBeVisible();
    await expect(page.locator('text=Rejected')).toBeVisible();
  });

  test('should have status filter', async ({ page }) => {
    const statusFilter = page.locator('select').first();
    await expect(statusFilter).toBeVisible();
    
    await statusFilter.selectOption('PENDING');
  });
});

test.describe('Admin Monitoring Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/monitoring`);
  });

  test('should display monitoring page', async ({ page }) => {
    await expect(page.locator('text=Monitoring')).toBeVisible();
  });

  test('should show service status cards', async ({ page }) => {
    await expect(page.locator('text=Prometheus')).toBeVisible();
    await expect(page.locator('text=Redis')).toBeVisible();
    await expect(page.locator('text=Job Queue')).toBeVisible();
    await expect(page.locator('text=MPP Converter')).toBeVisible();
  });

  test('should have auto-refresh toggle', async ({ page }) => {
    await expect(page.locator('text=Auto-refresh')).toBeVisible();
  });

  test('should have refresh button', async ({ page }) => {
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
  });
});

test.describe('Admin Audit Logs Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/audit-logs`);
  });

  test('should display audit logs page', async ({ page }) => {
    await expect(page.locator('text=Audit Logs')).toBeVisible();
  });

  test('should have filters', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();
  });
});

test.describe('Admin Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/settings`);
  });

  test('should display settings page', async ({ page }) => {
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('should show system flags', async ({ page }) => {
    await expect(page.locator('text=System Flags')).toBeVisible();
    await expect(page.locator('text=Maintenance Mode')).toBeVisible();
    await expect(page.locator('text=Auto Refund')).toBeVisible();
  });

  test('should show converter costs section', async ({ page }) => {
    await expect(page.locator('text=Converter Costs')).toBeVisible();
  });

  test('should have save button', async ({ page }) => {
    await expect(page.locator('text=Save Changes')).toBeVisible();
  });

  test('should have test alert button', async ({ page }) => {
    await expect(page.locator('text=Send Test Alert')).toBeVisible();
  });
});

test.describe('Admin Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should have sidebar navigation', async ({ page }) => {
    // Check all navigation items
    await expect(page.locator('a:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('a:has-text("Users")')).toBeVisible();
    await expect(page.locator('a:has-text("Jobs")')).toBeVisible();
    await expect(page.locator('a:has-text("Credits")')).toBeVisible();
    await expect(page.locator('a:has-text("Refunds")')).toBeVisible();
    await expect(page.locator('a:has-text("Alerts")')).toBeVisible();
    await expect(page.locator('a:has-text("Monitoring")')).toBeVisible();
    await expect(page.locator('a:has-text("Audit Logs")')).toBeVisible();
    await expect(page.locator('a:has-text("Settings")')).toBeVisible();
  });

  test('should navigate to different pages', async ({ page }) => {
    // Navigate to Users
    await page.click('a:has-text("Users")');
    await expect(page).toHaveURL(`${BASE_URL}/admin/users`);
    
    // Navigate to Jobs
    await page.click('a:has-text("Jobs")');
    await expect(page).toHaveURL(`${BASE_URL}/admin/jobs`);
    
    // Navigate back to Dashboard
    await page.click('a:has-text("Dashboard")');
    await expect(page).toHaveURL(`${BASE_URL}/admin`);
  });

  test('should have logout button', async ({ page }) => {
    await expect(page.locator('text=Logout')).toBeVisible();
  });

  test('should logout and redirect to login', async ({ page }) => {
    await page.click('text=Logout');
    
    // Should redirect to login
    await expect(page).toHaveURL(`${BASE_URL}/admin/login`, { timeout: 5000 });
  });
});

test.describe('Admin Session', () => {
  test('should redirect to login if not authenticated', async ({ page }) => {
    // Clear cookies
    await page.context().clearCookies();
    
    // Try to access dashboard
    await page.goto(`${BASE_URL}/admin`);
    
    // Should redirect to login
    await expect(page).toHaveURL(`${BASE_URL}/admin/login`, { timeout: 5000 });
  });

  test('should persist session on page reload', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Reload page
    await page.reload();
    
    // Should still be on dashboard
    await expect(page).toHaveURL(`${BASE_URL}/admin`);
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });
});
