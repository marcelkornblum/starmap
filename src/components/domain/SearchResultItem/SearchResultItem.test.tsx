// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchResultItem, formatPlanetCountSummary } from './SearchResultItem';
import { SearchContext } from '../../search/SearchContext';
import {
  executeCatalogSearch,
  type SearchResultItem as SearchResultItemModel,
} from '../../../services/searchService';

describe('<SearchResultItem />', () => {
  describe('formatPlanetCountSummary', () => {
    it('returns null for undefined or non-positive values', () => {
      expect(formatPlanetCountSummary(undefined)).toBeNull();
      expect(formatPlanetCountSummary(0)).toBeNull();
      expect(formatPlanetCountSummary(-1)).toBeNull();
    });

    it('formats singular and plural counts correctly', () => {
      expect(formatPlanetCountSummary(1)).toBe('1 planet');
      expect(formatPlanetCountSummary(8)).toBe('8 planets');
    });
  });

  const mockStarResult: SearchResultItemModel = {
    id: 'sol',
    name: 'Sol System',
    category: 'stars',
    entityKind: 'star-system',
    reticleType: 'stellar-system',
    targetView: 'system',
    href: '/system/sol',
    systemId: 'sol',
    spectralType: 'G2V',
    planetCount: 8,
    score: 1.0,
  };

  const mockLayerResult: SearchResultItemModel = {
    id: 'layer-star-trek',
    name: 'Star Trek Federation Space',
    category: 'layers',
    entityKind: 'layer',
    reticleType: 'stellar-cluster',
    targetView: 'galaxy',
    href: '/galaxy?select=layer:star-trek',
    canonTitle: 'Star Trek Canon',
    score: 0.9,
  };

  it('renders a star result with reticle, spectral badge, and planet count', () => {
    render(<SearchResultItem result={mockStarResult} />);

    const item = screen.getByTestId('search-result-item');
    expect(item.getAttribute('data-entity-id')).toBe('sol');
    expect(item.getAttribute('data-category')).toBe('stars');

    expect(screen.getByTestId('result-reticle-type')).toBeDefined();
    expect(screen.getByText('Sol System')).toBeDefined();
    expect(screen.getByTestId('result-spectral-badge')).toBeDefined();
    expect(screen.getByTestId('result-planet-summary')).toBeDefined();
  });

  it('renders a layer result with canon badge', () => {
    render(<SearchResultItem result={mockLayerResult} />);

    expect(screen.getByTestId('result-variation-layers')).toBeDefined();
    expect(screen.getByText('Star Trek Canon')).toBeDefined();
  });

  it('calls onSelect and dismissSearch on link click', () => {
    const onSelect = vi.fn();
    const dismissSearch = vi.fn();

    render(
      <SearchContext.Provider
        value={{
          query: 'sol',
          filter: 'all',
          status: 'ready',
          errorMessage: null,
          results: executeCatalogSearch([], { query: 'sol', filter: 'all' }),
          setQuery: vi.fn(),
          setFilter: vi.fn(),
          submitSearch: vi.fn(),
          isFocused: true,
          setIsFocused: vi.fn(),
          dismissSearch,
        }}
      >
        <SearchResultItem result={mockStarResult} onSelect={onSelect} />
      </SearchContext.Provider>
    );

    const link = screen.getByText('Sol System');
    fireEvent.click(link);

    expect(dismissSearch).toHaveBeenCalledWith(mockStarResult);
    expect(onSelect).toHaveBeenCalledWith(mockStarResult);
  });
});
