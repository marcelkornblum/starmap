// Setup global test environment polyfills
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('THREE.Clock: This module has been deprecated')) {
    return;
  }
  originalWarn(...args);
};

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@tanstack/react-router');
  return {
    ...actual,
    useParams: vi.fn(() => ({})),
    useSearch: vi.fn(() => ({})),
  };
});

const memoryStore = new Map<string, string>();

const mockLocalStorage: Storage = {
  getItem: (key: string): string | null => memoryStore.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    memoryStore.set(key, String(value));
  },
  removeItem: (key: string): void => {
    memoryStore.delete(key);
  },
  clear: (): void => {
    memoryStore.clear();
  },
  key: (index: number): string | null => Array.from(memoryStore.keys())[index] ?? null,
  get length(): number {
    return memoryStore.size;
  },
};

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  });
}
