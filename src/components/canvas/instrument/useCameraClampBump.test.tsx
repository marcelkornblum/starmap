import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { renderHook, act } from '@testing-library/react';
import { ALL_CANVAS_CLAMP_EDGES, useCameraStore } from '../../../stores/useCameraStore';
import {
  isAtZoomOutCeiling,
  useCameraClampBump,
} from './useCameraClampBump';

describe('isAtZoomOutCeiling', () => {
  it('detects perspective camera at or beyond maxDistance', () => {
    const cam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    const target = new THREE.Vector3(0, 0, 0);
    cam.position.set(0, 0, 100);

    expect(isAtZoomOutCeiling(cam, { target, maxDistance: 100 })).toBe(true);
    expect(isAtZoomOutCeiling(cam, { target, maxDistance: 100.4 })).toBe(true);
    expect(isAtZoomOutCeiling(cam, { target, maxDistance: 120 })).toBe(false);
    expect(isAtZoomOutCeiling(cam, { target, maxDistance: Infinity })).toBe(false);
  });

  it('detects orthographic camera at or below minZoom', () => {
    const ortho = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    ortho.zoom = 0.5;

    expect(isAtZoomOutCeiling(ortho, { minZoom: 0.5 })).toBe(true);
    expect(isAtZoomOutCeiling(ortho, { minZoom: 0.498 })).toBe(true);
    expect(isAtZoomOutCeiling(ortho, { minZoom: 0.2 })).toBe(false);
    expect(isAtZoomOutCeiling(ortho, { minZoom: 0 })).toBe(false);
  });
});

describe('useCameraClampBump', () => {
  beforeEach(() => {
    useCameraStore.getState().reset();
    vi.restoreAllMocks();
  });

  it('streams continuous wheel zoom-out impulses at ceiling without pulsing cooldown drops', () => {
    const domElement = document.createElement('canvas');
    const cam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    cam.position.set(0, 0, 100);
    const controls = { target: new THREE.Vector3(0, 0, 0), maxDistance: 100 };

    const { unmount } = renderHook(() =>
      useCameraClampBump({
        domElement,
        get: () => ({ camera: cam, controls }),
      }),
    );

    // Zoom-in wheel (deltaY < 0) should not trigger a zoom-out bump
    act(() => {
      domElement.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 }));
    });
    expect(useCameraStore.getState().clampBump).toBeNull();

    // First zoom-out wheel tick feeds impulse with seq 1
    act(() => {
      domElement.dispatchEvent(new WheelEvent('wheel', { deltaY: 80 }));
    });
    const first = useCameraStore.getState().clampBump;
    expect(first?.edges).toEqual(ALL_CANVAS_CLAMP_EDGES);
    expect(first?.reason).toBe('zoom-out');
    expect(first?.impulse).toBeCloseTo(0.5, 2);
    expect(first?.seq).toBe(1);

    // Immediate next wheel tick feeds continuous pressure (seq 2)
    act(() => {
      domElement.dispatchEvent(new WheelEvent('wheel', { deltaY: 80 }));
    });
    expect(useCameraStore.getState().clampBump?.seq).toBe(2);

    unmount();
  });

  it('does not trigger when zooming out well below the ceiling', () => {
    const domElement = document.createElement('canvas');
    const cam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    cam.position.set(0, 0, 40);
    const controls = { target: new THREE.Vector3(0, 0, 0), maxDistance: 100 };

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 1;
    });

    const { unmount } = renderHook(() =>
      useCameraClampBump({
        domElement,
        get: () => ({ camera: cam, controls }),
      }),
    );

    act(() => {
      domElement.dispatchEvent(new WheelEvent('wheel', { deltaY: 120 }));
    });
    expect(useCameraStore.getState().clampBump).toBeNull();

    unmount();
  });
});
