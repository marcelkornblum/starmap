import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  downloadFile,
  downloadSourceWithFallback,
  fetchAllDataSources,
  formatFetchError,
  hasFetchFailures,
  type FetchSummary,
} from './fetch-sources';

describe('fetch-sources', () => {
  const tempDestFile = path.resolve('/tmp', `starmap-test-fetch-${Date.now()}.txt`);
  const tempCsvFile = path.resolve('/tmp', `starmap-test-fetch-${Date.now()}.csv`);
  const tempGzFile = path.resolve('/tmp', `starmap-test-fetch-${Date.now()}.dat.gz`);
  const tempEpochPath = path.resolve('/tmp', `starmap-test-epoch-${Date.now()}.json`);

  afterEach(() => {
    for (const file of [tempDestFile, tempCsvFile, tempGzFile, tempEpochPath]) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
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

    it('transparently gunzips remote .csv.gz responses when destination path does not end with .gz', async () => {
      const csvPayload = 'id,hip\n0,Sol\n';
      const compressed = zlib.gzipSync(csvPayload);
      const mockFetch: typeof fetch = vi.fn(async () => new Response(compressed, { status: 200 }));

      const bytes = await downloadFile('https://example.com/catalog/hygdata_v3.csv.gz?download=1', tempCsvFile, {
        fetchImpl: mockFetch,
        maxRetries: 0,
      });

      expect(bytes).toBe(Buffer.byteLength(csvPayload));
      expect(fs.readFileSync(tempCsvFile, 'utf8')).toBe(csvPayload);
    });

    it('preserves compressed bytes when both remote URL and destination path end with .gz', async () => {
      const rawPayload = '00123456 Sol\n';
      const compressed = zlib.gzipSync(rawPayload);
      const mockFetch: typeof fetch = vi.fn(async () => new Response(compressed, { status: 200 }));

      const bytes = await downloadFile('https://example.com/catalog/gaia_dr3_gcns.dat.gz', tempGzFile, {
        fetchImpl: mockFetch,
        maxRetries: 0,
      });

      expect(bytes).toBe(compressed.length);
      expect(fs.readFileSync(tempGzFile)).toEqual(compressed);
    });

    it('rejects Git LFS pointer payloads instead of writing pointer metadata', async () => {
      const lfsPointer = 'version https://git-lfs.github.com/spec/v1\noid sha256:abc123\nsize 1024\n';
      const mockFetch: typeof fetch = vi.fn(async () => new Response(lfsPointer, { status: 200 }));

      await expect(
        downloadFile('https://example.com/data/hyg.csv.gz', tempCsvFile, {
          fetchImpl: mockFetch,
          maxRetries: 0,
        }),
      ).rejects.toThrow(/Git LFS pointer/);
      expect(fs.existsSync(tempCsvFile)).toBe(false);
    });

    it('rejects unexpected HTML responses for non-HTML targets', async () => {
      const htmlBody = '  \n<!DOCTYPE html><html><body>Not found</body></html>';
      const mockFetch: typeof fetch = vi.fn(async () => new Response(htmlBody, { status: 200 }));

      await expect(
        downloadFile('https://example.com/data/catalog.csv', tempCsvFile, {
          fetchImpl: mockFetch,
          maxRetries: 0,
        }),
      ).rejects.toThrow(/Unexpected HTML response/);
      expect(fs.existsSync(tempCsvFile)).toBe(false);
    });
  });

  describe('formatFetchError', () => {
    it('appends nested Error cause code and message when present', () => {
      const rootCause = Object.assign(new Error('getaddrinfo ENOTFOUND example.org'), {
        code: 'ENOTFOUND',
      });
      const err = new Error('fetch failed', { cause: rootCause });

      expect(formatFetchError(err)).toBe('fetch failed (getaddrinfo ENOTFOUND example.org)');
      expect(formatFetchError(new Error('plain failure'))).toBe('plain failure');
      expect(formatFetchError('raw string error')).toBe('raw string error');
    });
  });

  describe('downloadSourceWithFallback', () => {
    it('falls back to fallbackUrl when primary remoteUrl fails', async () => {
      const mockFetch: typeof fetch = vi.fn(async (input) => {
        const target = typeof input === 'string' ? input : input.toString();
        if (target.includes('primary.example')) {
          throw new Error('fetch failed', {
            cause: Object.assign(new Error('getaddrinfo ENOTFOUND primary.example'), {
              code: 'ENOTFOUND',
            }),
          });
        }
        return new Response('id,name\n1,Sirius\n', { status: 200 });
      });

      const bytes = await downloadSourceWithFallback(
        {
          remoteUrl: 'https://primary.example/catalog.csv',
          fallbackUrl: 'https://mirror.example/catalog.csv',
        },
        tempCsvFile,
        { fetchImpl: mockFetch, maxRetries: 0 },
      );

      expect(bytes).toBe(Buffer.byteLength('id,name\n1,Sirius\n'));
      expect(fs.readFileSync(tempCsvFile, 'utf8')).toBe('id,name\n1,Sirius\n');
    });

    it('combines primary and fallback errors when both fail', async () => {
      const mockFetch: typeof fetch = vi.fn(async (input) => {
        const target = typeof input === 'string' ? input : input.toString();
        if (target.includes('primary.example')) {
          throw new Error('fetch failed', {
            cause: Object.assign(new Error('getaddrinfo ENOTFOUND primary.example'), {
              code: 'ENOTFOUND',
            }),
          });
        }
        return new Response('Unavailable', { status: 503, statusText: 'Service Unavailable' });
      });

      await expect(
        downloadSourceWithFallback(
          {
            remoteUrl: 'https://primary.example/catalog.csv',
            fallbackUrl: 'https://mirror.example/catalog.csv',
          },
          tempCsvFile,
          { fetchImpl: mockFetch, maxRetries: 0 },
        ),
      ).rejects.toThrow(/Primary \(fetch failed \(getaddrinfo ENOTFOUND primary\.example\)\); Fallback \(HTTP fetch failed \[503 Service Unavailable\]/);
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
        s.sourceId === 'galactic-structures-curated' ||
        s.sourceId === 'solar-system-horizons-primary',
      );
      expect(seedSummaries).toHaveLength(2);
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
