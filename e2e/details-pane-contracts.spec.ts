import { test, expect } from 'playwright/test';

test.describe('Details Pane Implementation Contracts', () => {
  test.beforeEach(() => {
    test.setTimeout(60_000);
  });

  test('verifies star system details contract for Sol', async ({ page }) => {
    await page.goto('/galaxy?focus=sol');

    const detailsPane = page.getByRole('complementary', { name: 'Details' });
    await expect(detailsPane).toBeVisible();

    // Identity and spectral class
    await expect(detailsPane.getByTestId('details-peek-name')).toHaveText('Sol');
    await expect(
      detailsPane
        .getByRole('region', { name: 'Peek' })
        .getByRole('link', { name: 'G2V' })
        .first(),
    ).toBeVisible();

    // Star count
    await expect(detailsPane.getByTestId('details-star-count')).toHaveText(/1\s*star/);

    // Nominal environment / hazards
    await expect(
      detailsPane.getByText('Nominal environment').first(),
    ).toBeVisible();

    // Orbital Schematic (replacing separate Stars, Planets, and Belts tables)
    await expect(detailsPane.getByRole('heading', { name: 'Orbital Schematic' })).toBeVisible();
    await expect(detailsPane.getByTestId('orbital-schematic-stage').first()).toBeVisible();

    // Telemetry sections
    await expect(detailsPane.getByRole('heading', { name: 'Astrometry' })).toBeVisible();
  });

  test('verifies planet & nested moons contract for Earth', async ({ page }) => {
    await page.goto('/planet/earth?focus=earth');

    const detailsPane = page.getByRole('complementary', { name: 'Details' });
    await expect(detailsPane).toBeVisible();

    // Identity, classification, and habitability
    await expect(detailsPane.getByTestId('details-peek-name')).toHaveText('Earth (Terra)');
    await expect(
      detailsPane
        .getByRole('region', { name: 'Peek' })
        .getByRole('link', { name: /Terrestrial/i })
        .first(),
    ).toBeVisible();
    await expect(
      detailsPane
        .getByRole('region', { name: 'Peek' })
        .getByRole('link', { name: /Habitable Zone/i })
        .first(),
    ).toBeVisible();

    // Orbital Schematic showing The Moon (Luna)
    await expect(detailsPane.getByRole('heading', { name: 'Orbital Schematic' })).toBeVisible();
    await expect(
      detailsPane
        .getByTestId('orbital-schematic-stage')
        .getByRole('link', { name: 'The Moon (Luna)' })
        .first(),
    ).toBeVisible();

    // Planetary Telemetry attributes
    await expect(detailsPane.getByRole('heading', { name: 'Planetary Telemetry' })).toBeVisible();
    await expect(detailsPane.getByText('Surface Gravity')).toBeVisible();
    await expect(detailsPane.getByText('Earth Similarity Index (ESI)')).toBeVisible();
    await expect(detailsPane.getByText('Equilibrium Temp').first()).toBeVisible();
  });

  test('verifies hazardous star system contract for 40 Eridani', async ({ page }) => {
    await page.goto('/galaxy?focus=40-eridani');

    const detailsPane = page.getByRole('complementary', { name: 'Details' });
    await expect(detailsPane).toBeVisible();

    // Identity and spectral class in Peek region
    const peekRegion = detailsPane.getByRole('region', { name: 'Peek' });
    await expect(peekRegion.getByTestId('details-peek-name')).toHaveText('40 Eridani');
    await expect(peekRegion.getByRole('link', { name: /K/i }).first()).toBeVisible();

    // Environmental Hazards table with Stellar flare activity
    await expect(
      detailsPane.getByRole('heading', { name: 'Environmental Hazards' }),
    ).toBeVisible();
    await expect(detailsPane.getByText(/hazard|flare|stellar/i).first()).toBeVisible();

    // Orbital Schematic with HD 26965 b
    await expect(detailsPane.getByRole('heading', { name: 'Orbital Schematic' })).toBeVisible();
    await expect(detailsPane.getByText(/HD 26965/i).first()).toBeVisible();
  });

  test('verifies Sol orbital schematic zones, legend link, minor-body toggle, and Saturn ring zones', async ({
    page,
  }) => {
    await page.goto('/system/sol?focus=sol');

    const detailsPane = page.getByRole('complementary', { name: 'Details' });
    await expect(detailsPane).toBeVisible();
    await expect(detailsPane.getByRole('heading', { name: 'Orbital Schematic' })).toBeVisible();

    const legendLink = detailsPane.getByTestId('orbital-schematic-legend-link');
    await expect(legendLink).toBeVisible();
    await expect(legendLink).toHaveAttribute('href', '/guide/legend');

    await expect(detailsPane.getByTestId('orbital-schematic-hz-group')).toBeVisible();
    await expect(
      detailsPane.getByTestId('orbital-schematic-zone').filter({ hasText: /Main Asteroid Belt/i }),
    ).toBeVisible();
    await expect(
      detailsPane.getByTestId('orbital-schematic-zone').filter({ hasText: /Kuiper Belt/i }),
    ).toBeVisible();

    const minorToggle = detailsPane.getByTestId('orbital-schematic-minor-toggle');
    await expect(minorToggle).toBeVisible();
    await minorToggle.click();

    await expect(
      detailsPane.locator('[data-testid="orbital-schematic-row"][data-line-style="dotted"]').first(),
    ).toBeVisible();

    await page.goto('/planet/saturn?focus=saturn');
    await expect(detailsPane).toBeVisible();
    const ringZones = detailsPane.locator(
      '[data-testid="orbital-schematic-zone"][data-region-kind="ring-system"]',
    );
    await expect(ringZones.first()).toBeVisible();
    await expect(ringZones.filter({ hasText: /Main Rings/i })).toHaveCount(1);
    await expect(ringZones.filter({ hasText: /E Ring/i })).toHaveCount(1);
  });

  test('verifies /guide/legend sections and active Legend navigation state', async ({ page }) => {
    await page.goto('/guide/legend');

    await expect(page.getByTestId('legend-guide-view-root')).toBeVisible();
    await expect(page.getByTestId('legend-lines-section')).toBeVisible();
    await expect(page.getByTestId('legend-zones-section')).toBeVisible();
    await expect(page.getByTestId('legend-symbols-section')).toBeVisible();
    await expect(page.getByTestId('legend-chromaticity-section')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Legend' })).toHaveAttribute('aria-current', 'page');
  });
});
