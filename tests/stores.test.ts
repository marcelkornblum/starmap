import { describe, it, expect, beforeEach } from 'vitest';
import {
  useSettingsStore,
  DEFAULT_SETTINGS,
  fallbackStorage,
  resolveSettingsStorage,
} from '../src/stores/useSettingsStore';
import { useUIStore, INITIAL_UI_STATE } from '../src/stores/useUIStore';

describe('useSettingsStore (Persistent)', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.getState().resetSettings();
  });

  it('initializes with default settings', () => {
    const state = useSettingsStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.showLabels).toBe(true);
    expect(state.showGrid).toBe(true);
    expect(state.showOrbits).toBe(true);
    expect(state.projection).toBe('3d');
    expect(state.volume).toBe(0.8);
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
  });
});

describe('useUIStore (Ephemeral)', () => {
  beforeEach(() => {
    useUIStore.getState().resetUI();
  });

  it('initializes with default ephemeral state', () => {
    const state = useUIStore.getState();
    expect(state.isAudioPlaying).toBe(false);
    expect(state.activePanel).toBeNull();
    expect(state.hoveredNodeId).toBeNull();
    expect(state.selectedNodeId).toBeNull();
    expect(state.searchQuery).toBe('');
    expect(state.isCameraTransitioning).toBe(false);
  });

  it('handles audio toggle and explicit setter', () => {
    useUIStore.getState().toggleAudio();
    expect(useUIStore.getState().isAudioPlaying).toBe(true);

    useUIStore.getState().setAudioPlaying(false);
    expect(useUIStore.getState().isAudioPlaying).toBe(false);
  });

  it('manages active panel selection', () => {
    useUIStore.getState().setActivePanel('filters');
    expect(useUIStore.getState().activePanel).toBe('filters');

    useUIStore.getState().setActivePanel(null);
    expect(useUIStore.getState().activePanel).toBeNull();
  });

  it('tracks hovered and selected nodes', () => {
    useUIStore.getState().setHoveredNodeId('star-sol');
    expect(useUIStore.getState().hoveredNodeId).toBe('star-sol');

    useUIStore.getState().setSelectedNodeId('planet-earth');
    expect(useUIStore.getState().selectedNodeId).toBe('planet-earth');
  });

  it('updates search query and camera transition state', () => {
    useUIStore.getState().setSearchQuery('Sirius');
    expect(useUIStore.getState().searchQuery).toBe('Sirius');

    useUIStore.getState().setCameraTransitioning(true);
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);
  });

  it('resets to initial UI state and does not touch localStorage', () => {
    localStorage.clear();
    useUIStore.getState().setActivePanel('settings');
    useUIStore.getState().resetUI();

    expect(useUIStore.getState()).toMatchObject(INITIAL_UI_STATE);
    expect(localStorage.getItem('starmap-ui')).toBeNull();
  });
});
