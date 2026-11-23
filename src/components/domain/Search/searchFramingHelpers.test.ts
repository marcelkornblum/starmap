import { describe, it, expect } from 'vitest';
import { executeCatalogSearch } from '../../../services/search/searchExecution';
import type { CompactSearchEntry } from '../../../utils/compactDataTypes';
import {
  appendSearchParamsToHref,
  collectSpatialItems,
  isAlreadyAtTarget,
  isWithinFramedBounds,
} from './searchFramingHelpers';

const HELPERS_CORPUS: readonly CompactSearchEntry[] = [
  {
    i: 'tau-ceti',
    n: 'Tau Ceti',
    p: [1, 2, 3],
    m: [3.5, 'G8V', 4],
    a: 'tau ceti',
  },
  {
    i: 'earth',
    n: 'Earth',
    s: 'sol',
    k: 2,
    u: 'terrestrial',
    h: 1,
    a: 'earth',
  },
  {
    i: 'ceres',
    n: 'Ceres',
    s: 'sol',
    k: 4,
    h: 1,
    a: 'ceres',
  },
];

describe('searchFramingHelpers', () => {
  it('collectSpatialItems gathers stars, planets, minor-bodies, and structures while excluding layers', () => {
    const grouped = executeCatalogSearch(HELPERS_CORPUS, {
      query: 'a',
      filter: 'all',
    });
    const withLayer = {
      ...grouped,
      groups: {
        ...grouped.groups,
        layers: {
          ...grouped.groups.layers,
          items: [
            ...grouped.groups.layers.items,
            {
              id: 'layer:test',
              name: 'Test Layer',
              category: 'layers' as const,
              entityKind: 'layer' as const,
              reticleType: 'stellar-cluster' as const,
              targetView: 'galaxy' as const,
              href: '/galaxy?select=layer:test',
              score: 1,
            },
          ],
        },
      },
    };

    const items = collectSpatialItems(withLayer);
    expect(items.some((item) => item.id === 'tau-ceti')).toBe(true);
    expect(items.some((item) => item.id === 'earth')).toBe(true);
    expect(items.some((item) => item.category === 'layers')).toBe(false);
  });

  it('isAlreadyAtTarget compares pathname and focus query parameter', () => {
    expect(isAlreadyAtTarget('/system/sol', '?focus=earth&q=Earth', '/system/sol?focus=earth')).toBe(true);
    expect(isAlreadyAtTarget('/system/sol', 'focus=earth', '/system/sol?focus=earth')).toBe(true);
    expect(isAlreadyAtTarget('/system/sol', '?focus=mars', '/system/sol?focus=earth')).toBe(false);
    expect(isAlreadyAtTarget('/galaxy', '?focus=earth', '/system/sol?focus=earth')).toBe(false);
    expect(isAlreadyAtTarget('/system/sol', '', '/system/sol')).toBe(true);
  });

  it('appendSearchParamsToHref preserves existing query params and hash without clobbering', () => {
    expect(appendSearchParamsToHref('/system/sol?focus=earth', 'Earth', 'all')).toBe(
      '/system/sol?focus=earth&q=Earth',
    );
    expect(
      appendSearchParamsToHref('/system/sol?layer=canon-x#section', '  titan  ', 'planets'),
    ).toBe('/system/sol?layer=canon-x&q=titan&searchCategory=planets#section');
    expect(appendSearchParamsToHref('/system/sol?focus=earth', '   ', 'all')).toBe(
      '/system/sol?focus=earth',
    );
    expect(appendSearchParamsToHref('/galaxy', 'Kepler', 'stars')).toBe(
      '/galaxy?q=Kepler&searchCategory=stars',
    );
  });

  it('isWithinFramedBounds returns true only within spatial and distance tolerances', () => {
    const prev = { target: [10, -5, 2] as [number, number, number], distance: 30 };
    expect(isWithinFramedBounds(null, [10, -5, 2], 30)).toBe(false);
    expect(isWithinFramedBounds(prev, [10.1, -5, 2], 30.4)).toBe(true);
    expect(isWithinFramedBounds(prev, [11, -5, 2], 30)).toBe(false);
    expect(isWithinFramedBounds(prev, [10, -5, 2], 31)).toBe(false);
  });
});
