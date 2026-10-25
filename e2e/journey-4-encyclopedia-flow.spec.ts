import { test, expect } from 'playwright/test';

test.describe('Journey 4: Classification Deep-Dive via Encyclopedia', () => {
  test('explores Yerkes combinator, navigates guide sections, and returns to 3D atlas', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    // 1. User starts at Sol in galaxy view
    await page.goto('/galaxy?focus=sol');

    const detailsPane = page.getByRole('complementary', { name: 'Details' });
    await expect(detailsPane).toBeVisible();

    // 2. Clicks the spectral classification badge link (G2V)
    const spectralBadgeLink = detailsPane
      .getByRole('region', { name: 'Peek' })
      .getByRole('link', { name: 'G2V' })
      .first();
    await expect(spectralBadgeLink).toBeVisible();
    await spectralBadgeLink.click();

    // 3. Verifies navigation to Star Type guide page
    await expect(page).toHaveURL(/\/guide\/star-types\//i);

    // Heading confirms Star Type view
    const mainHeading = page.getByRole('heading', { level: 1 });
    await expect(mainHeading).toBeVisible();
    await expect(mainHeading).toHaveText(/Star Type/i);

    // 4. Interactive Yerkes Spectral Combinator
    const combinator = page.getByRole('region', { name: 'Yerkes Spectral Combinator' });
    await expect(combinator).toBeVisible();

    // Clicks class 'K' button and verifies aria-pressed
    const classKButton = combinator.getByRole('button', { name: 'K', exact: true });
    await expect(classKButton).toBeVisible();
    await classKButton.click();
    await expect(classKButton).toHaveAttribute('aria-pressed', 'true');

    // Clicks subdivision '5' button and verifies aria-pressed
    const sub5Button = combinator.getByRole('button', { name: '5', exact: true });
    await expect(sub5Button).toBeVisible();
    await sub5Button.click();
    await expect(sub5Button).toHaveAttribute('aria-pressed', 'true');

    // Clicks luminosity 'III' button and verifies aria-pressed
    const lumIIIButton = combinator.getByRole('button', { name: 'III', exact: true });
    await expect(lumIIIButton).toBeVisible();
    await lumIIIButton.click();
    await expect(lumIIIButton).toHaveAttribute('aria-pressed', 'true');

    // Verifies Classification updates to K5III
    await expect(combinator.getByText(/Classification:\s*K5III/i)).toBeVisible();

    // Verifies computed telemetry values update live
    const telemetryStack = combinator.getByTestId('combinator-computed-telemetry');
    await expect(telemetryStack).toBeVisible();
    await expect(telemetryStack.getByText('Effective Temperature')).toBeVisible();

    // 5. Navigates across Guide sections via "Guide sections" nav
    const guideNav = page.getByRole('navigation', { name: 'Guide sections' });
    await expect(guideNav).toBeVisible();

    // Planet Types section
    await guideNav.getByRole('link', { name: 'Planet Types' }).click();
    await expect(page).toHaveURL(/\/guide\/planet-types$/);
    // Inspect detail page in Planet Types
    const firstPlanetTypeLink = page.getByTestId('planet-types-guide-link').first();
    await expect(firstPlanetTypeLink).toBeVisible();
    await firstPlanetTypeLink.click();
    await expect(page).toHaveURL(/\/guide\/planet-types\//);

    // Telemetry Metrics section
    await guideNav.getByRole('link', { name: 'Telemetry Metrics' }).click();
    await expect(page).toHaveURL(/\/guide\/metrics$/);
    // Inspect detail page in Telemetry Metrics
    const firstMetricLink = page.getByTestId('metrics-guide-link').first();
    await expect(firstMetricLink).toBeVisible();
    await firstMetricLink.click();
    await expect(page).toHaveURL(/\/guide\/metrics\//);

    // Environmental Hazards section
    await guideNav.getByRole('link', { name: 'Environmental Hazards' }).click();
    await expect(page).toHaveURL(/\/guide\/hazards$/);
    // Inspect detail page in Environmental Hazards
    const firstHazardLink = page.getByTestId('hazards-guide-link').first();
    await expect(firstHazardLink).toBeVisible();
    await firstHazardLink.click();
    await expect(page).toHaveURL(/\/guide\/hazards\//);

    // 6. Uses Primary mode navigation to return to the 3D Atlas
    const primaryModeNav = page.getByRole('navigation', { name: 'Primary mode' });
    await expect(primaryModeNav).toBeVisible();

    const galaxyLink = primaryModeNav.getByRole('link', { name: 'Galaxy' });
    await expect(galaxyLink).toBeVisible();
    await galaxyLink.click();

    // Verifies returned to galaxy view
    await expect(page).toHaveURL(/\/galaxy/);
    await expect(page.getByTestId('galaxy-view-root')).toBeVisible();
  });
});
