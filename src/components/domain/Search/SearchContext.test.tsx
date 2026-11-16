import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { SearchContext, useSearchContext, type SearchContextValue } from './SearchContext';
import { executeCatalogSearch } from '../../../services/search/searchExecution';

describe('SearchContext', () => {
  it('returns default fallback values when rendered outside a provider', async () => {
    const { result } = renderHook(() => useSearchContext());

    expect(result.current.query).toBe('');
    expect(result.current.filter).toBe('all');
    expect(result.current.status).toBe('idle');
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.results.totalMatches).toBe(0);

    // Call default no-ops
    expect(() => result.current.setQuery('test')).not.toThrow();
    expect(() => result.current.setFilter('stars')).not.toThrow();
    await expect(result.current.submitSearch()).resolves.toBeUndefined();
  });

  it('provides custom context values when wrapped in SearchContext.Provider', () => {
    const customResults = executeCatalogSearch([], { query: 'test', filter: 'stars' });
    const setQueryMock = vi.fn();
    const setFilterMock = vi.fn();
    const submitSearchMock = vi.fn().mockResolvedValue(undefined);

    const customValue: SearchContextValue = {
      query: 'test',
      filter: 'stars',
      status: 'ready',
      errorMessage: null,
      results: customResults,
      isFocused: true,
      setQuery: setQueryMock,
      setFilter: setFilterMock,
      submitSearch: submitSearchMock,
    };

    const wrapper = ({ children }: PropsWithChildren) => (
      <SearchContext.Provider value={customValue}>{children}</SearchContext.Provider>
    );

    const { result } = renderHook(() => useSearchContext(), { wrapper });

    expect(result.current.query).toBe('test');
    expect(result.current.filter).toBe('stars');
    expect(result.current.status).toBe('ready');
    expect(result.current.isFocused).toBe(true);

    result.current.setQuery('updated');
    expect(setQueryMock).toHaveBeenCalledWith('updated');

    result.current.setFilter('planets');
    expect(setFilterMock).toHaveBeenCalledWith('planets');

    result.current.submitSearch();
    expect(submitSearchMock).toHaveBeenCalled();
  });
});
