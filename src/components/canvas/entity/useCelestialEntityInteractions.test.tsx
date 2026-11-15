import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ThreeEvent } from '@react-three/fiber';
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
});
