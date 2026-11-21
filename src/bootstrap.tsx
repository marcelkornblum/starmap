import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { App } from './App';
import { useLayerStore } from './stores/useLayerStore';

/**
 * Mounts the React root immediately and triggers asynchronous layer index loading
 * so first paint is never blocked on network latency.
 */
export const bootstrapApp = (rootElement: HTMLElement | null): Root | null => {
  if (!rootElement) {
    return null;
  }

  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  void useLayerStore
    .getState()
    .loadIndex()
    .catch(() => undefined);

  return root;
};
