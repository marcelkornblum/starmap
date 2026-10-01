import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Automatically set base path for GitHub Pages based on standard repo name
  base: process.env.GITHUB_ACTIONS ? '/starmap/' : '/',
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    passWithNoTests: true,
    server: {
      deps: {
        inline: ['three'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'json-summary', 'cobertura'],
      include: ['src/**'],
    },
  },
});

