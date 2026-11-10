// @vitest-environment jsdom
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

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('Search Results');
    expect(heading.getAttribute('data-visually-hidden')).toBe('true');

    const group = screen.getByTestId('search-results-group-stars');
    expect(group).toBeDefined();

    const resultItem = screen.getByTestId('search-result-item');
    expect(resultItem).toBeDefined();
    expect(screen.getByText('Tau Ceti')).toBeDefined();
  });
});
