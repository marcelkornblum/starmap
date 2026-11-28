import { describe, expect, it } from 'vitest';
import {
  buildLayerGalaxyHref,
  buildSearchViewHref,
  buildTagGalaxyHref,
  buildUpdatedSearchUrl,
  parseSearchUrlParams,
} from './searchUrls';

describe('searchUrls', () => {
  it('builds canonical galaxy view URLs with select shortcuts', () => {
    expect(buildTagGalaxyHref('HabitableCandidate')).toBe('/galaxy?select=tag:habitable-candidate');
    expect(buildTagGalaxyHref('')).toBe('/galaxy');

    expect(buildLayerGalaxyHref('canon-project-hail-mary')).toBe(
      '/galaxy?select=layer:project-hail-mary&layer=project-hail-mary',
    );
    expect(buildLayerGalaxyHref('overlay-recent-discoveries')).toBe(
      '/galaxy?select=layer:recent-discoveries&layer=recent-discoveries',
    );
    expect(buildLayerGalaxyHref('layer:project-hail-mary')).toBe(
      '/galaxy?select=layer:project-hail-mary&layer=project-hail-mary',
    );
    expect(buildLayerGalaxyHref('   ')).toBe('/galaxy');
    expect(buildLayerGalaxyHref('---')).toBe('/galaxy');
    expect(buildLayerGalaxyHref('')).toBe('/galaxy');
  });

  it('builds and parses search view href and parameters', () => {
    expect(buildSearchViewHref('   ', 'all')).toBe('/search');
    expect(buildSearchViewHref('Tau Ceti', 'stars')).toBe('/search?q=Tau+Ceti&searchCategory=stars');

    expect(parseSearchUrlParams('?q=Voyager&searchCategory=minor-bodies')).toEqual({
      query: 'Voyager',
      filter: 'minor-bodies',
    });
    expect(parseSearchUrlParams('?searchCategory=unknown', 'Sol', 'stars')).toEqual({
      query: 'Sol',
      filter: 'stars',
    });
    expect(parseSearchUrlParams('')).toEqual({
      query: '',
      filter: 'all',
    });
  });

  it('builds updated search URLs maintaining current query state', () => {
    expect(
      buildUpdatedSearchUrl('/search', '?foo=bar', '#top', 'Tau Ceti', 'planets'),
    ).toBe('/search?foo=bar&q=Tau+Ceti&searchCategory=planets#top');

    expect(
      buildUpdatedSearchUrl('/search', '?q=Old&searchCategory=stars', '', '   ', 'all'),
    ).toBe('/search');
  });
});
