import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'controllers/**',
        'middlewares/**',
        'routes/**',
        'utils/**',
      ],
      exclude: ['**/*.test.js'],
    },
  },
});
