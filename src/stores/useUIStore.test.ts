import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUIStore, INITIAL_UI_STATE } from './useUIStore';
import type { ViewportSafeRect } from '../utils/viewportSafeRect';

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
    expect(state.viewportSafeRect).toBeNull();
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

  it('updates viewportSafeRect and deduplicates sub-pixel updates', () => {
    const listener = vi.fn();
    const unsubscribe = useUIStore.subscribe(listener);

    const rect: ViewportSafeRect = {
      top: 0,
      right: 320,
      bottom: 56,
      left: 385,
      width: 735,
      height: 844,
      bypass: false,
    };

    useUIStore.getState().setViewportSafeRect(rect);
    expect(useUIStore.getState().viewportSafeRect).toEqual(rect);
    expect(listener).toHaveBeenCalledTimes(1);

    // Sub-pixel jitter within 1px epsilon must not notify subscribers
    useUIStore.getState().setViewportSafeRect({ ...rect, left: 385.5, width: 734.5 });
    expect(listener).toHaveBeenCalledTimes(1);

    // Meaningful change > 1px must notify subscribers
    const updatedRect: ViewportSafeRect = { ...rect, left: 400, width: 720 };
    useUIStore.getState().setViewportSafeRect(updatedRect);
    expect(useUIStore.getState().viewportSafeRect).toEqual(updatedRect);
    expect(listener).toHaveBeenCalledTimes(2);

    // Clearing to null notifies, and setting null again is deduplicated
    useUIStore.getState().setViewportSafeRect(null);
    expect(useUIStore.getState().viewportSafeRect).toBeNull();
    expect(listener).toHaveBeenCalledTimes(3);

    useUIStore.getState().setViewportSafeRect(null);
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
  });

  it('resets to initial UI state and does not touch localStorage', () => {
    localStorage.clear();
    useUIStore.getState().setActivePanel('settings');
    useUIStore.getState().setActivePrimaryPanel('directions');
    useUIStore.getState().setDetailsDetent('full');
    useUIStore.getState().setActiveDrawer('bodies');
    useUIStore.getState().setLayerCardOpen(false);
    useUIStore.getState().setViewportSafeRect({
      top: 0,
      right: 0,
      bottom: 56,
      left: 385,
      width: 1055,
      height: 844,
      bypass: false,
    });

    useUIStore.getState().resetUI();

    expect(useUIStore.getState()).toMatchObject(INITIAL_UI_STATE);
    expect(useUIStore.getState().viewportSafeRect).toBeNull();
    expect(localStorage.getItem('starmap-ui')).toBeNull();
  });
});
