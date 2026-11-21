import type {
  GuideExamplesDataset,
  GuideSectionKey,
  ResolvedGuideExampleItem,
} from '../types/guideData';
import { resolveDataUrl } from '../utils/url';

const EMPTY_EXAMPLES: readonly ResolvedGuideExampleItem[] = [];

let cachedExamples: GuideExamplesDataset | undefined;
let pendingRequest: Promise<GuideExamplesDataset> | undefined;
let repoVersion = 0;
const listeners = new Set<() => void>();

const notifyListeners = (): void => {
  repoVersion++;
  for (const listener of listeners) {
    listener();
  }
};

export const getGuideExamplesVersion = (): number => repoVersion;

export const subscribeGuideExamples = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getCachedGuideExamples = (): GuideExamplesDataset | undefined =>
  cachedExamples;

export const getCachedGuideExamplesForEntry = (
  section: GuideSectionKey,
  entryId: string,
): readonly ResolvedGuideExampleItem[] => {
  if (!cachedExamples || !entryId) {
    return EMPTY_EXAMPLES;
  }
  return cachedExamples.sections[section]?.[entryId] ?? EMPTY_EXAMPLES;
};

export const fetchGuideExamples = async (
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<GuideExamplesDataset> => {
  if (cachedExamples) {
    return cachedExamples;
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
        const url = resolveDataUrl('/data/guide-examples.json');
        const response = signal
          ? await fetchImpl(url, { signal })
          : await fetchImpl(url);
        if (!response.ok) {
          throw new Error(
            `Failed to load guide-examples.json: ${response.status} ${response.statusText}`,
          );
        }
        const data = (await response.json()) as GuideExamplesDataset;
        cachedExamples = data;
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

export const seedGuideExamples = (data: GuideExamplesDataset): void => {
  cachedExamples = data;
  pendingRequest = undefined;
  notifyListeners();
};

export const clearGuideExamplesCache = (): void => {
  cachedExamples = undefined;
  pendingRequest = undefined;
  notifyListeners();
};
