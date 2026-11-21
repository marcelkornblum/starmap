import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchAndParseJson,
  JsonHttpError,
  resetWorkerJsonParserForTests,
} from './workerJsonParser';

describe('workerJsonParser', () => {
  beforeEach(() => {
    resetWorkerJsonParserForTests();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetWorkerJsonParserForTests();
    vi.unstubAllGlobals();
  });

  it('falls back to main-thread fetcher when Worker is undefined', async () => {
    const customFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ v: 1, d: ['ok'] }),
    }));

    const result = await fetchAndParseJson<{ v: number; d: string[] }>(
      '/data/search/startup.json',
      customFetch as unknown as typeof fetch,
    );

    expect(result).toEqual({ v: 1, d: ['ok'] });
    expect(customFetch).toHaveBeenCalledWith('/data/search/startup.json');
  });

  it('throws JsonHttpError on non-OK HTTP status in main-thread fallback', async () => {
    const failingFetch = vi.fn(async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({}),
    }));

    await expect(
      fetchAndParseJson('/data/search/missing.json', failingFetch as unknown as typeof fetch),
    ).rejects.toThrow(JsonHttpError);
  });

  it('uses Web Worker when Worker is available and default fetch is used, and handles AbortSignal', async () => {
    const postedMessages: Array<{ id: number; url: string }> = [];
    const messageListeners = new Set<(event: MessageEvent) => void>();

    class MockWorker {
      addEventListener(type: string, cb: (event: MessageEvent) => void) {
        if (type === 'message') messageListeners.add(cb);
      }
      postMessage(msg: { id: number; url: string }) {
        postedMessages.push(msg);
        queueMicrotask(() => {
          for (const listener of messageListeners) {
            listener({
              data: { id: msg.id, ok: true, data: { v: 1, d: [msg.url] } },
            } as MessageEvent);
          }
        });
      }
      terminate() {}
    }

    vi.stubGlobal('Worker', MockWorker);

    const parsed = await fetchAndParseJson<{ v: number; d: string[] }>(
      '/data/search/stars.json',
    );
    expect(postedMessages).toHaveLength(1);
    expect(parsed.v).toBe(1);
    expect(parsed.d[0]).toContain('/data/search/stars.json');

    // Custom fetcher bypasses Worker even when Worker is defined
    const customFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ v: 1, custom: true }),
    }));
    const customParsed = await fetchAndParseJson<{ custom: boolean }>(
      '/data/search/planets.json',
      customFetch as unknown as typeof fetch,
    );
    expect(customParsed.custom).toBe(true);
    expect(postedMessages).toHaveLength(1);

    // Pre-aborted signal rejects immediately
    const controller = new AbortController();
    controller.abort();
    await expect(
      fetchAndParseJson('/data/search/stars.json', fetch, controller.signal),
    ).rejects.toThrow(/aborted/i);
  });
});
