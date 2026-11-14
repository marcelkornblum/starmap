import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore, INITIAL_UI_STATE } from './useUIStore';
import * as storesIndex from './index';

describe('useUIStore (Ephemeral)', () => {
  beforeEach(() => {
    useUIStore.getState().resetUI();
  });

  it('initializes with default ephemeral state', () => {
    const state = useUIStore.getState();
    expect(state.isAudioPlaying).toBe(false);
    expect(state.activePanel).toBeNull();
    expect(state.hoveredNodeId).toBeNull();
    expect(state.isCameraTransitioning).toBe(false);
    expect(state.activePrimaryPanel).toBe('details');
    expect(state.detailsDetent).toBe('peek');
    expect(state.activeDrawer).toBeNull();
    expect(state.isLayerCardOpen).toBe(true);
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

  it('tracks hovered nodes', () => {
    useUIStore.getState().setHoveredNodeId('star-sol');
    expect(useUIStore.getState().hoveredNodeId).toBe('star-sol');
  });

  it('updates camera transition state', () => {
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

  it('manages layer card visibility', () => {
    useUIStore.getState().setLayerCardOpen(false);
    expect(useUIStore.getState().isLayerCardOpen).toBe(false);

    useUIStore.getState().setLayerCardOpen(true);
    expect(useUIStore.getState().isLayerCardOpen).toBe(true);
  });

  it('resets to initial UI state and does not touch localStorage', () => {
    localStorage.clear();
    useUIStore.getState().setActivePanel('settings');
    useUIStore.getState().setActivePrimaryPanel('directions');
    useUIStore.getState().setDetailsDetent('full');
    useUIStore.getState().setActiveDrawer('bodies');
    useUIStore.getState().setLayerCardOpen(false);

    useUIStore.getState().resetUI();

    expect(useUIStore.getState()).toMatchObject(INITIAL_UI_STATE);
    expect(localStorage.getItem('starmap-ui')).toBeNull();
  });

  it('is correctly re-exported from index with operational state mutation', () => {
    storesIndex.useUIStore.getState().setActivePanel('filters');
    expect(storesIndex.useUIStore.getState().activePanel).toBe('filters');
  });
});
