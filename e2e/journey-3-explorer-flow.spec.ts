import { test, expect } from 'playwright/test';

test.describe('Journey 3: The Casual Explorer Flow (Serendipitous Discovery)', () => {
  test('launches random layer exploration, steps through waypoints, and activates canon layers in-place', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    // 1. User starts on `/`
    await page.goto('/');

    // 2. Focuses search input to expand search controls drawer, then clicks "Explore" button
    const searchbox = page.getByRole('searchbox', { name: 'Search query' });
    await expect(searchbox).toBeVisible();
    await searchbox.focus();

    const searchRegion = page.getByRole('region', { name: 'Search' });
    const exploreButton = searchRegion.getByRole('button', { name: 'Explore' });
    await expect(exploreButton).toBeVisible();
    await exploreButton.click();

    // 3. Verifies URL updates with `layer=`
    await expect(page).toHaveURL(/layer=/);

    // 4. Verifies Layer Card overview appears
    const layerCardOverview = page.getByRole('complementary', { name: /Overview$/i });
    await expect(layerCardOverview).toBeVisible();

    // Heading and entry count
    await expect(layerCardOverview.getByRole('heading', { level: 3 })).toBeVisible();
    await expect(layerCardOverview.getByText(/entr(y|ies)/i)).toBeVisible();

    // Start link: "Explore: ... →" or "Explore Layer →"
    const startLink = layerCardOverview.getByRole('link', {
      name: /Explore: .* →|Explore Layer →/i,
    });
    await expect(startLink).toBeVisible();

    // 5. Clicks start link to enter Item Mode
    await startLink.click();
    await expect(page).toHaveURL(/layer=[^&]+:[^&]+/, { timeout: 15000 });

    // Verifies Item Mode step counter (e.g. "1 of ...")
    const layerCardItem = page.getByTestId('layer-card');
    await expect(layerCardItem).toHaveAttribute('data-card-mode', 'item', { timeout: 15000 });
    await expect(layerCardItem.getByTestId('layer-card-step')).toHaveText(/1\s*of\s*\d+/i, {
      timeout: 15000,
    });

    // 6. Steps forward using next waypoint link ("... →")
    const nextWaypointLink = layerCardItem.getByTestId('layer-card-next');
    await expect(nextWaypointLink).toBeVisible();
    await nextWaypointLink.click();

    // Verifies step counter advances to 2 of ...
    await expect(layerCardItem.getByTestId('layer-card-step')).toHaveText(/2\s*of\s*\d+/i, {
      timeout: 15000,
    });

    // 7. Closes layer card
    const closeLayerCardLink = layerCardItem.getByRole('link', { name: 'Close layer card' });
    await expect(closeLayerCardLink).toBeVisible();
    await closeLayerCardLink.click();
    await expect(page.getByTestId('layer-card')).not.toBeVisible();

    // 8. In-place Canon Layer activation from Details pane (DEC-041)
    await page.goto('/galaxy?focus=sol');

    const detailsPane = page.getByRole('complementary', { name: 'Details' });
    await expect(detailsPane).toBeVisible();

    const canonSection = detailsPane.getByTestId('details-canon-section');
    await expect(canonSection).toBeVisible();

    // Clicks canon layer item link in Details pane
    const firstCanonLink = canonSection.getByTestId('details-canon-item-link').first();
    await expect(firstCanonLink).toBeVisible();
    await firstCanonLink.click();

    // Verifies Layer Card opened in-place
    await expect(page.getByTestId('layer-card')).toBeVisible();
  });
});
