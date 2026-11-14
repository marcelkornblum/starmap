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
    resolve: {
      dedupe: ['three', '@react-three/fiber', '@react-three/drei', 'maath'],
      alias: [
        {
          find: /^three$/,
          replacement: path.resolve(dirname, 'node_modules/three/build/three.module.js'),
        },
        {
          find: /^@react-three\/fiber$/,
          replacement: path.resolve(dirname, 'node_modules/@react-three/fiber/dist/react-three-fiber.esm.js'),
        },
        {
          find: /^@react-three\/drei$/,
          replacement: path.resolve(dirname, 'node_modules/@react-three/drei/index.js'),
        },
        {
          find: /^maath$/,
          replacement: path.resolve(dirname, 'node_modules/maath/dist/maath.esm.js'),
        },
        {
          find: /^troika-three-text$/,
          replacement: path.resolve(dirname, 'node_modules/troika-three-text/dist/troika-three-text.esm.js'),
        },
        {
          find: /^troika-three-utils$/,
          replacement: path.resolve(dirname, 'node_modules/troika-three-utils/dist/troika-three-utils.esm.js'),
        },
        {
          find: /^meshline$/,
          replacement: path.resolve(dirname, 'node_modules/meshline/dist/index.js'),
        },
        {
          find: /^three-mesh-bvh$/,
          replacement: path.resolve(dirname, 'node_modules/three-mesh-bvh/src/index.js'),
        },
      ],
      mainFields: ['module', 'main'],
    },
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
        reportsDirectory: '/tmp/starmap-coverage',
        reporter: ['text', 'json', 'html', 'json-summary', 'cobertura'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.stories.@(js|jsx|mjs|ts|tsx)', 'src/main.tsx', 'src/components/prototypes/**'],
        thresholds: {
          lines: 78,
          statements: 78,
          branches: 70,
          functions: 78,
        },
      },
      projects: [
        {
          extends: true,
          test: {
            name: 'unit:node',
            globals: true,
            environment: 'node',
            include: ['**/*.test.ts'],
            exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
            setupFiles: ['./tests/setup.ts'],
            server: {
              deps: {
                inline: [
                  /three/,
                  /@react-three/,
                  '@monogrid/gainmap-js',
                  'camera-controls',
                  'meshline',
                  'maath',
                ],
              },
            },
          },
        },
        {
          extends: true,
          test: {
            name: 'unit:dom',
            globals: true,
            environment: 'jsdom',
            include: ['**/*.test.tsx'],
            exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
            setupFiles: ['./tests/setup.ts'],
            server: {
              deps: {
                inline: [
                  /three/,
                  /@react-three/,
                  '@monogrid/gainmap-js',
                  'camera-controls',
                  'meshline',
                  'maath',
                ],
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