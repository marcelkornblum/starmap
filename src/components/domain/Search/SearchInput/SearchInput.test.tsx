// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchInput } from './SearchInput';
import { SearchContext } from '../SearchContext';
import { executeCatalogSearch } from '../../../../services/searchService';

describe('<SearchInput />', () => {
  it('renders input with placeholder, handles change and clear', () => {
    const setQuery = vi.fn();

    render(
      <SearchContext.Provider
        value={{
          query: 'alpha',
          filter: 'all',
          status: 'ready',
          errorMessage: null,
          results: executeCatalogSearch([], { query: 'alpha', filter: 'all' }),
          setQuery,
          setFilter: vi.fn(),
          submitSearch: vi.fn(),
          isFocused: true,
        }}
      >
        <SearchInput />
      </SearchContext.Provider>,
    );

    const input = screen.getByPlaceholderText('Search stars, planets, layers...');
    expect(input).toBeDefined();
    expect((input as HTMLInputElement).value).toBe('alpha');

    fireEvent.change(input, { target: { value: 'beta' } });
    expect(setQuery).toHaveBeenCalledWith('beta');

    const clearBtn = screen.getByTestId('search-clear-button');
    fireEvent.click(clearBtn);
    expect(setQuery).toHaveBeenCalledWith('');
  });
});
