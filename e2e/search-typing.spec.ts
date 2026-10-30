import { test, expect } from 'playwright/test';

// The shared Playwright config appends "jsdom" to the user agent, which makes Search take its
// synchronous test-only path. Use a real browser user agent so the debounced production path runs.
test.use({
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
});

test.describe('Search typing responsiveness', () => {
  test('clicking the search box and typing keeps the text visible and the app responsive', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/galaxy');

    const searchbox = page.getByRole('searchbox', { name: 'Search query' });
    await expect(searchbox).toBeVisible();

    // Focusing the box must not stall the main thread (a genuine freeze never recovers)
    await searchbox.click();
    const focusStart = Date.now();
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(Date.now() - focusStart).toBeLessThan(5000);

    // Each keystroke must be reflected in the input straight away
    let typed = '';
    for (const char of 'tau') {
      typed += char;
      await page.keyboard.type(char);
      await expect(searchbox).toHaveValue(typed, { timeout: 1000 });
    }

    // Below 3 characters nothing is suggested; at 3 characters results appear
    const resultsRegion = page.getByRole('region', { name: 'Search Results' });
    await expect(resultsRegion).toBeVisible({ timeout: 10_000 });
    await expect(searchbox).toHaveValue('tau');

    // The main thread must recover after the search ran. The bound is generous because the dev
    // server renders under software GL in CI; a genuine freeze never recovers and exceeds it.
    const searchStart = Date.now();
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(Date.now() - searchStart).toBeLessThan(5000);

    // Search-driven selection is programmatic: it must not be written back to the URL as a focus,
    // which previously ping-ponged between two stars and re-ran the search in an endless loop.
    await page.waitForTimeout(3000);
    expect(new URL(page.url()).searchParams.has('focus')).toBe(false);
    expect(new URL(page.url()).searchParams.get('q')).toBe('tau');

    expect(pageErrors).toEqual([]);
  });

  test('typing one or two characters shows the text and does not suggest results', async ({
    page,
  }) => {
    await page.goto('/galaxy');

    const searchbox = page.getByRole('searchbox', { name: 'Search query' });
    await searchbox.click();
    await page.keyboard.type('ta');

    await expect(searchbox).toHaveValue('ta');
    await expect(page.getByTestId('search-results-group-stars')).toHaveCount(0);
  });
});
