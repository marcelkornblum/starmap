import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
  // Automatically set base path for GitHub Pages based on standard repo name
  base: process.env.GITHUB_ACTIONS ? '/starmap/' : '/',
  test: {
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'json-summary', 'cobertura'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.stories.@(js|jsx|mjs|ts|tsx)', 'src/main.tsx', 'src/components/prototypes/**'],
      thresholds: {
        lines: 64,
        statements: 65,
        branches: 58,
        functions: 70,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          globals: true,
          environment: 'node',
          setupFiles: ['./tests/setup.ts'],
          server: {
            deps: {
              inline: ['three'],
            },
          },
        },
      },
      ...(process.env.STORYBOOK_TEST
        ? [
            {
              extends: true,
              plugins: [
                storybookTest({
                  configDir: path.join(dirname, '.storybook'),
                }),
              ],
              test: {
                name: 'storybook',
                browser: {
                  enabled: true,
                  headless: true,
                  provider: playwright({}),
                  instances: [{ browser: 'chromium' as const }],
                },
              },
            },
          ]
        : []),
    ],
  }
});