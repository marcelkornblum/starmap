// @vitest-environment jsdom
import { createElement, type ReactElement } from 'react';
import { render } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SpatialEntityProvider } from '../src/components/canvas/entity/SpatialEntityContext';
import { createSpatialEntityStore } from '../src/components/canvas/entity/SpatialEntityStore';
import { DetailsPanel } from '../src/components/domain';
import { buildFocusedEntityDetails } from '../src/services/detailsService';
import {
  buildLayerGalaxyHref,
  extractUrlLayerId,
  findCanonLayerById,
  resolveSelectedSystemsFromLayer,
} from '../src/services/searchService';
import { GalaxyView } from '../src/views/GalaxyView';
import { SystemView } from '../src/views/SystemView';
import { LAYER_MANIFESTS } from '../content/layers';
import {
  LAYER_INDEX_ENTRIES,
  annotationRecordsFor,
  resetLayerRuntime,
  seedAllLayerData,
} from './layerFixtures';
import { SAMPLE_CORPUS } from './searchFixtures';

const renderToHtml = (element: ReactElement): string => render(element).container.innerHTML;

describe('Journey 2: Author Flow - Fictional Canon Layers & Galaxy Annotations', () => {
  beforeAll(seedAllLayerData);
  afterAll(resetLayerRuntime);

  it('links each canon title in DetailsPanel to /galaxy?select=layer:<layerSlug>&layer=<layerSlug> and selects all annotated systems when GalaxyView loads', () => {
    expect(buildLayerGalaxyHref('canon-project-hail-mary')).toBe(
      '/galaxy?select=layer:project-hail-mary&layer=project-hail-mary',
    );
    expect(buildLayerGalaxyHref('   ')).toBe('/galaxy');
    expect(findCanonLayerById('canon-project-hail-mary', LAYER_MANIFESTS)?.title).toBe(
      'Hail Mary',
    );
    expect(findCanonLayerById('project-hail-mary', LAYER_MANIFESTS)?.title).toBe(
      'Hail Mary',
    );
    expect(findCanonLayerById('', LAYER_MANIFESTS)).toBeUndefined();
    expect(findCanonLayerById('non-existent-layer', LAYER_MANIFESTS)).toBeUndefined();

    expect(extractUrlLayerId('?select=layer:project-hail-mary', LAYER_INDEX_ENTRIES)).toBe(
      'canon-project-hail-mary',
    );
    expect(extractUrlLayerId('?layer=canon-halo', LAYER_INDEX_ENTRIES)).toBe('canon-halo');
    expect(extractUrlLayerId('?focus=tau-ceti-e', LAYER_INDEX_ENTRIES)).toBeNull();
    expect(extractUrlLayerId('', LAYER_INDEX_ENTRIES)).toBeNull();

    // DetailsPanel renders clickable canon links
    const focusedDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        position: [-3.1, -0.4, -2.0],
        classification: 'stellar-system',
      },
      corpus: SAMPLE_CORPUS,
      canonRecords: annotationRecordsFor(['gaia-2452378776434477184']),
    });
    const detailsHtml = renderToHtml(
      createElement(DetailsPanel, { details: focusedDetails }),
    );
    expect(detailsHtml).toContain('data-testid="details-canon-item-title"');
    expect(detailsHtml).toContain('data-testid="details-canon-link"');
    expect(
      detailsHtml.indexOf('data-testid="details-canon-item-title"'),
    ).toBeLessThan(detailsHtml.indexOf('data-testid="details-canon-link"'));
    expect(detailsHtml).toContain(
      'href="/galaxy?select=layer:project-hail-mary&amp;layer=project-hail-mary"',
    );
    expect(detailsHtml).toContain('href="/galaxy?select=layer:halo&amp;layer=halo"');

    // resolveSelectedSystemsFromLayer resolves all annotated systems
    const phmSystems = resolveSelectedSystemsFromLayer(
      'canon-project-hail-mary',
      SAMPLE_CORPUS,
      LAYER_MANIFESTS,
    );
    expect(phmSystems.map((s) => s.name)).toEqual(['Tau Ceti', 'Keid']);
    expect(
      resolveSelectedSystemsFromLayer('non-existent-canon', SAMPLE_CORPUS, LAYER_MANIFESTS),
    ).toEqual([]);

    // Fallback when corpus is empty and when Sol is included (e.g. canon-star-trek)
    const stSystemsEmptyCorpus = resolveSelectedSystemsFromLayer(
      'canon-star-trek',
      [],
      LAYER_MANIFESTS,
    );
    expect(stSystemsEmptyCorpus.some((s) => s.id === 'sol' && s.name === 'Sol')).toBe(
      true,
    );

    // MainView loading /galaxy?select=layer:project-hail-mary selects all systems in that canon and focuses nothing
    const store = createSpatialEntityStore();
    const html = renderToHtml(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(GalaxyView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/galaxy',
          locationSearch: '?select=layer:project-hail-mary',
        }),
      ),
    );

    const selected = store.getState().getEntitiesByState('selected');
    expect(selected.map((s) => s.name)).toEqual(['Tau Ceti', 'Keid']);
    expect(store.getState().getEntitiesByState('focused')).toEqual([]);
    expect(html).not.toContain('data-testid="details-panel"');
    expect(html).not.toContain('data-testid="systems-panel"');
  });

  it('DEC-018: verifies Canon Layers section is removed from BodiesPanel', () => {
    const store = createSpatialEntityStore();
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
    expect(systemHtml).not.toContain('data-testid="bodies-canon-section"');
  });
});
