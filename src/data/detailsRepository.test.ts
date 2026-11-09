import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearDetailsRepositoryCache,
  fetchDetailRecord,
  fetchSummaryNode,
  fetchSummaryNodeByHash,
  getCachedDetailRecord,
  getCachedSummaryNode,
  seedDetailRecord,
  seedSummaryNode,
  subscribeDetailsRepository,
  type DecodedDetailRecord,
} from './detailsRepository';
import {
  DETAIL_RECORD_CACHE_LIMIT,
  SUMMARY_NODE_CACHE_LIMIT,
} from '../config/cacheConfig';
import { fnv1a32 } from '../utils/binarySectorCodec';
import type { SystemSummaryNode } from '../types/astro';

const makeSummaryResponse = (id: string) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({
    d: {
      [id]: {
        n: `Star ${id}`,
        p: [1, 2, 3],
        m: 5.5,
        a: 4.2,
        s: 'G',
        c: 0.65,
      },
    },
  }),
});

const makeDetailResponse = (id: string) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({
    d: {
      [id]: {
        t: 'sys',
        n: `System ${id}`,
        p: [1, 2, 3],
        q: 'sector_0_0_0',
        S: [{ i: id, n: `Star ${id}`, c: 'A', s: 'G2V', m: 5.5, a: 4.2 }],
        E: [],
      },
    },
  }),
});

describe('detailsRepository (AUD-090 & DEC-R043)', () => {
  beforeEach(() => {
    clearDetailsRepositoryCache();
  });

  describe('AbortSignal forwarding and cancellation', () => {
    it('forwards AbortSignal to fetchImpl in fetchSummaryNode and cancels properly', async () => {
      const controller = new AbortController();
      controller.abort();

      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) {
          throw new DOMException('The user aborted a request.', 'AbortError');
        }
        return makeSummaryResponse('test-1') as unknown as Response;
      });

      await expect(
        fetchSummaryNode('test-1', fetchMock as unknown as typeof fetch, controller.signal),
      ).rejects.toThrow(/aborted/);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/data/summaries/'),
        { signal: controller.signal },
      );
    });

    it('forwards AbortSignal to fetchImpl in fetchSummaryNodeByHash', async () => {
      const controller = new AbortController();
      controller.abort();

      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) {
          throw new DOMException('The user aborted a request.', 'AbortError');
        }
        return makeSummaryResponse('test-hash-1') as unknown as Response;
      });

      const hash = fnv1a32('test-hash-1') >>> 0;
      await expect(
        fetchSummaryNodeByHash(hash, fetchMock as unknown as typeof fetch, controller.signal),
      ).rejects.toThrow(/aborted/);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/data/summaries/'),
        { signal: controller.signal },
      );
    });

    it('forwards AbortSignal to fetchImpl in fetchDetailRecord and cancels properly', async () => {
      const controller = new AbortController();
      controller.abort();

      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) {
          throw new DOMException('The user aborted a request.', 'AbortError');
        }
        return makeDetailResponse('test-detail-1') as unknown as Response;
      });

      await expect(
        fetchDetailRecord('test-detail-1', fetchMock as unknown as typeof fetch, controller.signal),
      ).rejects.toThrow(/aborted/);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/data/details/'),
        { signal: controller.signal },
      );
    });
  });

  describe('Bounded LRU cache eviction', () => {
    it('bounds RESOLVED_DETAIL_RECORD_CACHE to DETAIL_RECORD_CACHE_LIMIT', () => {
      for (let i = 0; i < DETAIL_RECORD_CACHE_LIMIT; i++) {
        const dummy: DecodedDetailRecord = {
          kind: 'structure',
          record: {
            id: `record-${i}`,
            name: `Structure ${i}`,
            type: 'EmissionNebula',
            x: 0,
            y: 0,
            z: 0,
            dist: 10,
            designations: [],
            description: 'test',
          },
        };
        seedDetailRecord(`record-${i}`, dummy);
      }

      expect(getCachedDetailRecord('record-0')).toBeDefined();
      expect(getCachedDetailRecord(`record-${DETAIL_RECORD_CACHE_LIMIT - 1}`)).toBeDefined();

      // Adding one more beyond limit should evict the least recently used
      // Since record-0 was accessed above, record-1 should be the oldest!
      const extra: DecodedDetailRecord = {
        kind: 'structure',
        record: {
          id: 'record-overflow',
          name: 'Structure Overflow',
          type: 'EmissionNebula',
          x: 0,
          y: 0,
          z: 0,
          dist: 10,
          designations: [],
          description: 'overflow',
        },
      };
      seedDetailRecord('record-overflow', extra);

      expect(getCachedDetailRecord('record-1')).toBeUndefined();
      expect(getCachedDetailRecord('record-0')).toBeDefined();
      expect(getCachedDetailRecord('record-overflow')).toBeDefined();
    });

    it('bounds RESOLVED_SUMMARY_NODE_CACHE to SUMMARY_NODE_CACHE_LIMIT', () => {
      for (let i = 0; i < SUMMARY_NODE_CACHE_LIMIT; i++) {
        const dummy: SystemSummaryNode = {
          id: `node-${i}`,
          name: `Star ${i}`,
          x: 1,
          y: 2,
          z: 3,
          dist: 3.74,
          mag: 5.5,
          absmag: 4.2,
          spect: 'G',
          ci: 0.65,
          starCount: 1,
          planetCount: 0,
          hasHabitableCandidate: false,
          sectorId: 'sector_0_0_0',
        };
        seedSummaryNode(`node-${i}`, dummy);
      }

      // Access node-0 so node-1 becomes the oldest
      expect(getCachedSummaryNode('node-0')).toBeDefined();

      // Seed one more beyond limit
      const extra: SystemSummaryNode = {
        id: 'node-overflow',
        name: 'Star Overflow',
        x: 1,
        y: 2,
        z: 3,
        dist: 3.74,
        mag: 5.5,
        absmag: 4.2,
        spect: 'G',
        ci: 0.65,
        starCount: 1,
        planetCount: 0,
        hasHabitableCandidate: false,
        sectorId: 'sector_0_0_0',
      };
      seedSummaryNode('node-overflow', extra);

      expect(getCachedSummaryNode('node-1')).toBeUndefined();
      expect(getCachedSummaryNode('node-0')).toBeDefined();
      expect(getCachedSummaryNode('node-overflow')).toBeDefined();
    });
  });

  describe('Cache subscription (AUD-087 & DEC-R042)', () => {
    it('notifies subscribers when summary cache updates', async () => {
      const listener = vi.fn();
      const unsubscribe = subscribeDetailsRepository(listener);

      const fetchMock = vi.fn(async () => makeSummaryResponse('sys-sub-1') as unknown as Response);
      await fetchSummaryNode('sys-sub-1', fetchMock as unknown as typeof fetch);

      expect(listener).toHaveBeenCalled();

      listener.mockClear();
      unsubscribe();
      await fetchSummaryNode('sys-sub-2', fetchMock as unknown as typeof fetch);
      expect(listener).not.toHaveBeenCalled();
    });

    it('notifies subscribers when detail cache updates', async () => {
      const listener = vi.fn();
      const unsubscribe = subscribeDetailsRepository(listener);

      const fetchMock = vi.fn(async () => makeDetailResponse('sys-sub-3') as unknown as Response);
      await fetchDetailRecord('sys-sub-3', fetchMock as unknown as typeof fetch);

      expect(listener).toHaveBeenCalled();

      unsubscribe();
    });

    it('notifies subscribers when seeding summary or detail nodes', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeDetailsRepository(listener);

      seedSummaryNode('seed-node-1', {
        id: 'seed-node-1',
        name: 'Seed Star',
        x: 0,
        y: 0,
        z: 0,
        dist: 0,
        mag: 0,
        absmag: 0,
        spect: 'G',
        ci: 0,
        starCount: 1,
        planetCount: 0,
        hasHabitableCandidate: false,
        sectorId: 'sector_0_0_0',
      });
      expect(listener).toHaveBeenCalledTimes(1);

      seedDetailRecord('seed-detail-1', {
        kind: 'structure',
        record: {
          id: 'seed-detail-1',
          name: 'Nebula',
          type: 'EmissionNebula',
          x: 0,
          y: 0,
          z: 0,
          dist: 10,
          designations: [],
          description: '',
        },
      });
      expect(listener).toHaveBeenCalledTimes(2);

      unsubscribe();
    });
  });
});
