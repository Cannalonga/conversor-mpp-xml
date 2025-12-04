import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * E2E Full Flow Test
 * 
 * Tests the complete user journey:
 * 1. Register new account
 * 2. Login
 * 3. Add demo credits
 * 4. Upload MPP file
 * 5. Start conversion
 * 6. Wait for completion
 * 7. Download result
 * 8. Verify credits deducted
 */

// Test configuration
const TEST_TIMEOUT = 120_000; // 2 minutes
const POLL_INTERVAL = 2_000;  // 2 seconds
const MAX_POLL_ATTEMPTS = 60; // 60 * 2s = 2 minutes max wait

// Generate unique test user for each run
const timestamp = Date.now();
const TEST_USER = {
  email: `testuser+${timestamp}@e2e.local`,
  password: 'TestPassword123!',
  name: `Test User ${timestamp}`,
};

// Fixture path
const FIXTURE_DIR = path.join(__dirname, '..', 'fixtures');
const SAMPLE_MPP_PATH = path.join(FIXTURE_DIR, 'sample.mpp');

test.describe('Full Conversion Flow', () => {
  test.setTimeout(TEST_TIMEOUT);

  let initialBalance: number;

  test('complete flow: register → credits → upload → convert → download', async ({ page }) => {
    // ================================================================
    // STEP 1: Register new user
    // ================================================================
    await test.step('Register new user', async () => {
      await page.goto('/register');
      
      // Fill registration form
      await page.getByLabel(/nome|name/i).fill(TEST_USER.name);
      await page.getByLabel(/email/i).fill(TEST_USER.email);
      await page.getByLabel(/senha|password/i).first().fill(TEST_USER.password);
      
      // Check for confirm password field
      const confirmPassword = page.getByLabel(/confirmar|confirm/i);
      if (await confirmPassword.isVisible()) {
        await confirmPassword.fill(TEST_USER.password);
      }
      
      // Submit form
      await page.getByRole('button', { name: /registrar|register|criar|create/i }).click();
      
      // Wait for redirect to dashboard or login
      await expect(page).toHaveURL(/\/(dashboard|login)/, { timeout: 15_000 });
      
      console.log(`✓ Registered user: ${TEST_USER.email}`);
    });

    // ================================================================
    // STEP 2: Login (if redirected to login page)
    // ================================================================
    await test.step('Login if needed', async () => {
      if (page.url().includes('/login')) {
        await page.getByLabel(/email/i).fill(TEST_USER.email);
        await page.getByLabel(/senha|password/i).fill(TEST_USER.password);
        await page.getByRole('button', { name: /entrar|login|sign in/i }).click();
        
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
        console.log('✓ Logged in successfully');
      }
    });

    // ================================================================
    // STEP 3: Add demo credits
    // ================================================================
    await test.step('Add demo credits', async () => {
      // Navigate to credits page
      await page.goto('/credits');
      await page.waitForLoadState('networkidle');
      
      // Get initial balance
      const balanceText = await page.locator('[data-testid="balance"], .balance, [class*="balance"]').first().textContent();
      initialBalance = parseInt(balanceText?.replace(/\D/g, '') || '0', 10);
      console.log(`   Initial balance: ${initialBalance}`);
      
      // Click add demo credits button
      const demoButton = page.getByRole('button', { name: /demo|teste|test|adicionar.*demo/i });
      
      if (await demoButton.isVisible()) {
        await demoButton.click();
        
        // Wait for balance update
        await page.waitForTimeout(2000);
        await page.reload();
        
        // Verify balance increased
        const newBalanceText = await page.locator('[data-testid="balance"], .balance, [class*="balance"]').first().textContent();
        const newBalance = parseInt(newBalanceText?.replace(/\D/g, '') || '0', 10);
        
        expect(newBalance).toBeGreaterThanOrEqual(initialBalance + 50);
        initialBalance = newBalance;
        console.log(`✓ Demo credits added. New balance: ${newBalance}`);
      } else {
        // Try API call directly
        const response = await page.request.post('/api/credits/add-demo', {
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (response.ok()) {
          await page.reload();
          const newBalanceText = await page.locator('[data-testid="balance"], .balance, [class*="balance"]').first().textContent();
          initialBalance = parseInt(newBalanceText?.replace(/\D/g, '') || '50', 10);
          console.log(`✓ Demo credits added via API. Balance: ${initialBalance}`);
        } else {
          console.warn('⚠️ Could not add demo credits - continuing with existing balance');
        }
      }
      
      expect(initialBalance).toBeGreaterThan(0);
    });

    // ================================================================
    // STEP 4: Upload MPP file
    // ================================================================
    await test.step('Upload MPP file', async () => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Check if sample.mpp exists, if not create a mock
      if (!fs.existsSync(SAMPLE_MPP_PATH)) {
        console.log('   Creating mock MPP file for testing...');
        await createMockMppFile(SAMPLE_MPP_PATH);
      }
      
      // Find file input
      const fileInput = page.locator('input[type="file"]');
      
      // Handle file chooser
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        fileInput.click(),
      ]);
      
      await fileChooser.setFiles(SAMPLE_MPP_PATH);
      console.log('✓ File uploaded');
      
      // Wait for upload confirmation
      await page.waitForTimeout(2000);
    });

    // ================================================================
    // STEP 5: Select converter and start conversion
    // ================================================================
    await test.step('Start MPP to XML conversion', async () => {
      // Select mpp-to-xml converter
      const converterSelect = page.locator('select, [data-testid="converter-select"]').first();
      
      if (await converterSelect.isVisible()) {
        // Find option with mpp-to-xml value or matching label
        const options = await converterSelect.locator('option').all();
        let optionValue = 'mpp-to-xml'; // default value
        
        for (const opt of options) {
          const text = await opt.textContent();
          if (text && /mpp.*xml/i.test(text)) {
            optionValue = await opt.getAttribute('value') || text;
            break;
          }
        }
        
        await converterSelect.selectOption(optionValue);
      } else {
        // Try clicking a converter button/card
        const mppConverter = page.getByRole('button', { name: /mpp.*xml/i })
          .or(page.locator('[data-converter="mpp-to-xml"]'))
          .or(page.locator('text=MPP para XML'));
        
        if (await mppConverter.isVisible()) {
          await mppConverter.click();
        }
      }
      
      // Click convert button
      const convertButton = page.getByRole('button', { name: /converter|convert|iniciar|start/i });
      await convertButton.click();
      
      console.log('✓ Conversion started');
    });

    // ================================================================
    // STEP 6: Wait for conversion to complete
    // ================================================================
    let jobId: string | null = null;
    
    await test.step('Wait for conversion completion', async () => {
      // Check if MPP converter is available
      const mppAvailable = process.env.MPP_CONVERTER_AVAILABLE === 'true';
      
      if (!mppAvailable) {
        console.log('⚠️ MPP Converter not available - skipping conversion wait');
        test.skip(true, 'MPP Converter not available');
        return;
      }
      
      let completed = false;
      let attempts = 0;
      
      while (!completed && attempts < MAX_POLL_ATTEMPTS) {
        attempts++;
        
        // Check for success indicators
        const successIndicator = page.locator(
          '[data-status="completed"], [data-status="success"], ' +
          '.status-completed, .status-success, ' +
          'text=/concluído|completed|sucesso|success/i'
        ).first();
        
        const errorIndicator = page.locator(
          '[data-status="failed"], [data-status="error"], ' +
          '.status-failed, .status-error, ' +
          'text=/falhou|failed|erro|error/i'
        ).first();
        
        if (await successIndicator.isVisible()) {
          completed = true;
          console.log(`✓ Conversion completed (attempt ${attempts})`);
          
          // Try to get job ID
          const jobElement = page.locator('[data-job-id]').first();
          if (await jobElement.isVisible()) {
            jobId = await jobElement.getAttribute('data-job-id');
          }
        } else if (await errorIndicator.isVisible()) {
          throw new Error('Conversion failed');
        } else {
          // Still processing
          console.log(`   Waiting for conversion... (attempt ${attempts}/${MAX_POLL_ATTEMPTS})`);
          await page.waitForTimeout(POLL_INTERVAL);
          await page.reload();
        }
      }
      
      if (!completed) {
        throw new Error(`Conversion timeout after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL / 1000}s`);
      }
    });

    // ================================================================
    // STEP 7: Download result
    // ================================================================
    await test.step('Download converted file', async () => {
      if (!process.env.MPP_CONVERTER_AVAILABLE) {
        test.skip(true, 'Skipping download - converter not available');
        return;
      }
      
      // Find download button
      const downloadButton = page.getByRole('button', { name: /download|baixar/i })
        .or(page.getByRole('link', { name: /download|baixar/i }))
        .first();
      
      // Setup download handler
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        downloadButton.click(),
      ]);
      
      // Verify download
      const fileName = download.suggestedFilename();
      expect(fileName).toMatch(/\.xml$/i);
      
      // Save and verify content
      const downloadPath = path.join(FIXTURE_DIR, 'downloaded-result.xml');
      await download.saveAs(downloadPath);
      
      const fileContent = fs.readFileSync(downloadPath, 'utf-8');
      expect(fileContent).toContain('<?xml');
      
      console.log(`✓ Downloaded file: ${fileName}`);
      
      // Cleanup
      fs.unlinkSync(downloadPath);
    });

    // ================================================================
    // STEP 8: Verify credits deducted
    // ================================================================
    await test.step('Verify credits deducted', async () => {
      if (!process.env.MPP_CONVERTER_AVAILABLE) {
        test.skip(true, 'Skipping credits check - converter not available');
        return;
      }
      
      await page.goto('/credits');
      await page.waitForLoadState('networkidle');
      
      const balanceText = await page.locator('[data-testid="balance"], .balance, [class*="balance"]').first().textContent();
      const finalBalance = parseInt(balanceText?.replace(/\D/g, '') || '0', 10);
      
      // MPP to XML costs 4 credits
      const expectedCost = 4;
      const expectedBalance = initialBalance - expectedCost;
      
      expect(finalBalance).toBeLessThan(initialBalance);
      console.log(`✓ Credits deducted: ${initialBalance} → ${finalBalance} (cost: ${initialBalance - finalBalance})`);
    });

    console.log('\n🎉 Full E2E flow completed successfully!\n');
  });
});

/**
 * Create a mock MPP file for testing
 * Real MPP files are binary Microsoft Project files
 * This creates a minimal valid-ish file for upload testing
 */
async function createMockMppFile(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Try to download a sample MPP from the repo's existing samples
  const localSample = path.join(__dirname, '..', '..', '..', 'scripts', 'samples', 'sample.mpp');
  
  if (fs.existsSync(localSample)) {
    fs.copyFileSync(localSample, filePath);
    console.log(`   Copied sample.mpp from ${localSample}`);
    return;
  }
  
  // Create a minimal binary header that looks like an OLE file (MPP is OLE-based)
  // This is just for upload testing - actual conversion would fail without real MPP content
  const oleHeader = Buffer.from([
    0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1, // OLE magic signature
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x3E, 0x00, 0x03, 0x00, 0xFE, 0xFF, 0x09, 0x00,
    0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
    // ... minimal OLE structure
  ]);
  
  // Pad to minimum size
  const padding = Buffer.alloc(512 - oleHeader.length);
  const content = Buffer.concat([oleHeader, padding]);
  
  fs.writeFileSync(filePath, content);
  console.log(`   Created mock MPP file at ${filePath}`);
}

// ================================================================
// Additional test: Health checks
// ================================================================
test.describe('Health Checks', () => {
  test('frontend is accessible', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(500);
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading')).toBeVisible();
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading')).toBeVisible();
  });
});
