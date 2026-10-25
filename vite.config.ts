import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig(({ mode }) => {
  const isProduction =
    mode === 'production' ||
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.GITHUB_ACTIONS);
  const base = process.env.BASE_PATH ?? (isProduction ? '/starmap/' : '/');

  return {
    plugins: [
      react(),
      {
        name: 'spa-fallback-404',
        closeBundle() {
          const distDir = path.resolve(dirname, 'dist');
          const indexPath = path.resolve(distDir, 'index.html');
          const fallbackPath = path.resolve(distDir, '404.html');
          if (fs.existsSync(indexPath)) {
            fs.copyFileSync(indexPath, fallbackPath);
          }
        },
      },
    ],
    // Set base path for production deployment under /starmap/
    base,
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      allowedHosts: true,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      strictPort: true,
      allowedHosts: true,
    },
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
            exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
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
    },
  };
});