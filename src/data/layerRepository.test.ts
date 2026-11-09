import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearLayerRepositoryCache,
  fetchEntityAnnotations,
  fetchLayerIndex,
  fetchLayerManifest,
  getCachedLayerManifest,
} from './layerRepository';
import { LAYER_MANIFEST_CACHE_LIMIT } from '../config/cacheConfig';

const makeManifestPayload = (id: string) => ({
  i: id,
  n: `Layer ${id}`,
  k: 1,
  d: 'Test layer',
  v: '1.0.0',
  e: {},
});

describe('layerRepository (AUD-090 & DEC-R043)', () => {
  beforeEach(() => {
    clearLayerRepositoryCache();
  });

  describe('AbortSignal forwarding and cancellation', () => {
    it('forwards AbortSignal to fetchImpl in fetchLayerIndex and cancels properly', async () => {
      const controller = new AbortController();
      controller.abort();

      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) {
          throw new DOMException('The user aborted a request.', 'AbortError');
        }
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({ d: [] }),
        } as unknown as Response;
      });

      await expect(
        fetchLayerIndex(fetchMock as unknown as typeof fetch, controller.signal),
      ).rejects.toThrow(/aborted/);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/data/overlays/layers/index.json'),
        { signal: controller.signal },
      );
    });

    it('forwards AbortSignal to fetchImpl in fetchLayerManifest and cancels properly', async () => {
      const controller = new AbortController();
      controller.abort();

      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) {
          throw new DOMException('The user aborted a request.', 'AbortError');
        }
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => makeManifestPayload('canon-1'),
        } as unknown as Response;
      });

      await expect(
        fetchLayerManifest('canon-1', fetchMock as unknown as typeof fetch, controller.signal),
      ).rejects.toThrow(/aborted/);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/data/overlays/layers/canon-1.json'),
        { signal: controller.signal },
      );
    });

    it('forwards AbortSignal to fetchImpl in fetchEntityAnnotations and cancels properly', async () => {
      const controller = new AbortController();
      controller.abort();

      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) {
          throw new DOMException('The user aborted a request.', 'AbortError');
        }
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({ d: {} }),
        } as unknown as Response;
      });

      await expect(
        fetchEntityAnnotations(['sol'], fetchMock as unknown as typeof fetch, controller.signal),
      ).rejects.toThrow(/aborted/);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/data/overlays/layers/by-entity/'),
        { signal: controller.signal },
      );
    });
  });

  describe('Bounded LRU cache eviction', () => {
    it('bounds RESOLVED_MANIFEST_CACHE to LAYER_MANIFEST_CACHE_LIMIT', async () => {
      const fetchMock = vi.fn(async (url: string) => {
        const idMatch = url.match(/\/data\/overlays\/layers\/(.*)\.json/);
        const id = idMatch ? idMatch[1] : 'unknown';
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => makeManifestPayload(id),
        } as unknown as Response;
      });

      // Load up to capacity limit
      for (let i = 0; i < LAYER_MANIFEST_CACHE_LIMIT; i++) {
        await fetchLayerManifest(`manifest-${i}`, fetchMock as unknown as typeof fetch);
      }

      // Access manifest-0 so manifest-1 is the oldest
      expect(getCachedLayerManifest('manifest-0')).toBeDefined();

      // Load one more
      await fetchLayerManifest('manifest-overflow', fetchMock as unknown as typeof fetch);

      expect(getCachedLayerManifest('manifest-1')).toBeUndefined();
      expect(getCachedLayerManifest('manifest-0')).toBeDefined();
      expect(getCachedLayerManifest('manifest-overflow')).toBeDefined();
    });
  });
});
