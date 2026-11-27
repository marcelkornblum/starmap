import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SearchPanel } from './SearchPanel';
import { SearchContext } from '../SearchContext';
import { executeCatalogSearch } from '../../../../services/search/searchExecution';

describe('<SearchPanel />', () => {
  it('renders search panel with visuallyHidden heading and search form, without Explore button', () => {
    render(<SearchPanel scope="search" />);

    const panel = screen.getByTestId('search-panel');
    expect(panel).toBeInTheDocument();
    expect(panel.getAttribute('data-scope')).toBe('search');

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('Search');
    expect(heading.getAttribute('data-visually-hidden')).toBe('true');

    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByTestId('search-expanded-drawer')).toBeInTheDocument();
    expect(screen.queryByTestId('search-explore-button')).toBeNull();
    expect(screen.getByTestId('search-submit-button')).toHaveAttribute('aria-label', 'Search');
  });

  it('invokes submitSearch with current query and filter when the search form is submitted', () => {
    const submitSearch = vi.fn().mockResolvedValue(undefined);
    render(
      <SearchContext.Provider
        value={{
          query: 'tau ceti',
          filter: 'stars',
          status: 'ready',
          errorMessage: null,
          results: executeCatalogSearch([], { query: 'tau ceti', filter: 'stars' }),
          setQuery: vi.fn(),
          setFilter: vi.fn(),
          submitSearch,
          isFocused: true,
        }}
      >
        <SearchPanel scope="galaxy" />
      </SearchContext.Provider>,
    );

    const submitBtn = screen.getByTestId('search-submit-button');
    fireEvent.click(submitBtn);
    expect(submitSearch).toHaveBeenCalledTimes(1);
    expect(submitSearch).toHaveBeenCalledWith('tau ceti', 'stars');
  });
});
