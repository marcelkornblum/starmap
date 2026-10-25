import { test, expect } from 'playwright/test';

test.describe('Click freeze & anchor navigation regression', () => {
  test('internal anchor clicks preserve query parameters without stripping them', async ({ page }) => {
    // 1. Opens /galaxy
    await page.goto('/galaxy');

    // 2. Types "Tau Ceti" into searchbox
    const searchbox = page.getByRole('searchbox', { name: 'Search query' });
    await expect(searchbox).toBeVisible();
    await searchbox.fill('Tau Ceti');

    // 3. Locates "Tau Ceti" link in "Search Results"
    const searchResultsRegion = page.getByRole('region', { name: 'Search Results' });
    await expect(searchResultsRegion).toBeVisible();
    const tauCetiLink = searchResultsRegion
      .getByRole('region', { name: /Stars/i })
      .getByRole('link', { name: 'Tau Ceti' });
    await expect(tauCetiLink).toBeVisible();

    // Verify the anchor element itself specifies the target query parameter
    const href = await tauCetiLink.getAttribute('href');
    expect(href).toContain('focus=tau-ceti');

    // Click the anchor link
    await tauCetiLink.click();

    // The URL must preserve the query parameters (e.g. ?focus=tau-ceti) instead of stripping them to /galaxy
    await expect(page).toHaveURL(/focus=tau-ceti/);
  });

  test('clicking system link/search result and repeated clicks does not freeze main thread or trigger infinite re-renders', async ({ page }) => {
    // 1. Opens /galaxy
    await page.goto('/galaxy');

    // 2. Types "Tau Ceti" into searchbox and clicks the result
    const searchbox = page.getByRole('searchbox', { name: 'Search query' });
    await expect(searchbox).toBeVisible();
    await searchbox.fill('Tau Ceti');

    const searchResultsRegion = page.getByRole('region', { name: 'Search Results' });
    await expect(searchResultsRegion).toBeVisible();
    const tauCetiLink = searchResultsRegion
      .getByRole('region', { name: /Stars/i })
      .getByRole('link', { name: 'Tau Ceti' });
    await expect(tauCetiLink).toBeVisible();
    await tauCetiLink.click();

    // Verify Tau Ceti is focused and Details panel opens (dismissing search dropdown)
    await expect(page).toHaveURL(/focus=tau-ceti/);
    const detailsPane = page.getByRole('complementary', { name: 'Details' });
    await expect(detailsPane).toBeVisible();

    // Types "Sol" into searchbox and clicks "Sol" (opening Sol's Details panel)
    await searchbox.fill('Sol');
    await expect(searchResultsRegion).toBeVisible();
    const solLink = searchResultsRegion
      .getByRole('region', { name: /Stars/i })
      .getByRole('link', { name: 'Sol' });
    await expect(solLink).toBeVisible();
    await solLink.click();

    // Verify Sol is focused and Details panel is displayed
    await expect(page).toHaveURL(/focus=sol/);
    await expect(detailsPane).toBeVisible();
    await expect(detailsPane.getByTestId('details-peek-name')).toHaveText('Sol');

    // 3. Repeated clicks on persistent links in Details panel / Canon Layers list
    // A. Click "Voyager 1 (Interstellar Probe)" twice in a row in Canon Layers list
    const canonSection = detailsPane.getByTestId('details-canon-section');
    await expect(canonSection).toBeVisible();
    const voyagerLink = canonSection.getByRole('link', { name: /Voyager 1/i }).first();
    await expect(voyagerLink).toBeVisible();
    await voyagerLink.click();
    await voyagerLink.click();

    // B. Click "Mars" twice in a row in Canon Layers list
    const marsLink = canonSection.getByRole('link', { name: 'Mars' }).first();
    await expect(marsLink).toBeVisible();
    await marsLink.click();
    await marsLink.click();

    // C. Click "Centre" twice in a row in Details panel
    const centreLink = detailsPane.getByTestId('details-button-center');
    await expect(centreLink).toBeVisible();
    await centreLink.click();
    await centreLink.click();

    // 4. Type "Sol" again in the searchbox and click "Sol" a second time (re-selecting already focused system)
    await searchbox.fill('Sol');
    await expect(searchResultsRegion).toBeVisible();
    const solLinkAgain = searchResultsRegion
      .getByRole('region', { name: /Stars/i })
      .getByRole('link', { name: 'Sol' });
    await expect(solLinkAgain).toBeVisible();
    await solLinkAgain.click();

    // 5. Measures main-thread responsiveness
    const startTime = Date.now();
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
    const elapsed = Date.now() - startTime;

    // A responsive main-thread will execute a 50ms timeout within 500ms.
    // If setShardTick / infinite React re-render loop starves the event loop,
    // this will time out or take excessive time.
    expect(elapsed).toBeLessThan(500);

    // Also verify Details pane is visible and responsive
    await expect(detailsPane).toBeVisible();
    await expect(detailsPane.getByTestId('details-peek-name')).toHaveText('Sol');
  });
});
