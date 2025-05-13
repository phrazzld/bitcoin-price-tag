import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'test/**', '**/*.config.js'],
    },
    server: {
      // Mock server for tests to avoid ECONNREFUSED errors
      origin: 'http://localhost:3000',
      enabled: true,
      handler(req, res) {
        // Mock server response
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify({ mocked: true }));
        res.end();
      },
    },
    // Exclude browser tests and node_modules tests
    include: ['test/**/*.test.js'],
    exclude: ['test/browser/**', 'node_modules/**'],
  },
});
