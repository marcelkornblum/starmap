import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export interface ViewportPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  deviceScaleFactor?: number;
}

export const STANDARD_VIEWPORTS: readonly ViewportPreset[] = [
  {
    id: 'mobile-portrait',
    label: 'Mobile Portrait (390×844)',
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
  },
  {
    id: 'tablet-portrait',
    label: 'Tablet Portrait (768×1024)',
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
  },
  {
    id: 'tablet-landscape',
    label: 'Tablet Landscape (1024×768)',
    width: 1024,
    height: 768,
    deviceScaleFactor: 2,
  },
  {
    id: 'desktop-standard',
    label: 'Desktop Standard (1440×900)',
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
  },
  {
    id: 'desktop-ultrawide',
    label: 'Desktop Ultrawide / QHD (2560×1440)',
    width: 2560,
    height: 1440,
    deviceScaleFactor: 1,
  },
] as const;

export const DEFAULT_CAPTURE_ROUTES: readonly string[] = [
  '/',
] as const;

export interface CaptureOptions {
  baseUrl: string;
  lanHost: string;
  port: number;
  routes: string[];
  outDir: string;
  waitMs: number;
}

export interface CapturedScreenshot {
  route: string;
  routeSlug: string;
  lanUrl: string;
  viewport: ViewportPreset;
  filePath: string;
}

/**
 * Resolves the primary IPv4 LAN address of the current host, falling back to 127.0.0.1.
 */
export function resolveLanIp(fallback = '127.0.0.1'): string {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family === 'IPv4' && !entry.internal) {
        return entry.address;
      }
    }
  }
  return fallback;
}

/**
 * Converts a route path (e.g. '/system/sol?zoom=2') into a filesystem-safe slug ('system-sol-zoom-2').
 */
export function slugifyRoute(route: string): string {
  const cleaned = route
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\/+/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return cleaned || 'root';
}

/**
 * Builds the clickable local-network URL for a route.
 */
export function formatLanUrl(lanHost: string, port: number, route: string): string {
  if (/^https?:\/\//.test(route)) {
    return route.replace(/\/\/(localhost|127\.0\.0\.1)(:\d+)?/, `//${lanHost}:${port}`);
  }
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
  return `http://${lanHost}:${port}${normalizedRoute}`;
}

/**
 * Parses CLI flags into a structured CaptureOptions config.
 */
export function parseCaptureArgs(
  argv: readonly string[],
  defaultLanHost = resolveLanIp(),
): CaptureOptions {
  let port = 5173;
  let lanHost = defaultLanHost;
  let baseUrl = '';
  let routes: string[] = [...DEFAULT_CAPTURE_ROUTES];
  let outDir = path.resolve(process.cwd(), 'artifacts/screenshots');
  let waitMs = 1200;

  for (const arg of argv) {
    if (arg.startsWith('--port=')) {
      const parsed = Number(arg.slice('--port='.length));
      if (Number.isFinite(parsed) && parsed > 0) port = parsed;
    } else if (arg.startsWith('--lan-host=')) {
      lanHost = arg.slice('--lan-host='.length).trim() || defaultLanHost;
    } else if (arg.startsWith('--base-url=')) {
      baseUrl = arg.slice('--base-url='.length).trim().replace(/\/+$/, '');
    } else if (arg.startsWith('--routes=')) {
      const list = arg
        .slice('--routes='.length)
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
      if (list.length > 0) routes = list;
    } else if (arg.startsWith('--out-dir=')) {
      const target = arg.slice('--out-dir='.length).trim();
      if (target) outDir = path.resolve(process.cwd(), target);
    } else if (arg.startsWith('--wait-ms=')) {
      const parsed = Number(arg.slice('--wait-ms='.length));
      if (Number.isFinite(parsed) && parsed >= 0) waitMs = parsed;
    }
  }

  if (!baseUrl) {
    baseUrl = `http://127.0.0.1:${port}`;
  }

  return {
    baseUrl,
    lanHost,
    port,
    routes,
    outDir,
    waitMs,
  };
}

/**
 * Generates an embeddable Markdown summary with LAN links and 5-viewport carousels per route.
 */
export function generateMarkdownGallery(
  captures: readonly CapturedScreenshot[],
  lanHost: string,
  appPort = 5173,
  storybookPort = 6006,
): string {
  const lines: string[] = [
    '# Local Network & Multi-Viewport Visual Review',
    '',
    '## Local Network Endpoints',
    `- **Application Dev Server:** [http://${lanHost}:${appPort}](http://${lanHost}:${appPort})`,
    `- **Storybook Server:** [http://${lanHost}:${storybookPort}](http://${lanHost}:${storybookPort})`,
    '',
  ];

  const grouped = new Map<string, CapturedScreenshot[]>();
  for (const item of captures) {
    const bucket = grouped.get(item.route) ?? [];
    bucket.push(item);
    grouped.set(item.route, bucket);
  }

  for (const [route, items] of grouped.entries()) {
    const lanUrl = items[0]?.lanUrl ?? formatLanUrl(lanHost, appPort, route);
    lines.push(`## Route: \`${route}\``);
    lines.push(`- **Live LAN Link:** [${lanUrl}](${lanUrl})`);
    lines.push('');
    lines.push('````carousel');
    items.forEach((shot, idx) => {
      if (idx > 0) {
        lines.push('<!-- slide -->');
      }
      lines.push(`![${route} — ${shot.viewport.label}](${shot.filePath})`);
      lines.push(`*${shot.viewport.label} — \`${route}\`*`);
    });
    lines.push('````');
    lines.push('');
  }

  return lines.join('\n');
}

async function isServerReachable(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok || response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function ensureDevServer(baseUrl: string, port: number): Promise<ChildProcess | null> {
  if (await isServerReachable(baseUrl)) {
    return null;
  }

  const child = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: 'ignore',
    detached: false,
    shell: process.platform === 'win32',
  });

  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (await isServerReachable(baseUrl)) {
      return child;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  child.kill('SIGTERM');
  throw new Error(`Timed out waiting for Vite dev server at ${baseUrl}`);
}

export async function runCapture(options: CaptureOptions): Promise<CapturedScreenshot[]> {
  fs.mkdirSync(options.outDir, { recursive: true });
  let spawnedServer: ChildProcess | null = null;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  const results: CapturedScreenshot[] = [];

  try {
    spawnedServer = await ensureDevServer(options.baseUrl, options.port);
    browser = await chromium.launch({
      headless: true,
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
      ],
    });

    for (const route of options.routes) {
      const routeSlug = slugifyRoute(route);
      const targetUrl = /^https?:\/\//.test(route)
        ? route
        : `${options.baseUrl}${route.startsWith('/') ? route : `/${route}`}`;
      const lanUrl = formatLanUrl(options.lanHost, options.port, route);

      for (const viewport of STANDARD_VIEWPORTS) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
        });
        const page = await context.newPage();

        await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30_000 });
        if (options.waitMs > 0) {
          await page.waitForTimeout(options.waitMs);
        }

        const fileName = `${routeSlug}__${viewport.id}.png`;
        const filePath = path.join(options.outDir, fileName);
        await page.screenshot({ path: filePath, fullPage: false });

        results.push({
          route,
          routeSlug,
          lanUrl,
          viewport,
          filePath,
        });

        await context.close();
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
    if (spawnedServer) {
      spawnedServer.kill('SIGTERM');
    }
  }

  const galleryMarkdown = generateMarkdownGallery(results, options.lanHost, options.port);
  fs.writeFileSync(path.join(options.outDir, 'gallery.md'), galleryMarkdown, 'utf8');

  return results;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const options = parseCaptureArgs(process.argv.slice(2));
  runCapture(options)
    .then((shots) => {
      console.log(`Captured ${shots.length} screenshots across ${options.routes.length} routes into ${options.outDir}`);
      console.log(`LAN Base URL: http://${options.lanHost}:${options.port}`);
      console.log(`Gallery Markdown: ${path.join(options.outDir, 'gallery.md')}`);
    })
    .catch((err: unknown) => {
      console.error('Failed to capture views:', err);
      process.exit(1);
    });
}
