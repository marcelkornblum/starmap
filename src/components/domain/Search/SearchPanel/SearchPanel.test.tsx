import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useRouter } from '@tanstack/react-router';
import { SearchPanel } from './SearchPanel';
import { SearchContext } from '../SearchContext';
import { executeCatalogSearch } from '../../../../services/search/searchExecution';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useRouter: vi.fn(() => undefined),
  };
});

describe('<SearchPanel />', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      navigate: mockNavigate,
      history: { push: mockNavigate },
    } as never);
  });

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

  it('invokes submitSearch and navigates to /search?q=… when submitted on non-search scope with non-empty query', () => {
    const submitSearch = vi.fn().mockResolvedValue(undefined);
    const setIsFocused = vi.fn();
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
          setIsFocused,
        }}
      >
        <SearchPanel scope="galaxy" />
      </SearchContext.Provider>,
    );

    const submitBtn = screen.getByTestId('search-submit-button');
    fireEvent.click(submitBtn);
    expect(submitSearch).toHaveBeenCalledTimes(1);
    expect(submitSearch).toHaveBeenCalledWith('tau ceti', 'stars');
    expect(setIsFocused).toHaveBeenCalledWith(false);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith({
      href: '/search?q=tau+ceti&searchCategory=stars',
    });
  });

  it('does not navigate when submitted on scope="search"', () => {
    const submitSearch = vi.fn().mockResolvedValue(undefined);
    const setIsFocused = vi.fn();
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
          setIsFocused,
        }}
      >
        <SearchPanel scope="search" />
      </SearchContext.Provider>,
    );

    fireEvent.click(screen.getByTestId('search-submit-button'));
    expect(submitSearch).toHaveBeenCalledTimes(1);
    expect(submitSearch).toHaveBeenCalledWith('tau ceti', 'stars');
    expect(setIsFocused).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when submitted with a whitespace-only query', () => {
    const submitSearch = vi.fn().mockResolvedValue(undefined);
    const setIsFocused = vi.fn();
    render(
      <SearchContext.Provider
        value={{
          query: '   ',
          filter: 'all',
          status: 'idle',
          errorMessage: null,
          results: executeCatalogSearch([], { query: '', filter: 'all' }),
          setQuery: vi.fn(),
          setFilter: vi.fn(),
          submitSearch,
          isFocused: true,
          setIsFocused,
        }}
      >
        <SearchPanel scope="galaxy" />
      </SearchContext.Provider>,
    );

    fireEvent.submit(screen.getByRole('search'));
    expect(submitSearch).toHaveBeenCalledTimes(1);
    expect(submitSearch).toHaveBeenCalledWith('   ', 'all');
    expect(setIsFocused).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
