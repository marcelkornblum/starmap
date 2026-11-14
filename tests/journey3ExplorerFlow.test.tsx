import { createElement } from 'react';
import { cleanup, render, screen, act } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SpatialEntityProvider } from '../src/components/canvas/entity/SpatialEntityProvider';
import { createSpatialEntityStore } from '../src/components/canvas/entity/SpatialEntityStore';
import {
  DetailsPanel,
  Minimap,
  OrbitalSchematicItem,
  OrbitalSchematicList,
  OrbitalSchematicPanel,
  PreviewPanel,
} from '../src/components/domain';
import {
  buildFocusedEntityDetails,
  buildFocusedPreviewSummary,
  buildGalaxyMinimapOrientation,
  buildPlanetMinimapOrientation,
  buildPlanetaryBodiesSummary,
  buildPlanetaryOrbitalSchematic,
  buildSystemBodiesSummary,
  buildSystemMinimapOrientation,
  buildSystemOrbitalSchematic,
  type FocusedPreviewSummary,
  type MinimapOrientationSummary,
  type OrbitalSchematicSummary,
} from '../src/services/detailsService';
import {
  buildTagGalaxyHref,
  doesSystemEntryMatchTag,
  executeCatalogSearch,
  extractUrlTagFocus,
  isCatalogTag,
  resolveSelectedSystemsFromTag,
} from '../src/services/searchService';
import { syncSelectedSystemsToStore } from '../src/components/domain/Search/searchStoreSync';
import { type CompactSearchEntry } from '../src/utils/compactDataCodec';
import { GalaxyView } from '../src/views/GalaxyView';
import { PlanetView } from '../src/views/PlanetView';
import { SystemView } from '../src/views/SystemView';
import {
  resetLayerRuntime,
  seedAllLayerData,
} from './fixtures/layerFixtures';
import { SAMPLE_CORPUS } from './fixtures/searchFixtures';

describe('Journey 3: Explorer Flow - Multi-Entity Selection & Astrometry Tags', () => {
  beforeAll(seedAllLayerData);
  afterAll(resetLayerRuntime);

  it('synchronizes focused and selected store states in GalaxyView without debug systems panel', async () => {
    const store = createSpatialEntityStore();
    syncSelectedSystemsToStore(
      store,
      executeCatalogSearch(SAMPLE_CORPUS, { query: 'Adrian' }),
      '?q=Adrian',
      SAMPLE_CORPUS,
      [],
      [],
    );

    // 1. Searching on '/' selects matching systems and parent systems of non-system results, with nothing focused
    cleanup();
    let res: ReturnType<typeof render>;
    await act(async () => {
      res = render(
        createElement(
          SpatialEntityProvider,
          { store },
          createElement(GalaxyView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/',
            locationSearch: '?q=Adrian',
          }),
        ),
      );
    });

    expect(screen.getByTestId('galaxy-view-root')).toBeDefined();
    expect(screen.queryByTestId('systems-panel')).toBeNull();
    // "Adrian" is a fictional entry in the Tau Ceti system -> Tau Ceti becomes selected
    expect(store.getState().getEntitiesByState('selected').map((e) => e.name)).toEqual([
      'Tau Ceti',
    ]);
    expect(store.getState().getEntitiesByState('focused')).toEqual([]);
    // When nothing is focused, Details panel does not show at all
    expect(screen.queryByTestId('details-panel')).toBeNull();
    res!.unmount();

    // 2. Clicking through to '/galaxy?focus=tau-ceti-e' clears selected (since ?q= is not in URL), focuses 'tau Ceti e', and renders Details panel
    cleanup();
    store.getState().setSelectedIds([]);
    await act(async () => {
      res = render(
        createElement(
          SpatialEntityProvider,
          { store },
          createElement(GalaxyView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/galaxy',
            locationSearch: '?focus=tau-ceti-e',
          }),
        ),
      );
    });

    expect(store.getState().getEntitiesByState('selected')).toEqual([]);
    expect(store.getState().getEntitiesByState('focused').map((e) => e.name)).toEqual([
      'tau Ceti e',
    ]);
    expect(screen.queryByTestId('systems-panel')).toBeNull();
    expect(screen.getByTestId('details-panel')).toBeDefined();
    expect(res!.container.querySelector('#details-panel-heading')?.textContent).toContain('Details');
    expect(res!.container.querySelector('#details-peek-heading')?.textContent).toContain('Peek');
    expect(res!.container.querySelector('#details-partial-heading')?.textContent).toContain('Partial');
    expect(res!.container.querySelector('#details-full-heading')?.textContent).toContain('Full');
    expect(screen.getByTestId('details-button-system-details').getAttribute('href')).toBe('/planet/tau-ceti-e');
    expect(screen.getByTestId('details-button-directions')).toBeDefined();
    expect(res!.container.textContent).toContain('Hail Mary');
    expect(res!.container.textContent).toContain('Adrian');
    res!.unmount();

    // 3. Clicking through to '/galaxy?focus=tau-ceti' focuses 'Tau Ceti' and shows Details panel with Peek, Partial, and Full detents
    cleanup();
    await act(async () => {
      res = render(
        createElement(
          SpatialEntityProvider,
          { store },
          createElement(GalaxyView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/galaxy',
            locationSearch: '?focus=tau-ceti',
          }),
        ),
      );
    });

    expect(store.getState().getEntitiesByState('selected')).toEqual([]);
    expect(store.getState().getEntitiesByState('focused').map((e) => e.name)).toEqual([
      'Tau Ceti',
    ]);
    expect(screen.queryByTestId('systems-panel')).toBeNull();
    expect(screen.getByTestId('details-panel')).toBeDefined();
    expect(screen.getByTestId('details-spectral-badge').getAttribute('data-spectral-badge')).toBe('G8V');
    expect(screen.getByTestId('details-spectral-badge').getAttribute('href')).toBe('/guide/star-types/G8V');
    expect(screen.getByTestId('details-reticle-type').getAttribute('data-celestial-symbol')).toBe('stellar-system');
    expect(res!.container.textContent).toContain('4');
    expect(res!.container.textContent).toContain('planets');
    expect(screen.getByTestId('details-button-system-details').getAttribute('href')).toBe('/system/tau-ceti');
    expect(res!.container.textContent).toContain('Directions');
    expect(res!.container.textContent).toContain('Tau Ceti');
    expect(res!.container.textContent).toContain('Astrophage Destination');
    expect(screen.getAllByTestId('details-canon-item').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('details-canon-item-title').length).toBeGreaterThan(0);

    // Verify DEC-022 detents: Peek contains systemSummary, Partial contains Canon, and Full contains Astrometry
    const peekDetent = screen.getByTestId('details-detent-peek');
    const partialDetent = screen.getByTestId('details-detent-partial');
    const fullDetent = screen.getByTestId('details-detent-full');
    expect(peekDetent.querySelector('[data-testid="details-system-summary"]')).not.toBeNull();
    expect(partialDetent.querySelector('[data-testid="details-canon-section"]')).not.toBeNull();
    expect(fullDetent.querySelector('[data-testid="details-astrometry-section"]')).not.toBeNull();
    res!.unmount();

    // 4. Navigating to '/galaxy' (nothing in URL) clears both focused and selected states and hides Details panel
    cleanup();
    await act(async () => {
      res = render(
        createElement(
          SpatialEntityProvider,
          { store },
          createElement(GalaxyView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/galaxy',
            locationSearch: '',
          }),
        ),
      );
    });

    expect(store.getState().getEntitiesByState('focused')).toEqual([]);
    expect(store.getState().getEntitiesByState('selected')).toEqual([]);
    expect(screen.queryByTestId('systems-panel')).toBeNull();
    expect(screen.queryByTestId('details-panel')).toBeNull();
    res!.unmount();
  });

  it('links Astrometry tags in DetailsPanel to /galaxy?select=tag:<tagSlug> and supports multi-entity ?select= lists alongside ?focus=', async () => {
    expect(buildTagGalaxyHref('ExoplanetHost')).toBe(
      '/galaxy?select=tag:exoplanet-host',
    );
    expect(buildTagGalaxyHref('HabitableCandidate')).toBe(
      '/galaxy?select=tag:habitable-candidate',
    );
    expect(buildTagGalaxyHref('   ')).toBe('/galaxy');
    expect(isCatalogTag('ExoplanetHost')).toBe(true);
    expect(isCatalogTag('exoplanet-host')).toBe(true);
    expect(isCatalogTag('SolarNeighborhood10pc')).toBe(true);
    expect(isCatalogTag('solar-neighborhood-10pc')).toBe(true);
    expect(isCatalogTag('seti')).toBe(false);
    expect(isCatalogTag('')).toBe(false);
    expect(isCatalogTag('tau-ceti-e')).toBe(false);

    expect(extractUrlTagFocus('?select=tag:exoplanet-host')).toBe('exoplanet-host');
    expect(extractUrlTagFocus('?select=tag:seti')).toBeNull();
    expect(extractUrlTagFocus('?select=layer:project-hail-mary')).toBeNull();
    expect(extractUrlTagFocus('?focus=tau-ceti-e')).toBeNull();
    expect(extractUrlTagFocus('')).toBeNull();

    // doesSystemEntryMatchTag evaluates all catalog system tags (both PascalCase and kebab-case)
    const solEntry = SAMPLE_CORPUS[0]!;
    const tauEntry = SAMPLE_CORPUS[1]!;
    const planetEntry = SAMPLE_CORPUS.find((e) => e.i === 'tau-ceti-e')!;
    expect(doesSystemEntryMatchTag(solEntry, 'HomeSystem')).toBe(true);
    expect(doesSystemEntryMatchTag(solEntry, 'home-system')).toBe(true);
    expect(doesSystemEntryMatchTag(solEntry, 'SolarNeighborhood10pc')).toBe(true);
    expect(doesSystemEntryMatchTag(solEntry, 'solar-neighborhood-10pc')).toBe(true);
    expect(doesSystemEntryMatchTag(solEntry, 'NakedEye')).toBe(true);
    expect(doesSystemEntryMatchTag(tauEntry, 'ExoplanetHost')).toBe(true);
    expect(doesSystemEntryMatchTag(tauEntry, 'HabitableCandidate')).toBe(true);
    expect(doesSystemEntryMatchTag(tauEntry, 'habitable-candidate')).toBe(true);
    expect(doesSystemEntryMatchTag(tauEntry, 'VariableStar')).toBe(false);
    expect(doesSystemEntryMatchTag(tauEntry, '')).toBe(false);
    expect(doesSystemEntryMatchTag(planetEntry, 'ExoplanetHost')).toBe(false);

    // DetailsPanel renders clickable tag links in both Partial Astrometry and Full Canon accordions
    const focusedDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        position: [-3.1, -0.4, -2.0],
        classification: 'stellar-system',
      },
      corpus: SAMPLE_CORPUS,
    });
    const { container: detailsContainer, unmount: unmountDetails } = render(
      createElement(DetailsPanel, { details: focusedDetails }),
    );
    expect(detailsContainer.querySelector('[data-testid="details-habitable-zone-link"]')).not.toBeNull();
    expect(detailsContainer.querySelector('[data-testid="details-summary-habitable-link"]')).not.toBeNull();
    expect(detailsContainer.querySelector('[data-testid="details-planet-habitable-link"]')).not.toBeNull();
    expect(detailsContainer.querySelector('[data-testid="details-astrometry-tag-link"]')).not.toBeNull();
    expect(detailsContainer.querySelector('a[href="/galaxy?select=tag:solar-neighborhood-10pc"]')).not.toBeNull();
    expect(detailsContainer.querySelector('a[href="/galaxy?select=tag:naked-eye"]')).not.toBeNull();
    expect(detailsContainer.querySelector('a[href="/galaxy?select=tag:exoplanet-host"]')).not.toBeNull();
    expect(detailsContainer.querySelector('a[href="/galaxy?select=tag:habitable-candidate"]')).not.toBeNull();
    expect(detailsContainer.querySelector('[data-testid="details-canon-tag-link"]')).toBeNull();
    unmountDetails();

    // resolveSelectedSystemsFromTag resolves catalog system tags only
    expect(resolveSelectedSystemsFromTag('', SAMPLE_CORPUS)).toEqual([]);
    const exoplanetHosts = resolveSelectedSystemsFromTag(
      'exoplanet-host',
      SAMPLE_CORPUS,
    );
    expect(exoplanetHosts.some((s) => s.name === 'Sol')).toBe(true);
    expect(exoplanetHosts.some((s) => s.name === 'Tau Ceti')).toBe(true);

    const habitableHosts = resolveSelectedSystemsFromTag(
      'habitable-candidate',
      SAMPLE_CORPUS,
    );
    expect(habitableHosts.map((s) => s.name)).toEqual(['Sol', 'Tau Ceti']);

    expect(resolveSelectedSystemsFromTag('seti', SAMPLE_CORPUS)).toEqual([]);

    // MainView loading /galaxy?select=tag:habitable-candidate selects all matching systems and focuses nothing
    const store = createSpatialEntityStore();
    let gal1: ReturnType<typeof render>;
    await act(async () => {
      gal1 = render(
        createElement(
          SpatialEntityProvider,
          { store },
          createElement(GalaxyView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/galaxy',
            locationSearch: '?select=tag:habitable-candidate',
          }),
        ),
      );
    });
    const selected = store.getState().getEntitiesByState('selected');
    expect(selected.map((s) => s.name)).toEqual(['Sol', 'Tau Ceti']);
    expect(store.getState().getEntitiesByState('focused')).toEqual([]);
    expect(screen.queryByTestId('details-panel')).toBeNull();
    expect(screen.queryByTestId('systems-panel')).toBeNull();
    gal1!.unmount();

    // GalaxyView loading /galaxy?select=sol,keid&focus=tau-ceti selects Sol + Keid and focuses Tau Ceti
    const multiStore = createSpatialEntityStore();
    let gal2: ReturnType<typeof render>;
    await act(async () => {
      gal2 = render(
        createElement(
          SpatialEntityProvider,
          { store: multiStore },
          createElement(GalaxyView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/galaxy',
            locationSearch: '?select=sol,keid&focus=tau-ceti',
          }),
        ),
      );
    });
    expect(
      multiStore
        .getState()
        .getEntitiesByState('selected')
        .map((s) => s.name),
    ).toEqual(['Sol', 'Keid']);
    expect(
      multiStore
        .getState()
        .getEntitiesByState('focused')
        .map((s) => s.name),
    ).toEqual(['Tau Ceti']);
    expect(screen.getByTestId('details-panel')).toBeDefined();
    gal2!.unmount();
  });
});

describe('Journey 3: Explorer Flow - Orbital Schematic Domain and Component Boundary (DEC-014)', () => {
  it('builds system orbital schematic with precalculated orbital rank r and region overlaps', () => {
    // Sol system summary with Earth, Ceres, Pluto, Voyager 1
    const solDetails = buildFocusedEntityDetails({
      focusedEntity: null,
      urlSystemSlug: 'sol',
      corpus: SAMPLE_CORPUS,
      summaryNode: {
        id: 'sol',
        name: 'Sol',
        spect: 'G2V',
        dist: 0,
        starCount: 1,
        planetCount: 8,
        mag: -26.74,
        absmag: 4.83,
        x: 0,
        y: 0,
        z: 0,
        hasHabitableCandidate: true,
        sectorId: 'SEC-0-0-0',
      },
    });

    const solBodies = buildSystemBodiesSummary({
      details: solDetails,
      corpus: SAMPLE_CORPUS,
    });

    const schematic = buildSystemOrbitalSchematic(solBodies, SAMPLE_CORPUS);
    expect(schematic).not.toBeNull();
    expect(schematic?.scope).toBe('system');
    expect(schematic?.systemId).toBe('sol');
    expect(schematic?.items.length).toBeGreaterThan(0);

    // Primary star at rank 0
    const starItem = schematic?.items.find((i) => i.kind === 'star');
    expect(starItem).toMatchObject({
      id: 'sol-A',
      kind: 'star',
      orbitRank: 0,
      summaryLabel: 'Component A · G2V',
    });

    // Earth at rank 3 with habitable zone region and nested moon children
    const earthItem = schematic?.items.find((i) => i.id === 'earth');
    expect(earthItem).toMatchObject({
      id: 'earth',
      kind: 'planet',
      orbitRank: 3,
      inHabitableZone: true,
      region: 'habitable-zone',
    });
    expect(earthItem?.children).toHaveLength(1);
    expect(earthItem?.children?.[0]).toMatchObject({
      id: 'moon',
      name: 'Moon',
      kind: 'moon',
      orbitRank: 1,
    });

    // Ceres at rank 5 in asteroid belt
    const ceresItem = schematic?.items.find((i) => i.id === 'ceres');
    expect(ceresItem).toMatchObject({
      id: 'ceres',
      kind: 'dwarf-planet',
      orbitRank: 5,
      region: 'asteroid-belt',
    });

    // Pluto at rank 10 in kuiper belt
    const plutoItem = schematic?.items.find((i) => i.id === 'pluto');
    expect(plutoItem).toMatchObject({
      id: 'pluto',
      kind: 'dwarf-planet',
      orbitRank: 10,
      region: 'kuiper-belt',
    });

    // Verify ordering: star (0) < earth (3) < ceres (5) < pluto (10)
    const itemIds = schematic?.items.map((i) => i.id) ?? [];
    expect(itemIds.indexOf('sol-A')).toBeLessThan(itemIds.indexOf('earth'));
    expect(itemIds.indexOf('earth')).toBeLessThan(itemIds.indexOf('ceres'));
    expect(itemIds.indexOf('ceres')).toBeLessThan(itemIds.indexOf('pluto'));
  });

  it('builds planetary orbital schematic with host at rank 0 and orbiting bodies sorted by r', () => {
    const earthDetails = buildFocusedEntityDetails({
      focusedEntity: null,
      urlPlanetSlug: 'earth',
      corpus: SAMPLE_CORPUS,
      summaryNode: {
        id: 'sol',
        name: 'Sol',
        spect: 'G2V',
        dist: 0,
        starCount: 1,
        planetCount: 8,
        mag: -26.74,
        absmag: 4.83,
        x: 0,
        y: 0,
        z: 0,
        hasHabitableCandidate: true,
        sectorId: 'SEC-0-0-0',
      },
    });

    const planetaryBodies = buildPlanetaryBodiesSummary({
      details: earthDetails,
      urlPlanetSlug: 'earth',
      corpus: SAMPLE_CORPUS,
    });

    const schematic = buildPlanetaryOrbitalSchematic(planetaryBodies, SAMPLE_CORPUS);
    expect(schematic).not.toBeNull();
    expect(schematic?.scope).toBe('planet');
    expect(schematic?.planetId).toBe('earth');

    // Host Earth at rank 0, in habitable zone
    expect(schematic?.items[0]).toMatchObject({
      id: 'earth',
      kind: 'planet',
      orbitRank: 0,
      inHabitableZone: true,
      region: 'habitable-zone',
    });

    // Moon at rank 1
    const moonItem = schematic?.items.find((i) => i.id === 'moon');
    expect(moonItem).toMatchObject({
      id: 'moon',
      kind: 'moon',
      orbitRank: 1,
    });
  });

  it('renders <OrbitalSchematicPanel />, <OrbitalSchematicList />, and <OrbitalSchematicItem /> with semantic attributes and badges', () => {
    // Null summary returns empty string
    const { container: nullContainer, unmount: unmountNull } = render(
      createElement(OrbitalSchematicPanel, { elements: null }),
    );
    expect(nullContainer.firstChild).toBeNull();
    unmountNull();

    // System summary rendering
    const dummySystemSummary: OrbitalSchematicSummary = {
      scope: 'system',
      systemId: 'sol',
      systemName: 'Sol',
      items: [
        {
          id: 'sol',
          name: 'Sol',
          href: '/system/sol?focus=sol',
          kind: 'star',
          orbitRank: 0,
          summaryLabel: 'Component A · G2V',
          inHabitableZone: false,
          isFocused: false,
          isSelected: false,
        },
        {
          id: 'earth',
          name: 'Earth',
          href: '/planet/earth',
          kind: 'planet',
          orbitRank: 3,
          summaryLabel: 'terrestrial',
          inHabitableZone: true,
          region: 'habitable-zone',
          isFocused: true,
          isSelected: true,
          children: [
            {
              id: 'moon',
              name: 'Moon',
              href: '/planet/earth?focus=moon',
              kind: 'moon',
              orbitRank: 1,
              summaryLabel: 'Moon',
              inHabitableZone: true,
              region: 'habitable-zone',
              isFocused: false,
              isSelected: false,
            },
          ],
        },
        {
          id: 'ceres',
          name: 'Ceres',
          href: '/system/sol?focus=ceres',
          kind: 'dwarf-planet',
          orbitRank: 5,
          summaryLabel: 'Dwarf Planet',
          inHabitableZone: false,
          region: 'asteroid-belt',
          isFocused: false,
          isSelected: false,
        },
        {
          id: 'pluto',
          name: 'Pluto',
          href: '/system/sol?focus=pluto',
          kind: 'dwarf-planet',
          orbitRank: 10,
          summaryLabel: 'Dwarf Planet',
          inHabitableZone: false,
          region: 'kuiper-belt',
          isFocused: false,
          isSelected: false,
        },
      ],
    };

    const { container: panelContainer, unmount: unmountPanel } = render(
      createElement(OrbitalSchematicPanel, { elements: dummySystemSummary }),
    );
    const panel = panelContainer.querySelector('[data-testid="orbital-schematic-panel"]');
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute('data-scope')).toBe('system');
    expect(panel?.getAttribute('data-system-id')).toBe('sol');
    expect(panelContainer.textContent).toContain('Orbital Schematic');
    expect(panelContainer.querySelector('[data-testid="orbital-schematic-list"]')).not.toBeNull();
    const earthItem = panelContainer.querySelector('[data-entity-id="earth"]');
    expect(earthItem).not.toBeNull();
    expect(earthItem?.getAttribute('data-kind')).toBe('planet');
    expect(earthItem?.getAttribute('data-orbit-rank')).toBe('3');
    expect(earthItem?.getAttribute('data-region')).toBe('habitable-zone');
    expect(earthItem?.getAttribute('data-in-habitable-zone')).toBe('true');
    expect(earthItem?.getAttribute('data-focused')).toBe('true');
    expect(earthItem?.getAttribute('data-selected')).toBe('true');
    expect(panelContainer.textContent).toContain('Habitable zone');
    expect(panelContainer.textContent).toContain('Asteroid belt');
    expect(panelContainer.textContent).toContain('Kuiper belt');

    // Guide badge links (DEC-024)
    expect(panelContainer.querySelector('[data-testid="orbital-schematic-spectral-link"]')).not.toBeNull();
    const planetLink = panelContainer.querySelector('[data-testid="orbital-schematic-planet-type-link"]');
    expect(planetLink).not.toBeNull();
    expect(planetLink?.getAttribute('href')).toBe('/guide/planet-types/terrestrial');
    const hzLink = panelContainer.querySelector('[data-testid="orbital-schematic-habitable-link"]');
    expect(hzLink).not.toBeNull();
    expect(hzLink?.getAttribute('href')).toBe('/galaxy?select=tag:habitable-candidate');

    // Nested moon rendering (DEC-024)
    const moonItem = panelContainer.querySelector('[data-entity-id="moon"]');
    expect(moonItem).not.toBeNull();
    expect(moonItem?.getAttribute('data-kind')).toBe('moon');
    unmountPanel();

    // List composition
    const { container: listContainer, unmount: unmountList } = render(
      createElement(OrbitalSchematicList, { items: dummySystemSummary.items }),
    );
    expect(listContainer.querySelector('[data-testid="orbital-schematic-list"]')).not.toBeNull();
    unmountList();

    // Individual item composition
    const { container: singleItemContainer, unmount: unmountSingle } = render(
      createElement(OrbitalSchematicItem, { item: dummySystemSummary.items[2] }),
    );
    const ceresItem = singleItemContainer.querySelector('[data-entity-id="ceres"]');
    expect(ceresItem).not.toBeNull();
    expect(ceresItem?.getAttribute('data-region')).toBe('asteroid-belt');
    expect(singleItemContainer.textContent).toContain('Asteroid belt');
    unmountSingle();
  });
});

describe('Journey 3: Explorer Flow - Focus Preview Domain and Component Boundary (DEC-016)', () => {
  it('buildFocusedPreviewSummary produces correct previewMode, primary telemetry, and orbit elements across all modes', () => {
    // 1. null details returns null
    expect(buildFocusedPreviewSummary(null)).toBeNull();

    // 2. System mode ('system-orbits')
    const systemDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'sol',
        name: 'Sol',
        position: [0, 0, 0],
        classification: 'stellar-system',
      },
      corpus: SAMPLE_CORPUS,
      urlSystemSlug: 'sol',
      hasExplicitFocus: true,
      summaryNode: {
        id: 'sol',
        name: 'Sol',
        spect: 'G2V',
        dist: 0,
        starCount: 1,
        planetCount: 8,
        mag: -26.74,
        absmag: 4.83,
        x: 0,
        y: 0,
        z: 0,
        hasHabitableCandidate: true,
        sectorId: 'SEC-0-0-0',
      },
    });

    const systemPreview = buildFocusedPreviewSummary(systemDetails);
    expect(systemPreview).not.toBeNull();
    expect(systemPreview?.previewMode).toBe('system-orbits');
    expect(systemPreview?.targetId).toBe('sol');
    expect(systemPreview?.systemId).toBe('sol');
    expect(systemPreview?.orbitElements.length).toBeGreaterThan(0);
    const earthElement = systemPreview?.orbitElements.find((e) => e.id === 'earth');
    expect(earthElement).toMatchObject({
      id: 'earth',
      kind: 'planet',
      inHabitableZone: true,
    });

    // 3. Planet mode ('planetary-system')
    const planetDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'earth',
        name: 'Earth',
        position: [0, 0, 0],
        classification: 'terrestrial',
      },
      corpus: SAMPLE_CORPUS,
      urlSystemSlug: 'sol',
      urlPlanetSlug: 'earth',
      hasExplicitFocus: true,
      entityDetail: {
        kind: 'solar-body',
        record: {
          id: 'earth',
          name: 'Earth',
          classification: 'Planet',
          meanRadiusKm: 6371,
          orbit: {
            semiMajorAxis: 1.0,
            eccentricity: 0.0167,
            inclination: 0.00005,
            periodDays: 365.25,
            ascendingNode: 0,
            argumentOfPeriapsis: 102.9,
            meanAnomaly: 100.46,
          },
        },
      },
    });

    const planetPreview = buildFocusedPreviewSummary(planetDetails);
    expect(planetPreview).not.toBeNull();
    expect(planetPreview?.previewMode).toBe('planetary-system');
    expect(planetPreview?.targetId).toBe('earth');
    expect(planetPreview?.primarySemiMajorAxisAu).toBe(1.0);
    expect(planetPreview?.primaryEccentricity).toBe(0.0167);
    expect(planetPreview?.primaryInclinationDeg).toBe(0.00005);
    // Orbit elements should contain moons
    const moonElement = planetPreview?.orbitElements.find((e) => e.id === 'moon');
    expect(moonElement).toMatchObject({
      id: 'moon',
      kind: 'moon',
      orbitRank: 1,
      inHabitableZone: false,
    });

    // 4. Object orbit mode ('object-orbit') for minor body
    const minorBodyDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'ceres',
        name: 'Ceres',
        position: [0, 0, 0],
      },
      corpus: SAMPLE_CORPUS,
      urlSystemSlug: 'sol',
      hasExplicitFocus: true,
    });

    const ceresDetailRecord = {
      kind: 'solar-body' as const,
      record: {
        id: 'ceres',
        name: 'Ceres',
        classification: 'DwarfPlanet' as const,
        meanRadiusKm: 469.7,
        orbit: {
          semiMajorAxis: 2.77,
          eccentricity: 0.076,
          inclination: 10.59,
          periodDays: 1682,
          ascendingNode: 80.3,
          argumentOfPeriapsis: 73.1,
          meanAnomaly: 77.4,
        },
      },
    };

    const minorBodyPreview = buildFocusedPreviewSummary(minorBodyDetails, ceresDetailRecord);
    expect(minorBodyPreview).not.toBeNull();
    expect(minorBodyPreview?.previewMode).toBe('object-orbit');
    expect(minorBodyPreview?.targetId).toBe('ceres');
    expect(minorBodyPreview?.primarySemiMajorAxisAu).toBe(2.77);
    expect(minorBodyPreview?.primaryEccentricity).toBe(0.076);
    expect(minorBodyPreview?.primaryInclinationDeg).toBe(10.59);
    expect(minorBodyPreview?.orbitElements).toEqual([]);
  });

  it('renders <PreviewPanel /> with semantic attributes, telemetry, and orbit elements, and hides when preview is null', () => {
    // 1. null preview returns empty markup
    const { container: nullPrevContainer, unmount: unmountNullPrev } = render(
      createElement(PreviewPanel, { preview: null }),
    );
    expect(nullPrevContainer.firstChild).toBeNull();
    unmountNullPrev();

    // 2. Populated preview rendering
    const dummyPreview: FocusedPreviewSummary = {
      targetId: 'earth',
      targetName: 'Earth',
      systemId: 'sol',
      systemName: 'Sol',
      focusedKind: 'planet',
      previewMode: 'planetary-system',
      primarySemiMajorAxisAu: 1.0,
      primaryEccentricity: 0.0167,
      primaryInclinationDeg: 0.0005,
      orbitElements: [
        {
          id: 'moon',
          name: 'Moon',
          kind: 'moon',
          orbitRank: 1,
          semiMajorAxisAu: 0.00257,
          inHabitableZone: false,
        },
      ],
    };

    const { container: prevContainer, unmount: unmountPrev } = render(
      createElement(PreviewPanel, { preview: dummyPreview }),
    );
    const prevPanel = prevContainer.querySelector('[data-testid="preview-panel"]');
    expect(prevPanel).not.toBeNull();
    expect(prevPanel?.getAttribute('data-target-id')).toBe('earth');
    expect(prevPanel?.getAttribute('data-focused-kind')).toBe('planet');
    expect(prevPanel?.getAttribute('data-preview-mode')).toBe('planetary-system');
    expect(prevContainer.textContent).toContain('Focus Preview');
    expect(prevContainer.querySelector('[data-testid="preview-canvas-slot"]')).not.toBeNull();
    expect(prevContainer.querySelector('[data-testid="preview-target-title"]')).not.toBeNull();
    expect(prevContainer.querySelector('[data-testid="preview-target-name"]')).not.toBeNull();
    expect(prevContainer.textContent).toContain('Earth');
    expect(prevContainer.textContent).toContain('planetary-system');
    expect(prevContainer.querySelector('[data-testid="preview-primary-orbit-telemetry"]')).not.toBeNull();
    expect(prevContainer.textContent).toContain('Semi-Major Axis (a)');
    expect(prevContainer.textContent).toContain('AU');
    expect(prevContainer.textContent).toContain('0.0167');
    expect(prevContainer.textContent).toContain('Inclination (i)');
    expect(prevContainer.textContent).toContain('°');
    expect(prevContainer.querySelector('a[href^="/guide/metrics/semi-major-axis?focus="]')).not.toBeNull();
    expect(prevContainer.querySelector('a[href^="/guide/metrics/orbital-inclination?focus="]')).not.toBeNull();
    expect(prevContainer.querySelector('[data-testid="preview-orbits-list"]')).not.toBeNull();
    const moonOrbit = prevContainer.querySelector('[data-testid="preview-orbit-item"]');
    expect(moonOrbit).not.toBeNull();
    expect(moonOrbit?.getAttribute('data-entity-id')).toBe('moon');
    expect(moonOrbit?.getAttribute('data-kind')).toBe('moon');
    expect(moonOrbit?.getAttribute('data-orbit-rank')).toBe('1');
    expect(prevContainer.textContent).toContain('Moon');
    unmountPrev();
  });

  it('integrates <PreviewPanel /> across GalaxyView, SystemView, and PlanetView with focus state', async () => {
    // When visiting SystemView or PlanetView without ?focus=, PreviewPanel is hidden
    const unfocusedStore = createSpatialEntityStore();
    let sys1: ReturnType<typeof render>;
    await act(async () => {
      sys1 = render(
        createElement(
          SpatialEntityProvider,
          { store: unfocusedStore },
          createElement(SystemView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/system/sol',
            locationSearch: '',
          }),
        ),
      );
    });
    expect(screen.queryByTestId('preview-panel')).toBeNull();
    sys1!.unmount();

    let plan1: ReturnType<typeof render>;
    await act(async () => {
      plan1 = render(
        createElement(
          SpatialEntityProvider,
          { store: unfocusedStore },
          createElement(PlanetView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/planet/earth',
            locationSearch: '',
          }),
        ),
      );
    });
    expect(screen.queryByTestId('preview-panel')).toBeNull();
    plan1!.unmount();

    // When ?focus= is present, PreviewPanel is rendered
    const focusedStore = createSpatialEntityStore({
      focusedId: 'earth',
    });
    focusedStore.getState().registerEntity({
      id: 'earth',
      name: 'Earth',
      position: new THREE.Vector3(0, 0, 0),
      classification: 'terrestrial',
    });

    let sys2: ReturnType<typeof render>;
    await act(async () => {
      sys2 = render(
        createElement(
          SpatialEntityProvider,
          { store: focusedStore },
          createElement(SystemView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/system/sol',
            locationSearch: '?focus=earth',
          }),
        ),
      );
    });
    const sysPreview = screen.getByTestId('preview-panel');
    expect(sysPreview).toBeDefined();
    expect(sysPreview.getAttribute('data-preview-mode')).toBe('planetary-system');
    expect(screen.getAllByTestId('preview-panel')).toHaveLength(1);
    sys2!.unmount();

    let plan2: ReturnType<typeof render>;
    await act(async () => {
      plan2 = render(
        createElement(
          SpatialEntityProvider,
          { store: focusedStore },
          createElement(PlanetView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/planet/earth',
            locationSearch: '?focus=earth',
          }),
        ),
      );
    });
    expect(screen.getByTestId('preview-panel')).toBeDefined();
    expect(screen.getAllByTestId('preview-panel')).toHaveLength(1);
    plan2!.unmount();
  });

  it('renders PreviewPanel and system OrbitalSchematic inside the draggable DetailsPanel full detent', () => {
    const dummyDetails = buildFocusedEntityDetails({
      focusedEntity: { id: 'earth', name: 'Earth', position: [0, 0, 0], classification: 'terrestrial' },
      corpus: SAMPLE_CORPUS,
      summaryNode: undefined,
      systemDetail: undefined,
      entityDetail: undefined,
      urlSystemSlug: 'sol',
      urlFocusSlug: 'earth',
      hasExplicitFocus: true,
      canonRecords: [],
      viewScope: 'system',
      currentPathname: '/system/sol',
      currentSearch: '?focus=earth',
    });
    const dummyPreview = buildFocusedPreviewSummary(dummyDetails);
    const dummySchematic: OrbitalSchematicSummary = {
      scope: 'system',
      systemId: 'sol',
      systemName: 'Sol',
      habitableZoneAu: [0.95, 1.37],
      items: [
        {
          id: 'earth',
          name: 'Earth',
          href: '/system/sol?focus=earth',
          kind: 'planet',
          orbitRank: 1,
          summaryLabel: 'Earth',
          inHabitableZone: true,
          isFocused: true,
          isSelected: false,
        },
      ],
    };

    const { container: detentContainer, unmount: unmountDetents } = render(
      createElement(DetailsPanel, {
        details: dummyDetails,
        schematic: dummySchematic,
        preview: dummyPreview,
      }),
    );

    const fullDetent = detentContainer.querySelector('[data-testid="details-detent-full"]');
    expect(fullDetent).not.toBeNull();
    const previewInside = fullDetent?.querySelector('[data-testid="preview-panel"]');
    const schematicInside = fullDetent?.querySelector('[data-testid="orbital-schematic-panel"]');
    expect(previewInside).not.toBeNull();
    expect(schematicInside).not.toBeNull();
    unmountDetents();
  });

  it('GalaxyView resolves center coordinates for corpus systems and host systems of planets', async () => {
    const store = createSpatialEntityStore();
    const corpusWithDistantSystem: readonly CompactSearchEntry[] = [
      ...SAMPLE_CORPUS,
      {
        i: 'trappist-1',
        n: 'TRAPPIST-1',
        k: 1,
        p: [12.1, -4.5, 3.2],
        m: [18.8, 'M8V', 7, 1],
      },
      {
        i: 'trappist-1-e',
        n: 'TRAPPIST-1 e',
        k: 2,
        s: 'trappist-1',
        p: [0, 0, 0],
      },
    ];

    let g1: ReturnType<typeof render>;
    await act(async () => {
      g1 = render(
        createElement(
          SpatialEntityProvider,
          { store },
          createElement(GalaxyView, {
            initialCorpus: corpusWithDistantSystem,
            locationPathname: '/galaxy',
            locationSearch: '?center=trappist-1',
          }),
        ),
      );
    });

    // CanvasLayer should receive resolved center coordinates [12.1, -4.5, 3.2]
    const root1 = g1!.container.querySelector('[data-center-coords]');
    expect(root1?.getAttribute('data-center-coords')).toBe('12.1,-4.5,3.2');
    g1!.unmount();

    // Resolves coordinates for planet focus target via host system
    let g2: ReturnType<typeof render>;
    await act(async () => {
      g2 = render(
        createElement(
          SpatialEntityProvider,
          { store },
          createElement(GalaxyView, {
            initialCorpus: corpusWithDistantSystem,
            locationPathname: '/galaxy',
            locationSearch: '?center=trappist-1-e',
          }),
        ),
      );
    });
    const root2 = g2!.container.querySelector('[data-center-coords]');
    expect(root2?.getAttribute('data-center-coords')).toBe('12.1,-4.5,3.2');
    g2!.unmount();
  });
});

describe('Journey 3: Explorer Flow - Minimap Global Spatial Orientation Panel (DEC-017)', () => {
  it('buildGalaxyMinimapOrientation produces correct origin anchor, coordinates, and markers', () => {
    // 1. Unfocused state
    const unfocusedOrientation = buildGalaxyMinimapOrientation(undefined, [], null);
    expect(unfocusedOrientation.scope).toBe('galaxy');
    expect(unfocusedOrientation.anchorId).toBe('sol');
    expect(unfocusedOrientation.anchorName).toBe('Sol');
    expect(unfocusedOrientation.distanceFromOriginPc).toBe(0);
    expect(unfocusedOrientation.focusedMarker).toBeNull();
    expect(unfocusedOrientation.markers).toHaveLength(1);
    expect(unfocusedOrientation.markers[0].role).toBe('origin');
    expect(unfocusedOrientation.markers[0].id).toBe('sol');

    // 2. Focused and selected state
    const focusedOrientation = buildGalaxyMinimapOrientation(
      {
        id: 'alpha-centauri',
        name: 'Alpha Centauri',
        position: [-0.47, 1.32, -0.33],
        classification: 'stellar-system',
      },
      [
        {
          id: 'sirius',
          name: 'Sirius',
          position: [-1.6, -1.9, -1.1],
          classification: 'stellar-system',
        },
      ],
      null,
    );
    expect(focusedOrientation.focusedMarker?.id).toBe('alpha-centauri');
    expect(focusedOrientation.focusedMarker?.role).toBe('focused');
    expect(focusedOrientation.focusedMarker?.distanceFromOriginPc).toBe(1.44);
    expect(focusedOrientation.selectedMarkers).toHaveLength(1);
    expect(focusedOrientation.selectedMarkers[0].id).toBe('sirius');
    expect(focusedOrientation.selectedMarkers[0].role).toBe('selected');
    expect(focusedOrientation.markers).toHaveLength(3); // origin + focused + selected
  });

  it('buildSystemMinimapOrientation produces correct anchor, orbital metrics, and markers', () => {
    const dummySystemBodies = {
      scope: 'system' as const,
      systemId: 'sol',
      systemName: 'Sol',
      systemHref: '/system/sol',
      stars: [
        {
          id: 'sol',
          name: 'Sol',
          componentDesignation: 'A',
          spectralType: 'G2V',
          mag: -26.74,
          absmag: 4.83,
        },
      ],
      planets: [
        {
          id: 'earth',
          name: 'Earth',
          composition: 'terrestrial' as const,
          semiMajorAxisAu: 1.0,
          isHabitableCandidate: true,
        },
        {
          id: 'jupiter',
          name: 'Jupiter',
          composition: 'gas-giant' as const,
          semiMajorAxisAu: 5.2,
          isHabitableCandidate: false,
        },
      ],
      moonsAndDwarfPlanets: [
        { id: 'ceres', name: 'Ceres', href: '/system/sol?focus=ceres', categoryLabel: 'Dwarf Planet' },
      ],
      minorBodiesAndSpacecraft: [
        { id: 'voyager-1', name: 'Voyager 1', href: '/system/sol?focus=voyager-1', categoryLabel: 'Spacecraft' },
      ],
      canonAnnotations: [],
    };

    const dummySchematic: OrbitalSchematicSummary = {
      scope: 'system',
      systemId: 'sol',
      systemName: 'Sol',
      habitableZoneAu: [0.95, 1.37],
      items: [],
    };

    const orientation = buildSystemMinimapOrientation(
      dummySystemBodies,
      dummySchematic,
      null,
      {
        id: 'earth',
        name: 'Earth',
        position: [1, 0, 0],
        classification: 'terrestrial',
      },
      [],
    );

    expect(orientation.scope).toBe('system');
    expect(orientation.anchorId).toBe('sol');
    expect(orientation.outerOrbitalRadiusAu).toBe(5.2);
    expect(orientation.habitableZoneAu).toEqual([0.95, 1.37]);
    expect(orientation.orbitingBodyCount).toBe(4); // 2 planets + 1 moon/dwarf + 1 minor/craft
    expect(orientation.focusedMarker?.id).toBe('earth');
    expect(orientation.focusedMarker?.semiMajorAxisAu).toBe(1.0);
    expect(orientation.markers).toHaveLength(2); // anchor (Sol) + focused (Earth)
  });

  it('buildPlanetMinimapOrientation produces correct anchor, parent semi-major axis, and orbiting counts', () => {
    const dummyPlanetaryBodies = {
      scope: 'planet' as const,
      planetId: 'earth',
      planetName: 'Earth',
      planetHref: '/planet/earth',
      systemId: 'sol',
      systemName: 'Sol',
      systemHref: '/system/sol',
      planetDetail: {
        id: 'earth',
        name: 'Earth',
        composition: 'terrestrial' as const,
        semiMajorAxisAu: 1.0,
        isHabitableCandidate: true,
      },
      moons: [
        { id: 'moon', name: 'Moon', href: '/planet/earth?focus=moon', categoryLabel: 'Moon' },
      ],
      minorBodiesAndSpacecraft: [
        { id: 'iss', name: 'ISS', href: '/planet/earth?focus=iss', categoryLabel: 'Spacecraft' },
      ],
      canonAnnotations: [],
    };

    const orientation = buildPlanetMinimapOrientation(
      dummyPlanetaryBodies,
      {
        id: 'moon',
        name: 'Moon',
        position: [0.00257, 0, 0],
        classification: 'hazard',
      },
      [],
    );

    expect(orientation.scope).toBe('planet');
    expect(orientation.anchorId).toBe('earth');
    expect(orientation.parentSemiMajorAxisAu).toBe(1.0);
    expect(orientation.orbitingBodyCount).toBe(2);
    expect(orientation.focusedMarker?.id).toBe('moon');
    expect(orientation.markers).toHaveLength(2); // anchor (Earth) + focused (Moon)
  });

  it('<Minimap /> component renders semantic HTML, badges, telemetry, and marker lists', () => {
    // 1. null orientation renders null
    const { container: nullMapContainer, unmount: unmountNullMap } = render(
      createElement(Minimap, { orientation: null }),
    );
    expect(nullMapContainer.firstChild).toBeNull();
    unmountNullMap();

    // 2. Full orientation rendering
    const dummyOrientation: MinimapOrientationSummary = {
      scope: 'planet',
      anchorId: 'earth',
      anchorName: 'Earth',
      systemId: 'sol',
      systemName: 'Sol',
      parentSemiMajorAxisAu: 1.0,
      orbitingBodyCount: 2,
      focusedMarker: {
        id: 'moon',
        name: 'Moon',
        kind: 'moon',
        role: 'focused',
        href: '/planet/earth?focus=moon',
      },
      selectedMarkers: [],
      markers: [
        {
          id: 'earth',
          name: 'Earth',
          kind: 'planet',
          role: 'anchor',
          href: '/planet/earth?focus=earth',
          semiMajorAxisAu: 1.0,
        },
        {
          id: 'moon',
          name: 'Moon',
          kind: 'moon',
          role: 'focused',
          href: '/planet/earth?focus=moon',
        },
      ],
    };

    const { container: mapContainer, unmount: unmountMap } = render(
      createElement(Minimap, { orientation: dummyOrientation }),
    );
    const panel = mapContainer.querySelector('[data-testid="minimap-panel"]');
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute('data-scope')).toBe('planet');
    expect(panel?.getAttribute('data-anchor-id')).toBe('earth');
    expect(panel?.getAttribute('data-system-id')).toBe('sol');
    expect(mapContainer.querySelector('[data-testid="minimap-viewport-slot"]')).not.toBeNull();
    const anchorName = mapContainer.querySelector('[data-testid="minimap-anchor-name"]');
    expect(anchorName).not.toBeNull();
    expect(mapContainer.textContent).toContain('Earth');
    expect(mapContainer.textContent).toContain('Sol');
    expect(mapContainer.querySelector('[data-testid="minimap-telemetry"]')).not.toBeNull();
    expect(mapContainer.textContent).toContain('Semi-Major Axis (a)');
    expect(mapContainer.textContent).toContain('AU');
    const orbitingCount = mapContainer.querySelector('[data-testid="minimap-orbiting-count"]');
    expect(orbitingCount).not.toBeNull();
    expect(orbitingCount?.textContent).toContain('2');
    expect(orbitingCount?.textContent).toContain('orbiting bodies');
    expect(mapContainer.querySelector('[data-testid="minimap-markers-list"]')).not.toBeNull();
    const earthMarker = mapContainer.querySelector('[data-marker-id="earth"]');
    expect(earthMarker).not.toBeNull();
    expect(earthMarker?.getAttribute('data-marker-role')).toBe('anchor');
    expect(earthMarker?.textContent).toContain('anchor');
    const moonMarker = mapContainer.querySelector('[data-marker-id="moon"]');
    expect(moonMarker).not.toBeNull();
    expect(moonMarker?.getAttribute('data-marker-role')).toBe('focused');
    expect(moonMarker?.textContent).toContain('focused');
    unmountMap();
  });

  it('renders <Minimap /> unconditionally across GalaxyView, SystemView, and PlanetView even without ?focus=', async () => {
    const store = createSpatialEntityStore();

    // 1. GalaxyView without ?focus=
    let g: ReturnType<typeof render>;
    await act(async () => {
      g = render(
        createElement(
          SpatialEntityProvider,
          { store },
          createElement(GalaxyView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/galaxy',
            locationSearch: '',
          }),
        ),
      );
    });
    const gMinimap = g!.container.querySelector('[data-testid="minimap-panel"]');
    expect(gMinimap).not.toBeNull();
    expect(gMinimap?.getAttribute('data-scope')).toBe('galaxy');
    expect(g!.container.querySelector('[data-testid="details-panel"]')).toBeNull();
    g!.unmount();

    // 2. SystemView without ?focus=
    let s: ReturnType<typeof render>;
    await act(async () => {
      s = render(
        createElement(
          SpatialEntityProvider,
          { store },
          createElement(SystemView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/system/sol',
            locationSearch: '',
          }),
        ),
      );
    });
    const sMinimap = s!.container.querySelector('[data-testid="minimap-panel"]');
    expect(sMinimap).not.toBeNull();
    expect(sMinimap?.getAttribute('data-scope')).toBe('system');
    expect(s!.container.querySelector('[data-testid="details-panel"]')).toBeNull();
    s!.unmount();

    // 3. PlanetView without ?focus=
    let p: ReturnType<typeof render>;
    await act(async () => {
      p = render(
        createElement(
          SpatialEntityProvider,
          { store },
          createElement(PlanetView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/planet/earth',
            locationSearch: '',
          }),
        ),
      );
    });
    const pMinimap = p!.container.querySelector('[data-testid="minimap-panel"]');
    expect(pMinimap).not.toBeNull();
    expect(pMinimap?.getAttribute('data-scope')).toBe('planet');
    expect(p!.container.querySelector('[data-testid="details-panel"]')).toBeNull();
    p!.unmount();
  });
});
