import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Use happy-dom for browser-like environment
    environment: 'happy-dom',
    
    // Global test APIs
    globals: true,
    
    // Test file patterns
    include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['tests/playwright/**/*'],
    
    // Performance optimizations
    cache: {
      dir: 'node_modules/.vitest',
    },
    
    // Optimize test execution with parallel processing
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 4,
        useAtomics: true,
      },
    },
    
    // Optimize timeouts for CI performance
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Optimize file watching (helps with incremental runs)
    watchExclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/*.config.*'
    ],
    
    // Coverage configuration with dual thresholds
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
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
      // Global thresholds (minimum for existing code - prevent regression)
      thresholds: {
        statements: 4,    // Current ~4.6%, prevent regression below current
        branches: 65,     // Current ~75%, allow some margin for new untested code
        functions: 85,    // Current ~92%, allow some margin for new code
        lines: 4,         // Current ~4.6%, prevent regression below current
      },
      // Note: Per-file thresholds for new code enforced through separate mechanisms
      // to avoid blocking existing development while ensuring new code meets high standards
      // Fail CI if coverage drops below thresholds
      skipFull: false,
      all: true,
      // Include source files even if not tested
      include: ['src/**/*.{js,ts}'],
      // Output coverage data for CI/Codecov
      reportsDirectory: './coverage'
    },
    
    // Mock Chrome APIs for testing
    setupFiles: ['./test/setup.ts']
  },
  
  // Resolve aliases to match tsconfig
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});