// Setup global test environment polyfills
import { vi } from 'vitest';
import '../src/components/canvas/viewport/patchR3F';

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
