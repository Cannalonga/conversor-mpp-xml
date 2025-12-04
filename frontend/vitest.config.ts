import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Test files pattern
    include: ['e2e/api-tests/**/*.spec.ts'],
    
    // Exclude playwright tests
    exclude: ['e2e/tests/**', 'node_modules/**'],
    
    // Disable parallelism for API tests (sequential execution)
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    
    // Timeout for each test (2 minutes for job polling)
    testTimeout: 120_000,
    
    // Hook timeout
    hookTimeout: 60_000,
    
    // Setup file
    setupFiles: ['./e2e/api-tests/setup.ts'],
    
    // Global test utilities
    globals: true,
    
    // Reporter
    reporters: ['verbose'],
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
