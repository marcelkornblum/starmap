import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UITheme = 'dark' | 'light' | 'amoled';
export type ThemePalette = 'kepler' | 'cygnus' | 'carbon' | 'obsidian';
export type ProjectionMode = '3d' | 'top-down';

export interface SettingsState {
  theme: UITheme;
  palette: ThemePalette;
  showLabels: boolean;
  showGrid: boolean;
  showOrbits: boolean;
  projection: ProjectionMode;
  volume: number;
}

export interface SettingsActions {
  setTheme: (theme: UITheme) => void;
  setPalette: (palette: ThemePalette) => void;
  toggleLabels: () => void;
  setShowLabels: (show: boolean) => void;
  toggleGrid: () => void;
  setShowGrid: (show: boolean) => void;
  toggleOrbits: () => void;
  setShowOrbits: (show: boolean) => void;
  setProjection: (projection: ProjectionMode) => void;
  setVolume: (volume: number) => void;
  resetSettings: () => void;
}

export type SettingsStore = SettingsState & SettingsActions;

export const DEFAULT_SETTINGS: SettingsState = {
  theme: 'dark',
  palette: 'carbon',
  showLabels: true,
  showGrid: true,
  showOrbits: true,
  projection: '3d',
  volume: 0.8,
};

// Fallback in-memory storage for non-browser/SSR environments
const memoryStore = new Map<string, string>();
export const fallbackStorage: Storage = {
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

export function resolveSettingsStorage(): Storage {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (
    typeof globalThis !== 'undefined' &&
    'localStorage' in globalThis &&
    Boolean(globalThis.localStorage)
  ) {
    return globalThis.localStorage as Storage;
  }
  return fallbackStorage;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setTheme: (theme: UITheme) => set({ theme }),
      setPalette: (palette: ThemePalette) => set({ palette }),
      toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
      setShowLabels: (showLabels: boolean) => set({ showLabels }),
      toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
      setShowGrid: (showGrid: boolean) => set({ showGrid }),
      toggleOrbits: () => set((state) => ({ showOrbits: !state.showOrbits })),
      setShowOrbits: (showOrbits: boolean) => set({ showOrbits }),
      setProjection: (projection: ProjectionMode) => set({ projection }),
      setVolume: (volume: number) => set({ volume: Math.max(0, Math.min(1, volume)) }),
      resetSettings: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: 'starmap-settings',
      storage: createJSONStorage(resolveSettingsStorage),
    },
  ),
);
