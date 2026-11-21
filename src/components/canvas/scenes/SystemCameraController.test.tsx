import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, act } from '@testing-library/react';
import * as THREE from 'three';
import { SystemCameraController } from './SystemCameraController';
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
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useFrame: (cb: (state: unknown, delta: number) => void) => {
      frameCallbacks.push(cb);
    },
    useThree: (selector?: (s: unknown) => unknown) => {
      const state = {
        camera: mockCamera,
        controls: mockControls,
        size: { width: 1920, height: 1080 },
        invalidate: mockInvalidate,
      };
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
});
