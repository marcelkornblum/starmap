interface WorkerParseResponse {
  readonly id: number;
  readonly ok: boolean;
  readonly data?: unknown;
  readonly status?: number;
  readonly statusText?: string;
  readonly error?: string;
}

interface PendingWorkerRequest {
  readonly resolve: (value: unknown) => void;
  readonly reject: (reason: unknown) => void;
  readonly cleanupAbort?: () => void;
}

export class JsonHttpError extends Error {
  readonly status: number;
  readonly statusText: string;

  constructor(status: number, statusText: string, message?: string) {
    super(message ?? `HTTP ${status} ${statusText}`.trim());
    this.name = 'JsonHttpError';
    this.status = status;
    this.statusText = statusText;
  }
}

let workerInstance: Worker | null = null;
let workerUnavailable = false;
let nextRequestId = 1;
const pendingRequests = new Map<number, PendingWorkerRequest>();

const toAbsoluteUrl = (url: string): string => {
  if (/^https?:\/\//i.test(url) || typeof globalThis.location === 'undefined') {
    return url;
  }
  try {
    return new URL(url, globalThis.location.href).href;
  } catch {
    return url;
  }
};

const getOrCreateWorker = (): Worker | null => {
  if (workerUnavailable || typeof Worker === 'undefined') {
    return null;
  }
  if (workerInstance) {
    return workerInstance;
  }
  try {
    const worker = new Worker(new URL('./jsonParseWorker.ts', import.meta.url), {
      type: 'module',
    });
    worker.addEventListener('message', (event: MessageEvent<WorkerParseResponse>) => {
      const msg = event.data;
      if (!msg || typeof msg.id !== 'number') return;
      const pending = pendingRequests.get(msg.id);
      if (!pending) return;
      pendingRequests.delete(msg.id);
      pending.cleanupAbort?.();
      if (msg.ok) {
        pending.resolve(msg.data);
      } else if (typeof msg.status === 'number') {
        pending.reject(new JsonHttpError(msg.status, msg.statusText ?? '', msg.error));
      } else {
        pending.reject(new Error(msg.error ?? 'Worker JSON parse failed'));
      }
    });
    worker.addEventListener('error', (event: ErrorEvent) => {
      const error = new Error(event.message || 'JSON parse worker error');
      for (const [id, pending] of pendingRequests.entries()) {
        pendingRequests.delete(id);
        pending.cleanupAbort?.();
        pending.reject(error);
      }
      worker.terminate();
      workerInstance = null;
      workerUnavailable = true;
    });
    workerInstance = worker;
    return worker;
  } catch {
    workerUnavailable = true;
    return null;
  }
};

async function fetchAndParseOnMainThread(
  url: string,
  fetcher: typeof fetch,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = signal ? await fetcher(url, { signal }) : await fetcher(url);
  if (!response.ok) {
    throw new JsonHttpError(response.status, response.statusText ?? '');
  }
  return response.json();
}

/**
 * Fetches and parses a JSON resource in a background module Web Worker when available
 * and using the default global `fetch`, falling back automatically to main-thread
 * `fetch` + `response.json()` in SSR/jsdom or when a custom `fetcher` is injected.
 */
export async function fetchAndParseJson<T = unknown>(
  url: string,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<T> {
  const useMainThread = typeof Worker === 'undefined' || fetcher !== fetch;
  if (useMainThread) {
    return (await fetchAndParseOnMainThread(url, fetcher, signal)) as T;
  }

  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }

  const worker = getOrCreateWorker();
  if (!worker) {
    return (await fetchAndParseOnMainThread(url, fetcher, signal)) as T;
  }

  const requestId = nextRequestId++;
  const absoluteUrl = toAbsoluteUrl(url);

  return new Promise<T>((resolve, reject) => {
    let onAbort: (() => void) | undefined;
    const cleanupAbort = signal
      ? () => {
          if (onAbort) signal.removeEventListener('abort', onAbort);
        }
      : undefined;

    if (signal) {
      onAbort = () => {
        pendingRequests.delete(requestId);
        cleanupAbort?.();
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }

    pendingRequests.set(requestId, {
      resolve: (val) => resolve(val as T),
      reject,
      cleanupAbort,
    });

    worker.postMessage({ id: requestId, url: absoluteUrl });
  });
}

export function resetWorkerJsonParserForTests(): void {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
  workerUnavailable = false;
  pendingRequests.clear();
  nextRequestId = 1;
}
