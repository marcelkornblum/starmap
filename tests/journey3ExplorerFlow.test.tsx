// @vitest-environment jsdom
import { createElement, type ReactElement } from 'react';
import { render } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SpatialEntityProvider } from '../src/components/canvas/entity/SpatialEntityContext';
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
  extractUrlFocusSlug,
  extractUrlTagFocus,
  isCatalogTag,
  resolveSelectedSystemsFromTag,
} from '../src/services/searchService';
import { syncSelectedSystemsToStore } from '../src/components/search/searchStoreSync';
import { type CompactSearchEntry } from '../src/utils/compactDataCodec';
import { GalaxyView } from '../src/views/GalaxyView';
import { PlanetView } from '../src/views/PlanetView';
import { SystemView } from '../src/views/SystemView';
import {
  resetLayerRuntime,
  seedAllLayerData,
} from './layerFixtures';
import { SAMPLE_CORPUS } from './searchFixtures';

const renderToHtml = (element: ReactElement): string => render(element).container.innerHTML;

describe('Journey 3: Explorer Flow - Multi-Entity Selection & Astrometry Tags', () => {
  beforeAll(seedAllLayerData);
  afterAll(resetLayerRuntime);

  it('synchronizes focused and selected store states in GalaxyView without debug systems panel', () => {
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
    const searchHtml = renderToHtml(
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

    expect(searchHtml).toContain('data-testid="galaxy-view-root"');
    expect(searchHtml).not.toContain('data-testid="systems-panel"');
    // "Adrian" is a fictional entry in the Tau Ceti system -> Tau Ceti becomes selected
    expect(store.getState().getEntitiesByState('selected').map((e) => e.name)).toEqual([
      'Tau Ceti',
    ]);
    expect(store.getState().getEntitiesByState('focused')).toEqual([]);
    // When nothing is focused, Details panel does not show at all
    expect(searchHtml).not.toContain('data-testid="details-panel"');

    // 2. Clicking through to '/galaxy/tau-ceti?focus=tau-ceti-e' clears selected (since ?q= is not in URL), focuses 'tau Ceti e', and renders Details panel
    store.getState().setSelectedIds([]);
    const focusChildHtml = renderToHtml(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(GalaxyView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/galaxy/tau-ceti',
          locationSearch: '?focus=tau-ceti-e',
        }),
      ),
    );

    expect(store.getState().getEntitiesByState('selected')).toEqual([]);
    expect(store.getState().getEntitiesByState('focused').map((e) => e.name)).toEqual([
      'tau Ceti e',
    ]);
    expect(focusChildHtml).not.toContain('data-testid="systems-panel"');
    expect(focusChildHtml).toContain('data-testid="details-panel"');
    expect(focusChildHtml).toContain('id="details-panel-heading"');
    expect(focusChildHtml).toContain('Details</h2>');
    expect(focusChildHtml).toContain('id="details-peek-heading"');
    expect(focusChildHtml).toContain('Peek</h3>');
    expect(focusChildHtml).toContain('id="details-partial-heading"');
    expect(focusChildHtml).toContain('Partial</h3>');
    expect(focusChildHtml).toContain('id="details-full-heading"');
    expect(focusChildHtml).toContain('Full</h3>');
    expect(focusChildHtml).toContain('data-testid="details-button-system-details"');
    expect(focusChildHtml).toContain('href="/planet/tau-ceti-e"');
    expect(focusChildHtml).toContain('data-testid="details-button-directions"');
    expect(focusChildHtml).toContain('Hail Mary');
    expect(focusChildHtml).toContain('Adrian');

    // 3. Clicking through to '/galaxy/tau-ceti' focuses 'Tau Ceti' and shows Details panel with Peek, Partial, and Full detents
    const focusSystemHtml = renderToHtml(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(GalaxyView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/galaxy/tau-ceti',
          locationSearch: '',
        }),
      ),
    );

    expect(store.getState().getEntitiesByState('selected')).toEqual([]);
    expect(store.getState().getEntitiesByState('focused').map((e) => e.name)).toEqual([
      'Tau Ceti',
    ]);
    expect(focusSystemHtml).not.toContain('data-testid="systems-panel"');
    expect(focusSystemHtml).toContain('data-testid="details-panel"');
    expect(focusSystemHtml).toContain('data-testid="details-spectral-badge"');
    expect(focusSystemHtml).toContain('data-spectral-badge="G8V"');
    expect(focusSystemHtml).toContain('href="/guide/star-types/G8V"');
    expect(focusSystemHtml).toContain('data-testid="details-reticle-type"');
    expect(focusSystemHtml).toContain('stellar-system');
    expect(focusSystemHtml).toContain('>4</span>');
    expect(focusSystemHtml).toContain('planets</span>');
    expect(focusSystemHtml).toContain('data-testid="details-button-system-details"');
    expect(focusSystemHtml).toContain('href="/system/tau-ceti"');
    expect(focusSystemHtml).toContain('Directions');
    expect(focusSystemHtml).toContain('Tau Ceti');
    expect(focusSystemHtml).toContain('Astrophage Destination');
    expect(focusSystemHtml).toContain('data-testid="details-canon-item"');
    expect(focusSystemHtml).toContain('data-testid="details-canon-item-title"');

    // Verify DEC-022 detents: Peek contains systemSummary, Partial contains Canon, and Full contains Astrometry
    const peekSplit = focusSystemHtml.split('data-testid="details-detent-partial"')[0] ?? '';
    const partialSplit =
      focusSystemHtml
        .split('data-testid="details-detent-partial"')[1]
        ?.split('data-testid="details-detent-full"')[0] ?? '';
    const fullSplit =
      focusSystemHtml.split('data-testid="details-detent-full"')[1] ?? '';
    expect(peekSplit).toContain('data-testid="details-system-summary"');
    expect(partialSplit).toContain('data-testid="details-canon-section"');
    expect(fullSplit).toContain('data-testid="details-astrometry-section"');

    // 4. Navigating to '/galaxy' (nothing in URL) clears both focused and selected states and hides Details panel
    const cleanHtml = renderToHtml(
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

    expect(store.getState().getEntitiesByState('focused')).toEqual([]);
    expect(store.getState().getEntitiesByState('selected')).toEqual([]);
    expect(cleanHtml).not.toContain('data-testid="systems-panel"');
    expect(cleanHtml).not.toContain('data-testid="details-panel"');
  });

  it('links Astrometry tags in DetailsPanel to /galaxy?select=tag:<tagSlug> and supports multi-entity ?select= lists alongside ?focus=', () => {
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

    // extractUrlFocusSlug ignores ?select= so no fake entity is focused
    expect(extractUrlFocusSlug('/galaxy', '?select=tag:exoplanet-host')).toBeNull();

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
    const detailsHtml = renderToHtml(
      createElement(DetailsPanel, { details: focusedDetails }),
    );
    expect(detailsHtml).toContain('data-testid="details-habitable-zone-link"');
    expect(detailsHtml).toContain('data-testid="details-summary-habitable-link"');
    expect(detailsHtml).toContain('data-testid="details-planet-habitable-link"');
    expect(detailsHtml).toContain('data-testid="details-astrometry-tag-link"');
    expect(detailsHtml).toContain('href="/galaxy?select=tag:solar-neighborhood-10pc"');
    expect(detailsHtml).toContain('href="/galaxy?select=tag:naked-eye"');
    expect(detailsHtml).toContain('href="/galaxy?select=tag:exoplanet-host"');
    expect(detailsHtml).toContain('href="/galaxy?select=tag:habitable-candidate"');
    expect(detailsHtml).not.toContain('data-testid="details-canon-tag-link"');

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
    const html = renderToHtml(
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
    const selected = store.getState().getEntitiesByState('selected');
    expect(selected.map((s) => s.name)).toEqual(['Sol', 'Tau Ceti']);
    expect(store.getState().getEntitiesByState('focused')).toEqual([]);
    expect(html).not.toContain('data-testid="details-panel"');
    expect(html).not.toContain('data-testid="systems-panel"');

    // GalaxyView loading /galaxy?select=sol,keid&focus=tau-ceti selects Sol + Keid and focuses Tau Ceti
    const multiStore = createSpatialEntityStore();
    const multiHtml = renderToHtml(
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
    expect(multiHtml).toContain('data-testid="details-panel"');
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
    const itemIds = schematic?.items.map((i) => i.id);
    expect(itemIds?.indexOf('sol-A')).toBeLessThan(itemIds?.indexOf('earth')!);
    expect(itemIds?.indexOf('earth')).toBeLessThan(itemIds?.indexOf('ceres')!);
    expect(itemIds?.indexOf('ceres')).toBeLessThan(itemIds?.indexOf('pluto')!);
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
    expect(renderToHtml(createElement(OrbitalSchematicPanel, { elements: null }))).toBe('');

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

    const html = renderToHtml(createElement(OrbitalSchematicPanel, { elements: dummySystemSummary }));
    expect(html).toContain('data-testid="orbital-schematic-panel"');
    expect(html).toContain('data-scope="system"');
    expect(html).toContain('data-system-id="sol"');
    expect(html).toContain('Orbital Schematic');
    expect(html).toContain('data-testid="orbital-schematic-list"');
    expect(html).toContain('data-testid="orbital-schematic-item"');
    expect(html).toContain('data-entity-id="earth"');
    expect(html).toContain('data-kind="planet"');
    expect(html).toContain('data-orbit-rank="3"');
    expect(html).toContain('data-region="habitable-zone"');
    expect(html).toContain('data-in-habitable-zone="true"');
    expect(html).toContain('data-focused="true"');
    expect(html).toContain('data-selected="true"');
    expect(html).toContain('Habitable zone');
    expect(html).toContain('Asteroid belt');
    expect(html).toContain('Kuiper belt');

    // Guide badge links (DEC-024)
    expect(html).toContain('data-testid="orbital-schematic-spectral-link"');
    expect(html).toContain('data-testid="orbital-schematic-planet-type-link"');
    expect(html).toContain('data-testid="orbital-schematic-habitable-link"');
    expect(html).toContain('href="/guide/planet-types/terrestrial"');
    expect(html).toContain('href="/galaxy?select=tag:habitable-candidate"');

    // Nested moon rendering (DEC-024)
    expect(html).toContain('data-entity-id="moon"');
    expect(html).toContain('data-kind="moon"');

    // List composition
    const listHtml = renderToHtml(
      createElement(OrbitalSchematicList, { items: dummySystemSummary.items }),
    );
    expect(listHtml).toContain('data-testid="orbital-schematic-list"');

    // Individual item composition
    const singleItemHtml = renderToHtml(
      createElement(OrbitalSchematicItem, { item: dummySystemSummary.items[2] }),
    );
    expect(singleItemHtml).toContain('data-entity-id="ceres"');
    expect(singleItemHtml).toContain('data-region="asteroid-belt"');
    expect(singleItemHtml).toContain('Asteroid belt');
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
    expect(renderToHtml(createElement(PreviewPanel, { preview: null }))).toBe('');

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

    const html = renderToHtml(createElement(PreviewPanel, { preview: dummyPreview }));
    expect(html).toContain('data-testid="preview-panel"');
    expect(html).toContain('data-target-id="earth"');
    expect(html).toContain('data-focused-kind="planet"');
    expect(html).toContain('data-preview-mode="planetary-system"');
    expect(html).toContain('Focus Preview');
    expect(html).toContain('data-testid="preview-canvas-slot"');
    expect(html).toContain('data-testid="preview-target-title"');
    expect(html).toContain('data-testid="preview-target-name"');
    expect(html).toContain('Earth');
    expect(html).toContain('planetary-system');
    expect(html).toContain('data-testid="preview-primary-orbit-telemetry"');
    expect(html).toContain('Semi-Major Axis (a)');
    expect(html).toContain('AU');
    expect(html).toContain('0.0167');
    expect(html).toContain('Inclination (i)');
    expect(html).toContain('°');
    expect(html).toContain('href="/guide/metrics/semi-major-axis?focus=');
    expect(html).toContain('href="/guide/metrics/orbital-inclination?focus=');
    expect(html).toContain('data-testid="preview-orbits-list"');
    expect(html).toContain('data-testid="preview-orbit-item"');
    expect(html).toContain('data-entity-id="moon"');
    expect(html).toContain('data-kind="moon"');
    expect(html).toContain('data-orbit-rank="1"');
    expect(html).toContain('Moon');
  });

  it('integrates <PreviewPanel /> across GalaxyView, SystemView, and PlanetView with focus state', () => {
    // When visiting SystemView or PlanetView without ?focus=, PreviewPanel is hidden
    const unfocusedStore = createSpatialEntityStore();
    const systemUnfocusedHtml = renderToHtml(
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
    expect(systemUnfocusedHtml).not.toContain('data-testid="preview-panel"');

    const planetUnfocusedHtml = renderToHtml(
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
    expect(planetUnfocusedHtml).not.toContain('data-testid="preview-panel"');

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

    const systemFocusedHtml = renderToHtml(
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
    expect(systemFocusedHtml).toContain('data-testid="preview-panel"');
    expect(systemFocusedHtml).toContain('data-preview-mode="planetary-system"');
    expect(systemFocusedHtml.match(/data-testid="preview-panel"/g)).toHaveLength(1);

    const planetFocusedHtml = renderToHtml(
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
    expect(planetFocusedHtml).toContain('data-testid="preview-panel"');
    expect(planetFocusedHtml.match(/data-testid="preview-panel"/g)).toHaveLength(1);
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

    const html = renderToHtml(
      createElement(DetailsPanel, {
        details: dummyDetails,
        schematic: dummySchematic,
        preview: dummyPreview,
      }),
    );

    expect(html).toContain('data-testid="details-detent-full"');
    expect(html).toContain('data-testid="preview-panel"');
    expect(html).toContain('data-testid="orbital-schematic-panel"');

    const fullIdx = html.indexOf('data-testid="details-detent-full"');
    const previewIdx = html.indexOf('data-testid="preview-panel"');
    const schematicIdx = html.indexOf('data-testid="orbital-schematic-panel"');

    // Both are inside full detent
    expect(previewIdx).toBeGreaterThan(fullIdx);
    expect(schematicIdx).toBeGreaterThan(fullIdx);
  });

  it('GalaxyView resolves center coordinates for corpus systems and host systems of planets', () => {
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

    const html = renderToHtml(
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

    // CanvasLayer should receive resolved center coordinates [12.1, -4.5, 3.2]
    expect(html).toContain('data-center-coords="12.1,-4.5,3.2"');

    // Resolves coordinates for planet focus target via host system
    const planetCenterHtml = renderToHtml(
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
    expect(planetCenterHtml).toContain('data-center-coords="12.1,-4.5,3.2"');
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
    const nullHtml = renderToHtml(createElement(Minimap, { orientation: null }));
    expect(nullHtml).toBe('');

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

    const html = renderToHtml(createElement(Minimap, { orientation: dummyOrientation }));
    expect(html).toContain('data-testid="minimap-panel"');
    expect(html).toContain('data-scope="planet"');
    expect(html).toContain('data-anchor-id="earth"');
    expect(html).toContain('data-system-id="sol"');
    expect(html).toContain('data-testid="minimap-viewport-slot"');
    expect(html).toContain('data-testid="minimap-anchor-name"');
    expect(html).toContain('Earth');
    expect(html).toContain('Sol');
    expect(html).toContain('data-testid="minimap-telemetry"');
    expect(html).toContain('Semi-Major Axis (a)');
    expect(html).toContain('AU');
    expect(html).toContain('data-testid="minimap-orbiting-count"');
    expect(html).toContain('>2</span>');
    expect(html).toContain('orbiting bodies</span>');
    expect(html).toContain('data-testid="minimap-markers-list"');
    expect(html).toContain('data-marker-id="earth"');
    expect(html).toContain('data-marker-role="anchor"');
    expect(html).toContain('anchor');
    expect(html).toContain('data-marker-id="moon"');
    expect(html).toContain('data-marker-role="focused"');
    expect(html).toContain('focused');
  });

  it('renders <Minimap /> unconditionally across GalaxyView, SystemView, and PlanetView even without ?focus=', () => {
    const store = createSpatialEntityStore();

    // 1. GalaxyView without ?focus=
    const galaxyHtml = renderToHtml(
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
    expect(galaxyHtml).toContain('data-testid="minimap-panel"');
    expect(galaxyHtml).toContain('data-scope="galaxy"');
    expect(galaxyHtml).not.toContain('data-testid="details-panel"');

    // 2. SystemView without ?focus=
    const systemHtml = renderToHtml(
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
    expect(systemHtml).toContain('data-testid="minimap-panel"');
    expect(systemHtml).toContain('data-scope="system"');
    expect(systemHtml).not.toContain('data-testid="details-panel"');

    // 3. PlanetView without ?focus=
    const planetHtml = renderToHtml(
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
    expect(planetHtml).toContain('data-testid="minimap-panel"');
    expect(planetHtml).toContain('data-scope="planet"');
    expect(planetHtml).not.toContain('data-testid="details-panel"');
  });
});
