import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, useEffect } from 'react';
import { render, act } from '@testing-library/react';
import * as THREE from 'three';
import { GalacticCameraController } from './GalacticCameraController';
import { GALACTIC_FRAME } from '../../../config/referenceFrames';
import { CameraTransitionController } from '../instrument/cameraTransitionEngine';
import {
  clearPendingCrossScaleArrival,
  computeCrossScaleArrivalEntryPosition,
  computeTiltedArrivalEntryPose,
  hasPendingCrossScaleArrival,
  setPendingCrossScaleArrival,
} from '../instrument/crossScaleArrivalState';
import {
  getCrossScaleInstrumentFade,
  resetCrossScaleInstrumentFade,
} from '../instrument/crossScaleFadeState';
import {
  clearCrossScalePlanePreview,
  getCrossScalePlanePreviewState,
  getCrossScaleSceneScale,
  resetCrossScaleSceneScale,
} from '../instrument/crossScaleVisualState';
import { SpatialEntityStoreContext } from '../entity/SpatialEntityContext';
import { createSpatialEntityStore } from '../entity/SpatialEntityStore';
import {
  DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
  computeCrossScaleArrivalFade,
  computeCrossScaleStageDurations,
} from '../../../utils/referenceFrameOrientation';
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
let activeMockControls: typeof mockControls | undefined;
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
      media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })),
  });
}

vi.mock('../../../hooks/useSpaLocation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../hooks/useSpaLocation')>();
  return { ...actual, useOptionalRouter: () => mockRouter };
});

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useFrame: (cb: (state: unknown, delta: number) => void) => { frameCallbacks.push(cb); },
    useThree: (selector?: (s: unknown) => unknown) => {
      const state = { camera: mockCamera, controls: activeMockControls, size: { width: 1920, height: 1080 }, invalidate: mockInvalidate };
      return selector ? selector(state) : state;
    },
  };
});

function advanceTransitionFrames(stepMs: number[], nowSpy: ReturnType<typeof vi.spyOn>) {
  for (const t of stepMs) {
    nowSpy.mockReturnValue(t);
    for (const cb of [...frameCallbacks]) {
      cb({ camera: mockCamera, controls: activeMockControls, invalidate: mockInvalidate }, 0.016);
    }
  }
}

describe('GalacticCameraController Camera Ownership & Choreography', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    frameCallbacks.length = 0;
    mockRouter = undefined;
    setMockReducedMotion(false);
    clearPendingCrossScaleArrival();
    resetCrossScaleInstrumentFade();
    clearCrossScalePlanePreview();
    resetCrossScaleSceneScale();
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
    activeMockControls = mockControls;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearPendingCrossScaleArrival();
    resetCrossScaleInstrumentFade();
    clearCrossScalePlanePreview();
    resetCrossScaleSceneScale();
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

    // Settle by max auto duration (1500ms)
    act(() => {
      advanceTransitionFrames([2500], nowSpy);
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

  it('does not glide to [0, 0, 0] when hasExplicitCenter is false and recenterTick increments', () => {
    const { rerender } = render(createElement(GalacticCameraController, { target: [12, 4, -3], hasExplicitCenter: true }));
    expect(mockControls.target.toArray()).toEqual([12, 4, -3]);
    rerender(createElement(GalacticCameraController, { target: [0, 0, 0], hasExplicitCenter: false }));
    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    act(() => { useCameraStore.getState().focusFromSearch('sirius'); });
    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(mockControls.target.toArray()).toEqual([12, 4, -3]);
  });

  it('restricts isTransientZero to !hasExplicitCenter so explicit [0,0,0] navigation is not hijacked by savedGalaxyCamera', () => {
    useCameraStore.getState().setSavedGalaxyCamera({
      position: [10, -25, 15], target: [10, 5, 0], up: [0, 0, 1], zoom: 1.4, focalDistance: 30, centerKey: '10,5,0',
    });
    render(createElement(GalacticCameraController, { target: [0, 0, 0], hasExplicitCenter: true }));
    expect(mockControls.target.toArray()).toEqual([0, 0, 0]);
  });

  it('does not overwrite savedGalaxyCamera on unmount when isCameraTransitioning is true', () => {
    const initialSaved = {
      position: [0, -35, 20] as [number, number, number], target: [0, 0, 0] as [number, number, number],
      up: [0, 0, 1] as [number, number, number], zoom: 1, focalDistance: 40, centerKey: '0,0,0',
    };
    useCameraStore.getState().setSavedGalaxyCamera(initialSaved);
    const { unmount } = render(createElement(GalacticCameraController, { target: [0, 0, 0], hasExplicitCenter: false }));
    useUIStore.getState().setCameraTransitioning(true);
    mockControls.target.set(7, 8, 9);
    unmount();
    expect(useCameraStore.getState().savedGalaxyCamera?.target).toEqual([0, 0, 0]);
  });

  it('consumes pending galaxy arrival on initial mount, glides from entryPos to savedGalaxyCamera, and fades in instruments', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(2000);
    const savedPos: [number, number, number] = [10, -25, 15];
    const savedTarget: [number, number, number] = [10, 5, 0];
    useCameraStore.getState().setSavedGalaxyCamera({
      position: savedPos,
      target: savedTarget,
      up: [0, 0, 1],
      zoom: 1,
      focalDistance: 30,
      centerKey: '10,5,0',
    });

    mockCamera.fov = 35;
    setPendingCrossScaleArrival({
      direction: 'out',
      targetScope: 'galaxy',
      durationSec: 0.9,
    });

    render(
      createElement(GalacticCameraController, {
        target: [0, 0, 0],
        hasExplicitCenter: false,
      }),
    );

    expect(hasPendingCrossScaleArrival()).toBe(false);
    expect(mockCamera.fov).toBe(GALACTIC_FRAME.camera.baseFov);
    expect(getCrossScaleInstrumentFade()).toBe(0);
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);

    const expectedEntry = computeCrossScaleArrivalEntryPosition(savedPos, savedTarget, 'out');
    expect(mockCamera.position.x).toBeCloseTo(expectedEntry[0], 4);
    expect(mockCamera.position.y).toBeCloseTo(expectedEntry[1], 4);
    expect(mockCamera.position.z).toBeCloseTo(expectedEntry[2], 4);

    act(() => {
      advanceTransitionFrames([2000, 2450], nowSpy);
    });
    expect(getCrossScaleInstrumentFade()).toBeCloseTo(computeCrossScaleArrivalFade(0.5), 4);

    act(() => {
      advanceTransitionFrames([2900], nowSpy);
    });
    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(getCrossScaleInstrumentFade()).toBe(1);
    expect(mockCamera.position.x).toBeCloseTo(savedPos[0], 4);
    expect(mockCamera.position.y).toBeCloseTo(savedPos[1], 4);
    expect(mockCamera.position.z).toBeCloseTo(savedPos[2], 4);
  });

  it('restores GALACTIC_FRAME.camera.baseFov (45) on normal initial mount after leaving System (35) or Planet (30)', () => {
    mockCamera.fov = 35;
    const updateProjSpy = vi.spyOn(mockCamera, 'updateProjectionMatrix');
    render(createElement(GalacticCameraController, { target: [0, 0, 0] }));
    expect(mockCamera.fov).toBe(GALACTIC_FRAME.camera.baseFov);
    expect(updateProjSpy).toHaveBeenCalled();

    useCameraStore.getState().reset();
    useCameraStore.getState().setSavedGalaxyCamera({
      position: [0, -35, 20],
      target: [0, 0, 0],
      up: [0, 0, 1],
      zoom: 1,
      focalDistance: 40,
      centerKey: '0,0,0',
    });
    mockCamera.fov = 30;
    render(createElement(GalacticCameraController, { target: [0, 0, 0] }));
    expect(mockCamera.fov).toBe(GALACTIC_FRAME.camera.baseFov);
  });

  it('does not overwrite savedGalaxyCamera on unmount when a cross-scale arrival is pending', () => {
    useCameraStore.getState().setSavedGalaxyCamera({
      position: [0, -35, 20],
      target: [0, 0, 0],
      up: [0, 0, 1],
      zoom: 1,
      focalDistance: 40,
      centerKey: '0,0,0',
    });
    const { unmount } = render(
      createElement(GalacticCameraController, { target: [0, 0, 0], hasExplicitCenter: false }),
    );
    setPendingCrossScaleArrival({
      direction: 'in',
      targetScope: 'system',
      durationSec: 0.9,
    });
    mockControls.target.set(7, 8, 9);
    unmount();
    expect(useCameraStore.getState().savedGalaxyCamera?.target).toEqual([0, 0, 0]);
  });

  it('applies pre-tilted close entry pose before passive useEffect paint, holds child preview disc from outerStore, tilts last, and contracts preview on complete', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(6000);
    const savedPos: [number, number, number] = [0, -35, 20];
    const savedTarget: [number, number, number] = [0, 0, 0];
    const savedUp: [number, number, number] = [0, 0, 1];
    useCameraStore.getState().setSavedGalaxyCamera({
      position: savedPos,
      target: savedTarget,
      up: savedUp,
      zoom: 1,
      focalDistance: Math.hypot(0, -35, 20),
      centerKey: '0,0,0',
    });

    const outerStore = createSpatialEntityStore();
    outerStore.getState().registerEntity({
      id: 'alpha-centauri',
      name: 'Alpha Centauri',
      position: [1.3, 0.2, -0.1],
      classification: 'star',
    });

    const config = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG;
    const durations = computeCrossScaleStageDurations(config);
    const frameTiltRad = -Math.PI / 3;
    const tiltAxis: readonly [number, number, number] = [Math.cos(0.4), Math.sin(0.4), 0];

    setPendingCrossScaleArrival({
      direction: 'out',
      targetScope: 'galaxy',
      durationSec: durations.arrivalSec,
      frameTiltRad,
      tiltAxis,
      planePreviewTargetId: 'alpha-centauri',
      planePreviewInclinationRad: Math.abs(frameTiltRad),
      planePreviewAscendingNodeRad: 0.4,
      config,
    });

    let cameraPosAtPassiveEffect: [number, number, number] | null = null;
    const PassiveProbe = () => {
      useEffect(() => {
        cameraPosAtPassiveEffect = [
          mockCamera.position.x,
          mockCamera.position.y,
          mockCamera.position.z,
        ];
      }, []);
      return null;
    };

    render(
      createElement(
        SpatialEntityStoreContext.Provider,
        { value: outerStore },
        createElement(PassiveProbe),
        createElement(GalacticCameraController, {
          target: [0, 0, 0],
          hasExplicitCenter: false,
        }),
      ),
    );

    const expectedEntry = computeTiltedArrivalEntryPose(
      savedPos,
      savedTarget,
      savedUp,
      'out',
      -frameTiltRad,
      tiltAxis,
      config,
    );

    // Pre-paint useLayoutEffect applied entry pose before passive useEffect ran
    expect(cameraPosAtPassiveEffect).not.toBeNull();
    expect(cameraPosAtPassiveEffect![0]).toBeCloseTo(expectedEntry.position[0], 4);
    expect(cameraPosAtPassiveEffect![1]).toBeCloseTo(expectedEntry.position[1], 4);
    expect(cameraPosAtPassiveEffect![2]).toBeCloseTo(expectedEntry.position[2], 4);
    expect(getCrossScaleSceneScale()).toBe(1);

    const landingDist = Math.hypot(savedPos[0], savedPos[1], savedPos[2]);
    const preview = getCrossScalePlanePreviewState();
    expect(preview.active).toBe(true);
    expect(preview.mode).toBe('holding');
    expect(preview.position).toEqual([1.3, 0.2, -0.1]);
    expect(preview.inclinationRad).toBeCloseTo(Math.abs(frameTiltRad), 6);
    expect(preview.ascendingNodeRad).toBeCloseTo(0.4, 6);
    expect(preview.maxRadius).toBeCloseTo(Math.max(0.6, landingDist * 0.16), 5);
    expect(preview.radiusProgress).toBe(1);
    expect(preview.opacity).toBe(1);

    // Early frame (0.2 of arrivalSec): zoomOutMoveWindow=[0,0.85] moves distance while zoomOutTiltWindow=[0.35,1] holds tilt
    act(() => {
      advanceTransitionFrames([6000, 6000 + durations.arrivalSec * 200], nowSpy);
    });
    expect(mockCamera.up.x).toBeCloseTo(expectedEntry.up[0], 4);
    expect(mockCamera.up.y).toBeCloseTo(expectedEntry.up[1], 4);
    expect(mockCamera.up.z).toBeCloseTo(expectedEntry.up[2], 4);
    expect(getCrossScalePlanePreviewState().opacity).toBe(1);

    // Mid-arrival (0.5 of arrivalSec): preview stays at full opacity while pulling back and tilting
    act(() => {
      advanceTransitionFrames([6000 + durations.arrivalSec * 500], nowSpy);
    });
    expect(getCrossScalePlanePreviewState().opacity).toBe(1);

    // Complete arrival -> preview disc begins contracting for durations.previewSec
    act(() => {
      advanceTransitionFrames([6000 + durations.arrivalSec * 1000], nowSpy);
    });
    expect(getCrossScaleInstrumentFade()).toBe(1);
    expect(getCrossScalePlanePreviewState().mode).toBe('contracting');
    expect(getCrossScalePlanePreviewState().durationSec).toBeCloseTo(durations.previewSec, 6);
  });

  it('clears preview disc when zoom-out galaxy arrival is cancelled via OrbitControls start', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(7000);
    useCameraStore.getState().setSavedGalaxyCamera({
      position: [0, -35, 20],
      target: [0, 0, 0],
      up: [0, 0, 1],
      zoom: 1,
      focalDistance: Math.hypot(0, -35, 20),
      centerKey: '0,0,0',
    });

    setPendingCrossScaleArrival({
      direction: 'out',
      targetScope: 'galaxy',
      durationSec: 1.0,
      frameTiltRad: -Math.PI / 3,
      tiltAxis: [1, 0, 0],
      planePreviewInclinationRad: Math.PI / 3,
      planePreviewAscendingNodeRad: 0,
      config: DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
    });

    render(createElement(GalacticCameraController, { target: [0, 0, 0], hasExplicitCenter: false }));
    expect(getCrossScalePlanePreviewState().active).toBe(true);

    act(() => {
      advanceTransitionFrames([7000, 7250], nowSpy);
      for (const cb of mockControls.listeners['start'] ?? []) cb();
    });

    expect(getCrossScalePlanePreviewState().active).toBe(false);
    expect(getCrossScaleInstrumentFade()).toBe(1);
  });

  it('protects active Stage 2 arrival glide when OrbitControls attaches on render 2 (controls undefined -> defined)', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(8000);
    const transitionToSpy = vi.spyOn(CameraTransitionController.prototype, 'start');
    const savedPos: [number, number, number] = [0, -35, 20];
    const savedTarget: [number, number, number] = [0, 0, 0];
    useCameraStore.getState().setSavedGalaxyCamera({
      position: savedPos,
      target: savedTarget,
      up: [0, 0, 1],
      zoom: 1,
      focalDistance: Math.hypot(0, -35, 20),
      centerKey: '0,0,0',
    });

    activeMockControls = undefined;
    const config = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG;
    const durations = computeCrossScaleStageDurations(config);
    setPendingCrossScaleArrival({
      direction: 'out',
      targetScope: 'galaxy',
      durationSec: durations.arrivalSec,
      frameTiltRad: -Math.PI / 3,
      tiltAxis: [1, 0, 0],
      planePreviewInclinationRad: Math.PI / 3,
      planePreviewAscendingNodeRad: 0,
      config,
    });

    const { rerender } = render(
      createElement(GalacticCameraController, {
        target: [0, 0, 0],
        hasExplicitCenter: true,
      }),
    );

    expect(getCrossScalePlanePreviewState().active).toBe(true);
    expect(getCrossScaleInstrumentFade()).toBe(0);
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);

    // Render 2: OrbitControls attaches (`controls` changes from undefined -> mockControls)
    activeMockControls = mockControls;
    rerender(
      createElement(GalacticCameraController, {
        target: [0, 0, 0],
        hasExplicitCenter: true,
      }),
    );

    expect(transitionToSpy).not.toHaveBeenCalled();
    expect(mockControls.update).not.toHaveBeenCalled();
    expect(getCrossScalePlanePreviewState().active).toBe(true);
    expect(getCrossScaleInstrumentFade()).toBe(0);
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);

    act(() => {
      advanceTransitionFrames([8000, 8000 + durations.arrivalSec * 1000], nowSpy);
    });

    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(getCrossScaleInstrumentFade()).toBe(1);
    expect(mockCamera.position.x).toBeCloseTo(savedPos[0], 4);
    expect(mockCamera.position.y).toBeCloseTo(savedPos[1], 4);
    expect(mockCamera.position.z).toBeCloseTo(savedPos[2], 4);
  });
});
