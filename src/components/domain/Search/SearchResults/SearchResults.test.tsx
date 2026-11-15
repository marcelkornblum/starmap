import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SearchResults } from './SearchResults';
import { SearchContext } from '../SearchContext';
import { executeCatalogSearch } from '../../../../services/searchService';

describe('<SearchResults />', () => {
  it('renders search results groups with visuallyHidden heading and stack list', () => {
    const results = executeCatalogSearch(
      [
        {
          i: 'tau-ceti',
          n: 'Tau Ceti',
          m: [3.5, 'G8V', 4, 1],
          a: 'tau ceti',
        },
      ],
      { query: 'tau', filter: 'all' },
    );

    render(
      <SearchContext.Provider
        value={{
          query: 'tau',
          filter: 'all',
          status: 'ready',
          errorMessage: null,
          results,
          setQuery: () => undefined,
          setFilter: () => undefined,
          submitSearch: async () => undefined,
          isFocused: true,
        }}
      >
        <SearchResults />
      </SearchContext.Provider>,
    );

    const panel = screen.getByTestId('search-results-panel');
    expect(panel).toBeDefined();
    expect(panel.getAttribute('data-open')).toBe('true');

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('Search Results');
    expect(heading.getAttribute('data-visually-hidden')).toBe('true');

    const group = screen.getByTestId('search-results-group-stars');
    expect(group).toBeInTheDocument();

    const resultItem = screen.getByTestId('search-result-item');
    expect(resultItem).toBeInTheDocument();
    expect(screen.getByText('Tau Ceti')).toBeInTheDocument();
  });

  it('sets data-open="false" when isFocused is false and alwaysOpen is not provided', () => {
    const results = executeCatalogSearch(
      [
        {
          i: 'tau-ceti',
          n: 'Tau Ceti',
          m: [3.5, 'G8V', 4, 1],
          a: 'tau ceti',
        },
      ],
      { query: 'tau', filter: 'all' },
    );

    render(
      <SearchContext.Provider
        value={{
          query: 'tau',
          filter: 'all',
          status: 'ready',
          errorMessage: null,
          results,
          setQuery: () => undefined,
          setFilter: () => undefined,
          submitSearch: async () => undefined,
          isFocused: false,
        }}
      >
        <SearchResults />
      </SearchContext.Provider>,
    );

    const panel = screen.getByTestId('search-results-panel');
    expect(panel.getAttribute('data-open')).toBe('false');
  });

  it('sets data-open="true" when alwaysOpen is passed even if isFocused is false', () => {
    const results = executeCatalogSearch(
      [
        {
          i: 'tau-ceti',
          n: 'Tau Ceti',
          m: [3.5, 'G8V', 4, 1],
          a: 'tau ceti',
        },
      ],
      { query: 'tau', filter: 'all' },
    );

    render(
      <SearchContext.Provider
        value={{
          query: 'tau',
          filter: 'all',
          status: 'ready',
          errorMessage: null,
          results,
          setQuery: () => undefined,
          setFilter: () => undefined,
          submitSearch: async () => undefined,
          isFocused: false,
        }}
      >
        <SearchResults alwaysOpen />
      </SearchContext.Provider>,
    );

    const panel = screen.getByTestId('search-results-panel');
    expect(panel.getAttribute('data-open')).toBe('true');
  });

  it('truncates results per category when limitPerCategory is set, renders filtered search links under populated headings, and omits empty category sections', () => {
    const multiResults = executeCatalogSearch(
      [
        { i: 'sol', n: 'Sol', m: [-26.7, 'G2V', 8, 1], a: 'sol' },
        { i: 'ceres', k: 4, n: 'Ceres', s: 'sol', a: 'ceres' },
        { i: 'earth', k: 2, n: 'Earth', s: 'sol', a: 'earth' },
        { i: 'pluto', k: 4, n: 'Pluto', s: 'sol', a: 'pluto' },
      ],
      { query: 'Sol', filter: 'all', limitPerCategory: 2 },
    );

    render(
      <SearchContext.Provider
        value={{
          query: 'Sol',
          filter: 'all',
          status: 'ready',
          errorMessage: null,
          results: multiResults,
          setQuery: () => undefined,
          setFilter: () => undefined,
          submitSearch: async () => undefined,
          isFocused: true,
        }}
      >
        <SearchResults searchViewPath="/search" />
      </SearchContext.Provider>,
    );

    // Ceres and Earth should be rendered, Pluto truncated
    expect(screen.getByText('Ceres')).toBeInTheDocument();
    expect(screen.getByText('Earth')).toBeInTheDocument();
    expect(screen.queryByText('Pluto')).toBeNull();

    // Empty categories are omitted completely
    expect(screen.queryByTestId('search-results-group-structures')).toBeNull();
    expect(screen.queryByTestId('search-results-group-minor-bodies')).toBeNull();
    expect(screen.queryByTestId('search-results-group-layers')).toBeNull();
  });
});
