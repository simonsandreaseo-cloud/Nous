import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@exodus/bytes': resolve(__dirname, './test/mocks/@exodus/bytes'),
      'html-encoding-sniffer': resolve(__dirname, './test/mocks/html-encoding-sniffer.js'),
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**', '**/supabase/functions/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/setup.ts', 'tests/e2e/**'],
    },
    deps: {
      inline: ['html-encoding-sniffer', '@exodus/bytes'],
    },
  },
  poolOptions: {
    singleThread: true,
  },
});
