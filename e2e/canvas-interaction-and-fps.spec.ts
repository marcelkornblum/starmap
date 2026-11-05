/// <reference lib="dom" />
import { test, expect } from 'playwright/test';

test.describe('3D Canvas Interaction & FPS Telemetry', () => {
  test('pointer hit-test confirms canvas receives pointer events at stage center without overlay occlusion', async ({
    page,
  }) => {
    await page.goto('/galaxy');

    const rootHost = page.locator('[data-testid="root-canvas-host"]');
    await expect(rootHost).toBeVisible({ timeout: 15_000 });
    const canvas = rootHost.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    const hit = await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return {
          tagName: el?.tagName.toLowerCase(),
          isInsideRootCanvasHost: Boolean(el?.closest('[data-testid="root-canvas-host"]')),
        };
      },
      { x: cx, y: cy },
    );

    expect(hit.tagName).toBe('canvas');
    expect(hit.isInsideRootCanvasHost).toBe(true);
  });

  test('orbit drag (left-button drag) updates camera position telemetry', async ({ page }) => {
    await page.goto('/galaxy');

    const rootHost = page.locator('[data-testid="root-canvas-host"]');
    await expect(rootHost).toBeVisible({ timeout: 15_000 });
    const canvas = rootHost.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });

    // Wait until initial camera position telemetry is populated
    await expect(rootHost).toHaveAttribute('data-camera-pos', /.+/);
    const initialPos = await rootHost.getAttribute('data-camera-pos');
    expect(initialPos).toBeTruthy();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    // Perform left-button orbit drag gesture
    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(cx + 120, cy + 60, { steps: 10 });
    await page.mouse.up({ button: 'left' });

    // Verify telemetry attribute data-camera-pos updated
    await expect(rootHost).not.toHaveAttribute('data-camera-pos', initialPos!);
  });

  test('pan drag (right-button drag) updates camera target telemetry', async ({ page }) => {
    await page.goto('/galaxy');

    const rootHost = page.locator('[data-testid="root-canvas-host"]');
    await expect(rootHost).toBeVisible({ timeout: 15_000 });
    const canvas = rootHost.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });

    await expect(rootHost).toHaveAttribute('data-camera-target', /.+/);
    const initialTarget = await rootHost.getAttribute('data-camera-target');
    expect(initialTarget).toBeTruthy();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    // Perform right-button pan drag gesture
    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(cx + 100, cy + 50, { steps: 10 });
    await page.mouse.up({ button: 'right' });

    // Verify telemetry attribute data-camera-target updated
    await expect(rootHost).not.toHaveAttribute('data-camera-target', initialTarget!);
  });

  test('wheel zoom decreases camera focal distance telemetry', async ({ page }) => {
    await page.goto('/galaxy');

    const rootHost = page.locator('[data-testid="root-canvas-host"]');
    await expect(rootHost).toBeVisible({ timeout: 15_000 });
    const canvas = rootHost.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });

    await expect(rootHost).toHaveAttribute('data-camera-dist', /.+/);
    const initialDistStr = await rootHost.getAttribute('data-camera-dist');
    expect(initialDistStr).toBeTruthy();
    const initialDist = parseFloat(initialDistStr!);

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    // Scroll up (negative deltaY) to zoom in
    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, -400);

    // Verify focal distance decreases
    await expect
      .poll(
        async () => {
          const distStr = await rootHost.getAttribute('data-camera-dist');
          return parseFloat(distStr ?? '0');
        },
        { timeout: 5_000 },
      )
      .toBeLessThan(initialDist);
  });

  test('3D raycast tap / click selection at canvas center selects Sol and opens Details panel', async ({
    page,
  }) => {
    // Navigate at dist=10 pc so aperture active count (~20 stars) remains well within the desktop active cutoff (<= 96)
    await page.goto('/galaxy?dist=10');

    const rootHost = page.locator('[data-testid="root-canvas-host"]');
    await expect(rootHost).toBeVisible({ timeout: 15_000 });
    const canvas = rootHost.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });

    // Ensure camera telemetry has settled
    await expect(rootHost).toHaveAttribute('data-camera-pos', /.+/);

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    // Wait for R3F frame pass so scene matrices and reticle hit areas are initialized
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });
    });
    await page.waitForTimeout(250);

    // Click at the exact canvas center where Sol [0, 0, 0] is projected
    await page.mouse.click(cx, cy);

    // Verify URL updates to include focus=sol
    await expect(page).toHaveURL(/focus=sol/, { timeout: 10_000 });

    // Verify Details panel opens and displays Sol
    const detailsPane = page.getByRole('complementary', { name: 'Details' });
    await expect(detailsPane).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('details-peek-name')).toHaveText('Sol');
  });

  test('frame rate telemetry measures active rendering (FPS > 10) during live orbit drag gesture', async ({
    page,
  }) => {
    await page.goto('/galaxy');

    const rootHost = page.locator('[data-testid="root-canvas-host"]');
    await expect(rootHost).toBeVisible({ timeout: 15_000 });
    const canvas = rootHost.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });

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

    // Perform continuous orbit drag gesture across ~1,000ms
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

    // Stop recording and compute FPS, mean frame time, and p95 frame time
    const stats = await page.evaluate(() => {
      const state = window as unknown as { __rafTimestamps: number[]; __rafRunning: boolean };
      state.__rafRunning = false;
      const timestamps = state.__rafTimestamps;
      if (timestamps.length < 2) {
        return { fps: 0, meanFrameTime: 0, p95FrameTime: 0, frameCount: timestamps.length, totalDuration: 0 };
      }
      const deltas: number[] = [];
      for (let i = 1; i < timestamps.length; i++) {
        deltas.push(timestamps[i] - timestamps[i - 1]);
      }
      const totalDuration = timestamps[timestamps.length - 1] - timestamps[0];
      const fps = (deltas.length / totalDuration) * 1000;
      const meanFrameTime = totalDuration / deltas.length;

      const sortedDeltas = [...deltas].sort((a, b) => a - b);
      const p95Index = Math.min(
        sortedDeltas.length - 1,
        Math.floor(sortedDeltas.length * 0.95),
      );
      const p95FrameTime = sortedDeltas[p95Index];

      return {
        fps,
        meanFrameTime,
        p95FrameTime,
        frameCount: deltas.length,
        totalDuration,
      };
    });

    console.log(
      `[FPS Telemetry] Measured: ${stats.fps.toFixed(1)} FPS | Mean Frame Time: ${stats.meanFrameTime.toFixed(2)}ms | p95 Frame Time: ${stats.p95FrameTime.toFixed(2)}ms (${stats.frameCount} frames over ${stats.totalDuration.toFixed(0)}ms)`,
    );

    expect(stats.fps).toBeGreaterThan(10);
  });

  test('touch hygiene and mobile gestures: overscroll-behavior is none, user-select is none, and tap highlight is transparent', async ({
    page,
  }) => {
    await page.goto('/galaxy');

    const rootHost = page.locator('[data-testid="root-canvas-host"]');
    await expect(rootHost).toBeVisible({ timeout: 15_000 });

    const styles = await page.evaluate(() => {
      const bodyStyle = window.getComputedStyle(document.body);
      const host = document.querySelector('[data-testid="root-canvas-host"]');
      const hostStyle = host ? window.getComputedStyle(host) : null;
      return {
        bodyOverscroll: bodyStyle.overscrollBehavior,
        bodyUserSelect: bodyStyle.userSelect,
        bodyTapHighlight: (bodyStyle as any).webkitTapHighlightColor,
        hostOverscroll: hostStyle?.overscrollBehavior,
        hostUserSelect: hostStyle?.userSelect,
        hostTapHighlight: hostStyle ? (hostStyle as any).webkitTapHighlightColor : null,
      };
    });

    expect(styles.bodyOverscroll).toBe('none');
    expect(styles.bodyUserSelect).toBe('none');
    expect(styles.bodyTapHighlight).toBe('rgba(0, 0, 0, 0)');

    expect(styles.hostOverscroll).toBe('none');
    expect(styles.hostUserSelect).toBe('none');
    expect(styles.hostTapHighlight).toBe('rgba(0, 0, 0, 0)');
  });

  test('focusing a non-Sol star system renders Details link to its own system and navigating renders the star scene', async ({
    page,
  }) => {
    await page.goto('/galaxy?focus=tau-ceti');

    const detailsPane = page.getByRole('complementary', { name: 'Details' });
    await expect(detailsPane).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('details-peek-name')).toHaveText('Tau Ceti');

    // Details action link pointing to /system/tau-ceti (located in partial detent section)
    const systemLink = page.getByTestId('details-button-system-details');
    if (!await systemLink.isVisible()) {
      const handle = page.locator('[data-testid$="-detent-sheet-handle"], [data-testid="details-peek-header"]').first();
      if (await handle.isVisible()) {
        await handle.click();
      }
    }
    await expect(systemLink).toBeVisible({ timeout: 10_000 });
    const href = await systemLink.getAttribute('href');
    expect(href).toContain('/system/tau-ceti');
    expect(href).not.toContain('/system/sol');

    // Click the system details link
    await systemLink.click();
    await expect(page).toHaveURL(/\/system\/tau-ceti/);

    // Breadcrumb navigation contains 'Tau Ceti' and does not contain 'Sol'
    const breadcrumbs = page.getByRole('navigation', { name: /breadcrumb/i });
    await expect(breadcrumbs).toBeVisible({ timeout: 15_000 });
    await expect(breadcrumbs).toHaveText(/Tau Ceti/i);
    expect(await breadcrumbs.textContent()).not.toContain('Sol');

    // Verify 3D canvas stage is mounted and active
    const rootHost = page.locator('[data-testid="root-canvas-host"]');
    await expect(rootHost).toBeVisible();
    const canvas = rootHost.locator('canvas');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    // Wait for R3F frame pass so scene matrices and reticle hit areas are initialized
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });
    });
    await page.waitForTimeout(250);

    // Click the centre of the 3D canvas on /system/tau-ceti to raycast-select the central star in SystemScene
    await page.mouse.click(cx, cy);

    // Assert details-peek-name displays Tau Ceti (proving SystemScene rendered Tau Ceti at [0, 0, 0] and not Sol)
    await expect(page.getByTestId('details-peek-name')).toHaveText(/Tau Ceti/i, { timeout: 10_000 });
  });
});
