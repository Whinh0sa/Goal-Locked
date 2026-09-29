import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test_setup.ts'],
    pool: 'threads',
    // @ts-expect-error type mismatch with threads option
    threads: {
      singleThread: true,
    },
  },
});
