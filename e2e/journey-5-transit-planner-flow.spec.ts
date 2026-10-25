import { test, expect } from 'playwright/test';

test.describe('Journey 5: The Transit Planner Flow (Intra-System Logistics & Orbital Timing)', () => {
  test('plans intra-system transfers and verifies route-gating shortcuts', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    // 1. User navigates to Sol system view
    await page.goto('/system/sol');

    // 2. Selects "Mars" in the Orbital Schematic region
    const orbitalSchematic = page.getByRole('region', { name: 'Orbital Schematic' });
    await expect(orbitalSchematic).toBeVisible();

    const marsLink = orbitalSchematic.getByRole('link', { name: 'Mars' });
    await expect(marsLink).toBeVisible({ timeout: 30000 });
    await marsLink.click();

    // 3. Verifies Details pane shows Mars and clicks "Directions"
    const detailsPane = page.getByRole('complementary', { name: 'Details' });
    await expect(detailsPane).toBeVisible();
    await expect(detailsPane.getByTestId('details-peek-name')).toHaveText('Mars');

    const directionsLink = detailsPane.getByRole('link', { name: 'Directions' });
    await expect(directionsLink).toBeVisible();
    await directionsLink.click();

    // Verifies URL route parameter is set to Earth -> Mars
    await expect(page).toHaveURL(/route=earth,mars/i, { timeout: 15000 });

    // 4. Verifies Directions pane shows "Earth → Mars" and intra-system distance in AU
    const directionsPane = page.getByRole('complementary', { name: 'Directions' });
    await expect(directionsPane).toBeVisible();
    await expect(directionsPane.getByTestId('directions-route-title')).toHaveText(/Earth.*→\s*Mars/);
    await expect(directionsPane.getByText(/AU/).first()).toBeVisible();

    // Verifies transfer options include Hohmann Transfer and Brachistochrone profiles
    const hohmannOption = directionsPane.getByRole('link', { name: /Hohmann.*Transfer/i });
    await expect(hohmannOption).toBeVisible();
    await expect(
      directionsPane.getByRole('link', { name: /Brachistochrone/i }).first(),
    ).toBeVisible();

    // 5. Selects "Hohmann Transfer"
    await hohmannOption.click();

    // Verifies Flight Profile telemetry
    await expect(directionsPane.getByRole('heading', { name: 'Flight Profile' })).toBeVisible();
    await expect(directionsPane.getByText('Delta-V')).toBeVisible();
    await expect(directionsPane.getByText('Synodic Period')).toBeVisible();
    await expect(directionsPane.getByText('Ship Time (Proper)')).toBeVisible();

    // Verifies Transit Steps & Timings / comms delay
    await expect(directionsPane.getByText('One-Way Comms')).toBeVisible();

    // 6. Verifies route-gating shortcut (FS-014) on unsupported non-Sol multi-system route
    await page.goto('/galaxy?focus=vega&route=tau-ceti,vega');

    // Verifies role="alert" message showing "Coming soon"
    const alertMessage = page.getByRole('alert');
    await expect(alertMessage).toBeVisible();
    await expect(alertMessage).toHaveText(/Coming soon/i);
  });
});
