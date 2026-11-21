import type { ReferenceBaselinesDataset } from '../types/guideData';
import { assertSchemaVersion } from '../utils/compactDataCodec';
import { COMPACT_SCHEMA_VERSION } from '../utils/compactDataConstants';
import { resolveManifestDataUrl } from './dataManifestRepository';

let cachedBaselines: ReferenceBaselinesDataset | undefined;
let pendingRequest: Promise<ReferenceBaselinesDataset> | undefined;
let repoVersion = 0;
const listeners = new Set<() => void>();

const notifyListeners = (): void => {
  repoVersion++;
  for (const listener of listeners) {
    listener();
  }
};

export const getReferenceBaselinesVersion = (): number => repoVersion;

export const subscribeReferenceBaselines = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getCachedReferenceBaselines = (): ReferenceBaselinesDataset | undefined =>
  cachedBaselines;

export const fetchReferenceBaselines = async (
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<ReferenceBaselinesDataset> => {
  if (cachedBaselines) {
    return cachedBaselines;
  }

  if (!pendingRequest) {
    let onAbort: (() => void) | undefined;
    if (signal) {
      onAbort = () => {
        signal.removeEventListener('abort', onAbort!);
        pendingRequest = undefined;
      };
      signal.addEventListener('abort', onAbort);
    }

    pendingRequest = (async () => {
      try {
        const url = await resolveManifestDataUrl(
          'reference-baselines.json',
          fetchImpl,
          signal,
        );
        const response = signal
          ? await fetchImpl(url, { signal })
          : await fetchImpl(url);
        if (!response.ok) {
          throw new Error(
            `Failed to load reference-baselines.json: ${response.status} ${response.statusText}`,
          );
        }
        const data = (await response.json()) as ReferenceBaselinesDataset;
        assertSchemaVersion(data, COMPACT_SCHEMA_VERSION, 'reference-baselines.json', 'version');
        cachedBaselines = data;
        notifyListeners();
        return data;
      } finally {
        if (signal && onAbort) {
          signal.removeEventListener('abort', onAbort);
        }
      }
    })().catch((err: unknown) => {
      pendingRequest = undefined;
      throw err;
    });
  }

  return pendingRequest;
};

export const seedReferenceBaselines = (data: ReferenceBaselinesDataset): void => {
  cachedBaselines = data;
  pendingRequest = undefined;
  notifyListeners();
};

export const clearReferenceBaselinesCache = (): void => {
  cachedBaselines = undefined;
  pendingRequest = undefined;
  notifyListeners();
};
