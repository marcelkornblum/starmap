// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchCategoryFilterSelect } from './SearchCategoryFilterSelect';
import { SearchContext } from '../SearchContext';
import { executeCatalogSearch } from '../../../../services/searchService';

describe('<SearchCategoryFilterSelect />', () => {
  it('renders select with categories and invokes setFilter on change', () => {
    const setFilter = vi.fn();

    render(
      <SearchContext.Provider
        value={{
          query: '',
          filter: 'all',
          status: 'idle',
          errorMessage: null,
          results: executeCatalogSearch([], { query: '', filter: 'all' }),
          setQuery: vi.fn(),
          setFilter,
          submitSearch: vi.fn(),
        }}
      >
        <SearchCategoryFilterSelect />
      </SearchContext.Provider>,
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeDefined();

    fireEvent.change(select, { target: { value: 'stars' } });
    expect(setFilter).toHaveBeenCalledWith('stars');
  });
});
