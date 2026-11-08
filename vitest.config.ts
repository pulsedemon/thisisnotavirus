import { defineConfig } from 'vitest/config';
import { readFileSync } from 'fs';

function escapeUnsafeChars(str: string): string {
  return str.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export default defineConfig({
  plugins: [
    {
      name: 'handlebars-loader',
      transform(_code: string, id: string) {
        if (id.endsWith('.hbs')) {
          const template = readFileSync(id, 'utf-8');
          return {
            code: `export default function() { return ${escapeUnsafeChars(JSON.stringify(template))}; }`,
            map: null,
          };
        }
        return null;
      },
    },
  ],
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
