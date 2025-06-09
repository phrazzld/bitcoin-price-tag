import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Smoke Test Configuration for CI
 * 
 * Runs only critical core functionality tests for fast CI feedback.
 * These tests verify the extension's essential features work correctly
 * without running the full comprehensive test suite.
 */
export default defineConfig({
  test: {
    // Use happy-dom for browser-like environment
    environment: 'happy-dom',
    
    // Global test APIs
    globals: true,
    
    // SMOKE TEST STRATEGY: Only run core functionality tests
    include: [
      // Core validation and security (CRITICAL)
      'src/common/schema-validation.test.ts',
      'src/shared/logger.test.ts',
      
      // Essential shared utilities  
      'src/shared/errors/base-error.test.ts',
      'src/shared/errors/guards.test.ts',
      
      // Core service worker API functionality (CRITICAL for extension)
      'src/service-worker/cache.test.ts',
      'src/service-worker/api-fetch.test.ts',
      
      // Core content script functionality
      'src/content-script/messaging.test.ts',
      'src/content-script/dom.test.ts',
      
      // Core constants and validation helpers
      'src/common/constants.test.ts',
      'src/common/validation-helpers.test.ts',
    ],
    
    // EXCLUDE heavy integration and complex tests
    exclude: [
      'tests/playwright/**/*',
      'tests/integration/**/*', // Skip all integration tests
      'src/content-script/dom-observer.test.ts', // Heavy DOM tests
      'src/service-worker/index.test.ts', // Heavy service worker integration
      'tests/utils/test-lifecycle.test.ts', // Test infrastructure
      '**/node_modules/**'
    ],
    
    // Aggressive performance optimizations for CI
    cache: {
      dir: 'node_modules/.vitest',
    },
    
    // Fast execution settings
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 2, // Reduce parallelism for faster startup
        useAtomics: true,
      },
    },
    
    // Shorter timeouts for smoke tests
    testTimeout: 5000,   // 5 seconds max per test
    hookTimeout: 3000,   // 3 seconds max for setup/teardown
    
    // Disable coverage for smoke tests (performance)
    coverage: {
      enabled: false
    },
    
    // Mock Chrome APIs for testing
    setupFiles: ['./test/setup.ts'],
    
    // Minimal reporting for CI
    reporter: ['basic'],
    
    // Fail fast on first error to save CI time
    bail: 1,
  },
  
  // Resolve aliases to match tsconfig
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});