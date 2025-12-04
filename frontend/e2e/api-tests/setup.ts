/**
 * Global setup for API E2E tests
 * Runs before all tests
 */

import { beforeAll, afterAll } from 'vitest';

// Store test context
export const testContext = {
  frontendUrl: process.env.E2E_FRONTEND_URL || 'http://localhost:3000',
  backendUrl: process.env.E2E_BACKEND_URL || 'http://localhost:3001',
  mppConverterUrl: process.env.MPP_CONVERTER_URL || 'http://localhost:8080',
  servicesAvailable: {
    frontend: false,
    backend: false,
    mppConverter: false,
  },
};

/**
 * Check if a service is healthy
 */
async function checkHealth(url: string, name: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (response.ok) {
      console.log(`✅ ${name} is healthy (${url})`);
      return true;
    } else {
      console.warn(`⚠️ ${name} returned ${response.status} (${url})`);
      return false;
    }
  } catch (error) {
    console.warn(`❌ ${name} not available: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

beforeAll(async () => {
  console.log('\n🔍 API E2E Test Setup');
  console.log('━'.repeat(50));
  console.log(`Frontend URL: ${testContext.frontendUrl}`);
  console.log(`Backend URL: ${testContext.backendUrl}`);
  console.log(`MPP Converter URL: ${testContext.mppConverterUrl}`);
  console.log('━'.repeat(50));
  
  // Check services health
  testContext.servicesAvailable.frontend = await checkHealth(
    testContext.frontendUrl,
    'Frontend'
  );
  
  testContext.servicesAvailable.backend = await checkHealth(
    `${testContext.backendUrl}/health`,
    'Backend'
  );
  
  testContext.servicesAvailable.mppConverter = await checkHealth(
    `${testContext.mppConverterUrl}/health`,
    'MPP Converter'
  );
  
  console.log('━'.repeat(50));
  console.log('Services Status:');
  console.log(`  Frontend: ${testContext.servicesAvailable.frontend ? '✅' : '❌'}`);
  console.log(`  Backend: ${testContext.servicesAvailable.backend ? '✅' : '❌'}`);
  console.log(`  MPP Converter: ${testContext.servicesAvailable.mppConverter ? '✅' : '❌'}`);
  console.log('━'.repeat(50) + '\n');
});

afterAll(async () => {
  console.log('\n🧹 API E2E Test Cleanup complete\n');
});
