import { test, expect } from 'playwright/test';

test.describe('URL Contract E2E Suite (AUD-009, DEC-R014a–DEC-R014l)', () => {
  test.beforeEach(() => {
    test.setTimeout(60_000);
  });

  test.describe('Active Passing URL Grammar Contracts', () => {
    test('galaxy view cold-load, focus details panel, and layer card overview mode', async ({
      page,
    }) => {
      // 1. Cold-load /galaxy without ?focus=
      await page.goto('/galaxy');
      await expect(page.getByTestId('galaxy-view-root')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId('details-panel')).not.toBeVisible();

      // 2. /galaxy?focus=tau-ceti opens DetailsPanel for Tau Ceti
      await page.goto('/galaxy?focus=tau-ceti');
      const detailsPanel = page.getByTestId('details-panel');
      await expect(detailsPanel).toBeVisible({ timeout: 15_000 });
      await expect(detailsPanel).toHaveAttribute('data-entity-id', 'tau-ceti');

      // 3. /galaxy?select=layer:project-hail-mary&layer=project-hail-mary opens LayerCard in overview mode
      await page.goto('/galaxy?select=layer:project-hail-mary&layer=project-hail-mary');
      const layerCard = page.getByTestId('layer-card');
      await expect(layerCard).toBeVisible({ timeout: 15_000 });
      await expect(layerCard).toHaveAttribute('data-card-mode', 'overview');
      await expect(layerCard).toHaveAttribute('data-layer-id', 'canon-project-hail-mary');
    });

    test('system view cold-load, focus details panel, and route directions panel', async ({
      page,
    }) => {
      // 1. Cold-load /system/sol without ?focus=
      await page.goto('/system/sol');
      await expect(page.getByTestId('system-view-root')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId('bodies-panel')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId('details-panel')).not.toBeVisible();

      // 2. /system/sol?focus=earth opens DetailsPanel for Earth
      await page.goto('/system/sol?focus=earth');
      const detailsPanel = page.getByTestId('details-panel');
      await expect(detailsPanel).toBeVisible({ timeout: 15_000 });
      await expect(detailsPanel).toHaveAttribute('data-entity-id', 'earth');

      // 3. /system/sol?route=earth,mars opens DirectionsPanel
      await page.goto('/system/sol?route=earth,mars');
      const directionsPanel = page.getByTestId('directions-panel');
      await expect(directionsPanel).toBeVisible({ timeout: 15_000 });
    });

    test('planet view cold-load and focus details panel for nested moon', async ({
      page,
    }) => {
      // 1. Cold-load /planet/jupiter without ?focus=
      await page.goto('/planet/jupiter');
      await expect(page.getByTestId('planet-view-root')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId('bodies-panel')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId('details-panel')).not.toBeVisible();

      // 2. /planet/jupiter?focus=europa opens DetailsPanel for Europa
      await page.goto('/planet/jupiter?focus=europa');
      const detailsPanel = page.getByTestId('details-panel');
      await expect(detailsPanel).toBeVisible({ timeout: 15_000 });
      await expect(detailsPanel).toHaveAttribute('data-entity-id', 'europa');
    });

    test('search view URL hydration for query and category filter', async ({
      page,
    }) => {
      // /search?q=tau&searchCategory=planets hydrates query input and category filter
      await page.goto('/search?q=tau&searchCategory=planets');
      await expect(page.getByTestId('search-view-root')).toBeVisible({ timeout: 15_000 });

      const searchInput = page.locator('#starmap-search-input');
      await expect(searchInput).toHaveValue('tau', { timeout: 15_000 });

      const categoryFilter = page.locator('#starmap-search-filter');
      await expect(categoryFilter).toHaveValue('planets', { timeout: 15_000 });

      // Trigger deterministic keystroke mutation so debounced search executes in development StrictMode
      const resultsPanel = page.getByTestId('search-results-panel');
      await expect(resultsPanel).toBeVisible({ timeout: 15_000 });
      await searchInput.focus();
      await page.keyboard.press('Backspace');
      await page.keyboard.type('u');

      const planetsGroup = page.getByTestId('search-results-group-planets');
      await expect(planetsGroup).toBeVisible({ timeout: 15_000 });
    });

    test('guide detail routes render detail views and comparative 3D widget', async ({
      page,
    }) => {
      // 1. /guide/star-types/g
      await page.goto('/guide/star-types/g');
      await expect(page.getByTestId('star-type-detail-view-root')).toBeVisible({ timeout: 15_000 });

      // 2. /guide/planet-types/super-earth
      await page.goto('/guide/planet-types/super-earth');
      await expect(page.getByTestId('planet-type-detail-view-root')).toBeVisible({ timeout: 15_000 });

      // 3. /guide/hazards/high-gravity
      await page.goto('/guide/hazards/high-gravity');
      await expect(page.getByTestId('hazard-detail-view-root')).toBeVisible({ timeout: 15_000 });

      // 4. /guide/metrics/planetary-mass?focus=jupiter renders detail view and metric-comparative-3d
      await page.goto('/guide/metrics/planetary-mass?focus=jupiter');
      await expect(page.getByTestId('metric-detail-view-root')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId('metric-comparative-3d')).toBeVisible({ timeout: 15_000 });
    });
  });

  test.describe('Target URL Grammar Contracts for T02 / T06 (DEC-R014l)', () => {
    test.fixme(
      'AUD-091 (DEC-R014a): ?center=<x>,<y>,<z> sets coordinate centre and panning away from ?center=<entityId> writes coordinates on settle',
      async ({ page }) => {
        // Navigating with coordinate centre sets camera target in reference frame
        await page.goto('/galaxy?center=10.5,20.0,-5.2');
        await expect(page.getByTestId('galaxy-view-root')).toBeVisible();
        await expect(page).toHaveURL(/center=10\.5%2C20(?:\.0)?%2C-5\.2|center=10\.5,20(?:\.0)?,-5\.2/);

        // Navigating with entity id sets centre
        await page.goto('/galaxy?center=sol');
        await expect(page).toHaveURL(/center=sol/);
        const historyLengthBefore = await page.evaluate(() => window.history.length);

        // Panning camera away replaces entity id with settled coordinates
        const canvas = page.locator('[data-testid="root-canvas-host"] canvas');
        const box = await canvas.boundingBox();
        if (box) {
          const cx = box.x + box.width / 2;
          const cy = box.y + box.height / 2;
          await page.mouse.move(cx, cy);
          await page.mouse.down({ button: 'left' });
          await page.mouse.move(cx + 100, cy + 50, { steps: 10 });
          await page.mouse.up({ button: 'left' });
        }

        // On camera settle, URL replaces ?center=sol with numeric coordinates ?center=<x>,<y>,<z>
        await expect(page).toHaveURL(/center=-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/);
        // Verify history length did not increase (replace, not push)
        const historyLengthAfter = await page.evaluate(() => window.history.length);
        expect(historyLengthAfter).toBe(historyLengthBefore);
      },
    );

    test.fixme(
      'AUD-091 (DEC-R014b/c): ?select= persists across Galaxy, System, and Planet navigation and marks in-scope entities selected',
      async ({ page }) => {
        // Cold-load Galaxy with multi-scope selections and layer
        await page.goto('/galaxy?select=sol,earth,tau-ceti&layer=project-hail-mary');
        await expect(page.getByTestId('galaxy-view-root')).toBeVisible();

        // In Galaxy view: Sol and Tau Ceti are in scope; Earth is out of scope but kept in URL
        await expect(page).toHaveURL(/select=sol,earth,tau-ceti/);
        await expect(page).toHaveURL(/layer=project-hail-mary/);

        // Transition to System Sol view
        await page.goto('/system/sol?select=sol,earth,tau-ceti&layer=project-hail-mary');
        await expect(page.getByTestId('system-view-root')).toBeVisible();
        await expect(page).toHaveURL(/select=sol,earth,tau-ceti/);
        await expect(page).toHaveURL(/layer=project-hail-mary/);

        // In Sol system: Earth is marked selected in the bodies panel
        const earthRow = page.locator('[data-testid="bodies-panel"] [data-entity-id="earth"]');
        await expect(earthRow).toHaveAttribute('data-selected', 'true');

        // Transition to Planet Earth view
        await page.goto('/planet/earth?select=sol,earth,tau-ceti&layer=project-hail-mary');
        await expect(page.getByTestId('planet-view-root')).toBeVisible();
        await expect(page).toHaveURL(/select=sol,earth,tau-ceti/);
        await expect(page).toHaveURL(/layer=project-hail-mary/);
      },
    );

    test.fixme(
      'AUD-091 (DEC-R014d/e): out-of-scope ?focus= and ?center=<entityId> are stripped via history.replace on /system/sol?focus=tau-ceti and /planet/earth?focus=mars',
      async ({ page }) => {
        // Navigating to /system/sol?focus=tau-ceti has out-of-scope focus (Tau Ceti is another star system)
        await page.goto('/system/sol?focus=tau-ceti');
        await expect(page.getByTestId('system-view-root')).toBeVisible();

        // Path is primary: out-of-scope focus stripped via history.replace
        await expect(page).not.toHaveURL(/[?&]focus=tau-ceti/);
        await expect(page.getByTestId('details-panel')).not.toBeVisible();

        // Navigating to /planet/earth?focus=mars has out-of-scope focus (Mars is another planet)
        await page.goto('/planet/earth?focus=mars');
        await expect(page.getByTestId('planet-view-root')).toBeVisible();
        await expect(page).not.toHaveURL(/[?&]focus=mars/);
        await expect(page.getByTestId('details-panel')).not.toBeVisible();

        // Out-of-scope entity in ?center= is also stripped via history.replace
        await page.goto('/system/sol?center=tau-ceti');
        await expect(page.getByTestId('system-view-root')).toBeVisible();
        await expect(page).not.toHaveURL(/[?&]center=tau-ceti/);
      },
    );

    test.fixme(
      'AUD-091 (DEC-R014f): ?layer=<slug> without ?select=layer:<slug> opens LayerCard without implicitly selecting layer entities',
      async ({ page }) => {
        // ?layer= controls only the layer card; 3D selection comes only from select
        await page.goto('/galaxy?layer=project-hail-mary');
        await expect(page.getByTestId('layer-card')).toBeVisible();

        // Implicit select=layer: is NOT injected into URL
        await expect(page).not.toHaveURL(/[?&]select=layer:project-hail-mary/);

        // Closing the layer card removes only ?layer=
        const closeButton = page.getByTestId('layer-card-close');
        await closeButton.click();
        await expect(page.getByTestId('layer-card')).not.toBeVisible();
        await expect(page).not.toHaveURL(/[?&]layer=/);
      },
    );

    test.fixme(
      'AUD-091 (DEC-R014g): ?select= strips deprecated tag:, star-type:, planet-type:, collection:, and canon: tokens and Guide benchmarks omit select=',
      async ({ page }) => {
        // Deprecated select tokens are stripped via history.replace
        await page.goto('/galaxy?select=tag:habitable-candidate,star-type:g,sol');
        await expect(page.getByTestId('galaxy-view-root')).toBeVisible();

        // URL only retains the valid entity ID 'sol'
        await expect(page).toHaveURL(/[?&]select=sol(?:$|&)/);
        await expect(page).not.toHaveURL(/tag:habitable-candidate/);
        await expect(page).not.toHaveURL(/star-type:g/);

        // Guide benchmark link navigates directly without appending deprecated select tokens
        await page.goto('/guide/star-types/g');
        const benchmarkLink = page.locator('main a[href*="/system/sol"]').first();
        await expect(benchmarkLink).toBeVisible();
        const href = await benchmarkLink.getAttribute('href');
        expect(href).not.toContain('select=star-type');
      },
    );

    test.fixme(
      'AUD-091 (DEC-R014h/i): ?route=sol:torchship-1g,tau-ceti opens Stage 2 Option Detail without ?journeyOption= and ?select=route marks route stops selected',
      async ({ page }) => {
        // Compound route with departure mode opens Stage 2 Option Detail directly
        await page.goto('/galaxy?route=sol:torchship-1g,tau-ceti&select=route');
        const directionsPanel = page.getByTestId('directions-panel');
        await expect(directionsPanel).toBeVisible();

        // Flight Profile visible without ?journeyOption= in URL
        await expect(directionsPanel.getByRole('heading', { name: 'Flight Profile' })).toBeVisible();
        await expect(page).not.toHaveURL(/[?&]journeyOption=/);

        // ?select=route marks stops selected
        await expect(page).toHaveURL(/[?&]select=route(?:$|&)/);
      },
    );

    test.fixme(
      'AUD-091 (DEC-R014j): typing a search query on a spatial view sets ?q=<query>&select=search',
      async ({ page }) => {
        await page.goto('/galaxy');
        await expect(page.getByTestId('galaxy-view-root')).toBeVisible();

        // Focus and type search query in header
        const searchInput = page.locator('#starmap-search-input');
        await searchInput.fill('trappist');

        // URL sets ?q=trappist&select=search
        await expect(page).toHaveURL(/[?&]q=trappist/);
        await expect(page).toHaveURL(/[?&]select=search/);

        // Clearing search removes select=search
        const clearButton = page.getByTestId('search-clear-button');
        await clearButton.click();
        await expect(page).not.toHaveURL(/[?&]select=search/);
      },
    );

    test.fixme(
      'AUD-092 (DEC-R014k): multi-value Guide routes (/guide/star-types/G2V,K1V and /guide/star-types/G2V%2BK1V) render all matched classifications and preserve ?focus= across all 4 Guide views',
      async ({ page }) => {
        // Comma-separated star types render all matched entries
        await page.goto('/guide/star-types/G2V,K1V');
        await expect(page.getByTestId('star-type-detail-view-root')).toBeVisible();
        await expect(page.getByText('G2V')).toBeVisible();
        await expect(page.getByText('K1V')).toBeVisible();

        // Plus-delimited compound star types (e.g. G2V+K1V)
        await page.goto('/guide/star-types/G2V%2BK1V');
        await expect(page.getByTestId('star-type-detail-view-root')).toBeVisible();

        // Guide views preserve ?focus= across all 4 Guide detail routes
        await page.goto('/guide/star-types/g?focus=sol');
        await expect(page.getByTestId('star-type-detail-view-root')).toBeVisible();
        await expect(page).toHaveURL(/[?&]focus=sol/);

        await page.goto('/guide/planet-types/terrestrial?focus=earth');
        await expect(page.getByTestId('planet-type-detail-view-root')).toBeVisible();
        await expect(page).toHaveURL(/[?&]focus=earth/);

        await page.goto('/guide/hazards/high-gravity?focus=jupiter');
        await expect(page.getByTestId('hazard-detail-view-root')).toBeVisible();
        await expect(page).toHaveURL(/[?&]focus=jupiter/);

        await page.goto('/guide/metrics/planetary-mass?focus=jupiter');
        await expect(page.getByTestId('metric-detail-view-root')).toBeVisible();
        await expect(page).toHaveURL(/[?&]focus=jupiter/);
      },
    );
  });
});
