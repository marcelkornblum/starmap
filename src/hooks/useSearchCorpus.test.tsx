// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSearchCorpus } from './useSearchCorpus';
import {
  clearSearchRepositoryCache,
  fetchSearchShard,
} from '../data/searchRepository';
import type { CompactSearchEntry } from '../utils/compactDataCodec';

const makeEntry = (id: string, name: string): CompactSearchEntry => ({
  i: id,
  n: name,
  k: 1,
  p: [0, 0, 0],
});

describe('useSearchCorpus (AUD-087 & DEC-R042)', () => {
  beforeEach(() => {
    clearSearchRepositoryCache();
    vi.restoreAllMocks();
  });

  it('resolves synchronously when initialCorpus is provided', () => {
    const initial: CompactSearchEntry[] = [makeEntry('sol', 'Sol')];
    const { result } = renderHook(() => useSearchCorpus('all', initial));

    expect(result.current.corpus).toEqual(initial);
    expect(result.current.isLoading).toBe(false);
  });

  it('resolves synchronously when corpus is already in cache', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        d: [makeEntry('star-1', 'Star 1')],
      }),
    } as unknown as Response));

    await fetchSearchShard('stars', fetchMock as unknown as typeof fetch);

    const { result } = renderHook(() => useSearchCorpus('stars'));

    expect(result.current.corpus).toHaveLength(1);
    expect(result.current.corpus?.[0].i).toBe('star-1');
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches corpus when not cached and updates reactively', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        d: [makeEntry('planet-1', 'Planet 1')],
      }),
    } as unknown as Response));

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useSearchCorpus('planets'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.corpus).toHaveLength(1);
      expect(result.current.corpus?.[0].i).toBe('planet-1');
    });
  });

  it('aborts in-flight fetch when unmounted', () => {
    let capturedSignal: AbortSignal | undefined;
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedSignal = init?.signal ?? undefined;
      return new Promise<Response>(() => {});
    });

    vi.stubGlobal('fetch', fetchMock);

    const { unmount } = renderHook(() => useSearchCorpus('stars'));

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);

    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });
});
