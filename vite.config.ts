import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));
const TEST_INLINE_DEPS = [
  /three/,
  /@react-three/,
  '@monogrid/gainmap-js',
  'camera-controls',
  'meshline',
  'maath',
];

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig(({ mode }) => {
  const isProduction =
    mode === 'production' ||
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.GITHUB_ACTIONS);
  const base = process.env.BASE_PATH ?? (isProduction ? '/starmap/' : '/');

  return {
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'zustand',
        '@tanstack/react-router',
        'three',
        '@react-three/fiber',
        '@react-three/drei',
      ],
    },
    resolve: {
      // Exact-boundary ESM alias prevents CJS require('three') ([THREE_CJS_DEPRECATED]) in Vitest.
      alias: [
        {
          find: /^three$/,
          replacement: path.resolve(dirname, 'node_modules/three/build/three.module.js'),
        },
      ],
      dedupe: ['three', '@react-three/fiber', '@react-three/drei', 'maath'],
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
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'vendor-react',
                test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                priority: 40,
              },
              {
                name: 'vendor-zustand',
                test: /node_modules[\\/]zustand[\\/]/,
                priority: 35,
              },
              {
                name: 'vendor-router',
                test: /node_modules[\\/]@tanstack[\\/]/,
                priority: 30,
              },
              {
                name: 'vendor-three',
                test: /node_modules[\\/](three|three-stdlib)[\\/]/,
                priority: 20,
              },
              {
                name: 'vendor-r3f',
                test: /node_modules[\\/](@react-three[\\/]fiber|@react-three[\\/]drei|camera-controls|maath|meshline|troika-.*|three-mesh-bvh)[\\/]/,
                priority: 10,
              },
            ],
          },
        },
      },
    },
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
        exclude: ['src/**/*.stories.@(js|jsx|mjs|ts|tsx)', 'src/main.tsx'],
        thresholds: {
          lines: 88,
          statements: 86,
          branches: 76,
          functions: 88,
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
            setupFiles: ['./tests/setup.node.ts'],
            server: {
              deps: {
                inline: TEST_INLINE_DEPS,
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
                inline: TEST_INLINE_DEPS,
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