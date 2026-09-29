import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'threads',
    // @ts-expect-error threads is deprecated but we keep it for now as per memory guidelines
    threads: {
      singleThread: true,
    },
  },
});
