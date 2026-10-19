import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CAPTURE_ROUTES,
  STANDARD_VIEWPORTS,
  formatLanUrl,
  generateMarkdownGallery,
  parseCaptureArgs,
  slugifyRoute,
} from '../scripts/capture-views';

describe('capture-views utilities', () => {
  it('defines all 5 ratified standard viewports (Mobile, Tablet Portrait/Landscape, Desktop Standard/Ultrawide)', () => {
    expect(STANDARD_VIEWPORTS).toHaveLength(5);
    expect(STANDARD_VIEWPORTS.map((v) => `${v.width}x${v.height}`)).toEqual([
      '390x844',
      '768x1024',
      '1024x768',
      '1440x900',
      '2560x1440',
    ]);
  });

  it('slugifies routes cleanly for screenshot filenames', () => {
    expect(slugifyRoute('/')).toBe('root');
    expect(slugifyRoute('/galaxy')).toBe('galaxy');
    expect(slugifyRoute('/system/sol?zoom=2')).toBe('system-sol-zoom-2');
    expect(slugifyRoute('http://127.0.0.1:6006/iframe.html?id=shell--default')).toBe(
      'iframe-html-id-shell-default',
    );
  });

  it('formats clickable LAN URLs using the configured host and port', () => {
    expect(formatLanUrl('192.168.1.124', 5173, '/galaxy')).toBe(
      'http://192.168.1.124:5173/galaxy',
    );
    expect(formatLanUrl('192.168.1.124', 5173, 'system/sol')).toBe(
      'http://192.168.1.124:5173/system/sol',
    );
    expect(formatLanUrl('192.168.1.124', 6006, 'http://127.0.0.1:6006/?path=/story/x')).toBe(
      'http://192.168.1.124:6006/?path=/story/x',
    );
  });

  it('parses CLI arguments and applies sensible defaults', () => {
    const defaults = parseCaptureArgs([], '192.168.1.124');
    expect(defaults.port).toBe(5173);
    expect(defaults.lanHost).toBe('192.168.1.124');
    expect(defaults.baseUrl).toBe('http://127.0.0.1:5173');
    expect(defaults.routes).toEqual(DEFAULT_CAPTURE_ROUTES);
    expect(defaults.waitMs).toBe(1200);

    const custom = parseCaptureArgs(
      [
        '--port=6006',
        '--lan-host=10.0.0.5',
        '--routes=/galaxy,/reference',
        '--out-dir=/tmp/shots',
        '--wait-ms=500',
      ],
      '192.168.1.124',
    );
    expect(custom.port).toBe(6006);
    expect(custom.lanHost).toBe('10.0.0.5');
    expect(custom.baseUrl).toBe('http://127.0.0.1:6006');
    expect(custom.routes).toEqual(['/galaxy', '/reference']);
    expect(custom.outDir).toBe('/tmp/shots');
    expect(custom.waitMs).toBe(500);

    const queryWithCommas = parseCaptureArgs([
      '--routes=/galaxy/tau-ceti?route=sol,tau-ceti,/system/sol?route=earth,mars',
    ]);
    expect(queryWithCommas.routes).toEqual([
      '/galaxy/tau-ceti?route=sol,tau-ceti',
      '/system/sol?route=earth,mars',
    ]);
  });

  it('generates Markdown carousel galleries with LAN links and absolute screenshot paths', () => {
    const md = generateMarkdownGallery(
      [
        {
          route: '/galaxy',
          routeSlug: 'galaxy',
          lanUrl: 'http://192.168.1.124:5173/galaxy',
          viewport: STANDARD_VIEWPORTS[0],
          filePath: '/abs/path/galaxy__mobile-portrait.png',
        },
        {
          route: '/galaxy',
          routeSlug: 'galaxy',
          lanUrl: 'http://192.168.1.124:5173/galaxy',
          viewport: STANDARD_VIEWPORTS[3],
          filePath: '/abs/path/galaxy__desktop-standard.png',
        },
      ],
      '192.168.1.124',
      5173,
      6006,
    );

    expect(md).toContain('http://192.168.1.124:5173/galaxy');
    expect(md).toContain('````carousel');
    expect(md).toContain('<!-- slide -->');
    expect(md).toContain('![/galaxy — Mobile Portrait (390×844)](/abs/path/galaxy__mobile-portrait.png)');
    expect(md).toContain('![/galaxy — Desktop Standard (1440×900)](/abs/path/galaxy__desktop-standard.png)');
  });
});
