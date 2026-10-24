import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LAYER_MANIFESTS } from '../content/layers';
import {
  clearLayerRepositoryCache,
  fetchEntityAnnotations,
  fetchLayerIndex,
  fetchLayerManifest,
  getCachedEntityAnnotations,
  getCachedLayerManifest,
} from '../src/data/layerRepository';
import { getShardKey } from '../src/utils/compactDataCodec';
import { createLayerFetch, RESOLVED_LAYER_MANIFESTS } from './layerFixtures';

const makeFetch = () => vi.fn(createLayerFetch());

const jsonResponse = (payload: unknown, ok = true): Response =>
  ({
    ok,
    status: ok ? 200 : 404,
    statusText: ok ? 'OK' : 'Not Found',
    json: async () => payload,
  }) as unknown as Response;

describe('layerRepository', () => {
  beforeEach(() => {
    clearLayerRepositoryCache();
  });

  it('fetches and caches the layer index entries', async () => {
    const fetchImpl = makeFetch();
    const first = await fetchLayerIndex(fetchImpl);
    const second = await fetchLayerIndex(fetchImpl);

    expect(first.map((l) => l.layerId)).toEqual(
      LAYER_MANIFESTS.map((l) => l.layerId),
    );
    expect(second).toBe(first);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('throws on a failed index response and does not cache the failure', async () => {
    const failing = vi.fn(async () => jsonResponse({}, false));
    await expect(fetchLayerIndex(failing)).rejects.toThrow(/layer index/i);

    const working = makeFetch();
    await expect(fetchLayerIndex(working)).resolves.toHaveLength(
      LAYER_MANIFESTS.length,
    );
  });

  it('fetches, decodes and caches a single layer manifest', async () => {
    const fetchImpl = makeFetch();
    const target = RESOLVED_LAYER_MANIFESTS.find((l) => l.layerId === 'canon-halo')!;

    const manifest = await fetchLayerManifest('canon-halo', fetchImpl);
    await fetchLayerManifest('canon-halo', fetchImpl);

    expect(manifest).toEqual(target);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('throws when a layer manifest cannot be loaded', async () => {
    await expect(
      fetchLayerManifest('canon-missing', makeFetch()),
    ).rejects.toThrow(/canon-missing/);
  });

  it('fetches by-entity buckets once per bucket and returns the decoded union', async () => {
    const fetchImpl = makeFetch();
    const records = await fetchEntityAnnotations(
      ['tau-ceti-e', 'gaia-2452378776434477184'],
      fetchImpl,
    );

    expect(records.some((r) => r.layerId === 'canon-project-hail-mary' && r.targetId === 'tau-ceti-e')).toBe(true);
    expect(records.some((r) => r.layerId === 'overlay-seti-landmarks')).toBe(true);
    const keys = records.map((r) => `${r.layerId}:${r.targetId}`);
    expect(new Set(keys).size).toBe(keys.length);

    const expectedBuckets = new Set([
      getShardKey('tau-ceti-e'),
      getShardKey('gaia-2452378776434477184'),
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(expectedBuckets.size);

    await fetchEntityAnnotations(['tau-ceti-e'], fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(expectedBuckets.size);
  });

  it('returns an empty list for unknown or empty entity IDs without fetching empty IDs', async () => {
    const fetchImpl = makeFetch();
    expect(await fetchEntityAnnotations([''], fetchImpl)).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(await fetchEntityAnnotations(['no-such-entity'], fetchImpl)).toEqual([]);
  });

  it('exposes fetched manifests and entity annotations synchronously from the cache', async () => {
    expect(getCachedLayerManifest('canon-halo')).toBeUndefined();
    expect(getCachedEntityAnnotations(['tau-ceti-e'])).toEqual([]);

    const fetchImpl = makeFetch();
    await fetchLayerManifest('canon-halo', fetchImpl);
    const fetched = await fetchEntityAnnotations(['tau-ceti-e'], fetchImpl);

    expect(getCachedLayerManifest('canon-halo')?.layerId).toBe('canon-halo');
    expect(getCachedEntityAnnotations(['tau-ceti-e'])).toEqual(fetched);
    expect(getCachedEntityAnnotations([''])).toEqual([]);
  });

  it('rejects when a by-entity bucket fails to load and retries on the next call', async () => {
    const failing = vi.fn(async () => jsonResponse({}, false));
    await expect(fetchEntityAnnotations(['tau-ceti-e'], failing)).rejects.toThrow(
      /by-entity/i,
    );
    await expect(
      fetchEntityAnnotations(['tau-ceti-e'], makeFetch()),
    ).resolves.not.toHaveLength(0);
  });
});
