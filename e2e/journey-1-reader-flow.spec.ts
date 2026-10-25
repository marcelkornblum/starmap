import { test, expect } from 'playwright/test';

test.describe('Journey 1: The Reader Flow (Target Acquisition & Travel Planning)', () => {
  test('executes target acquisition, travel planning, scale transition, and planetary telemetry inspection', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    // 1. User starts on `/`
    await page.goto('/');

    // 2. Types "Tau Ceti" into searchbox
    const searchbox = page.getByRole('searchbox', { name: 'Search query' });
    await expect(searchbox).toBeVisible();
    await searchbox.fill('Tau Ceti');

    // 3. Sees "Tau Ceti" link in "Search Results" region and clicks it
    const searchResultsRegion = page.getByRole('region', { name: 'Search Results' });
    await expect(searchResultsRegion).toBeVisible();
    const tauCetiSearchResult = searchResultsRegion
      .getByRole('region', { name: /Stars/i })
      .getByRole('link', { name: 'Tau Ceti' });
    await expect(tauCetiSearchResult).toBeVisible();
    await tauCetiSearchResult.click();

    // 4. Verifies Details pane
    const detailsPane = page.getByRole('complementary', { name: 'Details' });
    await expect(detailsPane).toBeVisible();
    await expect(detailsPane.getByTestId('details-peek-name')).toHaveText('Tau Ceti');

    // Spectral classification link (G8V)
    const spectralBadgeLink = detailsPane
      .getByRole('region', { name: 'Peek' })
      .getByRole('link', { name: 'G8V' })
      .first();
    await expect(spectralBadgeLink).toBeVisible();

    // Environmental hazard status (e.g. "0 hazards" or "Nominal environment")
    await expect(detailsPane.getByTestId('details-hazard-summary')).toBeVisible();

    // Planet census
    await expect(detailsPane.getByTestId('details-planet-composition')).toBeVisible();

    // 5. Clicks Directions link inside Details pane
    const directionsLink = detailsPane.getByRole('link', { name: 'Directions' });
    await expect(directionsLink).toBeVisible();
    await directionsLink.click();

    // 6. Verifies Directions pane replaces Details
    const directionsPane = page.getByRole('complementary', { name: 'Directions' });
    await expect(directionsPane).toBeVisible();
    await expect(detailsPane).not.toBeVisible();

    // Shows "Sol → Tau Ceti" and total distance (3.65 pc)
    await expect(directionsPane.getByTestId('directions-route-title')).toHaveText(/Sol\s*→\s*Tau Ceti/);
    await expect(directionsPane.getByTestId('directions-total-distance')).toHaveText(/3\.65\s*pc/);

    // Shows propulsion options
    const sailOption = directionsPane.getByRole('link', { name: /0\.10?c.*Sail/i });
    const torchshipOption = directionsPane.getByRole('link', { name: /1g Relativistic Torchship/i });
    await expect(sailOption).toBeVisible();
    await expect(torchshipOption).toBeVisible();

    // 7. Clicks "1g Relativistic Torchship" link
    await torchshipOption.click();

    // Inspects Flight Profile
    await expect(directionsPane.getByRole('heading', { name: 'Flight Profile' })).toBeVisible();
    await expect(directionsPane.getByText('Ship Time (Proper)').first()).toBeVisible();
    await expect(directionsPane.getByText('Coordinate Time').first()).toBeVisible();
    await expect(directionsPane.getByText(/Time Dilation \(γ\)/).first()).toBeVisible();
    await expect(directionsPane.getByText('Turnaround Point').first()).toBeVisible();

    // 8. Clicks "Back to options" and "Close"
    const backToOptionsLink = directionsPane.getByRole('link', { name: 'Back to options' });
    await expect(backToOptionsLink).toBeVisible();
    await backToOptionsLink.click();

    const closeLink = directionsPane.getByRole('link', { name: 'Close' });
    await expect(closeLink).toBeVisible();
    await closeLink.click();

    // Returns to Details pane
    await expect(detailsPane).toBeVisible();
    await expect(directionsPane).not.toBeVisible();

    // 9. Clicks "Details" link in Details pane to transition to System scale
    const systemDetailsLink = detailsPane.getByRole('link', { name: 'Details' });
    await expect(systemDetailsLink).toBeVisible();
    await systemDetailsLink.click();

    // Verifies navigation to /system/tau-ceti
    await expect(page).toHaveURL(/\/system\/tau-ceti/, { timeout: 15000 });

    // Verifies Breadcrumb shows Galaxy -> Tau Ceti
    const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb.getByRole('list').getByText('Galaxy')).toBeVisible();
    await expect(breadcrumb.getByRole('list').getByText('Tau Ceti')).toBeVisible();

    // Verifies System Bodies orbital schematic
    const orbitalSchematic = page.getByRole('region', { name: 'Orbital Schematic' });
    await expect(orbitalSchematic).toBeVisible();

    // 10. Selects a planet (Tau Ceti e)
    const planetLink = orbitalSchematic.getByRole('link', { name: 'Tau Ceti e' });
    await expect(planetLink).toBeVisible({ timeout: 15000 });
    await planetLink.click();

    // Verifies planetary telemetry in Details pane
    await expect(detailsPane).toBeVisible();
    await expect(detailsPane.getByTestId('details-peek-name')).toHaveText('Tau Ceti e');
    await expect(
      detailsPane.getByText(/Semi-Major Axis|Classification|Planetary Telemetry|Super-Earth/i).first(),
    ).toBeVisible();
  });
});
