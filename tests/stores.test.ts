import { describe, it, expect, beforeEach, vi } from 'vitest';
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
    // Current environment (Node polyfill via globalThis.localStorage)
    const storage = resolveSettingsStorage();
    expect(storage).toBeDefined();
    expect(typeof storage.getItem).toBe('function');

    // Environment with window.localStorage
    const mockWindowStorage = { getItem: () => null } as unknown as Storage;
    vi.stubGlobal('window', { localStorage: mockWindowStorage });
    expect(resolveSettingsStorage()).toBe(mockWindowStorage);
    vi.unstubAllGlobals();

    // Environment with neither window.localStorage nor globalThis.localStorage
    const origLocal = globalThis.localStorage;
    // @ts-expect-error intentional environment simulation
    delete globalThis.localStorage;
    expect(resolveSettingsStorage()).toBe(fallbackStorage);
    globalThis.localStorage = origLocal;
  });
});

describe('Stores Index Re-exports', () => {
  it('correctly re-exports settings and UI store symbols from index', async () => {
    const stores = await import('../src/stores');
    expect(stores.useSettingsStore).toBeDefined();
    expect(stores.DEFAULT_SETTINGS).toBeDefined();
    expect(stores.useUIStore).toBeDefined();
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
    expect(state.activePrimaryPanel).toBe('details');
    expect(state.detailsDetent).toBe('peek');
    expect(state.activeDrawer).toBeNull();
    expect(state.isLayerCardOpen).toBe(true);
    expect(state.centeredEntityId).toBeNull();
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

  it('manages primary panel and details detent lifecycle', () => {
    useUIStore.getState().setActivePrimaryPanel('directions');
    expect(useUIStore.getState().activePrimaryPanel).toBe('directions');

    useUIStore.getState().setActivePrimaryPanel(null);
    expect(useUIStore.getState().activePrimaryPanel).toBeNull();

    useUIStore.getState().setActivePrimaryPanel('details');
    expect(useUIStore.getState().activePrimaryPanel).toBe('details');

    useUIStore.getState().setDetailsDetent('full');
    expect(useUIStore.getState().detailsDetent).toBe('full');

    useUIStore.getState().setDetailsDetent('collapsed');
    expect(useUIStore.getState().detailsDetent).toBe('collapsed');
  });

  it('manages active drawer state and toggles drawers', () => {
    useUIStore.getState().setActiveDrawer('bodies');
    expect(useUIStore.getState().activeDrawer).toBe('bodies');

    // Toggle same drawer closes it
    useUIStore.getState().toggleDrawer('bodies');
    expect(useUIStore.getState().activeDrawer).toBeNull();

    // Toggle drawer opens it when closed
    useUIStore.getState().toggleDrawer('search');
    expect(useUIStore.getState().activeDrawer).toBe('search');

    // Toggle different drawer switches directly
    useUIStore.getState().toggleDrawer('filters');
    expect(useUIStore.getState().activeDrawer).toBe('filters');

    useUIStore.getState().setActiveDrawer(null);
    expect(useUIStore.getState().activeDrawer).toBeNull();
  });

  it('manages layer card visibility and centered entity ID', () => {
    useUIStore.getState().setLayerCardOpen(false);
    expect(useUIStore.getState().isLayerCardOpen).toBe(false);

    useUIStore.getState().setLayerCardOpen(true);
    expect(useUIStore.getState().isLayerCardOpen).toBe(true);

    useUIStore.getState().setCenteredEntityId('star-sol');
    expect(useUIStore.getState().centeredEntityId).toBe('star-sol');

    useUIStore.getState().setCenteredEntityId(null);
    expect(useUIStore.getState().centeredEntityId).toBeNull();
  });

  it('resets to initial UI state and does not touch localStorage', () => {
    localStorage.clear();
    useUIStore.getState().setActivePanel('settings');
    useUIStore.getState().setActivePrimaryPanel('directions');
    useUIStore.getState().setDetailsDetent('full');
    useUIStore.getState().setActiveDrawer('bodies');
    useUIStore.getState().setLayerCardOpen(false);
    useUIStore.getState().setCenteredEntityId('star-proxima');

    useUIStore.getState().resetUIState();

    expect(useUIStore.getState()).toMatchObject(INITIAL_UI_STATE);
    expect(localStorage.getItem('starmap-ui')).toBeNull();
  });
});
