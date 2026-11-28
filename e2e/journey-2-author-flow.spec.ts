import { test, expect } from 'playwright/test';
import { panCanvasOffCenter } from './helpers/safeCanvasCenter';

test.describe('Journey 2: The Author Flow (Candidate Hunting & Territory Mapping)', () => {
  test('inspects anchor system relative galactic distances, circumstellar belts, and nested bodies', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    // 1. User navigates to galaxy with Tau Ceti focused, pans off-centre so FS-013 reveals "Centre", and centres it
    await page.goto('/galaxy?focus=tau-ceti');

    const rootHost = page.getByTestId('root-canvas-host');
    await expect(rootHost.locator('canvas')).toBeVisible({ timeout: 15_000 });
    await expect(rootHost).toHaveAttribute('data-camera-target', /3\.1[56],\s*1\.5[40],\s*-1\.00?/, {
      timeout: 10_000,
    });

    const detailsPane = page.getByRole('complementary', { name: 'Details' });
    await expect(detailsPane).toBeVisible();

    await panCanvasOffCenter(page);
    const centreLink = detailsPane.getByRole('link', { name: 'Centre on map' });
    await expect(centreLink).toBeVisible({ timeout: 5_000 });
    await centreLink.click();
    await expect(page).toHaveURL(/center=/);

    // 2. User opens the Objects in View drawer via the top-right button if not already docked on desktop
    const bodiesToggleButton = page.getByRole('button', { name: /Objects in View/i });
    if (await bodiesToggleButton.isVisible()) {
      await bodiesToggleButton.click();
    }

    // 3. Inspects Galactic Systems region
    const galacticSystems = page.getByRole('region', { name: 'Galactic Systems' });
    await expect(galacticSystems).toBeVisible();

    // Verifies relative distances caption ("Distances from Tau Ceti")
    await expect(galacticSystems.getByText(/Distances from Tau Ceti/i)).toBeVisible();

    // Verifies Galactic Systems block list region is visible
    await expect(galacticSystems.getByTestId('bodies-galaxy-systems-list')).toBeVisible();

    await page.goto('/system/sol');

    const bodiesPanel = page.getByTestId('bodies-panel');
    await expect(bodiesPanel).toBeVisible();
    await expect(bodiesPanel.getByTestId('bodies-primary-list')).toBeVisible();

    const mainBeltLink = bodiesPanel
      .getByTestId('bodies-item-link')
      .filter({ hasText: /^Main Asteroid Belt$/ });
    const kuiperBeltLink = bodiesPanel
      .getByTestId('bodies-item-link')
      .filter({ hasText: /^Kuiper Belt$/ });
    await expect(mainBeltLink).toBeVisible({ timeout: 30000 });
    await expect(kuiperBeltLink).toBeVisible({ timeout: 15000 });

    const ceresLink = bodiesPanel.getByRole('link', { name: /Ceres/i });
    const plutoLink = bodiesPanel.getByRole('link', { name: /Pluto/i });
    await expect(ceresLink).toBeVisible({ timeout: 15000 });
    await expect(plutoLink).toBeVisible({ timeout: 15000 });

    await mainBeltLink.click();

    await expect(detailsPane).toBeVisible();
    await expect(
      detailsPane.getByRole('heading', { name: 'Circumstellar Disk Telemetry' }),
    ).toBeVisible();
    const diskTelemetrySection = detailsPane.getByTestId('details-disk-telemetry-list');
    await expect(diskTelemetrySection.getByText('Radial Span')).toBeVisible();
    await expect(diskTelemetrySection.getByText('Composition')).toBeVisible();
  });
});
