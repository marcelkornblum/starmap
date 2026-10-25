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

    // Tables
    await expect(detailsPane.getByRole('heading', { name: 'Stars' })).toBeVisible();
    await expect(detailsPane.getByRole('heading', { name: 'Planets' })).toBeVisible();
    await expect(
      detailsPane.getByRole('heading', { name: 'Circumstellar Belts & Disks' }),
    ).toBeVisible();

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

    // Orbiting Bodies table showing The Moon (Luna)
    await expect(detailsPane.getByRole('heading', { name: 'Orbiting Bodies' })).toBeVisible();
    await expect(
      detailsPane
        .getByRole('region', { name: 'Orbiting Bodies' })
        .getByRole('link', { name: 'The Moon (Luna)' })
        .first(),
    ).toBeVisible();

    // Planetary Telemetry attributes
    await expect(detailsPane.getByRole('heading', { name: 'Planetary Telemetry' })).toBeVisible();
    await expect(detailsPane.getByText('Surface Gravity')).toBeVisible();
    await expect(detailsPane.getByText('Earth Similarity Index (ESI)')).toBeVisible();
    await expect(detailsPane.getByText('Equilibrium Temp').first()).toBeVisible();
  });

  test('verifies hazardous star system contract for Proxima Centauri', async ({ page }) => {
    await page.goto('/galaxy?focus=proxima-centauri');

    const detailsPane = page.getByRole('complementary', { name: 'Details' });
    await expect(detailsPane).toBeVisible();

    // Identity and spectral class in Peek region
    const peekRegion = detailsPane.getByRole('region', { name: 'Peek' });
    await expect(peekRegion.getByTestId('details-peek-name')).toHaveText('Proxima Centauri');
    await expect(peekRegion.getByRole('link', { name: /M/i }).first()).toBeVisible();

    // Environmental Hazards table with Stellar flare activity
    await expect(
      detailsPane.getByRole('heading', { name: 'Environmental Hazards' }),
    ).toBeVisible();
    await expect(detailsPane.getByText(/hazard|flare|stellar/i).first()).toBeVisible();

    // Planets table with Proxima Centauri b
    await expect(detailsPane.getByRole('heading', { name: 'Planets' })).toBeVisible();
    await expect(detailsPane.getByText(/Proxima/i).first()).toBeVisible();
  });
});
