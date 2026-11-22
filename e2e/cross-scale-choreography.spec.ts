import { test, expect } from 'playwright/test';

test.describe('Cross-Scale Choreography Diagnostic & Regression Guard', () => {
  test('measures page load, Galaxy -> Sol zoom-in continuity, and Sol -> Galaxy tilt-back', async ({
    page,
  }) => {
    const t0 = Date.now();
    const slowResources: Array<{ url: string; durationMs: number }> = [];
    const reqStarts = new Map<string, number>();

    page.on('request', (req) => {
      reqStarts.set(req.url(), Date.now());
    });
    page.on('requestfinished', (req) => {
      const start = reqStarts.get(req.url());
      if (start !== undefined) {
        const dur = Date.now() - start;
        if (dur > 150) {
          slowResources.push({ url: req.url().replace(/^https?:\/\/[^/]+/, ''), durationMs: dur });
        }
      }
    });

    await page.goto('/galaxy?focus=sol', { waitUntil: 'domcontentloaded' });
    const tDom = Date.now() - t0;

    const rootHost = page.locator('[data-testid="root-canvas-host"]');
    await expect(rootHost).toBeVisible({ timeout: 30_000 });
    const canvas = rootHost.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 30_000 });
    await expect(canvas).toHaveAttribute('data-gl-draw-calls', /^[1-9]\d*$/, { timeout: 30_000 });
    const tWebGL = Date.now() - t0;

    const totalReqs = reqStarts.size;
    slowResources.sort((a, b) => b.durationMs - a.durationMs);
    console.log(
      `[Load Telemetry] dom=${tDom}ms webglReady=${tWebGL}ms totalRequests=${totalReqs} topSlow=${JSON.stringify(slowResources.slice(0, 8))}`,
    );

    await page.waitForTimeout(800);
    const preDivePos = await rootHost.getAttribute('data-camera-pos');
    console.log(`[Pre-Dive Pose] pos=${preDivePos}`);

    // Click Details CTA (href="/system/sol") and record every rAF sample for 3.2s
    const enterBtn = page.locator('a[href="/system/sol"]').first();
    await expect(enterBtn).toBeVisible({ timeout: 10_000 });

    const zoomInTrace = await page.evaluate(async () => {
      const samples: Array<{
        t: number;
        pos: string | null;
        target: string | null;
        dist: string | null;
        rootScope: string | null;
        slotScope: string | null;
      }> = [];
      const host = document.querySelector('[data-testid="root-canvas-host"]');
      const start = performance.now();
      let running = true;

      function tick(now: number) {
        const rootLayer = document.querySelector('[data-testid="canvas-layer"]');
        const slotLayer = document.querySelector('[data-testid="canvas-layer-slot"]');
        samples.push({
          t: Math.round(now - start),
          pos: host?.getAttribute('data-camera-pos') ?? null,
          target: host?.getAttribute('data-camera-target') ?? null,
          dist: host?.getAttribute('data-camera-dist') ?? null,
          rootScope: rootLayer?.getAttribute('data-scope') ?? null,
          slotScope: slotLayer?.getAttribute('data-scope') ?? null,
        });
        if (running) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);

      await new Promise((r) => setTimeout(r, 20));
      const link = document.querySelector('a[href="/system/sol"]') as HTMLElement | null;
      link?.click();

      await new Promise((r) => setTimeout(r, 5000));
      running = false;
      return samples;
    });

    // Deduplicate consecutive identical states so we can see exact transitions & jumps
    const zoomInKeyEvents = zoomInTrace.filter(
      (s, i) =>
        i === 0 ||
        s.pos !== zoomInTrace[i - 1]?.pos ||
        s.rootScope !== zoomInTrace[i - 1]?.rootScope ||
        s.slotScope !== zoomInTrace[i - 1]?.slotScope,
    );
    const bigGaps = zoomInTrace
      .map((s, i) =>
        i > 0 ? { t: s.t, gapMs: s.t - (zoomInTrace[i - 1]?.t ?? s.t), slotScope: s.slotScope } : null,
      )
      .filter((g): g is { t: number; gapMs: number; slotScope: string | null } => g !== null && g.gapMs > 180);
    console.log(`[Zoom-In Key Events (${zoomInKeyEvents.length})]`, JSON.stringify(zoomInKeyEvents));
    console.log(`[Zoom-In Frame Gaps >180ms]`, JSON.stringify(bigGaps));

    await expect(page.getByTestId('system-view-root')).toBeVisible({ timeout: 10_000 });
    await expect(rootHost).toHaveAttribute('data-camera-dist', '22.00', { timeout: 10_000 });
    const systemLandedPos = await rootHost.getAttribute('data-camera-pos');
    const systemLandedDist = await rootHost.getAttribute('data-camera-dist');
    console.log(`[System Landed Pose] pos=${systemLandedPos} dist=${systemLandedDist}`);

    // Now zoom back out to Galaxy via Breadcrumb and record trace
    const zoomOutTrace = await page.evaluate(async () => {
      const samples: Array<{
        t: number;
        pos: string | null;
        target: string | null;
        dist: string | null;
        rootScope: string | null;
        slotScope: string | null;
      }> = [];
      const host = document.querySelector('[data-testid="root-canvas-host"]');
      const start = performance.now();
      let running = true;

      function tick(now: number) {
        const rootLayer = document.querySelector('[data-testid="canvas-layer"]');
        const slotLayer = document.querySelector('[data-testid="canvas-layer-slot"]');
        samples.push({
          t: Math.round(now - start),
          pos: host?.getAttribute('data-camera-pos') ?? null,
          target: host?.getAttribute('data-camera-target') ?? null,
          dist: host?.getAttribute('data-camera-dist') ?? null,
          rootScope: rootLayer?.getAttribute('data-scope') ?? null,
          slotScope: slotLayer?.getAttribute('data-scope') ?? null,
        });
        if (running) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);

      await new Promise((r) => setTimeout(r, 20));
      const galaxyCrumb = Array.from(document.querySelectorAll('a')).find(
        (a) => a.getAttribute('href')?.startsWith('/galaxy'),
      );
      galaxyCrumb?.click();

      await new Promise((r) => setTimeout(r, 3200));
      running = false;
      return samples;
    });

    const zoomOutKeyEvents = zoomOutTrace.filter(
      (s, i) =>
        i === 0 ||
        s.pos !== zoomOutTrace[i - 1]?.pos ||
        s.rootScope !== zoomOutTrace[i - 1]?.rootScope ||
        s.slotScope !== zoomOutTrace[i - 1]?.slotScope,
    );
    console.log(`[Zoom-Out Key Events (${zoomOutKeyEvents.length})]`, JSON.stringify(zoomOutKeyEvents));

    await expect(rootHost).toHaveAttribute('data-camera-pos', preDivePos ?? '', { timeout: 5_000 });
    const postReturnPos = await rootHost.getAttribute('data-camera-pos');
    console.log(`[Post-Return Pose] pos=${postReturnPos} expected=${preDivePos}`);

    expect(postReturnPos).toBe(preDivePos);
  });
});
