interface WorkerParseRequest {
  readonly id: number;
  readonly url: string;
}

interface WorkerParseResponse {
  readonly id: number;
  readonly ok: boolean;
  readonly data?: unknown;
  readonly status?: number;
  readonly statusText?: string;
  readonly error?: string;
}

interface ModuleWorkerGlobal {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<WorkerParseRequest>) => void,
  ) => void;
  postMessage: (message: WorkerParseResponse) => void;
}

const workerScope = globalThis as unknown as ModuleWorkerGlobal;

workerScope.addEventListener('message', async (event: MessageEvent<WorkerParseRequest>) => {
  const { id, url } = event.data;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      workerScope.postMessage({
        id,
        ok: false,
        status: response.status,
        statusText: response.statusText,
        error: `HTTP ${response.status} ${response.statusText}`.trim(),
      });
      return;
    }
    const data: unknown = await response.json();
    workerScope.postMessage({ id, ok: true, data });
  } catch (err: unknown) {
    workerScope.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
