import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './components/poc/canvas/patchR3F';
import './index.css';
import { App } from './App';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

