import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, act } from '@testing-library/react';
import * as THREE from 'three';
import { SystemCameraController } from './SystemCameraController';
import {
  clearPendingCrossScaleArrival,
  computeCrossScaleArrivalEntryPosition,
  hasPendingCrossScaleArrival,
  setPendingCrossScaleArrival,
} from '../instrument/crossScaleArrivalState';
import {
  getCrossScaleInstrumentFade,
  resetCrossScaleInstrumentFade,
} from '../instrument/crossScaleFadeState';
import { computeCrossScaleArrivalFade } from '../../../utils/referenceFrameOrientation';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useUIStore } from '../../../stores/useUIStore';

let mockCamera: THREE.PerspectiveCamera;
let mockControls: {
  target: THREE.Vector3;
  enabled: boolean;
  update: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  listeners: Record<string, Array<() => void>>;
};
const mockInvalidate = vi.fn();
const frameCallbacks: Array<(state: unknown, delta: number) => void> = [];

function setMockReducedMotion(reduced: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reduced && query === '(prefers-reduced-motion: reduce)',
      media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })),
  });
}

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useFrame: (cb: (state: unknown, delta: number) => void) => { frameCallbacks.push(cb); },
    useThree: (selector?: (s: unknown) => unknown) => {
      const state = { camera: mockCamera, controls: mockControls, size: { width: 1920, height: 1080 }, invalidate: mockInvalidate };
      return selector ? selector(state) : state;
    },
  };
});

function advanceTransitionFrames(stepMs: number[], nowSpy: ReturnType<typeof vi.spyOn>) {
  for (const t of stepMs) {
    nowSpy.mockReturnValue(t);
    for (const cb of [...frameCallbacks]) {
      cb({ camera: mockCamera, controls: mockControls, invalidate: mockInvalidate }, 0.016);
    }
  }
}

describe('SystemCameraController Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    frameCallbacks.length = 0;
    setMockReducedMotion(false);
    clearPendingCrossScaleArrival();
    resetCrossScaleInstrumentFade();
    useCameraStore.getState().reset();
    useUIStore.getState().resetUI();
    mockCamera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    mockCamera.position.set(0, 0, 0);
    mockCamera.up.set(0, 1, 0);

    const listeners: Record<string, Array<() => void>> = {};
    mockControls = {
      target: new THREE.Vector3(0, 0, 0),
      enabled: true,
      listeners,
      update: vi.fn(),
      addEventListener: vi.fn((type: string, cb: () => void) => {
        (listeners[type] ??= []).push(cb);
      }),
      removeEventListener: vi.fn((type: string, cb: () => void) => {
        listeners[type] = (listeners[type] ?? []).filter((fn) => fn !== cb);
      }),
    };
    vi.spyOn(mockControls.target, 'set');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearPendingCrossScaleArrival();
    resetCrossScaleInstrumentFade();
    setMockReducedMotion(false);
  });

  it('updates camera position, up vector, controls target, and camera store synchronously on mount', () => {
    render(
      createElement(SystemCameraController, {
        position: [10, 20, 30],
        target: [1, 2, 3],
        up: [0, 0, 1],
      }),
    );

    expect(mockCamera.position.x).toBe(10);
    expect(mockCamera.position.y).toBe(20);
    expect(mockCamera.position.z).toBe(30);
    expect(mockCamera.up.z).toBe(1);
    expect(mockControls.target.set).toHaveBeenCalledWith(1, 2, 3);
    expect(mockControls.update).toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
    expect(useCameraStore.getState().position).toEqual([10, 20, 30]);
    expect(useCameraStore.getState().target).toEqual([1, 2, 3]);
  });

  it('glides smoothly preserving the user viewing angle and distance when target updates', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const { rerender } = render(
      createElement(SystemCameraController, {
        position: [10, 20, 30],
        target: [1, 2, 3],
        up: [0, 0, 1],
      }),
    );

    // Simulate user orbiting to a custom viewing offset (+5, -4, +6) from target [1, 2, 3]
    mockCamera.position.set(6, -2, 9);
    mockInvalidate.mockClear();

    rerender(
      createElement(SystemCameraController, {
        position: [20, 30, 40],
        target: [11, 2, 3],
        up: [0, 0, 1],
      }),
    );

    expect(mockInvalidate).toHaveBeenCalledTimes(1);
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);
    expect(mockControls.target.x).toBe(1);

    act(() => {
      advanceTransitionFrames([1000, 1400], nowSpy);
    });
    expect(mockControls.target.x).toBeGreaterThan(1);
    expect(mockControls.target.x).toBeLessThan(11);

    act(() => {
      advanceTransitionFrames([2500], nowSpy);
    });
    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(mockControls.target.x).toBeCloseTo(11, 4);
    // Offset (+5, -4, +6) preserved instead of reorienting to [20, 30, 40]
    expect(mockCamera.position.x).toBeCloseTo(16, 4);
    expect(mockCamera.position.y).toBeCloseTo(-2, 4);
    expect(mockCamera.position.z).toBeCloseTo(9, 4);
    expect(useCameraStore.getState().target[0]).toBeCloseTo(11, 4);
    expect(useCameraStore.getState().position[0]).toBeCloseTo(16, 4);
  });

  it('syncs useCameraStore on OrbitControls end only when not transitioning', () => {
    render(
      createElement(SystemCameraController, {
        position: [10, 20, 30],
        target: [1, 2, 3],
        up: [0, 0, 1],
      }),
    );

    const setCameraPoseSpy = vi.spyOn(useCameraStore.getState(), 'setCameraPose');

    useUIStore.getState().setCameraTransitioning(true);
    mockCamera.position.set(15, 25, 35);
    mockControls.target.set(5, 6, 7);
    for (const cb of mockControls.listeners['end'] ?? []) cb();
    expect(setCameraPoseSpy).not.toHaveBeenCalled();

    useUIStore.getState().setCameraTransitioning(false);
    for (const cb of mockControls.listeners['end'] ?? []) cb();
    expect(setCameraPoseSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        position: [15, 25, 35],
        target: [5, 6, 7],
      }),
    );
  });

  it('does not force-re-centre when hasExplicitCenter is false after mount', () => {
    const { rerender } = render(
      createElement(SystemCameraController, {
        position: [10, 20, 30],
        target: [1, 2, 3],
        up: [0, 0, 1],
        hasExplicitCenter: true,
      }),
    );

    mockInvalidate.mockClear();
    rerender(
      createElement(SystemCameraController, {
        position: [0, -20, 10],
        target: [0, 0, 0],
        up: [0, 0, 1],
        hasExplicitCenter: false,
      }),
    );

    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(mockControls.target.x).toBe(1);
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('applies explicit fov, resets zoom to 1, and updates projection matrix on initial mount', () => {
    mockCamera.fov = 45;
    mockCamera.zoom = 2.5;
    const updateProjSpy = vi.spyOn(mockCamera, 'updateProjectionMatrix');
    render(createElement(SystemCameraController, { position: [10, 20, 30], target: [0, 0, 0], up: [0, 0, 1], fov: 35 }));
    expect(mockCamera.fov).toBe(35);
    expect(mockCamera.zoom).toBe(1);
    expect(updateProjSpy).toHaveBeenCalled();
  });

  it('glides when hasExplicitCenter transitions false -> true after panning away, and skips if already within 1e-3', () => {
    const { rerender } = render(createElement(SystemCameraController, { position: [0, -20, 10], target: [0, 0, 0], up: [0, 0, 1], hasExplicitCenter: false }));
    mockControls.target.set(5, 5, 0);
    mockInvalidate.mockClear();

    rerender(createElement(SystemCameraController, { position: [0, -20, 10], target: [0, 0, 0], up: [0, 0, 1], hasExplicitCenter: true }));
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);
    expect(mockInvalidate).toHaveBeenCalledTimes(1);

    act(() => { useUIStore.getState().setCameraTransitioning(false); });
    rerender(createElement(SystemCameraController, { position: [0, -20, 10], target: [0, 0, 0], up: [0, 0, 1], hasExplicitCenter: false }));
    mockControls.target.set(0, 0, 0);
    mockInvalidate.mockClear();

    rerender(createElement(SystemCameraController, { position: [0, -20, 10], target: [0, 0, 0], up: [0, 0, 1], hasExplicitCenter: true }));
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('updates prevTickRef during !hasExplicitCenter early return so stale tick does not trigger later', () => {
    const { rerender } = render(createElement(SystemCameraController, { position: [0, -20, 10], target: [0, 0, 0], up: [0, 0, 1], hasExplicitCenter: false }));
    act(() => { useCameraStore.getState().focusFromSearch('earth'); });
    mockControls.target.set(0, 0, 0);
    mockInvalidate.mockClear();

    rerender(createElement(SystemCameraController, { position: [0, -20, 10], target: [0, 0, 0], up: [0, 0, 1], hasExplicitCenter: true }));
    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('consumes pending system arrival on initial mount, glides from 1.9x entryPos to landing pose, and fades in instruments', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(3000);
    const landingPos: [number, number, number] = [0, -20, 10];
    const landingTarget: [number, number, number] = [0, 0, 0];
    setPendingCrossScaleArrival({
      direction: 'in',
      targetScope: 'system',
      durationSec: 0.9,
    });

    render(
      createElement(SystemCameraController, {
        scope: 'system',
        position: landingPos,
        target: landingTarget,
        up: [0, 0, 1],
        fov: 35,
      }),
    );

    expect(hasPendingCrossScaleArrival()).toBe(false);
    expect(mockCamera.fov).toBe(35);
    expect(mockCamera.zoom).toBe(1);
    expect(getCrossScaleInstrumentFade()).toBe(0);
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);

    const expectedEntry = computeCrossScaleArrivalEntryPosition(landingPos, landingTarget, 'in');
    expect(mockCamera.position.x).toBeCloseTo(expectedEntry[0], 4);
    expect(mockCamera.position.y).toBeCloseTo(expectedEntry[1], 4);
    expect(mockCamera.position.z).toBeCloseTo(expectedEntry[2], 4);

    act(() => {
      advanceTransitionFrames([3000, 3450], nowSpy);
    });
    expect(getCrossScaleInstrumentFade()).toBeCloseTo(computeCrossScaleArrivalFade(0.5), 4);

    act(() => {
      advanceTransitionFrames([3900], nowSpy);
    });
    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(getCrossScaleInstrumentFade()).toBe(1);
    expect(mockCamera.position.x).toBeCloseTo(landingPos[0], 4);
    expect(mockCamera.position.y).toBeCloseTo(landingPos[1], 4);
    expect(mockCamera.position.z).toBeCloseTo(landingPos[2], 4);
    expect(useCameraStore.getState().position[1]).toBeCloseTo(landingPos[1], 4);
  });

  it('consumes planet arrival only when scope="planet" and resets fade on cancel', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(4000);
    setPendingCrossScaleArrival({
      direction: 'in',
      targetScope: 'planet',
      durationSec: 0.9,
    });

    // scope="system" must not consume a planet arrival
    const { unmount } = render(
      createElement(SystemCameraController, {
        scope: 'system',
        position: [0, -20, 10],
        target: [0, 0, 0],
        up: [0, 0, 1],
        fov: 35,
      }),
    );
    expect(hasPendingCrossScaleArrival()).toBe(true);
    expect(getCrossScaleInstrumentFade()).toBe(1);
    unmount();

    // scope="planet" consumes it and resets fade if interrupted via OrbitControls start
    render(
      createElement(SystemCameraController, {
        scope: 'planet',
        position: [0, -100, 60],
        target: [0, 0, 0],
        up: [0, 0, 1],
        fov: 30,
      }),
    );
    expect(hasPendingCrossScaleArrival()).toBe(false);
    expect(mockCamera.fov).toBe(30);
    expect(getCrossScaleInstrumentFade()).toBe(0);

    act(() => {
      advanceTransitionFrames([4000, 4450], nowSpy);
    });
    expect(getCrossScaleInstrumentFade()).toBeGreaterThan(0);

    act(() => {
      for (const listener of mockControls.listeners['start'] ?? []) {
        listener();
      }
    });
    expect(getCrossScaleInstrumentFade()).toBe(1);
    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
  });
});
