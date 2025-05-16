import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Use happy-dom for browser-like environment
    environment: 'happy-dom',
    
    // Global test APIs
    globals: true,
    
    // Test file patterns
    include: ['src/**/*.{test,spec}.{js,ts}'],
    
    // Coverage configuration
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/**/*.d.ts',
        'vitest.config.ts'
      ]
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