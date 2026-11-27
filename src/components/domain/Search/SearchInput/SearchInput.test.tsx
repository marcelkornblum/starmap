import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SearchInput } from './SearchInput';
import { SearchContext } from '../SearchContext';
import { executeCatalogSearch } from '../../../../services/search/searchExecution';

describe('<SearchInput />', () => {
  it('renders input with placeholder, clear and submit icon buttons, and binds searchInputRef', () => {
    const setQuery = vi.fn();
    const searchInputRef = createRef<HTMLInputElement>();

    const { rerender } = render(
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
    expect(clearBtn).toHaveAttribute('aria-label', 'Clear search');
    expect(clearBtn).toHaveAttribute('data-variant', 'subtle');
    expect(input.parentElement?.contains(clearBtn)).toBe(true);
    expect(input.parentElement).toHaveAttribute('data-has-query', 'true');
    expect(clearBtn.parentElement).toHaveAttribute('data-has-query', 'true');
    expect(clearBtn.querySelector('svg')).not.toBeNull();

    const submitBtn = screen.getByTestId('search-submit-button');
    expect(submitBtn).toHaveAttribute('aria-label', 'Search');
    expect(submitBtn).toHaveAttribute('type', 'submit');
    expect(submitBtn).toHaveAttribute('data-variant', 'default');
    expect(submitBtn).not.toBeDisabled();
    expect(submitBtn.querySelector('svg')).not.toBeNull();

    fireEvent.click(clearBtn);
    expect(setQuery).toHaveBeenCalledWith('');
    expect(document.activeElement).toBe(input);

    rerender(
      <SearchContext.Provider
        value={{
          query: '',
          filter: 'all',
          status: 'idle',
          errorMessage: null,
          results: executeCatalogSearch([], { query: '', filter: 'all' }),
          setQuery,
          setFilter: vi.fn(),
          submitSearch: vi.fn(),
          isFocused: false,
          searchInputRef,
        }}
      >
        <SearchInput />
      </SearchContext.Provider>,
    );

    expect(input.parentElement).toHaveAttribute('data-has-query', 'false');
    expect(screen.getByTestId('search-clear-button').parentElement).toHaveAttribute('data-has-query', 'false');
    expect(screen.getByTestId('search-submit-button')).toHaveAttribute('data-variant', 'subtle');
    expect(screen.getByTestId('search-submit-button')).toBeDisabled();

    rerender(
      <SearchContext.Provider
        value={{
          query: '   ',
          filter: 'all',
          status: 'idle',
          errorMessage: null,
          results: executeCatalogSearch([], { query: '   ', filter: 'all' }),
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

    expect(screen.getByTestId('search-submit-button')).toHaveAttribute('data-variant', 'subtle');
    expect(screen.getByTestId('search-submit-button')).toBeDisabled();
  });
});
