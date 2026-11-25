import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UITheme = 'dark' | 'light' | 'amoled';
export type ThemePalette = 'prodigy';
export type ProjectionMode = '3d' | 'top-down';

export interface SettingsState {
  theme: UITheme;
  palette: ThemePalette;
  showLabels: boolean;
  showGrid: boolean;
  showOrbits: boolean;
  projection: ProjectionMode;
  enableOrthographicProjection: boolean;
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
  toggleOrthographicProjection: () => void;
  setEnableOrthographicProjection: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  resetSettings: () => void;
}

export type SettingsStore = SettingsState & SettingsActions;

export const DEFAULT_SETTINGS: SettingsState = {
  theme: 'dark',
  palette: 'prodigy',
  showLabels: true,
  showGrid: true,
  showOrbits: true,
  projection: '3d',
  enableOrthographicProjection: false,
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

export function migrateSettingsState(persistedState: unknown, _version: number): SettingsState {
  if (typeof persistedState === 'object' && persistedState !== null) {
    const record = persistedState as Partial<SettingsState>;
    return {
      ...DEFAULT_SETTINGS,
      ...record,
      palette: 'prodigy',
    };
  }
  return { ...DEFAULT_SETTINGS };
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
      toggleOrthographicProjection: () =>
        set((state) => ({ enableOrthographicProjection: !state.enableOrthographicProjection })),
      setEnableOrthographicProjection: (enableOrthographicProjection: boolean) =>
        set({ enableOrthographicProjection }),
      setVolume: (volume: number) => set({ volume: Math.max(0, Math.min(1, volume)) }),
      resetSettings: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: 'starmap-settings',
      version: 1,
      storage: createJSONStorage(resolveSettingsStorage),
      partialize: (state): SettingsState => ({
        theme: state.theme,
        palette: state.palette,
        showLabels: state.showLabels,
        showGrid: state.showGrid,
        showOrbits: state.showOrbits,
        projection: state.projection,
        enableOrthographicProjection: state.enableOrthographicProjection,
        volume: state.volume,
      }),
      migrate: migrateSettingsState,
    },
  ),
);
