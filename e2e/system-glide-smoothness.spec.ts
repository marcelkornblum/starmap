import { test, expect } from 'playwright/test';

test.describe('System View Glide Smoothness Regression Guard', () => {
  test('centring Mars -> Jupiter on /system/sol glides smoothly without main-thread frame freezes', async ({
    page,
  }) => {
    await page.goto('/system/sol', { waitUntil: 'networkidle' });

    const rootHost = page.locator('[data-testid="root-canvas-host"]');
    await expect(rootHost).toBeVisible({ timeout: 15_000 });
    const canvas = rootHost.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    await expect(canvas).toHaveAttribute('data-gl-draw-calls', /^[1-9]\d*$/, { timeout: 15_000 });
    await page.waitForTimeout(800);

    const schematic = page.getByTestId('bodies-panel').getByTestId('orbital-schematic-panel');
    await expect(schematic).toBeVisible({ timeout: 10_000 });

    // Focus & Centre Mars first
    await schematic.getByRole('link', { name: /^Mars$/i }).click();
    const centerBtn = page.getByTestId('details-button-center');
    await expect(centerBtn).toBeVisible({ timeout: 10_000 });
    await centerBtn.click();
    await page.waitForTimeout(1500);

    await schematic.getByRole('link', { name: /^Jupiter$/i }).click();
    await expect(centerBtn).toHaveAttribute('href', /center=jupiter/);
    await page.waitForTimeout(1000);

    // Measure rAF frame deltas strictly across the Centre glide from Mars -> Jupiter
    const glide = await page.evaluate(async () => {
      const host = document.querySelector('[data-testid="root-canvas-host"]');
      const deltas: number[] = [];
      const targetBefore = host?.getAttribute('data-camera-target') ?? null;
      let prev = performance.now();
      let running = true;

      function loop(now: number) {
        deltas.push(Number((now - prev).toFixed(1)));
        prev = now;
        if (running) requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);

      await new Promise((r) => setTimeout(r, 32));
      const cBtn = document.querySelector('[data-testid="details-button-center"]') as HTMLElement | null;
      cBtn?.click();

      await new Promise((r) => setTimeout(r, 1400));
      running = false;
      const targetAfter = host?.getAttribute('data-camera-target') ?? null;

      return { deltas: deltas.slice(2), targetBefore, targetAfter };
    });

    const maxDelta = Math.max(...glide.deltas);
    const sorted = [...glide.deltas].sort((a, b) => a - b);
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    console.log(
      `[System Glide Telemetry] frames=${glide.deltas.length} p95=${p95}ms max=${maxDelta}ms ${glide.targetBefore} -> ${glide.targetAfter}`,
    );

    // Under headless CPU SwiftShader software WebGL (62 draw calls/frame), each WebGL frame
    // takes ~50-90ms (vs <2ms on a hardware GPU), yielding ~18-50 frames over 1.4s.
    // Guard strictly against the 400ms-1800ms synchronous React DOM freeze regression.
    expect(glide.targetAfter).not.toBe(glide.targetBefore);
    expect(glide.deltas.length).toBeGreaterThanOrEqual(15);
    expect(maxDelta).toBeLessThan(250);
    expect(p95).toBeLessThan(200);
  });
});
