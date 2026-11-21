import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useSettingsStore,
  DEFAULT_SETTINGS,
  fallbackStorage,
  resolveSettingsStorage,
} from './useSettingsStore';

describe('useSettingsStore (Persistent)', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.getState().resetSettings();
  });

  it('initializes with default settings', () => {
    const state = useSettingsStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.palette).toBe('carbon');
    expect(state.showLabels).toBe(true);
    expect(state.showGrid).toBe(true);
    expect(state.showOrbits).toBe(true);
    expect(state.projection).toBe('3d');
    expect(state.enableOrthographicProjection).toBe(false);
    expect(state.volume).toBe(0.8);
  });

  it('toggles and sets enableOrthographicProjection', () => {
    expect(useSettingsStore.getState().enableOrthographicProjection).toBe(false);

    useSettingsStore.getState().toggleOrthographicProjection();
    expect(useSettingsStore.getState().enableOrthographicProjection).toBe(true);

    useSettingsStore.getState().setEnableOrthographicProjection(false);
    expect(useSettingsStore.getState().enableOrthographicProjection).toBe(false);

    useSettingsStore.getState().setEnableOrthographicProjection(true);
    expect(useSettingsStore.getState().enableOrthographicProjection).toBe(true);
  });

  it('updates theme and projection', () => {
    useSettingsStore.getState().setTheme('light');
    expect(useSettingsStore.getState().theme).toBe('light');

    useSettingsStore.getState().setProjection('top-down');
    expect(useSettingsStore.getState().projection).toBe('top-down');
  });

  it('toggles and explicitly sets boolean visual options', () => {
    useSettingsStore.getState().toggleLabels();
    expect(useSettingsStore.getState().showLabels).toBe(false);

    useSettingsStore.getState().setShowLabels(true);
    expect(useSettingsStore.getState().showLabels).toBe(true);

    useSettingsStore.getState().toggleGrid();
    expect(useSettingsStore.getState().showGrid).toBe(false);

    useSettingsStore.getState().setShowGrid(true);
    expect(useSettingsStore.getState().showGrid).toBe(true);

    useSettingsStore.getState().toggleOrbits();
    expect(useSettingsStore.getState().showOrbits).toBe(false);

    useSettingsStore.getState().setShowOrbits(true);
    expect(useSettingsStore.getState().showOrbits).toBe(true);
  });

  it('clamps volume between 0 and 1', () => {
    useSettingsStore.getState().setVolume(1.5);
    expect(useSettingsStore.getState().volume).toBe(1);

    useSettingsStore.getState().setVolume(-0.2);
    expect(useSettingsStore.getState().volume).toBe(0);

    useSettingsStore.getState().setVolume(0.45);
    expect(useSettingsStore.getState().volume).toBe(0.45);
  });

  it('resets settings to defaults', () => {
    useSettingsStore.getState().setTheme('amoled');
    useSettingsStore.getState().setShowLabels(false);
    useSettingsStore.getState().resetSettings();

    expect(useSettingsStore.getState().theme).toBe(DEFAULT_SETTINGS.theme);
    expect(useSettingsStore.getState().showLabels).toBe(DEFAULT_SETTINGS.showLabels);
  });

  it('persists changes to localStorage under starmap-settings', () => {
    useSettingsStore.getState().setTheme('amoled');
    useSettingsStore.getState().setShowLabels(false);

    const saved = localStorage.getItem('starmap-settings');
    expect(saved).not.toBeNull();

    const parsed = JSON.parse(saved as string);
    expect(parsed.state.theme).toBe('amoled');
    expect(parsed.state.showLabels).toBe(false);
  });

  it('supports fallbackStorage memory implementation', () => {
    fallbackStorage.setItem('test-key', 'test-value');
    expect(fallbackStorage.getItem('test-key')).toBe('test-value');
    expect(fallbackStorage.length).toBe(1);
    expect(fallbackStorage.key(0)).toBe('test-key');
    expect(fallbackStorage.key(-1)).toBeNull();
    expect(fallbackStorage.key(99)).toBeNull();

    fallbackStorage.removeItem('test-key');
    expect(fallbackStorage.getItem('test-key')).toBeNull();
    expect(fallbackStorage.length).toBe(0);

    fallbackStorage.setItem('key-a', 'val-a');
    fallbackStorage.setItem('key-b', 'val-b');
    fallbackStorage.clear();
    expect(fallbackStorage.length).toBe(0);
  });

  it('resolves storage gracefully across runtime environments', () => {
    const storage = resolveSettingsStorage();
    expect(storage).toBeDefined();
    expect(typeof storage.getItem).toBe('function');

    const mockWindowStorage = { getItem: () => null } as unknown as Storage;
    vi.stubGlobal('window', { localStorage: mockWindowStorage });
    expect(resolveSettingsStorage()).toBe(mockWindowStorage);
    vi.unstubAllGlobals();

    const origLocal = globalThis.localStorage;
    // @ts-expect-error intentional environment simulation
    delete globalThis.localStorage;
    expect(resolveSettingsStorage()).toBe(fallbackStorage);
    globalThis.localStorage = origLocal;
  });
});
