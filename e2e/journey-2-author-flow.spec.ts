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
    const centreLink = detailsPane.getByRole('link', { name: 'Centre' });
    await expect(centreLink).toBeVisible({ timeout: 5_000 });
    await centreLink.click();
    await expect(page).toHaveURL(/center=/);

    // 2. User opens the Galactic Systems drawer via the Bodies button if not already open on desktop
    const bodiesToggleButton = page.getByRole('button', { name: /Bodies/i });
    if (await bodiesToggleButton.isVisible()) {
      await bodiesToggleButton.click();
    }

    // 3. Inspects Galactic Systems region
    const galacticSystems = page.getByRole('region', { name: 'Galactic Systems' });
    await expect(galacticSystems).toBeVisible();

    // Verifies relative distances caption ("Distances from Tau Ceti")
    await expect(galacticSystems.getByText(/Distances from Tau Ceti/i)).toBeVisible();

    // Verifies table headers: System, Class, Planets, Status, Distance
    await expect(galacticSystems.getByRole('columnheader', { name: 'System' })).toBeVisible();
    await expect(galacticSystems.getByRole('columnheader', { name: 'Class' })).toBeVisible();
    await expect(galacticSystems.getByRole('columnheader', { name: 'Planets' })).toBeVisible();
    await expect(galacticSystems.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(galacticSystems.getByRole('columnheader', { name: 'Distance' })).toBeVisible();

    // 4. Transitions to rich multi-belt system (/system/sol)
    await page.goto('/system/sol');

    // 5. Inspects Orbital Schematic region for interleaved belts and nested resident dwarf planets
    const orbitalSchematic = page.getByRole('region', { name: 'Orbital Schematic' });
    await expect(orbitalSchematic).toBeVisible();

    // Interleaved circumstellar belts (Main Asteroid Belt, Kuiper Belt)
    const mainBeltLink = orbitalSchematic.getByRole('link', { name: 'Main Asteroid Belt' });
    const kuiperBeltLink = orbitalSchematic.getByRole('link', { name: 'Kuiper Belt' });
    await expect(mainBeltLink).toBeVisible({ timeout: 30000 });
    await expect(kuiperBeltLink).toBeVisible({ timeout: 15000 });

    // Verifies radial span is rendered for belts
    await expect(orbitalSchematic.getByText(/AU/).first()).toBeVisible();

    // Nested resident dwarf planets (Ceres, Pluto) in Orbital Schematic
    const ceresLink = orbitalSchematic.getByRole('link', { name: /Ceres/i });
    const plutoLink = orbitalSchematic.getByRole('link', { name: /Pluto/i });
    await expect(ceresLink).toBeVisible({ timeout: 15000 });
    await expect(plutoLink).toBeVisible({ timeout: 15000 });

    // 6. Clicks "Main Asteroid Belt" and verifies Circumstellar Disk Telemetry in Details pane
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
