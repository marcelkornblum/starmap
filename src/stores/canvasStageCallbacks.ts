export interface CanvasStageCallbacks {
  readonly onInspect?: (id: string) => void;
  readonly onSelect?: (id: string | null) => void;
  readonly onFocusChange?: (id: string | null) => void;
  readonly onTouchPointerMissed?: () => boolean;
}

const EMPTY_STAGE_CALLBACKS: CanvasStageCallbacks = {};

let currentCallbacks: CanvasStageCallbacks = EMPTY_STAGE_CALLBACKS;
const listeners = new Set<() => void>();

function notifyStageCallbackListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function setStageCallbacks(callbacks: CanvasStageCallbacks): void {
  if (
    currentCallbacks.onInspect === callbacks.onInspect &&
    currentCallbacks.onSelect === callbacks.onSelect &&
    currentCallbacks.onFocusChange === callbacks.onFocusChange &&
    currentCallbacks.onTouchPointerMissed === callbacks.onTouchPointerMissed
  ) {
    return;
  }
  currentCallbacks = callbacks;
  notifyStageCallbackListeners();
}

export function getStageCallbacks(): CanvasStageCallbacks {
  return currentCallbacks;
}

export function subscribeStageCallbacks(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetStageCallbacks(): void {
  setStageCallbacks(EMPTY_STAGE_CALLBACKS);
}
