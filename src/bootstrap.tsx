import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { App } from './App';
import { fetchDataManifest } from './data/dataManifestRepository';
import { useLayerStore } from './stores/useLayerStore';

/**
 * Mounts the React root immediately and triggers asynchronous manifest + layer index loading
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

  void fetchDataManifest().catch(() => undefined);
  void useLayerStore
    .getState()
    .loadIndex()
    .catch(() => undefined);

  return root;
};
