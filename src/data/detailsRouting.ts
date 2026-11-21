import { assertSchemaVersion } from '../utils/compactDataCodec';
import { COMPACT_SCHEMA_VERSION } from '../utils/compactDataConstants';
import type { DetailsRoutingIndex } from '../utils/compactDataTypes';
import { hasManifestDataPath, resolveManifestDataUrl } from './dataManifestRepository';
import { fetchAndParseJson, JsonHttpError } from './workerJsonParser';

const ROUTING_LOGICAL_PATH = 'details/routing.json';

let cachedRouting: DetailsRoutingIndex | null = null;
let pendingRouting: Promise<DetailsRoutingIndex | null> | undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Clears the cached `details/routing.json` index.
 */
export const clearDetailsRoutingCache = (): void => {
  cachedRouting = null;
  pendingRouting = undefined;
};

/**
 * Lazily fetches, validates, and caches `public/data/details/routing.json` via the Web Worker parser.
 */
export const fetchDetailsRoutingTable = async (
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<DetailsRoutingIndex | null> => {
  if (cachedRouting) {
    return cachedRouting;
  }
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }

  let currentPending = pendingRouting;
  if (!currentPending) {
    let onAbort: (() => void) | undefined;
    if (signal) {
      const handleAbort = () => {
        signal.removeEventListener('abort', handleAbort);
        if (pendingRouting === currentPending) {
          pendingRouting = undefined;
        }
      };
      onAbort = handleAbort;
      signal.addEventListener('abort', handleAbort);
    }

    currentPending = (async (): Promise<DetailsRoutingIndex | null> => {
      try {
        const url = await resolveManifestDataUrl(ROUTING_LOGICAL_PATH, fetchImpl, signal);
        if (hasManifestDataPath(ROUTING_LOGICAL_PATH) === false) {
          return null;
        }
        let payload: unknown;
        try {
          payload = await fetchAndParseJson(url, fetchImpl, signal);
        } catch (err: unknown) {
          if (err instanceof JsonHttpError) {
            throw new Error(
              `Failed to load details routing index: ${err.status} ${err.statusText}`,
            );
          }
          throw err;
        }
        assertSchemaVersion(payload, COMPACT_SCHEMA_VERSION, 'details routing index');
        if (
          !isRecord(payload) ||
          !Array.isArray(payload.k) ||
          !isRecord(payload.s) ||
          !isRecord(payload.d)
        ) {
          throw new Error('Invalid details routing index envelope');
        }
        const routing: DetailsRoutingIndex = {
          v: COMPACT_SCHEMA_VERSION,
          k: payload.k as string[],
          s: payload.s as Record<string, number>,
          d: payload.d as Record<string, number>,
        };
        cachedRouting = routing;
        return routing;
      } finally {
        if (pendingRouting === currentPending) {
          pendingRouting = undefined;
        }
        if (signal && onAbort) {
          signal.removeEventListener('abort', onAbort);
        }
      }
    })();

    pendingRouting = currentPending;
  }

  return currentPending.catch((err: unknown) => {
    if (err instanceof Error && err.name === 'AbortError' && !signal?.aborted) {
      return fetchDetailsRoutingTable(fetchImpl, signal);
    }
    throw err;
  });
};
