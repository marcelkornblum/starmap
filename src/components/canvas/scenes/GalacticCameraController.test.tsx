import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, act } from '@testing-library/react';
import * as THREE from 'three';
import { GalacticCameraController } from './GalacticCameraController';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useUIStore } from '../../../stores/useUIStore';
import { useOptionalRouter, type StarmapSearchParams } from '../../../hooks/useSpaLocation';

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
let mockRouter: {
  navigate: ReturnType<typeof vi.fn>;
  state: { location: { pathname: string; search: StarmapSearchParams } };
} | undefined;

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

vi.mock('../../../hooks/useSpaLocation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../hooks/useSpaLocation')>();
  return {
    ...actual,
    useOptionalRouter: () => mockRouter,
  };
});

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

describe('GalacticCameraController Camera Ownership & Choreography', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    frameCallbacks.length = 0;
    mockRouter = undefined;
    setMockReducedMotion(false);
    useCameraStore.getState().reset();
    useUIStore.getState().resetUI();
    mockCamera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    mockCamera.position.set(0, -35, 20);
    mockCamera.up.set(0, 0, 1);
    mockCamera.lookAt(0, 0, 0);

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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setMockReducedMotion(false);
  });

  it('glides smoothly when target coordinates change and syncs camera store on settle', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const { rerender } = render(
      createElement(GalacticCameraController, {
        target: [0, 0, 0],
      }),
    );

    expect(mockControls.target.x).toBe(0);
    expect(mockControls.target.y).toBe(0);
    expect(mockControls.target.z).toBe(0);

    rerender(
      createElement(GalacticCameraController, {
        target: [10, -5, 2],
      }),
    );

    // Mid-flight: should NOT snap synchronously
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);
    expect(mockControls.target.x).toBe(0);

    // Advance halfway (400ms of 800ms default)
    act(() => {
      advanceTransitionFrames([1000, 1400], nowSpy);
    });
    expect(mockControls.target.x).toBeGreaterThan(0);
    expect(mockControls.target.x).toBeLessThan(10);

    // Settle at 1800ms
    act(() => {
      advanceTransitionFrames([1800], nowSpy);
    });
    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(mockControls.target.x).toBeCloseTo(10, 4);
    expect(mockControls.target.y).toBeCloseTo(-5, 4);
    expect(mockControls.target.z).toBeCloseTo(2, 4);
    expect(mockControls.update).toHaveBeenCalled();
    expect(useCameraStore.getState().target[0]).toBeCloseTo(10, 4);
    expect(useCameraStore.getState().savedGalaxyCamera?.target[0]).toBeCloseTo(10, 4);
  });

  it('settles target updates immediately when prefersReducedMotion is active', () => {
    setMockReducedMotion(true);
    const { rerender } = render(
      createElement(GalacticCameraController, {
        target: [0, 0, 0],
      }),
    );

    rerender(
      createElement(GalacticCameraController, {
        target: [10, -5, 2],
      }),
    );

    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(mockControls.target.x).toBeCloseTo(10, 4);
    expect(mockControls.target.y).toBeCloseTo(-5, 4);
    expect(mockControls.target.z).toBeCloseTo(2, 4);
    expect(useCameraStore.getState().savedGalaxyCamera?.target[0]).toBeCloseTo(10, 4);
  });

  it('suppresses pose save on change and router center updates on end while isCameraTransitioning is true', () => {
    const navigate = vi.fn();
    mockRouter = {
      navigate,
      state: { location: { pathname: '/galaxy', search: { focus: 'sol' } } },
    };
    const setCameraPoseSpy = vi.spyOn(useCameraStore.getState(), 'setCameraPose');
    const setSavedSpy = vi.spyOn(useCameraStore.getState(), 'setSavedGalaxyCamera');

    render(createElement(GalacticCameraController, { target: [0, 0, 0] }));
    setCameraPoseSpy.mockClear();
    setSavedSpy.mockClear();

    useUIStore.getState().setCameraTransitioning(true);
    mockControls.target.set(6, 2, 1);
    for (const cb of mockControls.listeners['change'] ?? []) cb();
    for (const cb of mockControls.listeners['end'] ?? []) cb();

    expect(setCameraPoseSpy).not.toHaveBeenCalled();
    expect(setSavedSpy).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('updates router search center via TanStack Router without altering focus when user pans on end', () => {
    const navigate = vi.fn();
    mockRouter = {
      navigate,
      state: { location: { pathname: '/galaxy', search: { focus: 'tau-ceti' } } },
    };

    render(createElement(GalacticCameraController, { target: [0, 0, 0] }));

    mockControls.target.set(5.24, 1.51, -1.03);
    for (const cb of mockControls.listeners['end'] ?? []) cb();

    expect(navigate).toHaveBeenCalledTimes(1);
    const navArg = navigate.mock.calls[0]?.[0] as {
      to: string;
      search: (prev: StarmapSearchParams) => StarmapSearchParams;
      replace: boolean;
    };
    expect(navArg.to).toBe('.');
    expect(navArg.replace).toBe(true);
    expect(navArg.search({ focus: 'tau-ceti' })).toEqual({
      focus: 'tau-ceti',
      center: '5.2,1.5,-1.0',
    });
  });

  it('does not imperatively stomp camera pose with duplicate restore when target matches savedGalaxyCamera (AUD-110)', () => {
    useCameraStore.getState().setSavedGalaxyCamera({
      position: [5, -30, 20],
      target: [5, 5, 0],
      up: [0, 0, 1],
      zoom: 1.5,
      focalDistance: 35,
      centerKey: '5,5,0',
    });

    mockCamera.position.set(5, -30, 20);
    mockCamera.up.set(0, 0, 1);
    mockControls.target.set(5, 5, 0);

    const initialPosCopy = mockCamera.position.clone();

    render(
      createElement(GalacticCameraController, {
        target: [5, 5, 0],
      }),
    );

    expect(mockCamera.position.x).toBe(initialPosCopy.x);
    expect(mockCamera.position.y).toBe(initialPosCopy.y);
    expect(mockCamera.position.z).toBe(initialPosCopy.z);
  });

  it('calls invalidate() after imperative camera mutations on mount and target change, and skips when target is unchanged', () => {
    expect(useOptionalRouter).toBeDefined();
    const { rerender } = render(
      createElement(GalacticCameraController, {
        target: [0, 0, 0],
      }),
    );

    expect(mockInvalidate).toHaveBeenCalledTimes(1);

    mockInvalidate.mockClear();
    rerender(
      createElement(GalacticCameraController, {
        target: [0, 0, 0],
      }),
    );
    expect(mockInvalidate).not.toHaveBeenCalled();

    rerender(
      createElement(GalacticCameraController, {
        target: [5, 10, 15],
      }),
    );
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
  });
});
