import { createElement } from 'react';
import { act, render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { SpatialEntityProvider } from '../src/components/canvas/entity/SpatialEntityProvider';
import { createSpatialEntityStore } from '../src/components/canvas/entity/SpatialEntityStore';
import {
  BodiesPanel,
  Breadcrumbs,
  DetailsPanel,
  SearchResultItem,
} from '../src/components/domain';
import {
  clearDetailsRepositoryCache,
  decodeDetailRecord,
  fetchDetailRecord,
  fetchSummaryNode,
  getCachedDetailRecord,
  getCachedExoplanetFromSystem,
  getCachedSummaryNode,
} from '../src/data/detailsRepository';
import {
  buildFocusedEntityDetails,
  buildIntrinsicSystemSummary,
  buildPlanetCompositionSummary,
  buildPlanetDetailsHref,
  buildPlanetElementFocusHref,
  buildPlanetaryBodiesSummary,
  buildPlanetViewBreadcrumbs,
  buildSystemBodiesSummary,
  buildSystemDetailsHref,
  buildSystemElementFocusHref,
  buildSystemViewBreadcrumbs,
  classifyExoplanetComposition,
  isExoplanetHabitableCandidate,
  resolveCanonLayerKindPriority,
  resolveFocusedCanonAnnotations,
  sortCanonAnnotations,
} from '../src/services/detailsService';
import {
  METRICS_GUIDE_PATH,
  PLANET_TYPES_GUIDE_PATH,
  STAR_TYPES_GUIDE_PATH,
  buildMetricGuideHref,
  buildPlanetTypeGuideHref,
  buildStarTypeGuideHref,
  executeCatalogSearch,
  hasExplicitFocusParam,
} from '../src/services/searchService';
import { MetricDetailView } from '../src/views/MetricDetailView';
import { MetricsListView } from '../src/views/MetricsListView';
import { PlanetTypeDetailView } from '../src/views/PlanetTypeDetailView';
import { PlanetTypesListView } from '../src/views/PlanetTypesListView';
import { PlanetView } from '../src/views/PlanetView';
import { SearchView } from '../src/views/SearchView';
import { StarTypeDetailView } from '../src/views/StarTypeDetailView';
import { StarTypesListView } from '../src/views/StarTypesListView';
import { SystemView } from '../src/views/SystemView';
import {
  annotationRecordsFor,
  resetLayerRuntime,
  seedAllLayerData,
} from './fixtures/layerFixtures';
import { SAMPLE_CORPUS } from './fixtures/searchFixtures';

describe('Journey 1: Reader Flow - Details Service & Panel Decomposition', () => {
  beforeAll(seedAllLayerData);
  afterAll(resetLayerRuntime);
  it('evaluates detailsService builders, detailsRepository bucket lookups, and DetailsPanel decomposition across all branches', async () => {
    // 1. DetailsPanel returns null when details is null
    const { container: nullDetails, unmount: unmountNullDetails } = render(
      createElement(DetailsPanel, { details: null }),
    );
    expect(nullDetails.firstChild).toBeNull();
    unmountNullDetails();
    expect(buildFocusedEntityDetails({ focusedEntity: null })).toBeNull();
    expect(buildSystemDetailsHref('tau-ceti')).toBe('/system/tau-ceti');
    expect(buildSystemDetailsHref('')).toBe('/system/sol');

    // 2. classifyExoplanetComposition & isExoplanetHabitableCandidate
    expect(classifyExoplanetComposition({ massMearth: 1.2, radiusRearth: 1.1 })).toBe('terrestrial');
    expect(classifyExoplanetComposition({ massMearth: 15, radiusRearth: 3.5 })).toBe('ice-giant');
    expect(classifyExoplanetComposition({ massMearth: 300, radiusRearth: 11 })).toBe('gas-giant');

    expect(isExoplanetHabitableCandidate({ esi: 0.82 })).toBe(true);
    expect(isExoplanetHabitableCandidate({ equilibriumTempK: 260 })).toBe(true);
    expect(isExoplanetHabitableCandidate({ equilibriumTempK: 800, esi: 0.2 })).toBe(false);

    // 3. buildPlanetCompositionSummary
    expect(buildPlanetCompositionSummary([], 0, false)).toBe('0 confirmed planets');
    expect(buildPlanetCompositionSummary([], 1, false, ['gas-giant'])).toBe('1 planet (gas-giant)');
    expect(buildPlanetCompositionSummary([], 2, true)).toBe(
      '2 planets (terrestrial · Habitable zone candidate)',
    );
    expect(
      buildPlanetCompositionSummary(
        [
          {
            id: 'p1',
            name: 'P1',
            composition: 'terrestrial',
            isHabitableCandidate: true,
          },
          {
            id: 'p2',
            name: 'P2',
            composition: 'ice-giant',
            isHabitableCandidate: false,
          },
          {
            id: 'p3',
            name: 'P3',
            composition: 'gas-giant',
            isHabitableCandidate: false,
          },
        ],
        3,
        true,
      ),
    ).toBe('3 planets (1 terrestrial · 1 ice-giant · 1 gas-giant · Habitable zone candidate)');

    // 4. buildIntrinsicSystemSummary
    expect(
      buildIntrinsicSystemSummary({
        name: 'Custom',
        systemName: 'Custom',
        isChildEntity: false,
        starCount: 2,
        planetCount: 0,
        hasHabitableCandidate: false,
        manifestOverview: '  Explicit overview prose.  ',
      }),
    ).toBe('Explicit overview prose.');
    expect(
      buildIntrinsicSystemSummary({
        name: 'Hyades',
        systemName: 'Hyades',
        isChildEntity: false,
        starCount: 1,
        planetCount: 0,
        hasHabitableCandidate: false,
        structureDescription: 'Open cluster in Taurus.',
      }),
    ).toBe('Open cluster in Taurus.');
    expect(
      buildIntrinsicSystemSummary({
        name: 'Binary Star',
        systemName: 'Binary Star',
        isChildEntity: false,
        spectralType: 'Unknown',
        starCount: 2,
        planetCount: 1,
        hasHabitableCandidate: false,
      }),
    ).toBe('Binary Star is a 2-star system hosting 1 confirmed planet.');

    // 5. resolveFocusedCanonAnnotations & sortCanonAnnotations (factual before fictional, plus custom ordering)
    expect(resolveCanonLayerKindPriority('scientific-overlay')).toBe(0);
    expect(resolveCanonLayerKindPriority('custom-user')).toBe(1);
    expect(resolveCanonLayerKindPriority('fictional-canon')).toBe(2);
    expect(
      resolveCanonLayerKindPriority(
        'unknown-kind' as unknown as 'scientific-overlay',
      ),
    ).toBe(3);

    const annotations = resolveFocusedCanonAnnotations(
      'canon-project-hail-mary:tau-ceti-e',
      'gaia-2452378776434477184',
      annotationRecordsFor(['tau-ceti-e', 'gaia-2452378776434477184']),
    );
    // Factual 'scientific-overlay' layer appears first
    expect(annotations[0]?.kind).toBe('scientific-overlay');
    expect(annotations[0]?.layerTitle).toBe('SETI');
    // Within 'fictional-canon', the direct planet annotation ('Adrian') appears before system-level annotations
    const fictional = annotations.filter((a) => a.kind === 'fictional-canon');
    expect(fictional[0]?.inUniverseName).toBe('Adrian');
    expect(annotations.some((a) => a.subtitle === 'Astrophage Destination')).toBe(
      true,
    );

    // Custom user-curated layerIdOrder overrides default ordering
    const customOrdered = sortCanonAnnotations(annotations, {
      layerIdOrder: ['canon-halo', 'canon-project-hail-mary'],
    });
    expect(customOrdered[0]?.layerId).toBe('canon-halo');
    expect(customOrdered[1]?.layerId).toBe('canon-project-hail-mary');

    // 6. detailsRepository shard caching, decoding (sys, str, sol), and error handling
    clearDetailsRepositoryCache();
    expect(getCachedSummaryNode('')).toBeUndefined();
    expect(getCachedDetailRecord('')).toBeUndefined();
    expect(await fetchSummaryNode('')).toBeUndefined();
    expect(await fetchDetailRecord('')).toBeUndefined();
    expect(getCachedExoplanetFromSystem('gaia-2452378776434477184', 'tau-ceti-e')).toBeUndefined();

    const decodedStr = decodeDetailRecord(
      {
        t: 'str',
        n: 'Orion Nebula',
        k: 8,
        p: [-340, -210, -130],
        d: 'Diffuse emission nebula.',
      },
      'ngc-1976',
    );
    expect(decodedStr.kind).toBe('structure');

    const decodedSol = decodeDetailRecord(
      {
        t: 'sol',
        n: 'Earth',
        k: 2,
        r: 6371,
      },
      'earth',
    );
    expect(decodedSol.kind).toBe('solar-body');

    const mockFetch = vi.fn(async (url: string) => {
      if (url.includes('/data/summaries/')) {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({
            i: '1',
            c: 1,
            d: {
              'gaia-2452378776434477184': {
                n: 'Tau Ceti',
                p: [-3.1, -0.4, -2.0],
                m: 3.5,
                M: 5.69,
                s: 'G8V',
                u: 1,
                k: 2,
                e: 1,
                h: 1,
                g: 14,
              },
            },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          i: '1',
          c: 1,
          d: {
            'gaia-2452378776434477184': {
              t: 'sys',
              n: 'Tau Ceti',
              p: [-3.1, -0.4, -2.0],
              S: [
                {
                  i: 'tau-ceti-A',
                  n: 'Tau Ceti A',
                  s: 'G8V',
                  m: 3.5,
                  M: 5.69,
                  u: 0.78,
                  r: 0.79,
                  l: 0.52,
                  T: 5344,
                },
              ],
              E: [
                {
                  i: 'tau-ceti-e',
                  n: 'Tau Ceti e',
                  l: 'e',
                  y: 2017,
                  d: 1,
                  e: 3.93,
                  r: 1.8,
                  T: 270,
                  o: [0.538, 0.18, 0, 0, 0, 0, 162.87],
                },
                {
                  i: 'tau-ceti-g',
                  n: 'Tau Ceti g',
                  l: 'g',
                  o: [0.133, 0.06, 0, 0, 0, 0, 20.0],
                },
              ],
            },
          },
        }),
      };
    }) as unknown as typeof fetch;

    const summary = await fetchSummaryNode('gaia-2452378776434477184', mockFetch);
    expect(summary?.name).toBe('Tau Ceti');
    // Second call hits cache
    expect(await fetchSummaryNode('gaia-2452378776434477184', mockFetch)).toBeDefined();

    const detail = await fetchDetailRecord('gaia-2452378776434477184', mockFetch);
    expect(detail?.kind).toBe('system');
    expect(await fetchDetailRecord('gaia-2452378776434477184', mockFetch)).toBeDefined();
    expect(getCachedExoplanetFromSystem('gaia-2452378776434477184', 'tau-ceti-e')?.name).toBe(
      'Tau Ceti e',
    );

    // Build full FocusedEntityDetails with manifest, summaryNode, and THREE.Vector3 position
    const fullDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        position: new THREE.Vector3(-3.1, -0.4, -2.0),
        classification: 'stellar-system',
      },
      summaryNode: summary,
      systemDetail: detail,
    });
    expect(fullDetails).not.toBeNull();
    expect(fullDetails?.planets.map((p) => p.id)).toEqual(['tau-ceti-g', 'tau-ceti-e']);

    const { container: fullContainer, unmount: unmountFull } = render(
      createElement(DetailsPanel, { details: fullDetails }),
    );
    expect(fullContainer.textContent).toContain('0.538');
    expect(fullContainer.querySelector('a[href^="/guide/metrics/semi-major-axis?focus="]')).not.toBeNull();
    expect(fullContainer.textContent).toContain('162.87');
    expect(fullContainer.querySelector('a[href^="/guide/metrics/orbital-period?focus="]')).not.toBeNull();
    expect(fullContainer.textContent).toContain('3.93');
    expect(fullContainer.querySelector('a[href^="/guide/metrics/planetary-mass?focus="]')).not.toBeNull();
    expect(fullContainer.textContent).toContain('270');
    expect(fullContainer.querySelector('a[href^="/guide/metrics/equilibrium-temperature?focus="]')).not.toBeNull();
    expect(fullContainer.querySelector('a[href^="/guide/metrics/stellar-magnitude?focus="]')).not.toBeNull();
    expect(fullContainer.querySelector('a[href^="/guide/metrics/galactic-coordinates?focus="]')).not.toBeNull();
    expect(fullContainer.querySelector('[data-testid="details-metric-unit-link"]')).not.toBeNull();
    expect(fullContainer.querySelector('[data-testid="details-astrometry-tags"]')).not.toBeNull();
    unmountFull();

    // Error handling in detailsRepository
    clearDetailsRepositoryCache();
    const failFetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      statusText: 'Error',
    })) as unknown as typeof fetch;
    await expect(fetchSummaryNode('sol', failFetch)).rejects.toThrow('500');
    await expect(fetchDetailRecord('sol', failFetch)).rejects.toThrow('500');
    clearDetailsRepositoryCache();
  });

  it('links telemetry unit badges to /guide/metrics/$metricId and renders MetricsListView and MetricDetailView', () => {
    expect(METRICS_GUIDE_PATH).toBe('/guide/metrics');
    expect(buildMetricGuideHref('semi-major-axis')).toBe(
      '/guide/metrics/semi-major-axis',
    );
    expect(buildMetricGuideHref('  orbital-period  ')).toBe(
      '/guide/metrics/orbital-period',
    );
    expect(buildMetricGuideHref('')).toBe('/guide/metrics');
    expect(buildMetricGuideHref('Unknown')).toBe('/guide/metrics');

    const { container: listContainer, unmount: unmountList } = render(createElement(MetricsListView));
    expect(listContainer.querySelector('[data-testid="metrics-list-view-root"]')).not.toBeNull();
    expect(listContainer.textContent).toContain('Telemetry Metrics');
    unmountList();

    const { container: detailContainer, unmount: unmountDetail } = render(
      createElement(MetricDetailView, {
        metricId: 'semi-major-axis',
      }),
    );
    expect(detailContainer.querySelector('[data-testid="metric-detail-view-root"]')).not.toBeNull();
    expect(detailContainer.querySelector('[data-metric-id="semi-major-axis"]')).not.toBeNull();
    expect(detailContainer.textContent).toContain('Metric: semi-major-axis');
    expect(detailContainer.querySelector('a[href="/guide/metrics"]')).not.toBeNull();
    unmountDetail();

    const { container: explicitPropDetailContainer, unmount: unmountExplicit } = render(
      createElement(MetricDetailView, { metricId: 'planetary-mass' }),
    );
    expect(explicitPropDetailContainer.querySelector('[data-metric-id="planetary-mass"]')).not.toBeNull();
    unmountExplicit();
  });

  it('links all stellar classifications to /guide/star-types/$starType and renders StarTypesListView and StarTypeDetailView', () => {
    expect(STAR_TYPES_GUIDE_PATH).toBe('/guide/star-types');
    expect(buildStarTypeGuideHref('G8V')).toBe('/guide/star-types/G8V');
    expect(buildStarTypeGuideHref('  M5.5Ve  ')).toBe('/guide/star-types/M5.5Ve');
    expect(buildStarTypeGuideHref('')).toBe('/guide/star-types');
    expect(buildStarTypeGuideHref('Unknown')).toBe('/guide/star-types');

    // SearchResultItem spectral badge is non-interactive per DEC-R052 (single anchor row)
    const searchRes = executeCatalogSearch(SAMPLE_CORPUS, {
      query: 'Tau Ceti',
      filter: 'stars',
    });
    const tauItem = searchRes.groups.stars.items[0]!;
    const { container: itemContainer, unmount: unmountItem } = render(
      createElement(SearchResultItem, { result: tauItem }),
    );
    expect(itemContainer.querySelector('a[href="/guide/star-types/G8V"]')).toBeNull();
    expect(itemContainer.querySelector('[data-testid="result-spectral-badge"]')).not.toBeNull();
    unmountItem();

    // DetailsPanel links G8V in Peek badge, Partial summary, and Full Stars list
    const focusedDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        position: [-3.1, -0.4, -2.0],
        classification: 'stellar-system',
        spectralType: 'G8V',
      },
      corpus: SAMPLE_CORPUS,
    });
    const { container: detailsContainer, unmount: unmountDetails } = render(
      createElement(DetailsPanel, { details: focusedDetails }),
    );
    expect(detailsContainer.querySelector('[data-testid="details-spectral-badge"]')).not.toBeNull();
    expect(detailsContainer.querySelector('[data-testid="details-summary-spectral-link"]')).not.toBeNull();
    expect(detailsContainer.querySelector('[data-testid="details-star-spectral-link"]')).not.toBeNull();
    expect(detailsContainer.querySelectorAll('a[href="/guide/star-types/G8V"]').length).toBeGreaterThanOrEqual(
      3,
    );
    unmountDetails();

    // StarTypesListView and StarTypeDetailView render cleanly
    const { container: starListViewContainer, unmount: unmountStarList } = render(createElement(StarTypesListView));
    expect(starListViewContainer.querySelector('[data-testid="star-types-list-view-root"]')).not.toBeNull();
    expect(starListViewContainer.textContent).toContain('Star Types');
    unmountStarList();

    const { container: starDetailContainer, unmount: unmountStarDetail } = render(
      createElement(StarTypeDetailView, { starType: 'G8V' }),
    );
    expect(starDetailContainer.querySelector('[data-testid="star-type-detail-view-root"]')).not.toBeNull();
    expect(starDetailContainer.querySelector('[data-star-type="G8V"]')).not.toBeNull();
    expect(starDetailContainer.textContent).toContain('Star Type: G8V');
    expect(starDetailContainer.querySelector('a[href="/guide/star-types"]')).not.toBeNull();
    unmountStarDetail();
  });

  it('links planet type labels in DetailsPanel to /guide/planet-types/$planetType and renders PlanetTypesListView and PlanetTypeDetailView', () => {
    expect(PLANET_TYPES_GUIDE_PATH).toBe('/guide/planet-types');
    expect(buildPlanetTypeGuideHref('terrestrial')).toBe(
      '/guide/planet-types/terrestrial',
    );
    expect(buildPlanetTypeGuideHref('  ice-giant  ')).toBe(
      '/guide/planet-types/ice-giant',
    );
    expect(buildPlanetTypeGuideHref('gas-giant')).toBe(
      '/guide/planet-types/gas-giant',
    );
    expect(buildPlanetTypeGuideHref('')).toBe('/guide/planet-types');
    expect(buildPlanetTypeGuideHref('Unknown')).toBe('/guide/planet-types');

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

    // Peek planet composition summary links terrestrial to /guide/planet-types/terrestrial
    expect(detailsContainer.querySelector('[data-testid="details-summary-planet-type-link"]')).not.toBeNull();
    // Full Planets list links terrestrial to /guide/planet-types/terrestrial
    expect(detailsContainer.querySelector('[data-testid="details-planet-type-link"]')).not.toBeNull();
    expect(
      detailsContainer.querySelectorAll('a[href="/guide/planet-types/terrestrial"]').length,
    ).toBeGreaterThanOrEqual(2);

    // Star and planet names in DetailsPanel link to /system/<systemSlug>?focus=<elementSlug>
    expect(buildSystemElementFocusHref('Tau Ceti', 'tau Ceti e')).toBe(
      '/system/tau-ceti?focus=tau-ceti-e',
    );
    expect(buildSystemElementFocusHref('Tau Ceti', '')).toBe(
      '/system/tau-ceti',
    );
    expect(detailsContainer.querySelector('[data-testid="details-star-name-link"]')).not.toBeNull();
    expect(detailsContainer.querySelector('a[href="/system/tau-ceti?focus=tau-ceti"]')).not.toBeNull();
    expect(detailsContainer.querySelector('[data-testid="details-planet-name-link"]')).not.toBeNull();
    expect(detailsContainer.querySelector('a[href="/system/tau-ceti?focus=tau-ceti-e"]')).not.toBeNull();
    unmountDetails();

    // PlanetTypesListView and PlanetTypeDetailView render cleanly
    const { container: pListContainer, unmount: unmountPList } = render(createElement(PlanetTypesListView));
    expect(pListContainer.querySelector('[data-testid="planet-types-list-view-root"]')).not.toBeNull();
    expect(pListContainer.textContent).toContain('Planet Types');
    unmountPList();

    const { container: pDetailContainer, unmount: unmountPDetail } = render(
      createElement(PlanetTypeDetailView, {
        planetType: 'terrestrial',
      }),
    );
    expect(pDetailContainer.querySelector('[data-testid="planet-type-detail-view-root"]')).not.toBeNull();
    expect(pDetailContainer.querySelector('[data-planet-type="terrestrial"]')).not.toBeNull();
    expect(pDetailContainer.textContent).toContain('Planet Type: terrestrial');
    expect(pDetailContainer.querySelector('a[href="/guide/planet-types"]')).not.toBeNull();
    unmountPDetail();
  });

  it('renders Breadcrumbs at the top of every view, populates entity-specific telemetry in DetailsPanel, and renders BodiesPanel in SystemView and PlanetView', async () => {
    expect(hasExplicitFocusParam('?focus=tau-ceti-e')).toBe(true);
    expect(hasExplicitFocusParam('')).toBe(false);

    // Empty breadcrumbs returns null
    const { container: emptyBreadcrumbs, unmount: unmountEmptyB } = render(
      createElement(Breadcrumbs, { items: [] }),
    );
    expect(emptyBreadcrumbs.firstChild).toBeNull();
    unmountEmptyB();

    const { container: emptyBodies, unmount: unmountEmptyBod } = render(
      createElement(
        SpatialEntityProvider,
        null,
        createElement(BodiesPanel, { elements: null }),
      ),
    );
    expect(emptyBodies.firstChild).toBeNull();
    unmountEmptyBod();
    expect(buildSystemBodiesSummary({ details: null })).toBeNull();

    // Guide & Search views render breadcrumbs at top
    const searchStore = createSpatialEntityStore();
    const { container: sView, unmount: unmountSView } = render(
      createElement(
        SpatialEntityProvider,
        { store: searchStore },
        createElement(SearchView),
      ),
    );
    expect(sView.querySelector('[data-testid="view-breadcrumbs"]')).not.toBeNull();
    unmountSView();

    const { container: stlView, unmount: unmountStl } = render(createElement(StarTypesListView));
    expect(stlView.querySelector('[data-testid="view-breadcrumbs"]')).not.toBeNull();
    unmountStl();

    const { container: stdView, unmount: unmountStd } = render(
      createElement(StarTypeDetailView, {
        starType: 'G8V',
      }),
    );
    expect(stdView.querySelector('[data-testid="view-breadcrumbs"]')).not.toBeNull();
    unmountStd();

    const { container: ptlView, unmount: unmountPtl } = render(createElement(PlanetTypesListView));
    expect(ptlView.querySelector('[data-testid="view-breadcrumbs"]')).not.toBeNull();
    unmountPtl();

    const { container: ptdView, unmount: unmountPtd } = render(
      createElement(PlanetTypeDetailView, {
        locationPathname: '/guide/planet-types/terrestrial',
      }),
    );
    expect(ptdView.querySelector('[data-testid="view-breadcrumbs"]')).not.toBeNull();
    unmountPtd();

    const { container: mlView, unmount: unmountMl } = render(createElement(MetricsListView));
    expect(mlView.querySelector('[data-testid="view-breadcrumbs"]')).not.toBeNull();
    unmountMl();

    const { container: mdView, unmount: unmountMd } = render(
      createElement(MetricDetailView, {
        locationPathname: '/guide/metrics/semi-major-axis',
      }),
    );
    expect(mdView.querySelector('[data-testid="view-breadcrumbs"]')).not.toBeNull();
    unmountMd();

    // SystemView at /system/tau-ceti?focus=tau-ceti-e renders Breadcrumbs, BodiesPanel, and Details (planet telemetry)
    const sysStore = createSpatialEntityStore();
    let sysRes: ReturnType<typeof render>;
    await act(async () => {
      sysRes = render(
        createElement(
          SpatialEntityProvider,
          { store: sysStore },
          createElement(SystemView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/system/tau-ceti',
            locationSearch: '?focus=tau-ceti-e',
          }),
        ),
      );
    });
    expect(sysRes!.container.querySelector('[data-testid="view-breadcrumbs"]')).not.toBeNull();
    expect(sysRes!.container.querySelector('[data-testid="bodies-panel"]')).not.toBeNull();
    expect(sysRes!.container.querySelector('[data-scope="system"]')).not.toBeNull();
    expect(sysRes!.container.querySelector('[data-system-id="gaia-2452378776434477184"]')).not.toBeNull();
    expect(sysRes!.container.querySelector('[data-testid="orbital-schematic-panel"]')).not.toBeNull();
    expect(sysRes!.container.querySelector('[data-testid="orbital-schematic-list"]')).not.toBeNull();
    expect(sysRes!.container.querySelector('[data-testid="orbital-schematic-item"]')).not.toBeNull();
    expect(sysRes!.container.querySelector('[data-testid="bodies-stars-section"]')).toBeNull();
    expect(sysRes!.container.querySelector('[data-testid="bodies-planets-section"]')).toBeNull();
    expect(sysRes!.container.querySelector('[data-testid="bodies-canon-section"]')).toBeNull();
    expect(sysRes!.container.querySelector('[data-testid="details-canon-section"]')).not.toBeNull();
    expect(sysRes!.container.querySelector('[data-focused="true"]')).not.toBeNull();
    expect(sysRes!.container.querySelector('[data-testid="details-panel"]')).not.toBeNull();
    expect(sysRes!.container.querySelector('[data-focused-kind="planet"]')).not.toBeNull();
    expect(sysRes!.container.querySelector('[data-testid="details-planet-telemetry-section"]')).not.toBeNull();
    expect(sysRes!.container.querySelector('[data-testid="details-planet-composition"]')).toBeNull();
    expect(sysRes!.container.querySelector('[data-testid="details-stars-section"]')).toBeNull();
    expect(sysRes!.container.querySelector('[data-testid="details-planets-section"]')).toBeNull();
    sysRes!.unmount();

    // SystemView at /system/sol?select=earth renders earth as selected in BodiesPanel and hides DetailsPanel
    const solSelectStore = createSpatialEntityStore();
    let solSelectRes: ReturnType<typeof render>;
    await act(async () => {
      solSelectRes = render(
        createElement(
          SpatialEntityProvider,
          { store: solSelectStore },
          createElement(SystemView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/system/sol',
            locationSearch: '?select=earth',
          }),
        ),
      );
    });
    expect(solSelectRes!.container.querySelector('[data-testid="orbital-schematic-item"]')).not.toBeNull();
    expect(solSelectRes!.container.querySelector('[data-selected="true"]')).not.toBeNull();
    expect(solSelectRes!.container.querySelector('[data-testid="details-panel"]')).toBeNull();
    expect(solSelectRes!.container.querySelector('[data-testid="orbital-schematic-panel"]')).not.toBeNull();
    solSelectRes!.unmount();

    // SystemView at /system/sol?focus=earth renders Orbiting Bodies (Moon) in DetailsPanel Full and links Details button to /planet/earth
    const earthFocusStore = createSpatialEntityStore();
    let earthFocusRes: ReturnType<typeof render>;
    await act(async () => {
      earthFocusRes = render(
        createElement(
          SpatialEntityProvider,
          { store: earthFocusStore },
          createElement(SystemView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/system/sol',
            locationSearch: '?focus=earth',
          }),
        ),
      );
    });
    expect(earthFocusRes!.container.querySelector('[data-testid="details-orbiting-bodies-section"]')).not.toBeNull();
    expect(earthFocusRes!.container.querySelector('[data-testid="details-orbiting-body-link"]')).not.toBeNull();
    expect(earthFocusRes!.container.querySelector('a[href="/planet/earth?focus=moon"]')).not.toBeNull();
    expect(earthFocusRes!.container.textContent).toContain('1 catalogued body in orbit.');
    expect(earthFocusRes!.container.querySelector('[data-testid="details-button-system-details"]')).not.toBeNull();
    expect(earthFocusRes!.container.querySelector('a[href="/planet/earth"]')).not.toBeNull();
    earthFocusRes!.unmount();

    // PlanetView at /planet/earth renders Breadcrumbs (Galaxy -> Sol -> Earth), BodiesPanel, and OrbitalSchematicPanel
    expect(buildPlanetDetailsHref('earth')).toBe('/planet/earth');
    expect(buildPlanetDetailsHref('')).toBe('/planet/earth');
    expect(buildPlanetElementFocusHref('jupiter', 'europa')).toBe(
      '/planet/jupiter?focus=europa',
    );
    expect(buildPlanetElementFocusHref('jupiter', '')).toBe('/planet/jupiter');
    expect(buildPlanetaryBodiesSummary({ details: null })).toBeNull();
    expect(buildPlanetViewBreadcrumbs(null, null, 'earth', false)).toEqual([
      { label: 'Galaxy', href: '/galaxy' },
      { label: 'System', href: '/system/system', reticleType: 'stellar-system' },
      { label: 'Earth', reticleType: 'terrestrial' },
    ]);

    const planetStore = createSpatialEntityStore();
    let planetRes: ReturnType<typeof render>;
    await act(async () => {
      planetRes = render(
        createElement(
          SpatialEntityProvider,
          { store: planetStore },
          createElement(PlanetView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/planet/earth',
            locationSearch: '?select=moon',
          }),
        ),
      );
    });
    expect(planetRes!.container.querySelector('[data-testid="planet-view-root"]')).not.toBeNull();
    expect(planetRes!.container.querySelector('[data-testid="view-breadcrumbs"]')).not.toBeNull();
    expect(planetRes!.container.querySelector('a[href="/galaxy"]')).not.toBeNull();
    expect(planetRes!.container.querySelector('a[href="/system/sol"]')).not.toBeNull();
    expect(planetRes!.container.querySelector('[data-testid="bodies-panel"]')).not.toBeNull();
    expect(planetRes!.container.querySelector('[data-scope="planet"]')).not.toBeNull();
    expect(planetRes!.container.querySelector('[data-planet-id="earth"]')).not.toBeNull();
    expect(planetRes!.container.querySelector('[data-selected="true"]')).not.toBeNull();
    expect(planetRes!.container.querySelector('[data-testid="details-panel"]')).toBeNull();
    expect(planetRes!.container.querySelector('[data-testid="orbital-schematic-panel"]')).not.toBeNull();
    expect(planetRes!.container.querySelector('[data-testid="orbital-schematic-list"]')).not.toBeNull();
    expect(planetRes!.container.querySelector('[data-testid="orbital-schematic-item"]')).not.toBeNull();
    expect(planetRes!.container.querySelector('a[href="/planet/earth?focus=moon"]')).not.toBeNull();
    expect(planetRes!.container.querySelector('[data-testid="bodies-planet-section"]')).toBeNull();
    expect(planetRes!.container.querySelector('[data-testid="bodies-moons-section"]')).toBeNull();
    planetRes!.unmount();

    // PlanetView at /planet/earth?focus=moon focuses Moon (minor-body) and renders Galaxy -> Sol -> Earth breadcrumbs (never Moon)
    const moonFocusStore = createSpatialEntityStore();
    let moonFocusRes: ReturnType<typeof render>;
    await act(async () => {
      moonFocusRes = render(
        createElement(
          SpatialEntityProvider,
          { store: moonFocusStore },
          createElement(PlanetView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/planet/earth',
            locationSearch: '?focus=moon',
          }),
        ),
      );
    });
    expect(moonFocusRes!.container.querySelector('[data-focused-kind="minor-body"]')).not.toBeNull();
    expect(moonFocusRes!.container.querySelector('a[href="/planet/earth"]')).not.toBeNull();
    expect(moonFocusRes!.container.textContent).toContain('Moon is a moon orbiting Earth.');
    expect(moonFocusRes!.container.querySelector('[data-focused="true"]')).not.toBeNull();
    expect(moonFocusRes!.container.querySelector('[data-testid="details-panel"]')).not.toBeNull();
    moonFocusRes!.unmount();

    // PlanetView at /planet/earth?focus=earth focuses Earth and renders DetailsPanel
    const earthHostFocusStore = createSpatialEntityStore();
    let earthHostFocusRes: ReturnType<typeof render>;
    await act(async () => {
      earthHostFocusRes = render(
        createElement(
          SpatialEntityProvider,
          { store: earthHostFocusStore },
          createElement(PlanetView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/planet/earth',
            locationSearch: '?focus=earth',
          }),
        ),
      );
    });
    expect(earthHostFocusRes!.container.querySelector('[data-testid="details-panel"]')).not.toBeNull();
    expect(earthHostFocusRes!.container.querySelector('[data-focused-kind="planet"]')).not.toBeNull();
    expect(earthHostFocusRes!.container.querySelector('[data-focused="true"]')).not.toBeNull();
    earthHostFocusRes!.unmount();

    // PlanetView at /planet/tau-ceti-e renders exoplanet with canon layer and empty moons message
    const exoPlanetStore = createSpatialEntityStore();
    let exoPlanetRes: ReturnType<typeof render>;
    await act(async () => {
      exoPlanetRes = render(
        createElement(
          SpatialEntityProvider,
          { store: exoPlanetStore },
          createElement(PlanetView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/planet/tau-ceti-e',
            locationSearch: '',
          }),
        ),
      );
    });
    expect(exoPlanetRes!.container.querySelector('[data-testid="orbital-schematic-panel"]')).not.toBeNull();
    expect(exoPlanetRes!.container.querySelector('[data-testid="bodies-canon-section"]')).toBeNull();
    exoPlanetRes!.unmount();

    // With explicit focus on tau-ceti-e, DetailsPanel renders details-canon-section with canon annotation
    const focusedExoStore = createSpatialEntityStore({ focusedId: 'tau-ceti-e' });
    focusedExoStore.getState().registerEntity({
      id: 'tau-ceti-e',
      name: 'Tau Ceti e',
      position: new THREE.Vector3(0, 0, 0),
      classification: 'terrestrial',
    });
    let focusedExoRes: ReturnType<typeof render>;
    await act(async () => {
      focusedExoRes = render(
        createElement(
          SpatialEntityProvider,
          { store: focusedExoStore },
          createElement(PlanetView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/planet/tau-ceti-e',
            locationSearch: '?focus=tau-ceti-e',
          }),
        ),
      );
    });
    expect(focusedExoRes!.container.querySelector('[data-testid="details-canon-section"]')).not.toBeNull();
    expect(focusedExoRes!.container.textContent).toContain('Adrian');
    focusedExoRes!.unmount();

    // SystemView at /system/sol renders Orbital Schematic and Minor Bodies & Spacecraft sections
    const solStore = createSpatialEntityStore();
    let solRes: ReturnType<typeof render>;
    await act(async () => {
      solRes = render(
        createElement(
          SpatialEntityProvider,
          { store: solStore },
          createElement(SystemView, {
            initialCorpus: SAMPLE_CORPUS,
            locationPathname: '/system/sol',
            locationSearch: '',
          }),
        ),
      );
    });
    expect(solRes!.container.querySelector('[data-testid="orbital-schematic-panel"]')).not.toBeNull();
    expect(solRes!.container.querySelector('[data-testid="bodies-minor-bodies-section"]')).not.toBeNull();
    solRes!.unmount();

    // Entity-specific telemetry branches in buildFocusedEntityDetails + DetailsPanel:
    // 1. Star focus (?focus=tau-ceti)
    const starDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        position: [-3.1, -0.4, -2.0],
        classification: 'stellar-system',
      },
      corpus: SAMPLE_CORPUS,
      urlSystemSlug: 'tau-ceti',
      hasExplicitFocus: true,
      systemDetail: {
        kind: 'system',
        record: {
          id: 'gaia-2452378776434477184',
          name: 'Tau Ceti',
          x: -3.1,
          y: -0.4,
          z: -2.0,
          dist: 3.65,
          sectorId: 'S-1',
          stars: [
            {
              id: 'gaia-2452378776434477184-A',
              name: 'Tau Ceti',
              componentDesignation: 'A',
              spectralType: 'G8V',
              mag: 3.5,
              absmag: 5.69,
              massMsun: 0.78,
              radiusRsun: 0.79,
              luminosityLsun: 0.52,
              effectiveTempK: 5344,
            },
          ],
          planets: [],
        },
      },
    });
    expect(starDetails?.focusedKind).toBe('star');
    expect(starDetails?.starTelemetry).toBeDefined();
    const { container: starContainer, unmount: unmountStar } = render(
      createElement(DetailsPanel, { details: starDetails }),
    );
    expect(starContainer.querySelector('[data-testid="details-star-telemetry-section"]')).not.toBeNull();
    expect(starContainer.querySelector('[data-testid="details-star-telemetry-mass"]')).not.toBeNull();
    expect(starContainer.querySelector('[data-testid="details-star-telemetry-radius"]')).not.toBeNull();
    expect(starContainer.querySelector('[data-testid="details-star-telemetry-luminosity"]')).not.toBeNull();
    expect(starContainer.querySelector('[data-testid="details-star-telemetry-temp"]')).not.toBeNull();
    expect(starContainer.querySelector('a[href^="/guide/metrics/stellar-mass?focus="]')).not.toBeNull();
    expect(starContainer.querySelector('a[href^="/guide/metrics/stellar-radius?focus="]')).not.toBeNull();
    expect(starContainer.querySelector('a[href^="/guide/metrics/stellar-luminosity?focus="]')).not.toBeNull();
    expect(starContainer.querySelector('a[href^="/guide/metrics/effective-temperature?focus="]')).not.toBeNull();

    // DEC-025: StarFocus is strictly scoped to the focused star in DetailsPanel
    expect(starContainer.querySelector('[data-testid="details-star-count"]')).toBeNull();
    expect(starContainer.querySelector('[data-testid="details-planet-composition"]')).toBeNull();
    expect(starContainer.querySelector('[data-testid="details-stars-section"]')).toBeNull();
    expect(starContainer.querySelector('[data-testid="details-planets-section"]')).toBeNull();
    // DEC-026: Details CTA is omitted for star focus
    expect(starDetails?.systemDetailsHref).toBeUndefined();
    expect(starContainer.querySelector('[data-testid="details-button-system-details"]')).toBeNull();
    unmountStar();

    // 2. Planet focus with full SystemManifest
    const manifestPlanetDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'tau-ceti-b',
        name: 'tau-ceti-b',
        position: [0, 0, 0],
        classification: 'stellar-system',
      },
      corpus: SAMPLE_CORPUS,
      urlSystemSlug: 'tau-ceti',
      hasExplicitFocus: true,
      systemDetail: {
        kind: 'system',
        record: {
          id: 'gaia-2452378776434477184',
          name: 'Tau Ceti',
          x: -3.1,
          y: -0.4,
          z: -2.0,
          dist: 3.65,
          sectorId: 'S-1',
          stars: [
            {
              id: 'gaia-2452378776434477184-A',
              name: 'Tau Ceti',
              componentDesignation: 'A',
              spectralType: 'G8V',
              mag: 3.5,
              absmag: 5.69,
              massMsun: 0.78,
              radiusRsun: 0.79,
              luminosityLsun: 0.52,
              effectiveTempK: 5344,
            },
          ],
          planets: [
            {
              id: 'tau-ceti-b',
              name: 'Tau Ceti b',
              letter: 'b',
              massMearth: 2.0,
              radiusRearth: 1.2,
              equilibriumTempK: 475,
              discoveryYear: 2012,
              discoveryMethod: 'Radial Velocity',
              orbit: {
                semiMajorAxis: 0.105,
                periodDays: 13.9,
                eccentricity: 0.16,
                inclination: 0,
                ascendingNode: 0,
                argumentOfPeriapsis: 0,
                meanAnomaly: 0,
              },
            },
          ],
        },
      },
    });
    expect(manifestPlanetDetails?.focusedKind).toBe('planet');
    expect(manifestPlanetDetails?.name).toBe('Tau Ceti b');
    expect(manifestPlanetDetails?.systemSummary).toBe(
      'Tau Ceti b is a terrestrial planet orbiting Tau Ceti.',
    );
    const { container: manifestPlanetContainer, unmount: unmountManifestPlanet } = render(
      createElement(DetailsPanel, { details: manifestPlanetDetails }),
    );
    expect(manifestPlanetContainer.querySelector('[data-testid="details-planet-telemetry-section"]')).not.toBeNull();
    expect(manifestPlanetContainer.querySelector('[data-testid="details-planet-telemetry-inclination"]')).not.toBeNull();
    expect(manifestPlanetContainer.querySelector('[data-testid="details-planet-telemetry-radius"]')).not.toBeNull();
    expect(manifestPlanetContainer.querySelector('a[href^="/guide/metrics/orbital-inclination?focus="]')).not.toBeNull();
    expect(manifestPlanetContainer.querySelector('a[href^="/guide/metrics/planetary-radius?focus="]')).not.toBeNull();
    expect(manifestPlanetContainer.querySelector('[data-testid="details-planet-telemetry-discovery"]')).not.toBeNull();
    expect(manifestPlanetContainer.querySelector('[data-testid="details-planet-composition"]')).toBeNull();
    expect(manifestPlanetContainer.querySelector('[data-testid="details-stars-section"]')).toBeNull();
    expect(manifestPlanetContainer.querySelector('[data-testid="details-planets-section"]')).toBeNull();
    unmountManifestPlanet();

    // 3. Minor-body focus (Moon k=3, Dwarf Planet k=4, Asteroid/Minor Body k=6, Spacecraft k=6)
    for (const bodyId of ['moon', 'pluto', 'mpc-433', 'voyager-1']) {
      const bodyDetails = buildFocusedEntityDetails({
        focusedEntity: {
          id: bodyId,
          name: bodyId,
          position: [0, 0, 0],
          classification: 'terrestrial',
        },
        corpus: [
          ...SAMPLE_CORPUS,
          { i: 'voyager-1', n: 'Voyager 1', k: 6, s: 'sol', h: 1 },
        ],
      });
      expect(bodyDetails?.focusedKind).toBe('minor-body');
      const { container: bodyContainer, unmount: unmountBody } = render(
        createElement(DetailsPanel, { details: bodyDetails }),
      );
      expect(bodyContainer.querySelector('[data-testid="details-minor-body-telemetry-section"]')).not.toBeNull();
      unmountBody();
    }

    // 4. Structure focus (k=7)
    const structDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'hyades',
        name: 'Hyades',
        position: [15, -40, -18],
        classification: 'stellar-cluster',
      },
      corpus: SAMPLE_CORPUS,
      entityDetail: {
        kind: 'structure',
        record: {
          id: 'hyades',
          name: 'Hyades',
          type: 'OpenCluster',
          x: 15,
          y: -40,
          z: -18,
          dist: 47,
          designations: ['Melotte 25'],
          radiusPc: 3.0,
          description: 'Nearest open cluster.',
        },
      },
    });
    expect(structDetails?.focusedKind).toBe('structure');
    const { container: structContainer, unmount: unmountStruct } = render(
      createElement(DetailsPanel, { details: structDetails }),
    );
    expect(structContainer.querySelector('[data-testid="details-structure-telemetry-section"]')).not.toBeNull();
    expect(structContainer.querySelector('[data-testid="details-structure-telemetry-radius"]')).not.toBeNull();
    expect(structContainer.querySelector('[data-testid="details-star-count"]')).toBeNull();
    expect(structContainer.querySelector('[data-testid="details-planet-composition"]')).toBeNull();
    unmountStruct();

    // 5. Precalculated planetCompositionCounts (b) and tag bitmask (g) on search corpus entries
    const precalcSolDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'sol',
        name: 'Sol',
        position: [0, 0, 0],
        classification: 'stellar-system',
      },
      corpus: [
        {
          i: 'sol',
          n: 'Sol',
          m: [-26.74, 'G2V', 8, 1],
          b: [4, 0, 2, 2],
          g: 1 | 2 | 4 | 16,
          h: 1,
        },
      ],
    });
    expect(precalcSolDetails?.planetCompositionBreakdown).toEqual([
      { composition: 'terrestrial', count: 4 },
      { composition: 'ice-giant', count: 2 },
      { composition: 'gas-giant', count: 2 },
    ]);
    expect(precalcSolDetails?.planetCompositionSummary).toBe(
      '8 planets (4 terrestrial · 2 ice-giant · 2 gas-giant · Habitable zone candidate)',
    );
    expect(precalcSolDetails?.tags).toEqual([
      'HomeSystem',
      'SolarNeighborhood10pc',
      'NakedEye',
      'HabitableCandidate',
    ]);

    // buildSystemViewBreadcrumbs covers both system root and sub-element focus (never includes focused entity)
    expect(buildSystemViewBreadcrumbs(starDetails, 'tau-ceti', true)).toEqual([
      { label: 'Galaxy', href: '/galaxy' },
      { label: 'Tau Ceti', reticleType: 'stellar-system' },
    ]);
    expect(buildSystemViewBreadcrumbs(null, 'tau-ceti', false)).toEqual([
      { label: 'Galaxy', href: '/galaxy' },
      { label: 'Tau Ceti', reticleType: 'stellar-system' },
    ]);
    expect(buildPlanetViewBreadcrumbs(null, null, 'earth', false)).toEqual([
      { label: 'Galaxy', href: '/galaxy' },
      { label: 'System', href: '/system/system', reticleType: 'stellar-system' },
      { label: 'Earth', reticleType: 'terrestrial' },
    ]);
  });
});

describe('Journey 1: Reader Flow - Nested Moons, Scoped Star Focus & Contextual Details Drill-Down CTA (DEC-024, DEC-025, DEC-026)', () => {
  it('DEC-025: scopes StarFocus in DetailsPanel strictly to the star without repeating system-wide lists', () => {
    const starDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'alpha-centauri-a',
        name: 'Alpha Centauri A',
        position: [-0.47, 1.32, -0.33],
        classification: 'star',
      },
      corpus: SAMPLE_CORPUS,
      urlSystemSlug: 'alpha-centauri',
      summaryNode: {
        id: 'alpha-centauri',
        name: 'Alpha Centauri',
        spect: 'G2V',
        dist: 1.34,
        starCount: 3,
        planetCount: 2,
        mag: -0.01,
        absmag: 4.38,
        x: -0.47,
        y: 1.32,
        z: -0.33,
        hasHabitableCandidate: true,
        sectorId: 'SEC-0-1-0',
      },
    });

    expect(starDetails?.focusedKind).toBe('star');
    const { container: starDetContainer, unmount: unmountStarDet } = render(
      createElement(DetailsPanel, { details: starDetails }),
    );

    // Shows star header, reticle type, spectral badge
    expect(starDetContainer.textContent).toContain('Alpha Centauri A');
    expect(starDetContainer.textContent).toContain('star');
    expect(starDetContainer.querySelector('[data-testid="details-spectral-badge"]')).not.toBeNull();

    // Does NOT show system star count in peek header
    expect(starDetContainer.querySelector('[data-testid="details-star-count"]')).toBeNull();

    // Does NOT show planet composition in peek
    expect(starDetContainer.querySelector('[data-testid="details-planet-composition"]')).toBeNull();

    // Does NOT repeat system-wide star and planet lists in Partial
    expect(starDetContainer.querySelector('[data-testid="details-stars-section"]')).toBeNull();
    expect(starDetContainer.querySelector('[data-testid="details-planets-section"]')).toBeNull();

    // Shows details-system-summary and details-cta-group / details-actions
    expect(starDetContainer.querySelector('[data-testid="details-system-summary"]')).not.toBeNull();
    expect(
      starDetContainer.querySelector('[data-testid="details-cta-group"]') !== null ||
        starDetContainer.querySelector('[data-testid="details-actions"]') !== null,
    ).toBe(true);
    unmountStarDet();
  });

  it('DEC-026: computes contextual systemDetailsHref and conditionally renders Details CTA in DetailsPanel', () => {
    // 1. System in Galaxy view -> has systemDetailsHref
    const sysGalaxyDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'sol',
        name: 'Sol',
        position: [0, 0, 0],
        classification: 'stellar-system',
      },
      corpus: SAMPLE_CORPUS,
    });
    expect(sysGalaxyDetails?.focusedKind).toBe('system');
    expect(sysGalaxyDetails?.systemDetailsHref).toBe('/system/sol');
    const { container: sysGalContainer, unmount: unmountSysGal } = render(
      createElement(DetailsPanel, { details: sysGalaxyDetails }),
    );
    expect(sysGalContainer.querySelector('[data-testid="details-button-system-details"]')).not.toBeNull();
    expect(sysGalContainer.querySelector('a[href="/system/sol"]')).not.toBeNull();
    unmountSysGal();

    // 2. System in System view -> systemDetailsHref is undefined, CTA omitted
    const sysSystemDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'sol',
        name: 'Sol',
        position: [0, 0, 0],
        classification: 'stellar-system',
      },
      urlSystemSlug: 'sol',
      corpus: SAMPLE_CORPUS,
    });
    expect(sysSystemDetails?.systemDetailsHref).toBeUndefined();
    const { container: sysSysContainer, unmount: unmountSysSys } = render(
      createElement(DetailsPanel, { details: sysSystemDetails }),
    );
    expect(sysSysContainer.querySelector('[data-testid="details-button-system-details"]')).toBeNull();
    unmountSysSys();

    // 3. Planet in Galaxy view -> has planetDetailsHref
    const planetGalaxyDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'earth',
        name: 'Earth',
        position: [0, 0, 0],
        classification: 'terrestrial',
      },
      corpus: SAMPLE_CORPUS,
    });
    expect(planetGalaxyDetails?.focusedKind).toBe('planet');
    expect(planetGalaxyDetails?.systemDetailsHref).toBe('/planet/earth');
    const { container: pGalContainer, unmount: unmountPGal } = render(
      createElement(DetailsPanel, { details: planetGalaxyDetails }),
    );
    expect(pGalContainer.querySelector('[data-testid="details-button-system-details"]')).not.toBeNull();
    expect(pGalContainer.querySelector('a[href="/planet/earth"]')).not.toBeNull();
    unmountPGal();

    // 4. Planet in System view -> has planetDetailsHref
    const planetSystemDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'earth',
        name: 'Earth',
        position: [0, 0, 0],
        classification: 'terrestrial',
      },
      urlSystemSlug: 'sol',
      corpus: SAMPLE_CORPUS,
    });
    expect(planetSystemDetails?.systemDetailsHref).toBe('/planet/earth');
    const { container: pSysContainer, unmount: unmountPSys } = render(
      createElement(DetailsPanel, { details: planetSystemDetails }),
    );
    expect(pSysContainer.querySelector('[data-testid="details-button-system-details"]')).not.toBeNull();
    expect(pSysContainer.querySelector('a[href="/planet/earth"]')).not.toBeNull();
    unmountPSys();

    // 5. Planet in Planet view -> systemDetailsHref is undefined, CTA omitted
    const planetPlanetDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'earth',
        name: 'Earth',
        position: [0, 0, 0],
        classification: 'terrestrial',
      },
      urlPlanetSlug: 'earth',
      corpus: SAMPLE_CORPUS,
    });
    expect(planetPlanetDetails?.systemDetailsHref).toBeUndefined();
    const { container: pPlanContainer, unmount: unmountPPlan } = render(
      createElement(DetailsPanel, { details: planetPlanetDetails }),
    );
    expect(pPlanContainer.querySelector('[data-testid="details-button-system-details"]')).toBeNull();
    unmountPPlan();

    // 6. Star, minor-body, structure -> systemDetailsHref is undefined
    const starDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'alpha-centauri-a',
        name: 'Alpha Centauri A',
        position: [-0.47, 1.32, -0.33],
        classification: 'star',
      },
      urlSystemSlug: 'alpha-centauri',
      summaryNode: {
        id: 'alpha-centauri',
        name: 'Alpha Centauri',
        spect: 'G2V',
        dist: 1.34,
        starCount: 3,
        planetCount: 2,
        mag: -0.01,
        absmag: 4.38,
        x: -0.47,
        y: 1.32,
        z: -0.33,
        hasHabitableCandidate: true,
        sectorId: 'SEC-0-1-0',
      },
      corpus: SAMPLE_CORPUS,
    });
    expect(starDetails?.focusedKind).toBe('star');
    expect(starDetails?.systemDetailsHref).toBeUndefined();

    const minorBodyDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'moon',
        name: 'Moon',
        position: [0, 0, 0],
        classification: 'terrestrial',
      },
      corpus: SAMPLE_CORPUS,
    });
    expect(minorBodyDetails?.systemDetailsHref).toBeUndefined();

    const structureDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'ngc-1976',
        name: 'Orion Nebula',
        position: [0, 0, 0],
        classification: 'stellar-cluster',
      },
      corpus: SAMPLE_CORPUS,
    });
    expect(structureDetails?.systemDetailsHref).toBeUndefined();
  });
});
