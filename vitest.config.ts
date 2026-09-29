import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'threads',
    // @ts-expect-error - vitest types are mismatched with this configuration in current lockfile
    threads: {
      singleThread: true,
    },
  },
});
