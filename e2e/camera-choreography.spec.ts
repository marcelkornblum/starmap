import { test, expect } from 'playwright/test';

test.describe('Camera Choreography Contracts (FS-003, FS-012, FS-013)', () => {
  test('FS-013 & FS-012: cold-load centring, focus independence, conditional Centre CTA, and HUD flight retraction', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/system/sol?focus=earth', { waitUntil: 'networkidle' });

    const rootHost = page.locator('[data-testid="root-canvas-host"]');
    await expect(rootHost).toBeVisible({ timeout: 20_000 });
    const canvas = rootHost.locator('canvas');
    await expect(canvas).toHaveAttribute('data-gl-draw-calls', /^[1-9]\d*$/, { timeout: 20_000 });
    await expect(rootHost).not.toHaveAttribute('data-camera-target', '0.00,0.00,0.00', {
      timeout: 10_000,
    });

    const detailsPanel = page.getByTestId('details-panel');
    await expect(detailsPanel).toBeVisible({ timeout: 10_000 });
    if ((await page.locator('[data-testid="details-detent-partial"]').count()) === 0) {
      await page.getByTestId('details-drag-handle').click();
    }

    const bodiesList = page.getByTestId('bodies-panel').getByTestId('bodies-primary-list');
    await expect(bodiesList).toBeVisible({ timeout: 10_000 });

    const centerBtn = page.getByTestId('details-button-center');
    await expect(centerBtn).toHaveCount(0);

    const earthTarget = await rootHost.getAttribute('data-camera-target');
    expect(earthTarget).not.toBeNull();
    expect(earthTarget).not.toBe('0.00,0.00,0.00');

    await bodiesList.getByRole('link', { name: /^Mars$/i }).click();

    await expect(page).toHaveURL(/focus=mars/);
    expect(page.url()).not.toContain('center=mars');
    expect(await rootHost.getAttribute('data-camera-target')).toBe(earthTarget);

    await expect(centerBtn).toBeVisible({ timeout: 10_000 });
    await expect(centerBtn).toHaveAttribute('href', /\/system\/sol\?center=mars&focus=mars/);

    const sawInFlight = await page.evaluate(async () => {
      const shell = document.querySelector('[data-spatial-shell]');
      let observed = false;
      const observer = new MutationObserver(() => {
        if (shell?.getAttribute('data-camera-in-flight') === 'true') {
          observed = true;
        }
      });
      if (shell) {
        observer.observe(shell, { attributes: true, attributeFilter: ['data-camera-in-flight'] });
      }
      const btn = document.querySelector('[data-testid="details-button-center"]');
      if (btn instanceof HTMLElement) {
        btn.click();
      }
      await new Promise((r) => setTimeout(r, 400));
      observer.disconnect();
      return observed || shell?.getAttribute('data-camera-in-flight') === 'true';
    });

    expect(sawInFlight).toBe(true);
    await expect(page.locator('[data-spatial-shell]')).toHaveAttribute(
      'data-camera-in-flight',
      'false',
      { timeout: 6_000 },
    );

    const marsTarget = await rootHost.getAttribute('data-camera-target');
    expect(marsTarget).not.toBe(earthTarget);
    await expect(centerBtn).toHaveCount(0);
  });

  test('FS-012: prefers-reduced-motion settles cross-scale transitions immediately without HUD retraction', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/galaxy?focus=sol', { waitUntil: 'networkidle' });

    const rootHost = page.locator('[data-testid="root-canvas-host"]');
    const canvas = rootHost.locator('canvas');
    await expect(canvas).toHaveAttribute('data-gl-draw-calls', /^[1-9]\d*$/, { timeout: 20_000 });

    const reducedMotionResult = await page.evaluate(async () => {
      const shell = document.querySelector('[data-spatial-shell]');
      let sawInFlight = false;
      const observer = new MutationObserver(() => {
        if (shell?.getAttribute('data-camera-in-flight') === 'true') {
          sawInFlight = true;
        }
      });
      if (shell) {
        observer.observe(shell, { attributes: true, attributeFilter: ['data-camera-in-flight'] });
      }
      const enterLink = document.querySelector('a[href="/system/sol"]');
      if (enterLink instanceof HTMLElement) {
        enterLink.click();
      }
      await new Promise((r) => setTimeout(r, 600));
      observer.disconnect();
      return { sawInFlight };
    });

    expect(reducedMotionResult.sawInFlight).toBe(false);
    await expect(page.getByTestId('system-view-root')).toBeVisible({ timeout: 5_000 });
    await expect(rootHost).toHaveAttribute('data-camera-dist', '22.00', { timeout: 5_000 });
  });

  test('FS-003: settled search typing frames multi-result galactic bounds with selected labels and restores origin on clear', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/galaxy', { waitUntil: 'networkidle' });

    const rootHost = page.locator('[data-testid="root-canvas-host"]');
    const canvas = rootHost.locator('canvas');
    await expect(canvas).toHaveAttribute('data-gl-draw-calls', /^[1-9]\d*$/, { timeout: 20_000 });
    await page.waitForTimeout(600);

    const originTarget = await rootHost.getAttribute('data-camera-target');
    expect(originTarget).toBe('0.00,0.00,0.00');

    const searchInput = page.locator('input[name="query"]');
    await searchInput.click();
    await searchInput.fill('epsilon');

    await expect(page).toHaveURL(/q=epsilon/, { timeout: 5_000 });
    await expect(rootHost).not.toHaveAttribute('data-camera-target', '0.00,0.00,0.00', {
      timeout: 8_000,
    });

    const selectedLabels = page.locator(
      '[data-testid^="entity-label-inner-"][data-state="selected"][data-occluded="false"]',
    );
    await expect
      .poll(async () => selectedLabels.count(), { timeout: 8_000 })
      .toBeGreaterThanOrEqual(4);

    await searchInput.fill('');
    await expect(rootHost).toHaveAttribute('data-camera-target', '0.00,0.00,0.00', {
      timeout: 8_000,
    });
  });
});
