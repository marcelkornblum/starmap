import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  clearDetailsRepositoryCache,
  seedSummaryNode,
} from '../data/detailsRepository';
import { clearDataManifestCache, seedDataManifest } from '../data/dataManifestRepository';
import { useRoutingSummaryFallback } from './useRoutingSummaryFallback';

describe('useRoutingSummaryFallback', () => {
  beforeEach(() => {
    clearDetailsRepositoryCache();
    clearDataManifestCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearDetailsRepositoryCache();
    clearDataManifestCache();
  });

  it('returns an empty array when unresolvedSlugs is empty', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useRoutingSummaryFallback([]));
    expect(result.current).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('resolves canonical prefixed slugs (exo-*, hip-*, gaia-*, hyg-*) via details/routing.json and summary shards', async () => {
    seedDataManifest({
      v: 1,
      generatedAt: '2026-01-01T00:00:00.000Z',
      files: {
        'details/routing.json': 'details/routing.json',
        'summaries/sector_+050_-150_+075.json': 'summaries/sector_+050_-150_+075.json',
      },
    });

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      if (url.includes('details/routing.json')) {
        return new Response(
          JSON.stringify({
            v: 1,
            k: ['sector_+050_-150_+075'],
            s: { 'exo-kepler-186': 0 },
            d: { 'exo-kepler-186': 0 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('summaries/sector_+050_-150_+075.json')) {
        return new Response(
          JSON.stringify({
            v: 1,
            i: 'sector_+050_-150_+075',
            c: 1,
            d: {
              'exo-kepler-186': {
                i: 'exo-kepler-186',
                n: 'Kepler-186',
                p: [61.5, -112.4, 123.7],
                m: 14.62,
                M: 8.36,
                s: 'M1V',
                c: 1,
                k: 5,
                b: [4, 1, 0, 0],
                h: 1,
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('Not Found', { status: 404 });
    });

    const { result } = renderHook(() => useRoutingSummaryFallback(['exo-kepler-186']));

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
    });

    expect(result.current[0]).toMatchObject({
      i: 'exo-kepler-186',
      n: 'Kepler-186',
      p: [61.5, -112.4, 123.7],
      m: [14.62, 'M1V', 5, 1],
      c: 'stars',
    });
  });

  it('resolves non-prefixed canonical IDs present in details/routing.json and skips unknown slugs', async () => {
    seedDataManifest({
      v: 1,
      generatedAt: '2026-01-01T00:00:00.000Z',
      files: {
        'details/routing.json': 'details/routing.json',
      },
    });
    seedSummaryNode('proxima-centauri', {
      id: 'proxima-centauri',
      name: 'Proxima Centauri',
      x: -0.472,
      y: -0.361,
      z: -1.151,
      dist: 1.302,
      mag: 11.13,
      absmag: 15.6,
      spect: 'M5.5Ve',
      starCount: 1,
      planetCount: 2,
      hasHabitableCandidate: true,
      sectorId: 'sector_-001_-001_-001',
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      if (url.includes('details/routing.json')) {
        return new Response(
          JSON.stringify({
            v: 1,
            k: ['sector_-001_-001_-001'],
            s: { 'proxima-centauri': 0 },
            d: { 'proxima-centauri': 0 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('Not Found', { status: 404 });
    });

    const { result } = renderHook(() =>
      useRoutingSummaryFallback(['proxima-centauri', 'nonexistent-slug']),
    );

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
    });

    expect(result.current[0]?.i).toBe('proxima-centauri');
    expect(result.current[0]?.p).toEqual([-0.472, -0.361, -1.151]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
