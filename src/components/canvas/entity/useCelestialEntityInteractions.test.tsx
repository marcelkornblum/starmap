import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ThreeEvent } from '@react-three/fiber';
import * as prefetchModule from '../../../services/details/prefetchEntitySelection';
import { useCelestialEntityInteractions } from './useCelestialEntityInteractions';
import { createSpatialEntityStore } from './SpatialEntityStore';
import { CelestialOcclusionManager } from '../cartography/celestialOcclusionRegistry';

describe('useCelestialEntityInteractions', () => {
  it('handles click, double click, pointer over and out', () => {
    const store = createSpatialEntityStore();
    const occlusionManager = new CelestialOcclusionManager();
    const onClick = vi.fn();
    const onDoubleClick = vi.fn();
    const onPointerOver = vi.fn();
    const onPointerOut = vi.fn();

    const { result } = renderHook(() =>
      useCelestialEntityInteractions({
        activeState: 'active',
        storeApi: store,
        occlusionManager,
        onClick,
        onDoubleClick,
        onPointerOver,
        onPointerOut,
      }),
    );

    const mockMouseEvent = {} as ThreeEvent<MouseEvent>;
    const mockPointerEvent = {} as ThreeEvent<PointerEvent>;

    act(() => {
      result.current.handleMarkerClick('star-1', mockMouseEvent);
      result.current.handleMarkerDoubleClick('star-1', mockMouseEvent);
      result.current.handleMarkerPointerOver('star-1', mockPointerEvent);
    });

    expect(onClick).toHaveBeenCalledWith('star-1', mockMouseEvent);
    expect(onDoubleClick).toHaveBeenCalledWith('star-1', mockMouseEvent);
    expect(onPointerOver).toHaveBeenCalledWith('star-1', mockPointerEvent);
    expect(store.getState().hoveredId).toBe('star-1');

    act(() => {
      result.current.handleMarkerPointerOut('star-1', mockPointerEvent);
    });

    expect(onPointerOut).toHaveBeenCalledWith('star-1', mockPointerEvent);
    expect(store.getState().hoveredId).toBeNull();
  });

  it('ignores interactions when activeState is passive', () => {
    const store = createSpatialEntityStore();
    const occlusionManager = new CelestialOcclusionManager();
    const onClick = vi.fn();

    const { result } = renderHook(() =>
      useCelestialEntityInteractions({
        activeState: 'passive',
        storeApi: store,
        occlusionManager,
        onClick,
      }),
    );

    const mockMouseEvent = {} as ThreeEvent<MouseEvent>;
    act(() => {
      result.current.handleMarkerClick('star-1', mockMouseEvent);
    });

    expect(onClick).not.toHaveBeenCalled();
  });

  it('schedules hover prefetch with 12ms delay and retains prefetch on click', () => {
    const scheduleSpy = vi.spyOn(prefetchModule, 'scheduleHoverPrefetch');
    const cancelSpy = vi.spyOn(prefetchModule, 'cancelHoverPrefetch');

    const store = createSpatialEntityStore();
    const occlusionManager = new CelestialOcclusionManager();

    const { result } = renderHook(() =>
      useCelestialEntityInteractions({
        activeState: 'active',
        storeApi: store,
        occlusionManager,
      }),
    );

    const mockPointerEvent = {} as ThreeEvent<PointerEvent>;
    const mockMouseEvent = {} as ThreeEvent<MouseEvent>;

    act(() => {
      result.current.handleMarkerPointerOver('sirius', mockPointerEvent);
    });

    expect(scheduleSpy).toHaveBeenCalledWith('sirius', 'sirius', 12);

    cancelSpy.mockClear();
    act(() => {
      result.current.handleMarkerClick('sirius', mockMouseEvent);
    });

    expect(cancelSpy).not.toHaveBeenCalled();
  });
});
