import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * 
 * Run tests with:
 *   npm run test:e2e           # headless
 *   npm run test:e2e:headed    # with browser UI
 */
export default defineConfig({
  // Test directory
  testDir: './e2e/tests',
  
  // Test output directory
  outputDir: './e2e/test-results',
  
  // Timeout for each test
  timeout: 120_000, // 2 minutes - conversions can take time
  
  // Timeout for each expect() call
  expect: {
    timeout: 10_000,
  },
  
  // Run tests in parallel
  fullyParallel: false, // Sequential for E2E to avoid race conditions
  
  // Fail the build on CI if you accidentally left test.only in the source
  forbidOnly: !!process.env.CI,
  
  // Retry on CI
  retries: process.env.CI ? 2 : (parseInt(process.env.E2E_RETRIES || '1', 10)),
  
  // Workers - more on CI for parallel execution
  workers: process.env.CI ? 2 : 1,
  
  // Reporter
  reporter: process.env.CI 
    ? [['list'], ['html', { open: 'never', outputFolder: './e2e/playwright-report' }]]
    : [['list']],
  
  // Global setup - wait for services
  globalSetup: './e2e/global-setup.ts',
  
  // Shared settings for all projects
  use: {
    // Base URL from environment or default
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    
    // Headless mode
    headless: true,
    
    // Collect trace when retrying failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'on-first-retry',
    
    // Viewport
    viewport: { width: 1280, height: 720 },
    
    // Ignore HTTPS errors (useful for local dev)
    ignoreHTTPSErrors: true,
    
    // Action timeout
    actionTimeout: 15_000,
    
    // Navigation timeout
    navigationTimeout: 30_000,
  },

  // Projects (browser configurations)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment for multi-browser testing:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Web server configuration - start the app before tests
  webServer: process.env.E2E_SKIP_SERVER ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
