import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SearchResults } from './SearchResults';
import { SearchContext } from '../SearchContext';
import { executeCatalogSearch } from '../../../../services/search/searchExecution';

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

  it('truncates results per category when limitPerCategory is set, renders View all (N) button only below truncated groups, omits search-view-link, and dismisses on click', () => {
    const dismissSearch = vi.fn();
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
          dismissSearch,
        }}
      >
        <SearchResults searchViewPath="/search" />
      </SearchContext.Provider>,
    );

    expect(screen.queryByTestId('search-view-link')).toBeNull();

    // Ceres and Earth should be rendered, Pluto truncated
    expect(screen.getByText('Ceres')).toBeInTheDocument();
    expect(screen.getByText('Earth')).toBeInTheDocument();
    expect(screen.queryByText('Pluto')).toBeNull();

    // Planets group has totalMatches=3 > 2 shown -> View all (3) button below list
    const planetsGroup = screen.getByTestId('search-results-group-planets');
    const planetsLink = screen.getByTestId('search-category-link-planets');
    expect(planetsLink.tagName.toLowerCase()).toBe('a');
    expect(planetsLink).toHaveAttribute('data-variant', 'default');
    expect(planetsLink).toHaveAttribute('data-size', 'sm');
    expect(planetsLink).toHaveTextContent('View all (3)');
    expect(planetsLink.getAttribute('href')).toContain('/search?q=Sol&searchCategory=planets');
    const planetsList = planetsGroup.querySelector('ul');
    expect(planetsList).not.toBeNull();
    expect(
      Boolean(
        planetsList &&
          (planetsList.compareDocumentPosition(planetsLink) & Node.DOCUMENT_POSITION_FOLLOWING),
      ),
    ).toBe(true);

    // Stars group has only 1 match (totalMatches <= items.length) -> no View all button
    expect(screen.getByTestId('search-results-group-stars')).toBeInTheDocument();
    expect(screen.queryByTestId('search-category-link-stars')).toBeNull();

    // Modified clicks (Ctrl/Cmd) do not dismiss the dropdown
    fireEvent.click(planetsLink, { ctrlKey: true });
    fireEvent.click(planetsLink, { metaKey: true });
    expect(dismissSearch).not.toHaveBeenCalled();

    // Unmodified primary click on View all (N) button dismisses the dropdown
    fireEvent.click(planetsLink);
    expect(dismissSearch).toHaveBeenCalledTimes(1);

    // Empty categories are omitted completely
    expect(screen.queryByTestId('search-results-group-structures')).toBeNull();
    expect(screen.queryByTestId('search-results-group-minor-bodies')).toBeNull();
    expect(screen.queryByTestId('search-results-group-layers')).toBeNull();
  });
});
