import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './components/canvas/viewport/patchR3F';
import './index.css';
import { App } from './App';
import { useLayerStore } from './stores';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  // Bootstrap the layer index before the router resolves `?layer=` / `?select=layer:` URLs.
  void useLayerStore
    .getState()
    .loadIndex()
    .then(() => {
      root.render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
    });
}

