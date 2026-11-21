import { assertSchemaVersion } from '../utils/compactDataCodec';
import { COMPACT_SCHEMA_VERSION } from '../utils/compactDataConstants';
import type { ShardedBucketEnvelope } from '../utils/compactDataTypes';
import type { BoundedLruCache } from '../utils/lruCache';
import { hasManifestDataPath, resolveManifestDataUrl } from './dataManifestRepository';
import { fetchAndParseJson, JsonHttpError } from './workerJsonParser';

export interface LoadShardedEnvelopeParams<T> {
  readonly cacheKey: string;
  readonly logicalPath: string;
  readonly label: string;
  readonly pendingCache: BoundedLruCache<string, Promise<Record<string, T>>>;
  readonly resolvedCache: BoundedLruCache<string, Record<string, T>>;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
  readonly onLoaded?: () => void;
}

/**
 * Fetches, parses (via Web Worker when available), validates, and caches a
 * `ShardedBucketEnvelope<T>` dictionary shard with request deduplication,
 * manifest absence short-circuiting, and shared-abort retry handling.
 */
export const loadShardedEnvelopeData = async <T>(
  params: LoadShardedEnvelopeParams<T>,
): Promise<Record<string, T>> => {
  const {
    cacheKey,
    logicalPath,
    label,
    pendingCache,
    resolvedCache,
    fetchImpl = fetch,
    signal,
    onLoaded,
  } = params;

  const resolved = resolvedCache.get(cacheKey);
  if (resolved) {
    return resolved;
  }
  if (hasManifestDataPath(logicalPath) === false) {
    const empty: Record<string, T> = {};
    resolvedCache.set(cacheKey, empty);
    return empty;
  }

  let pending = pendingCache.get(cacheKey);
  if (!pending) {
    let onAbort: (() => void) | undefined;
    if (signal) {
      onAbort = () => {
        signal.removeEventListener('abort', onAbort!);
        if (pendingCache.get(cacheKey) === pending) {
          pendingCache.delete(cacheKey);
        }
      };
      signal.addEventListener('abort', onAbort);
    }

    pending = (async () => {
      try {
        const url = await resolveManifestDataUrl(logicalPath, fetchImpl, signal);
        if (hasManifestDataPath(logicalPath) === false) {
          const empty: Record<string, T> = {};
          resolvedCache.set(cacheKey, empty);
          return empty;
        }
        let envelope: ShardedBucketEnvelope<T>;
        try {
          envelope = await fetchAndParseJson<ShardedBucketEnvelope<T>>(url, fetchImpl, signal);
        } catch (err: unknown) {
          if (err instanceof JsonHttpError) {
            throw new Error(`Failed to load ${label}: ${err.status} ${err.statusText}`);
          }
          throw err;
        }
        assertSchemaVersion(envelope, COMPACT_SCHEMA_VERSION, label);
        const data = envelope.d ?? {};
        resolvedCache.set(cacheKey, data);
        onLoaded?.();
        return data;
      } finally {
        if (pendingCache.get(cacheKey) === pending) {
          pendingCache.delete(cacheKey);
        }
        if (signal && onAbort) {
          signal.removeEventListener('abort', onAbort);
        }
      }
    })().catch((err: unknown) => {
      if (pendingCache.get(cacheKey) === pending) {
        pendingCache.delete(cacheKey);
      }
      throw err;
    });

    pendingCache.set(cacheKey, pending);
  }

  return pending.catch((err: unknown) => {
    if (err instanceof Error && err.name === 'AbortError' && !signal?.aborted) {
      return loadShardedEnvelopeData(params);
    }
    throw err;
  });
};
