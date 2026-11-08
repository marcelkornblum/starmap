import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  downloadFile,
  fetchAllDataSources,
  hasFetchFailures,
  type FetchSummary,
} from './fetch-sources';

describe('fetch-sources', () => {
  const tempDestFile = path.resolve('/tmp', `starmap-test-fetch-${Date.now()}.txt`);
  const tempEpochPath = path.resolve('/tmp', `starmap-test-epoch-${Date.now()}.json`);

  afterEach(() => {
    if (fs.existsSync(tempDestFile)) {
      fs.unlinkSync(tempDestFile);
    }
    if (fs.existsSync(tempEpochPath)) {
      fs.unlinkSync(tempEpochPath);
    }
    vi.restoreAllMocks();
  });

  describe('hasFetchFailures', () => {
    it('returns true when any summary has status error', () => {
      const summaries: FetchSummary[] = [
        { sourceId: 'src-1', name: 'Source 1', status: 'cached', localPath: '/path1', bytes: 100 },
        { sourceId: 'src-2', name: 'Source 2', status: 'error', localPath: '/path2', bytes: 0, message: 'timeout' },
      ];
      expect(hasFetchFailures(summaries)).toBe(true);
    });

    it('returns false when no summaries have status error', () => {
      const summaries: FetchSummary[] = [
        { sourceId: 'src-1', name: 'Source 1', status: 'cached', localPath: '/path1', bytes: 100 },
        { sourceId: 'src-2', name: 'Source 2', status: 'downloaded', localPath: '/path2', bytes: 500 },
      ];
      expect(hasFetchFailures(summaries)).toBe(false);
    });
  });

  describe('downloadFile hardening', () => {
    it('retries failed requests with exponential backoff and succeeds on recovery', async () => {
      let callCount = 0;
      const mockFetch: typeof fetch = vi.fn(async () => {
        callCount++;
        if (callCount < 2) {
          throw new Error('Transient network glitch');
        }
        return new Response('recovered content', { status: 200 });
      });

      const bytes = await downloadFile('https://example.com/data.txt', tempDestFile, {
        fetchImpl: mockFetch,
        maxRetries: 2,
        retryDelayMs: 10,
        timeoutMs: 1000,
      });

      expect(callCount).toBe(2);
      expect(bytes).toBe(Buffer.byteLength('recovered content'));
      expect(fs.readFileSync(tempDestFile, 'utf8')).toBe('recovered content');
    });

    it('enforces request timeout when fetch hangs or signal aborts', async () => {
      const mockFetch: typeof fetch = vi.fn(async (_url, init) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new Error('The operation was aborted due to timeout'));
          });
        });
      });

      await expect(
        downloadFile('https://example.com/hang.txt', tempDestFile, {
          fetchImpl: mockFetch,
          maxRetries: 0,
          timeoutMs: 50,
        }),
      ).rejects.toThrow(/aborted|timeout/i);
    });

    it('throws error after exhausting all retries', async () => {
      let callCount = 0;
      const mockFetch: typeof fetch = vi.fn(async () => {
        callCount++;
        return new Response('Internal Server Error', { status: 500, statusText: 'Server Error' });
      });

      await expect(
        downloadFile('https://example.com/fail.txt', tempDestFile, {
          fetchImpl: mockFetch,
          maxRetries: 2,
          retryDelayMs: 10,
          timeoutMs: 1000,
        }),
      ).rejects.toThrow(/HTTP fetch failed \[500 Server Error\]/);

      expect(callCount).toBe(3);
    });
  });

  describe('fetchAllDataSources', () => {
    it('verifies declarative seeds and records cached summaries without downloading', async () => {
      const mockFetch: typeof fetch = vi.fn().mockRejectedValue(new Error('Network disabled in unit test'));
      const summaries = await fetchAllDataSources(false, {
        fetchImpl: mockFetch,
        timeoutMs: 100,
        maxRetries: 0,
        retryDelayMs: 0,
      });

      const seedSummaries = summaries.filter((s) =>
        s.sourceId.includes('galactic') || s.sourceId.includes('solar-system'),
      );
      expect(seedSummaries.length).toBeGreaterThan(0);
      for (const s of seedSummaries) {
        expect(['cached', 'initialized']).toContain(s.status);
        expect(s.bytes).toBeGreaterThan(0);
      }
    });

    it('refreshes build epoch when refreshEpoch option is true', async () => {
      const mockFetch: typeof fetch = vi.fn().mockRejectedValue(new Error('Network disabled in unit test'));

      await fetchAllDataSources(false, {
        fetchImpl: mockFetch,
        refreshEpoch: true,
        epochFilePath: tempEpochPath,
        timeoutMs: 100,
        maxRetries: 0,
        retryDelayMs: 0,
      });

      expect(fs.existsSync(tempEpochPath)).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(tempEpochPath, 'utf8')) as { generatedAt: string };
      expect(parsed.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
