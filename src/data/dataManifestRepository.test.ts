import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearDataManifestCache,
  fetchDataManifest,
  getCachedDataManifest,
  hasManifestDataPath,
  resolveManifestDataUrl,
  seedDataManifest,
  type DataManifest,
} from './dataManifestRepository';

const MOCK_MANIFEST: DataManifest = {
  v: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  files: {
    'search/startup.json': 'search/startup.a1b2c3d4.json',
    'summaries/0.json': 'summaries/0.11223344.json',
    'partitions/sector_+000_+000_+000.bin': 'partitions/sector_+000_+000_+000.deadbeef.bin',
  },
};

describe('dataManifestRepository', () => {
  beforeEach(() => {
    clearDataManifestCache();
    vi.restoreAllMocks();
  });

  it('fetches, validates, caches, and deduplicates /data/manifest.json', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => MOCK_MANIFEST,
    }));

    expect(getCachedDataManifest()).toBeUndefined();

    const [a, b] = await Promise.all([
      fetchDataManifest(fetchMock as unknown as typeof fetch),
      fetchDataManifest(fetchMock as unknown as typeof fetch),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/data/manifest.json');
    expect(a).toEqual(MOCK_MANIFEST);
    expect(b).toBe(a);
    expect(getCachedDataManifest()).toEqual(MOCK_MANIFEST);
  });

  it('rejects manifest.json with missing or mismatched schema version v', async () => {
    const missingFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ generatedAt: '2026', files: {} }),
    }));
    await expect(
      fetchDataManifest(missingFetch as unknown as typeof fetch),
    ).rejects.toThrow(/unsupported schema version/i);

    const wrongFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ v: 99, generatedAt: '2026', files: {} }),
    }));
    await expect(
      fetchDataManifest(wrongFetch as unknown as typeof fetch),
    ).rejects.toThrow(/unsupported schema version/i);
  });

  it('resolves hashed URLs when manifest is seeded or fetched globally', async () => {
    seedDataManifest(MOCK_MANIFEST);
    expect(await resolveManifestDataUrl('search/startup.json')).toBe(
      '/data/search/startup.a1b2c3d4.json',
    );
    expect(await resolveManifestDataUrl('/data/summaries/0.json')).toBe(
      '/data/summaries/0.11223344.json',
    );
    expect(await resolveManifestDataUrl('data/partitions/sector_+000_+000_+000.bin')).toBe(
      '/data/partitions/sector_+000_+000_+000.deadbeef.bin',
    );
    // Unmapped path falls back to logical path
    expect(await resolveManifestDataUrl('search/unknown.json')).toBe(
      '/data/search/unknown.json',
    );
  });

  it('falls back to unhashed path without extra fetch when custom fetchImpl is supplied and cache is empty', async () => {
    const customFetch = vi.fn();
    const resolved = await resolveManifestDataUrl(
      'search/stars.json',
      customFetch as unknown as typeof fetch,
    );
    expect(resolved).toBe('/data/search/stars.json');
    expect(customFetch).not.toHaveBeenCalled();
  });

  it('falls back cleanly when global fetch returns 404 for manifest.json', async () => {
    const notFoundFetch = vi.fn(async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({}),
    }));
    vi.stubGlobal('fetch', notFoundFetch);

    const resolved = await resolveManifestDataUrl('search/stars.json');
    expect(resolved).toBe('/data/search/stars.json');
  });

  it('forwards AbortSignal and rethrows AbortError without swallowing cancellation', async () => {
    const controller = new AbortController();
    controller.abort();
    const abortFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      return { ok: true, status: 200, json: async () => MOCK_MANIFEST } as unknown as Response;
    });
    vi.stubGlobal('fetch', abortFetch);

    await expect(
      resolveManifestDataUrl('search/stars.json', fetch, controller.signal),
    ).rejects.toThrow(/aborted/i);
  });

  it('reports hasManifestDataPath as undefined before load and boolean once manifest is cached', () => {
    expect(hasManifestDataPath('summaries/sector_+000_+000_+000.json')).toBeUndefined();

    seedDataManifest(MOCK_MANIFEST);

    expect(hasManifestDataPath('search/startup.json')).toBe(true);
    expect(hasManifestDataPath('/data/summaries/0.json')).toBe(true);
    expect(hasManifestDataPath('summaries/sector_+999_+000_+000.json')).toBe(false);
    expect(hasManifestDataPath('toString')).toBe(false);
  });

  it('throws loudly in resolveManifestDataUrl on schema mismatch or malformed manifest envelope', async () => {
    const badVersionFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ v: 99, generatedAt: '2026', files: {} }),
    }));
    vi.stubGlobal('fetch', badVersionFetch);

    await expect(resolveManifestDataUrl('search/stars.json')).rejects.toThrow(
      /unsupported schema version/i,
    );

    clearDataManifestCache();
    const malformedFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ v: 1, generatedAt: '2026' }),
    }));
    vi.stubGlobal('fetch', malformedFetch);

    await expect(resolveManifestDataUrl('search/stars.json')).rejects.toThrow(
      /invalid data manifest envelope/i,
    );
  });

  it('retries shared pendingManifest cleanly when another concurrent caller aborts', async () => {
    const controllerA = new AbortController();
    let attempt = 0;

    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      attempt++;
      if (attempt === 1) {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => MOCK_MANIFEST,
      } as unknown as Response);
    });

    const promiseA = fetchDataManifest(fetchMock as unknown as typeof fetch, controllerA.signal);
    const promiseB = fetchDataManifest(fetchMock as unknown as typeof fetch);

    controllerA.abort();

    await expect(promiseA).rejects.toThrow(/aborted/i);
    await expect(promiseB).resolves.toEqual(MOCK_MANIFEST);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
