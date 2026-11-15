import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSearchExecution } from './useSearchExecution';
import { createSpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';
import type { CompactSearchEntry } from '../../../utils/compactDataTypes';

const TEST_CORPUS: readonly CompactSearchEntry[] = [
  { i: 'sol', n: 'Sol', m: [-26.74, 'G2V', 8, 1], h: 1, a: 'sol' },
  { i: 'tau-ceti', n: 'Tau Ceti', m: [3.49, 'G8V', 4, 1], h: 1, a: 'tau ceti' },
];

describe('useSearchExecution', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initialises with given query and filter and returns search results in sync mode', () => {
    const store = createSpatialEntityStore();
    const searchRootRef = { current: document.createElement('div') };
    const setIsFocused = vi.fn();

    const { result } = renderHook(() =>
      useSearchExecution({
        initialQuery: 'Sol',
        initialFilter: 'all',
        initialCorpus: TEST_CORPUS,
        syncUrl: false,
        isSync: true,
        effectiveDebounceMs: 0,
        activeSearch: '',
        store,
        layerIndex: [],
        loadedLayers: [],
        searchRootRef,
        setIsFocused,
      }),
    );

    expect(result.current.query).toBe('Sol');
    expect(result.current.filter).toBe('all');
    expect(result.current.status).toBe('ready');
    expect(result.current.results.totalMatches).toBeGreaterThanOrEqual(1);
    expect(result.current.results.groups.stars.items.some((i) => i.id === 'sol')).toBe(true);
  });

  it('updates query and executes search immediately in sync mode', () => {
    const store = createSpatialEntityStore();
    const searchRootRef = { current: document.createElement('div') };
    const setIsFocused = vi.fn();

    const { result } = renderHook(() =>
      useSearchExecution({
        initialQuery: '',
        initialFilter: 'all',
        initialCorpus: TEST_CORPUS,
        syncUrl: false,
        isSync: true,
        effectiveDebounceMs: 0,
        activeSearch: '',
        store,
        layerIndex: [],
        loadedLayers: [],
        searchRootRef,
        setIsFocused,
      }),
    );

    act(() => {
      result.current.setQuery('Tau Ceti');
    });

    expect(result.current.query).toBe('Tau Ceti');
    expect(result.current.results.groups.stars.items.some((i) => i.id === 'tau-ceti')).toBe(true);
  });

  it('updates filter and filters results', () => {
    const store = createSpatialEntityStore();
    const searchRootRef = { current: document.createElement('div') };
    const setIsFocused = vi.fn();

    const { result } = renderHook(() =>
      useSearchExecution({
        initialQuery: 'Tau Ceti',
        initialFilter: 'all',
        initialCorpus: TEST_CORPUS,
        syncUrl: false,
        isSync: true,
        effectiveDebounceMs: 0,
        activeSearch: '',
        store,
        layerIndex: [],
        loadedLayers: [],
        searchRootRef,
        setIsFocused,
      }),
    );

    act(() => {
      result.current.setFilter('planets');
    });

    expect(result.current.filter).toBe('planets');
    // Tau Ceti is a star, so under planets filter it should have 0 items
    expect(result.current.results.groups.planets.items).toHaveLength(0);
  });

  it('dismisses search and unfocuses via dismissSearch', () => {
    const store = createSpatialEntityStore();
    const searchRootRef = { current: document.createElement('div') };
    const setIsFocused = vi.fn();

    const { result } = renderHook(() =>
      useSearchExecution({
        initialQuery: 'Sol',
        initialFilter: 'all',
        initialCorpus: TEST_CORPUS,
        syncUrl: false,
        isSync: true,
        effectiveDebounceMs: 0,
        activeSearch: '',
        store,
        layerIndex: [],
        loadedLayers: [],
        searchRootRef,
        setIsFocused,
      }),
    );

    act(() => {
      result.current.dismissSearch();
    });

    expect(setIsFocused).toHaveBeenCalledWith(false);
  });
});
