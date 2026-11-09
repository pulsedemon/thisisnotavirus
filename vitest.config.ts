import { defineConfig } from 'vitest/config';
import { handlebarsLoader } from './build-utils/handlebars-loader';

export default defineConfig({
  plugins: [handlebarsLoader()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        'test-utils/**',
      ],
      // today's coverage rounded down, so the gate blocks regressions. raise it as tests land
      thresholds: {
        branches: 21,
        functions: 26,
        lines: 20,
        statements: 20,
      },
    },
  },
});
