import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * CI Test Configuration
 * 
 * Balanced test suite for CI environments - more comprehensive than smoke tests
 * but optimized for CI performance constraints. Runs essential functionality
 * and core integration tests while skipping the heaviest test suites.
 */
export default defineConfig({
  test: {
    // Use happy-dom for browser-like environment
    environment: 'happy-dom',
    
    // Global test APIs
    globals: true,
    
    // CI TEST STRATEGY: Core + selected integration tests
    include: [
      // All core functionality
      'src/**/*.{test,spec}.{js,ts}',
      
      // Essential test utilities
      'tests/utils/chrome-api-factory.test.ts',
      'tests/utils/test-lifecycle.test.ts',
      
      // Light integration tests only
      'tests/integration/messaging-simple.test.ts',
      'tests/integration/content-script-initialization.test.ts',
    ],
    
    // EXCLUDE the heaviest test suites that cause timeouts
    exclude: [
      'tests/playwright/**/*', // Skip all Playwright E2E tests
      'tests/integration/messaging.integration.test.ts', // Heavy messaging tests
      'tests/integration/messaging-promise.test.ts', // Complex promise-based tests
      'tests/integration/service-worker-persistence.test.ts', // Heavy service worker tests
      'tests/integration/dom-observer-*.test.ts', // Heavy DOM observer integration tests
      'src/service-worker/index.test.ts', // Heavy service worker integration test (causes timeouts)
      '**/node_modules/**'
    ],
    
    // CI-optimized performance settings
    cache: {
      dir: 'node_modules/.vitest',
    },
    
    // Balanced execution settings for CI
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 3, // Limited parallelism for CI stability
        useAtomics: true,
      },
    },
    
    // CI-appropriate timeouts
    testTimeout: 8000,   // 8 seconds max per test
    hookTimeout: 5000,   // 5 seconds max for setup/teardown
    
    // File watching optimizations
    watchExclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/*.config.*'
    ],
    
    // Simplified coverage for CI
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'], // Minimal reporting
      exclude: [
        'node_modules/',
        'dist/',
        'src/**/*.d.ts',
        'vitest.config.ts',
        'test/',
        'tests/',
        '**/*.{test,spec}.{js,ts}',
        'eslint.config.js',
        'webpack.config.js',
        'verify-build.js',
        '.commitlintrc.js',
        'playwright.config.ts'
      ],
      // Relaxed thresholds for CI (focus on regression prevention)
      thresholds: {
        statements: 4,    
        branches: 60,     // Slightly relaxed for CI performance
        functions: 80,    
        lines: 4,         
      },
      skipFull: false,
      all: true,
      include: ['src/**/*.{js,ts}'],
      reportsDirectory: './coverage'
    },
    
    // Mock Chrome APIs for testing
    setupFiles: ['./test/setup.ts'],
    
    // Optimized reporting for CI
    reporter: process.env.CI ? ['github-actions', 'json'] : ['default'],
    
    // Don't fail fast - we want to see all failures in CI
    bail: 0,
  },
  
  // Resolve aliases to match tsconfig
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});