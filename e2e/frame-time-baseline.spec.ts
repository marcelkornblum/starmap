import fs from 'node:fs';
import os from 'node:os';
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
  if (!box) {
    throw new Error('Canvas bounding box could not be retrieved');
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Drive 30-frame pointer drag and rAF timestamp collection entirely inside the browser context (zero CDP IPC roundtrip latency)
  const stats = await page.evaluate(
    ({ centerX, centerY }) =>
      new Promise<{
        fps: number;
        meanFrameTimeMs: number;
        p95FrameTimeMs: number;
        frameCount: number;
        totalDuration: number;
      }>((resolve) => {
        const canvasEl = document.querySelector('[data-testid="root-canvas-host"] canvas');
        const timestamps: number[] = [];
        const radius = 80;
        const totalSteps = 30;
        let step = 0;

        if (canvasEl) {
          canvasEl.dispatchEvent(
            new PointerEvent('pointerdown', {
              clientX: centerX,
              clientY: centerY,
              button: 0,
              buttons: 1,
              bubbles: true,
            }),
          );
        }

        function onFrame(now: number) {
          timestamps.push(now);
          if (step < totalSteps) {
            const angle = (step / totalSteps) * Math.PI * 2;
            if (canvasEl) {
              canvasEl.dispatchEvent(
                new PointerEvent('pointermove', {
                  clientX: centerX + Math.cos(angle) * radius,
                  clientY: centerY + Math.sin(angle) * radius,
                  button: 0,
                  buttons: 1,
                  bubbles: true,
                }),
              );
            }
            step++;
            requestAnimationFrame(onFrame);
            return;
          }

          if (canvasEl) {
            canvasEl.dispatchEvent(
              new PointerEvent('pointerup', {
                clientX: centerX,
                clientY: centerY,
                button: 0,
                buttons: 0,
                bubbles: true,
              }),
            );
          }

          if (timestamps.length < 2) {
            resolve({ fps: 0, meanFrameTimeMs: 0, p95FrameTimeMs: 0, frameCount: timestamps.length, totalDuration: 0 });
            return;
          }

          const deltas: number[] = [];
          for (let i = 1; i < timestamps.length; i++) {
            deltas.push(timestamps[i] - timestamps[i - 1]);
          }
          const totalDuration = timestamps[timestamps.length - 1] - timestamps[0];
          const fps = (deltas.length / totalDuration) * 1000;
          const meanFrameTimeMs = totalDuration / deltas.length;
          const sortedDeltas = [...deltas].sort((a, b) => a - b);
          const p95Index = Math.min(sortedDeltas.length - 1, Math.floor(sortedDeltas.length * 0.95));
          const p95FrameTimeMs = sortedDeltas[p95Index];

          resolve({
            fps: Number(fps.toFixed(2)),
            meanFrameTimeMs: Number(meanFrameTimeMs.toFixed(2)),
            p95FrameTimeMs: Number(p95FrameTimeMs.toFixed(2)),
            frameCount: deltas.length,
            totalDuration: Number(totalDuration.toFixed(2)),
          });
        }

        requestAnimationFrame(onFrame);
      }),
    { centerX: cx, centerY: cy },
  );

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

    // Write measured metrics to starmap-test-results/frame-times.json
    const outDir = path.join(os.tmpdir(), 'starmap-test-results');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'frame-times.json');
    fs.writeFileSync(outPath, `${JSON.stringify(measuredResults, null, 2)}\n`, 'utf-8');
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
