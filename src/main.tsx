import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './components/canvas/viewport/patchR3F';
import './index.css';
import { App } from './App';
import { useLayerStore } from './stores';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  let rendered = false;

  const renderApp = (): void => {
    if (rendered) return;
    rendered = true;
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  };

  // Bootstrap layer index before router resolution, capped at a 1500ms timeout
  // to guarantee first paint is never blocked indefinitely on slow/stalled networks.
  const timeoutPromise = new Promise<void>((resolve) => {
    setTimeout(resolve, 1500);
  });

  void Promise.race([
    useLayerStore.getState().loadIndex(),
    timeoutPromise,
  ]).finally(() => {
    renderApp();
  });
}

