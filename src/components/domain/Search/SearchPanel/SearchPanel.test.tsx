import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SearchPanel } from './SearchPanel';
import { SearchContext } from '../SearchContext';
import { executeCatalogSearch } from '../../../../services/search/searchExecution';
import { useRouter } from '@tanstack/react-router';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useRouter: vi.fn(() => undefined),
  };
});

vi.mock('../../../../hooks/useLayerData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../hooks/useLayerData')>();
  return {
    ...actual,
    useLayerIndex: () => [
      { layerId: 'project-hail-mary', title: 'Project Hail Mary', entryCount: 3 },
      { layerId: 'exoplanet-archive', title: 'Exoplanet Archive', entryCount: 5 },
    ],
  };
});

describe('<SearchPanel />', () => {
  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue(undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders search panel with visuallyHidden heading and search form', () => {
    render(<SearchPanel scope="search" />);

    const panel = screen.getByTestId('search-panel');
    expect(panel).toBeInTheDocument();
    expect(panel.getAttribute('data-scope')).toBe('search');

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('Search');
    expect(heading.getAttribute('data-visually-hidden')).toBe('true');

    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByTestId('search-expanded-drawer')).toBeInTheDocument();
    expect(screen.getByTestId('search-explore-button')).toHaveAttribute('data-variant', 'subtle');
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

  it('reads current layer from typed TanStack Router search state on Explore click', () => {
    const navigate = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      navigate,
      state: { location: { pathname: '/galaxy', search: { layer: 'project-hail-mary' } } },
    } as never);
    window.history.pushState({}, '', '/galaxy');

    render(<SearchPanel scope="galaxy" />);
    fireEvent.click(screen.getByTestId('search-explore-button'));

    expect(navigate).toHaveBeenCalledTimes(1);
    const navCall = navigate.mock.calls[0]?.[0] as {
      to: string;
      search: (prev: Record<string, unknown>) => Record<string, unknown>;
    };
    expect(navCall.to).toBe('/galaxy');
    const nextSearch = navCall.search({ layer: 'project-hail-mary' });
    expect(nextSearch.layer).not.toBe('project-hail-mary');
    expect(nextSearch.select).toBe(`layer:${nextSearch.layer}`);
  });
});
