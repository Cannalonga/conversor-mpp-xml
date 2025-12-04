import { FullConfig } from '@playwright/test';

/**
 * Global setup - runs before all tests
 * Waits for required services to be healthy
 */
async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
  const backendURL = process.env.BACKEND_URL || 'http://localhost:3001';
  const mppConverterURL = process.env.MPP_CONVERTER_URL || 'http://localhost:8080';
  
  console.log('\n🔧 E2E Global Setup');
  console.log(`   Frontend URL: ${baseURL}`);
  console.log(`   Backend URL: ${backendURL}`);
  console.log(`   MPP Converter URL: ${mppConverterURL}`);
  
  // Wait for frontend
  await waitForService(`${baseURL}`, 'Frontend', 60_000);
  
  // Wait for backend (optional - some tests may work without it)
  try {
    await waitForService(`${backendURL}/api/health`, 'Backend', 30_000);
  } catch (e) {
    console.warn('⚠️  Backend not available - some tests may be skipped');
  }
  
  // Check MPP converter (optional)
  try {
    await waitForService(`${mppConverterURL}/health`, 'MPP Converter', 10_000);
    process.env.MPP_CONVERTER_AVAILABLE = 'true';
    console.log('✅ MPP Converter is available');
  } catch (e) {
    process.env.MPP_CONVERTER_AVAILABLE = 'false';
    console.warn('⚠️  MPP Converter not available - conversion tests will use mock');
  }
  
  console.log('✅ Global setup complete\n');
}

/**
 * Wait for a service to be healthy
 */
async function waitForService(url: string, name: string, timeout: number): Promise<void> {
  const startTime = Date.now();
  const pollInterval = 2000;
  
  console.log(`   Waiting for ${name}...`);
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok || response.status < 500) {
        console.log(`   ✓ ${name} is ready (${response.status})`);
        return;
      }
    } catch (e) {
      // Service not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error(`${name} not available after ${timeout / 1000}s at ${url}`);
}

export default globalSetup;
