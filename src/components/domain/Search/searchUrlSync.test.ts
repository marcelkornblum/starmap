import { describe, expect, it, vi } from 'vitest';
import {
  resolveInitialFilter,
  resolveInitialQuery,
  syncSearchUrlParams,
} from './searchUrlSync';
import type { AppRouterAdapter } from '../../../hooks/useSpaLocation';

describe('searchUrlSync', () => {
  describe('resolveInitialQuery', () => {
    it('returns fallbackQuery when syncUrl is false', () => {
      expect(resolveInitialQuery(false, '?q=urlQuery', 'fallback')).toBe('fallback');
    });

    it('returns fallbackQuery when fallbackQuery is non-empty even if syncUrl is true', () => {
      expect(resolveInitialQuery(true, '?q=urlQuery', 'fallback')).toBe('fallback');
    });

    it('extracts query from search string when syncUrl is true and fallback is empty', () => {
      expect(resolveInitialQuery(true, '?q=urlQuery', '')).toBe('urlQuery');
      expect(resolveInitialQuery(true, '', '')).toBe('');
    });
  });

  describe('resolveInitialFilter', () => {
    it('returns fallbackFilter when syncUrl is false', () => {
      expect(resolveInitialFilter(false, '?searchCategory=stars', 'all')).toBe('all');
    });

    it('returns fallbackFilter when fallbackFilter is not "all"', () => {
      expect(resolveInitialFilter(true, '?searchCategory=stars', 'planets')).toBe('planets');
    });

    it('extracts category from search string when syncUrl is true and fallback is "all"', () => {
      expect(resolveInitialFilter(true, '?searchCategory=stars', 'all')).toBe('stars');
      expect(resolveInitialFilter(true, '', 'all')).toBe('all');
    });
  });

  describe('syncSearchUrlParams', () => {
    it('updates search query and filter in passed router when navigate is available', () => {
      const navigateMock = vi.fn().mockResolvedValue(undefined);
      const mockRouter: AppRouterAdapter = {
        navigate: navigateMock,
        state: {},
      };

      syncSearchUrlParams('Sol', 'stars', mockRouter);
      expect(navigateMock).toHaveBeenCalled();

      const navArg = navigateMock.mock.calls[0][0];
      expect(navArg.to).toBe('.');
      const updatedSearch = navArg.search({});
      expect(updatedSearch.q).toBe('Sol');
      expect(updatedSearch.select).toBe('search');
      expect(updatedSearch.searchCategory).toBe('stars');

      // Test clearing search
      syncSearchUrlParams('', 'all', mockRouter);
      const clearedArg = navigateMock.mock.calls[1][0];
      const clearedSearch = clearedArg.search({ q: 'Sol', select: 'search', searchCategory: 'stars' });
      expect(clearedSearch.q).toBeUndefined();
      expect(clearedSearch.select).toBeUndefined();
      expect(clearedSearch.searchCategory).toBeUndefined();
    });

    it('is a no-op when router or router.state is unavailable', () => {
      const navigateMock = vi.fn();
      syncSearchUrlParams('Sol', 'stars', undefined);
      syncSearchUrlParams('Sol', 'stars', { navigate: navigateMock });
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });
});
