import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from 'playwright/test';

export interface FrameTimeMetrics {
  readonly fps: number;
  readonly meanFrameTimeMs: number;
  readonly p95FrameTimeMs: number;
  readonly frameCount?: number;
  readonly totalDuration?: number;
}

export type FrameTimeBaseline = Record<string, FrameTimeMetrics>;

const SPATIAL_VIEWS = [
  { route: '/galaxy', rootTestId: 'galaxy-view-root' },
  { route: '/system/sol', rootTestId: 'system-view-root' },
  { route: '/planet/earth', rootTestId: 'planet-view-root' },
] as const;

async function measurePointerDragMetrics(
  page: Page,
  route: string,
  rootTestId: string,
): Promise<FrameTimeMetrics> {
  await page.goto(route);
  await expect(page.getByTestId(rootTestId)).toBeVisible({ timeout: 15_000 });

  const rootHost = page.locator('[data-testid="root-canvas-host"]');
  await expect(rootHost).toBeVisible({ timeout: 15_000 });
  const canvas = rootHost.locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 15_000 });

  // Settle initial scene hydration
  await page.waitForTimeout(500);

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const cx = box!.x + box!.width / 2;
  const cy = box!.y + box!.height / 2;

  // Start requestAnimationFrame timestamp recording in the browser context
  await page.evaluate(() => {
    (window as unknown as { __rafTimestamps: number[]; __rafRunning: boolean }).__rafTimestamps = [];
    (window as unknown as { __rafTimestamps: number[]; __rafRunning: boolean }).__rafRunning = true;
    function recordFrame(now: number) {
      const state = window as unknown as { __rafTimestamps: number[]; __rafRunning: boolean };
      if (!state.__rafRunning) return;
      state.__rafTimestamps.push(now);
      requestAnimationFrame(recordFrame);
    }
    requestAnimationFrame(recordFrame);
  });

  // Perform continuous 30-step pointer drag across ~900ms
  await page.mouse.move(cx, cy);
  await page.mouse.down({ button: 'left' });
  const radius = 80;
  const steps = 30;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    await page.mouse.move(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    await page.waitForTimeout(30);
  }
  await page.mouse.up({ button: 'left' });

  // Stop recording and compute metrics
  const stats = await page.evaluate(() => {
    const state = window as unknown as { __rafTimestamps: number[]; __rafRunning: boolean };
    state.__rafRunning = false;
    const timestamps = state.__rafTimestamps;
    if (timestamps.length < 2) {
      return { fps: 0, meanFrameTimeMs: 0, p95FrameTimeMs: 0, frameCount: timestamps.length, totalDuration: 0 };
    }
    const deltas: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      deltas.push(timestamps[i] - timestamps[i - 1]);
    }
    const totalDuration = timestamps[timestamps.length - 1] - timestamps[0];
    const fps = (deltas.length / totalDuration) * 1000;
    const meanFrameTimeMs = totalDuration / deltas.length;

    const sortedDeltas = [...deltas].sort((a, b) => a - b);
    const p95Index = Math.min(
      sortedDeltas.length - 1,
      Math.floor(sortedDeltas.length * 0.95),
    );
    const p95FrameTimeMs = sortedDeltas[p95Index];

    return {
      fps: Number(fps.toFixed(2)),
      meanFrameTimeMs: Number(meanFrameTimeMs.toFixed(2)),
      p95FrameTimeMs: Number(p95FrameTimeMs.toFixed(2)),
      frameCount: deltas.length,
      totalDuration: Number(totalDuration.toFixed(2)),
    };
  });

  console.log(
    `[Frame-Time Telemetry] ${route} Measured: ${stats.fps.toFixed(1)} FPS | Mean: ${stats.meanFrameTimeMs.toFixed(2)}ms | p95: ${stats.p95FrameTimeMs.toFixed(2)}ms (${stats.frameCount} frames over ${stats.totalDuration.toFixed(0)}ms)`,
  );

  return stats;
}

test.describe('Spatial View Frame-Time Baseline Guard (AUD-009, DEC-R016)', () => {
  test.setTimeout(90_000);

  test('measures frame times during pointer drag and asserts against baseline <= 25% tolerance', async ({
    page,
  }) => {
    const measuredResults: Record<string, FrameTimeMetrics> = {};

    for (const { route, rootTestId } of SPATIAL_VIEWS) {
      const metrics = await measurePointerDragMetrics(page, route, rootTestId);
      measuredResults[route] = metrics;
    }

    // Write measured metrics to /tmp/starmap-test-results/frame-times.json
    const outDir = '/tmp/starmap-test-results';
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'frame-times.json');
    fs.writeFileSync(outPath, JSON.stringify(measuredResults, null, 2), 'utf-8');
    console.log(`[Frame-Time Telemetry] Saved measured metrics to ${outPath}`);

    // Load baseline from scripts/guards/frame-time-baseline.json
    const baselinePath = path.resolve(process.cwd(), 'scripts/guards/frame-time-baseline.json');
    expect(fs.existsSync(baselinePath)).toBe(true);

    const baseline: FrameTimeBaseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));

    // Assert that each view does not regress beyond +25% tolerance
    for (const { route } of SPATIAL_VIEWS) {
      const measured = measuredResults[route];
      const targetBaseline = baseline[route];
      expect(targetBaseline).toBeDefined();

      const maxAllowedP95 = targetBaseline.p95FrameTimeMs * 1.25;
      expect(
        measured.p95FrameTimeMs,
        `[DEC-R016 Frame-Time Regression] ${route} measured p95 frame time (${measured.p95FrameTimeMs}ms) exceeded baseline (${targetBaseline.p95FrameTimeMs}ms) by more than 25% (threshold: ${maxAllowedP95.toFixed(2)}ms)`,
      ).toBeLessThanOrEqual(maxAllowedP95);
    }
  });
});
