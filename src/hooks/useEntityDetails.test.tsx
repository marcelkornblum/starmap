// @vitest-environment jsdom
import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEntityDetails } from './useEntityDetails';
import {
  clearDetailsRepositoryCache,
  seedDetailRecord,
  seedSummaryNode,
  type DecodedDetailRecord,
} from '../data/detailsRepository';
import type { SystemSummaryNode } from '../types/astro';

const makeSummaryNode = (id: string): SystemSummaryNode => ({
  id,
  name: `Star ${id}`,
  x: 1,
  y: 2,
  z: 3,
  dist: 3.74,
  mag: 5.5,
  absmag: 4.2,
  spect: 'G2V',
  ci: 0.65,
  starCount: 1,
  planetCount: 0,
  hasHabitableCandidate: false,
  sectorId: 'sector_0_0_0',
});

const makeDetailRecord = (id: string): DecodedDetailRecord => ({
  kind: 'system',
  record: {
    id,
    name: `System ${id}`,
    x: 1,
    y: 2,
    z: 3,
    dist: 3.74,
    sectorId: 'sector_0_0_0',
    stars: [
      {
        id,
        name: `Star ${id}`,
        componentDesignation: 'A',
        spectralType: 'G2V',
        mag: 5.5,
        absmag: 4.2,
      },
    ],
    planets: [],
  },
});

describe('useEntityDetails (AUD-087 & DEC-R042)', () => {
  beforeEach(() => {
    clearDetailsRepositoryCache();
    vi.restoreAllMocks();
  });

  it('returns undefined detail and summary with isLoading: false when entityId is omitted', () => {
    const { result } = renderHook(() => useEntityDetails(null));

    expect(result.current.detail).toBeUndefined();
    expect(result.current.summary).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('resolves synchronously on initial render when data is already cached', () => {
    seedSummaryNode('sol', makeSummaryNode('sol'));
    seedDetailRecord('sol', makeDetailRecord('sol'));

    const { result } = renderHook(() => useEntityDetails('sol'));

    expect(result.current.summary?.id).toBe('sol');
    expect(result.current.detail?.record.id).toBe('sol');
    expect(result.current.isLoading).toBe(false);
  });

  it('initiates fetch and updates reactively when data arrives', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('/data/summaries/')) {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({
            d: {
              'sys-1': {
                n: 'Star sys-1',
                p: [1, 2, 3],
                m: 5.5,
                a: 4.2,
                s: 'G',
                c: 0.65,
              },
            },
          }),
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          d: {
            'sys-1': {
              t: 'sys',
              n: 'System sys-1',
              p: [1, 2, 3],
              q: 'sector_0_0_0',
              S: [{ i: 'sys-1', n: 'Star sys-1', c: 'A', s: 'G2V', m: 5.5, a: 4.2 }],
              E: [],
            },
          },
        }),
      } as unknown as Response;
    });

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useEntityDetails('sys-1'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.summary?.id).toBe('sys-1');
      expect(result.current.detail?.record.id).toBe('sys-1');
    });
  });

  it('updates reactively when cache is seeded externally while mounted', () => {
    const { result } = renderHook(() => useEntityDetails('sys-external'));

    expect(result.current.detail).toBeUndefined();

    act(() => {
      seedSummaryNode('sys-external', makeSummaryNode('sys-external'));
    });
    act(() => {
      seedDetailRecord('sys-external', makeDetailRecord('sys-external'));
    });

    expect(result.current.summary?.id).toBe('sys-external');
    expect(result.current.detail?.record.id).toBe('sys-external');
  });

  it('aborts in-flight request when unmounted', () => {
    let capturedSignal: AbortSignal | undefined;
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedSignal = init?.signal ?? undefined;
      return new Promise<Response>(() => {});
    });

    vi.stubGlobal('fetch', fetchMock);

    const { unmount } = renderHook(() => useEntityDetails('sys-abort'));

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);

    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });
});
