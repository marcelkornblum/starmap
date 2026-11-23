import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchInput } from './SearchInput';
import { SearchContext } from '../SearchContext';
import { executeCatalogSearch } from '../../../../services/search/searchExecution';

describe('<SearchInput />', () => {
  it('renders input with placeholder, handles change and clear, and binds searchInputRef', () => {
    const setQuery = vi.fn();
    const searchInputRef = createRef<HTMLInputElement>();

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
          searchInputRef,
        }}
      >
        <SearchInput />
      </SearchContext.Provider>,
    );

    const input = screen.getByPlaceholderText('Search stars, planets, layers...');
    expect(input).toBeDefined();
    expect(searchInputRef.current).toBe(input);
    expect((input as HTMLInputElement).value).toBe('alpha');

    fireEvent.change(input, { target: { value: 'beta' } });
    expect(setQuery).toHaveBeenCalledWith('beta');

    const clearBtn = screen.getByTestId('search-clear-button');
    fireEvent.click(clearBtn);
    expect(setQuery).toHaveBeenCalledWith('');
  });
});
