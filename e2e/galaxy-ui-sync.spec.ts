/// <reference lib="dom" />
import { test, expect } from 'playwright/test';
import { getSafeCanvasCenter } from './helpers/safeCanvasCenter';

test.describe('3D Canvas <-> DOM UI Synchronization & Mobile DetentSheet', () => {
  test('Desktop (1440x900): syncs live wheel zoom aperture, canvas star clicks, BodiesPanel hover, Escape clear, and route roundtrips', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByTestId('galaxy-view-root')).toBeVisible({ timeout: 15_000 });
    const rootHost = page.getByTestId('root-canvas-host');
    await expect(rootHost.locator('canvas')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1500);

    // 1. Zoom in via live mouse wheel (without ?dist= in URL) and verify BodiesPanel + 3D reticles populate
    await page.mouse.move(500, 450);
    for (let i = 0; i < 28; i++) {
      await page.mouse.wheel(0, -350);
      await page.waitForTimeout(50);
    }

    await expect
      .poll(
        async () =>
          page.locator('[data-testid="bodies-galaxy-systems-list"] [data-testid="bodies-galaxy-system-item"]').count(),
        { timeout: 15_000 },
      )
      .toBeGreaterThan(0);

    // 2. Project Alpha Centauri onto the canvas and click it directly in 3D
    const alphaPoint = await page.evaluate(() => {
      const host = document.querySelector('[data-testid="root-canvas-host"]');
      const canvas = host?.querySelector('canvas');
      if (!host || !canvas) return null;
      const camPos = (host.getAttribute('data-camera-pos') ?? '0,0,10').split(',').map(Number);
      const camTarget = (host.getAttribute('data-camera-target') ?? '0,0,0').split(',').map(Number);
      const viewOffset = (host.getAttribute('data-view-offset') ?? '0,0').split(',').map(Number);
      const box = canvas.getBoundingClientRect();

      let zx = (camPos[0] ?? 0) - (camTarget[0] ?? 0);
      let zy = (camPos[1] ?? 0) - (camTarget[1] ?? 0);
      let zz = (camPos[2] ?? 10) - (camTarget[2] ?? 0);
      const zLen = Math.hypot(zx, zy, zz) || 1;
      zx /= zLen;
      zy /= zLen;
      zz /= zLen;
      let xx = -zy;
      let xy = zx;
      const xLen = Math.hypot(xx, xy) || 1;
      xx /= xLen;
      xy /= xLen;
      const yx = -zz * xy;
      const yy = zz * xx;
      const yz = zx * xy - zy * xx;
      const aspect = box.width / box.height;
      const tanFov = Math.tan(((45 / 2) * Math.PI) / 180);

      const star = [-0.495, -0.414, -1.157];
      const dx = (star[0] ?? 0) - (camPos[0] ?? 0);
      const dy = (star[1] ?? 0) - (camPos[1] ?? 0);
      const dz = (star[2] ?? 0) - (camPos[2] ?? 0);
      const xCam = dx * xx + dy * xy;
      const yCam = dx * yx + dy * yy + dz * yz;
      const zCam = -(dx * zx + dy * zy + dz * zz);
      const ndcX = xCam / (zCam * tanFov * aspect);
      const ndcY = yCam / (zCam * tanFov);
      return {
        x: Math.round(box.x + (ndcX * 0.5 + 0.5) * box.width - (viewOffset[0] ?? 0)),
        y: Math.round(box.y + (-ndcY * 0.5 + 0.5) * box.height - (viewOffset[1] ?? 0)),
      };
    });

    expect(alphaPoint).not.toBeNull();
    if (alphaPoint) {
      await page.mouse.click(alphaPoint.x, alphaPoint.y);
    }

    const detailsPanel = page.getByTestId('details-panel');
    await expect(detailsPanel).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('details-peek-name')).toHaveText('Alpha Centauri');
    const desktopBox = await detailsPanel.boundingBox();
    expect(desktopBox).not.toBeNull();
    if (desktopBox) {
      expect(desktopBox.height).toBeGreaterThan(200);
    }

    // 3. Hover an on-screen active row in BodiesPanel (WISE 0855-0714) and verify its 3D label elevates active -> selected -> active via outerStore -> scopedStore bridge
    const hoverRow = page
      .locator('[data-testid="bodies-galaxy-system-item"][data-system-id="wise-0855"]')
      .first();
    await expect(hoverRow).toBeVisible();
    await expect(page.getByTestId('entity-label-inner-wise-0855')).toHaveAttribute(
      'data-state',
      'active',
    );
    await hoverRow.hover();
    await expect(page.getByTestId('entity-label-inner-wise-0855')).toHaveAttribute(
      'data-state',
      'selected',
      { timeout: 5_000 },
    );
    await page.mouse.move(500, 100);
    await expect(page.getByTestId('entity-label-inner-wise-0855')).toHaveAttribute(
      'data-state',
      'active',
      { timeout: 5_000 },
    );

    // 4. Press Escape to clear focus and verify both DetailsPanel and 3D focus clear
    await page.keyboard.press('Escape');
    await expect(detailsPanel).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('entity-label-inner-hip-71683')).not.toHaveAttribute(
      'data-state',
      'focused',
    );

    // 5. Route roundtrip /galaxy?focus=sol -> /system/sol -> /galaxy still keeps canvas clicks wired
    await page.goto('/galaxy?focus=sol&dist=8');
    await expect(detailsPanel).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('details-button-system-details').click();
    await expect(page).toHaveURL(/\/system\/sol/);
    await expect(page.getByTestId('system-view-root')).toBeVisible({ timeout: 10_000 });

    await page
      .locator('[data-spatial-region="breadcrumbs"] a', { hasText: 'Galaxy' })
      .first()
      .click();
    await expect(page.getByTestId('galaxy-view-root')).toBeVisible({ timeout: 10_000 });
    await expect(detailsPanel).toBeVisible({ timeout: 10_000 });
    expect(errors).toEqual([]);
  });

  test('Mobile (390x844): tapping a star displays visible identity header in peek, keeps ControlBar unobscured, and expands to partial on tap', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?dist=10');
    await expect(page.getByTestId('galaxy-view-root')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1500);

    // Tap Sol at safe optical centre
    const safeMobile = await getSafeCanvasCenter(page);
    await page.mouse.click(safeMobile.x, safeMobile.y);

    const detailsPanel = page.getByTestId('details-panel');
    await expect(detailsPanel).toBeVisible({ timeout: 10_000 });
    await expect(detailsPanel).toHaveAttribute('data-detent', 'peek');

    const peekSection = page.getByTestId('details-detent-peek');
    const peekName = page.getByTestId('details-peek-name');
    await expect(peekName).toHaveText('Sol');

    const panelBox = await detailsPanel.boundingBox();
    const peekBox = await peekSection.boundingBox();
    const nameBox = await peekName.boundingBox();
    const controlToggle = page.getByTestId('control-bar-mobile-toggle');
    const controlBox = await controlToggle.boundingBox();

    expect(panelBox).not.toBeNull();
    expect(peekBox).not.toBeNull();
    expect(nameBox).not.toBeNull();
    expect(controlBox).not.toBeNull();

    if (panelBox && peekBox && nameBox && controlBox) {
      // Peek section and star name must have non-zero height and sit visibly inside the 56px sheet
      expect(panelBox.height).toBe(56);
      expect(peekBox.height).toBeGreaterThanOrEqual(18);
      expect(nameBox.height).toBeGreaterThanOrEqual(14);
      expect(nameBox.y).toBeGreaterThanOrEqual(panelBox.y);
      expect(nameBox.y + nameBox.height).toBeLessThanOrEqual(panelBox.y + panelBox.height);

      // Mobile ControlBar toggle button must sit above the peek sheet (never covered by it)
      expect(controlBox.y + controlBox.height).toBeLessThanOrEqual(panelBox.y);
    }

    // Tapping the peek section expands the sheet to partial detent, revealing action controls
    await peekName.click();
    await expect(detailsPanel).toHaveAttribute('data-detent', 'partial');
    const expandedBox = await detailsPanel.boundingBox();
    expect(expandedBox).not.toBeNull();
    if (expandedBox) {
      expect(expandedBox.height).toBeGreaterThanOrEqual(300);
    }
    await expect(page.getByTestId('details-button-system-details')).toBeVisible();
  });

  test('Search result selection displays visible 3D focused entity label across default and zoomed apertures', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByTestId('galaxy-view-root')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1500);

    const assertSearchTargetLabelVisible = async (query: string) => {
      const searchInput = page.getByRole('searchbox', { name: /search query/i });
      await searchInput.click();
      await searchInput.fill('');
      await searchInput.pressSequentially(query, { delay: 35 });
      const firstResult = page
        .locator('[data-testid="search-result-item"][data-target-view="galaxy"] a')
        .first();
      await expect(firstResult).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(250);
      await firstResult.click();

      const focusedLabel = page
        .locator('[data-testid^="entity-label-inner-"][data-state="focused"]')
        .first();
      await expect(focusedLabel).toBeVisible({ timeout: 10_000 });
      await expect(focusedLabel).toHaveAttribute('data-occluded', 'false');
      const box = await focusedLabel.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeGreaterThan(40);
        expect(box.height).toBeGreaterThan(20);
      }
    };

    await assertSearchTargetLabelVisible('Tau Ceti');
    await assertSearchTargetLabelVisible('51 Pegasi');
    await assertSearchTargetLabelVisible('Aldebaran');
    await assertSearchTargetLabelVisible('Betelgeuse');
    await assertSearchTargetLabelVisible('Kepler');
    await assertSearchTargetLabelVisible('Sirius');

    // Also verify when zoomed in (dist=10)
    await page.goto('/galaxy?dist=10');
    await page.waitForTimeout(1500);
    await assertSearchTargetLabelVisible('Tau Ceti');
    await assertSearchTargetLabelVisible('Barnard');
    await assertSearchTargetLabelVisible('51 Pegasi');
  });
});
