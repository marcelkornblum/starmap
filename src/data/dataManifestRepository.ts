import { assertSchemaVersion } from '../utils/compactDataCodec';
import { COMPACT_SCHEMA_VERSION } from '../utils/compactDataConstants';
import { resolveDataUrl } from '../utils/url';

export interface DataManifest {
  readonly v: number;
  readonly generatedAt: string;
  readonly files: Readonly<Record<string, string>>;
}

let cachedManifest: DataManifest | undefined;
let pendingManifest: Promise<DataManifest | null> | undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeLogicalPath = (logicalPath: string): string =>
  logicalPath
    .replace(/^\/+/, '')
    .replace(/^data\//, '');

export const getCachedDataManifest = (): DataManifest | undefined => cachedManifest;

export const seedDataManifest = (manifest: DataManifest): void => {
  cachedManifest = manifest;
  pendingManifest = undefined;
};

export const clearDataManifestCache = (): void => {
  cachedManifest = undefined;
  pendingManifest = undefined;
};

/**
 * Fetches and validates `/data/manifest.json` once per session.
 * Returns `null` if the manifest returns HTTP non-OK (e.g. isolated test environments).
 * Throws an explicit error if the manifest is returned with an invalid schema version.
 */
export const fetchDataManifest = async (
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<DataManifest | null> => {
  if (cachedManifest) {
    return cachedManifest;
  }

  if (!pendingManifest) {
    let onAbort: (() => void) | undefined;
    if (signal) {
      onAbort = () => {
        signal.removeEventListener('abort', onAbort!);
        pendingManifest = undefined;
      };
      signal.addEventListener('abort', onAbort);
    }

    pendingManifest = (async () => {
      try {
        const url = resolveDataUrl('/data/manifest.json');
        const response = signal
          ? await fetchImpl(url, { signal })
          : await fetchImpl(url);
        if (!response.ok) {
          return null;
        }
        const payload: unknown = await response.json();
        assertSchemaVersion(payload, COMPACT_SCHEMA_VERSION, 'data manifest');
        if (!isRecord(payload) || !isRecord(payload.files)) {
          throw new Error('Invalid data manifest envelope: missing "files" map');
        }
        const manifest: DataManifest = {
          v: COMPACT_SCHEMA_VERSION,
          generatedAt: typeof payload.generatedAt === 'string' ? payload.generatedAt : '',
          files: payload.files as Record<string, string>,
        };
        cachedManifest = manifest;
        return manifest;
      } finally {
        pendingManifest = undefined;
        if (signal && onAbort) {
          signal.removeEventListener('abort', onAbort);
        }
      }
    })();
  }

  return pendingManifest;
};

/**
 * Resolves a logical `/data/<logicalPath>` path to its content-hashed filename via
 * `manifest.json` when available, falling back cleanly to the unhashed path when
 * custom mock fetchers or manifest-free unit tests are running.
 */
export const resolveManifestDataUrl = async (
  logicalPath: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<string> => {
  const cleanLogical = normalizeLogicalPath(logicalPath);
  if (cachedManifest) {
    const mapped = cachedManifest.files[cleanLogical];
    return resolveDataUrl(`/data/${mapped ?? cleanLogical}`);
  }

  if (fetchImpl !== fetch) {
    return resolveDataUrl(`/data/${cleanLogical}`);
  }

  let manifest: DataManifest | null = null;
  try {
    manifest = await fetchDataManifest(fetchImpl, signal);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    manifest = null;
  }

  const mapped = manifest?.files[cleanLogical];
  return resolveDataUrl(`/data/${mapped ?? cleanLogical}`);
};
