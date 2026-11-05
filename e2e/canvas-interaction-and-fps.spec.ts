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

  test('searching for a star and clicking the result focuses the star and opens DetailsPanel', async ({
    page,
  }) => {
    await page.goto('/galaxy');

    const rootHost = page.locator('[data-testid="root-canvas-host"]');
    await expect(rootHost).toBeVisible({ timeout: 15_000 });
    const canvas = rootHost.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });

    // Initial camera target should be at Sol (0, 0, 0)
    await expect(rootHost).toHaveAttribute('data-camera-target', /0\.00,\s*0\.00,\s*0\.00/);

    // Locate the search input
    const searchInput = page.getByRole('searchbox', { name: /search query/i });
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    await searchInput.fill('Tau Ceti');

    // Wait for search result to appear and click it
    const tauCetiResultLink = page
      .getByTestId('search-results-group-stars')
      .getByRole('link', { name: 'Tau Ceti', exact: true })
      .first();
    await expect(tauCetiResultLink).toBeVisible({ timeout: 10_000 });
    await tauCetiResultLink.click();

    // Verify URL updates to include focus=tau-ceti
    await expect(page).toHaveURL(/focus=tau-ceti/);

    // Verify DetailsPanel is visible and details-peek-name has text 'Tau Ceti'
    const peekName = page.getByTestId('details-peek-name');
    await expect(peekName).toBeVisible({ timeout: 10_000 });
    await expect(peekName).toHaveText(/Tau Ceti/i);

    // Verify data-camera-target updates to Tau Ceti's coordinates (3.16, 1.54, -1.00)
    await expect(rootHost).toHaveAttribute('data-camera-target', /3\.1[56],\s*1\.5[40],\s*-1\.00?/);
  });

  test('navigating from galaxy to system view and back via breadcrumbs or browser back preserves galaxy camera zoom and position', async ({
    page,
  }) => {
    await page.goto('/galaxy?focus=tau-ceti');

    const rootHost = page.locator('[data-testid="root-canvas-host"]');
    await expect(rootHost).toBeVisible({ timeout: 15_000 });
    const canvas = rootHost.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });

    // Wait for camera telemetry attributes to be populated
    await expect(rootHost).toHaveAttribute('data-camera-pos', /.+/);
    await expect(rootHost).toHaveAttribute('data-camera-target', /3\.1[56]/);

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    // Orbit-drag to modify position
    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(cx + 80, cy + 40, { steps: 8 });
    await page.mouse.up({ button: 'left' });

    // Wheel-zoom to modify focal distance
    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, -300);

    // Wait until OrbitControls damping settles before recording modified telemetry
    let prevSample = '';
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(150);
      const currentSample = `${await rootHost.getAttribute('data-camera-pos')}|${await rootHost.getAttribute('data-camera-dist')}`;
      if (currentSample === prevSample && currentSample.length > 5) {
        break;
      }
      prevSample = currentSample;
    }

    // Record modified galaxy camera telemetry
    const modifiedPos = await rootHost.getAttribute('data-camera-pos');
    const modifiedTarget = await rootHost.getAttribute('data-camera-target');
    const modifiedDist = await rootHost.getAttribute('data-camera-dist');
    expect(modifiedPos).toBeTruthy();
    expect(modifiedTarget).toBeTruthy();
    expect(modifiedDist).toBeTruthy();

    // Expand DetailsPanel if needed and click Details button to navigate to /system/tau-ceti
    const systemLink = page.getByTestId('details-button-system-details');
    if (!(await systemLink.isVisible())) {
      const peekHeader = page.getByTestId('details-panel-heading');
      if (await peekHeader.isVisible()) {
        await peekHeader.click();
      }
    }
    await expect(systemLink).toBeVisible({ timeout: 10_000 });
    await systemLink.click();
    await expect(page).toHaveURL(/\/system\/tau-ceti/);

    // Return to Galaxy via Breadcrumbs link
    const galaxyBreadcrumbLink = page
      .getByTestId('breadcrumb-link')
      .filter({ hasText: 'Galaxy' });
    await expect(galaxyBreadcrumbLink).toBeVisible({ timeout: 10_000 });
    await galaxyBreadcrumbLink.click();

    // Verify URL retains focus=tau-ceti
    await expect(page).toHaveURL(/\/galaxy.*focus=tau-ceti/);

    // Verify galaxy camera values match the pre-navigation modified telemetry
    await expect(rootHost).toHaveAttribute('data-camera-pos', modifiedPos!);
    await expect(rootHost).toHaveAttribute('data-camera-target', modifiedTarget!);
    await expect(rootHost).toHaveAttribute('data-camera-dist', modifiedDist!);

    // Now navigate to /system/tau-ceti again and verify browser back (page.goBack()) restoration
    await expect(systemLink).toBeVisible({ timeout: 10_000 });
    await systemLink.click();
    await expect(page).toHaveURL(/\/system\/tau-ceti/);

    await page.goBack();
    await expect(page).toHaveURL(/\/galaxy.*focus=tau-ceti/);

    // Verify telemetry restored identically after browser back
    await expect(rootHost).toHaveAttribute('data-camera-pos', modifiedPos!);
    await expect(rootHost).toHaveAttribute('data-camera-target', modifiedTarget!);
    await expect(rootHost).toHaveAttribute('data-camera-dist', modifiedDist!);
  });
});
