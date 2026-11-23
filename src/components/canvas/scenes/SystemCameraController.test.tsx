import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, useEffect, type ReactNode } from 'react';
import { render, act } from '@testing-library/react';
import * as THREE from 'three';
import { SystemCameraController } from './SystemCameraController';
import { CameraTransitionController } from '../instrument/cameraTransitionEngine';
import { CameraTransitionProvider } from '../instrument/useCameraTransition';
import {
  clearPendingCrossScaleArrival,
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
  setCrossScalePlanePreview,
} from '../instrument/crossScaleVisualState';
import {
  DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
  computeCrossScaleArrivalFade,
  computeCrossScalePreviewHandoffOpacity,
  computeCrossScaleSceneScale,
  computeCrossScaleStageDurations,
  getReferenceFrameRadius,
} from '../../../utils/referenceFrameOrientation';
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
let activeMockControls: typeof mockControls | undefined;
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

const withTransitionProvider = (node: ReactNode) =>
  createElement(CameraTransitionProvider, null, node);

describe('SystemCameraController Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    frameCallbacks.length = 0;
    setMockReducedMotion(false);
    clearPendingCrossScaleArrival();
    resetCrossScaleInstrumentFade();
    clearCrossScalePlanePreview();
    resetCrossScaleSceneScale();
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

  it('updates camera position, up vector, controls target, and camera store synchronously on mount', () => {
    render(
      withTransitionProvider(
        createElement(SystemCameraController, {
          position: [10, 20, 30],
          target: [1, 2, 3],
          up: [0, 0, 1],
        }),
      ),
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
      withTransitionProvider(
        createElement(SystemCameraController, {
          position: [10, 20, 30],
          target: [1, 2, 3],
          up: [0, 0, 1],
        }),
      ),
    );

    // Simulate user orbiting to a custom viewing offset (+5, -4, +6) from target [1, 2, 3]
    mockCamera.position.set(6, -2, 9);
    mockInvalidate.mockClear();

    rerender(
      withTransitionProvider(
        createElement(SystemCameraController, {
          position: [20, 30, 40],
          target: [11, 2, 3],
          up: [0, 0, 1],
        }),
      ),
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
      withTransitionProvider(
        createElement(SystemCameraController, {
          position: [10, 20, 30],
          target: [1, 2, 3],
          up: [0, 0, 1],
        }),
      ),
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
      withTransitionProvider(
        createElement(SystemCameraController, {
          position: [10, 20, 30],
          target: [1, 2, 3],
          up: [0, 0, 1],
          hasExplicitCenter: true,
        }),
      ),
    );

    mockInvalidate.mockClear();
    rerender(
      withTransitionProvider(
        createElement(SystemCameraController, {
          position: [0, -20, 10],
          target: [0, 0, 0],
          up: [0, 0, 1],
          hasExplicitCenter: false,
        }),
      ),
    );

    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(mockControls.target.x).toBe(1);
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('applies explicit fov, resets zoom to 1, and updates projection matrix on initial mount', () => {
    mockCamera.fov = 45;
    mockCamera.zoom = 2.5;
    const updateProjSpy = vi.spyOn(mockCamera, 'updateProjectionMatrix');
    render(
      withTransitionProvider(
        createElement(SystemCameraController, { position: [10, 20, 30], target: [0, 0, 0], up: [0, 0, 1], fov: 35 }),
      ),
    );
    expect(mockCamera.fov).toBe(35);
    expect(mockCamera.zoom).toBe(1);
    expect(updateProjSpy).toHaveBeenCalled();
  });

  it('glides when hasExplicitCenter transitions false -> true after panning away, and skips if already within 1e-3', () => {
    const { rerender } = render(
      withTransitionProvider(
        createElement(SystemCameraController, { position: [0, -20, 10], target: [0, 0, 0], up: [0, 0, 1], hasExplicitCenter: false }),
      ),
    );
    mockControls.target.set(5, 5, 0);
    mockInvalidate.mockClear();

    rerender(
      withTransitionProvider(
        createElement(SystemCameraController, { position: [0, -20, 10], target: [0, 0, 0], up: [0, 0, 1], hasExplicitCenter: true }),
      ),
    );
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);
    expect(mockInvalidate).toHaveBeenCalledTimes(1);

    act(() => { useUIStore.getState().setCameraTransitioning(false); });
    rerender(
      withTransitionProvider(
        createElement(SystemCameraController, { position: [0, -20, 10], target: [0, 0, 0], up: [0, 0, 1], hasExplicitCenter: false }),
      ),
    );
    mockControls.target.set(0, 0, 0);
    mockInvalidate.mockClear();

    rerender(
      withTransitionProvider(
        createElement(SystemCameraController, { position: [0, -20, 10], target: [0, 0, 0], up: [0, 0, 1], hasExplicitCenter: true }),
      ),
    );
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('updates prevTickRef during !hasExplicitCenter early return so stale tick does not trigger later', () => {
    const { rerender } = render(
      withTransitionProvider(
        createElement(SystemCameraController, { position: [0, -20, 10], target: [0, 0, 0], up: [0, 0, 1], hasExplicitCenter: false }),
      ),
    );
    act(() => { useCameraStore.getState().focusFromSearch('earth'); });
    mockControls.target.set(0, 0, 0);
    mockInvalidate.mockClear();

    rerender(
      withTransitionProvider(
        createElement(SystemCameraController, { position: [0, -20, 10], target: [0, 0, 0], up: [0, 0, 1], hasExplicitCenter: true }),
      ),
    );
    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('consumes pending system arrival on initial mount before passive paint, glides from tilted entry pose with scene scale-in, and fades in instruments', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(3000);
    const landingPos: [number, number, number] = [0, -20, 10];
    const landingTarget: [number, number, number] = [0, 0, 0];
    const landingUp: [number, number, number] = [0, 0, 1];
    const config = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG;
    setCrossScalePlanePreview({
      position: [0, 0, 0],
      inclinationRad: 0,
      ascendingNodeRad: 0,
      maxRadius: getReferenceFrameRadius('system') * config.minSceneScale,
      radiusProgress: 1,
      opacity: 1,
      mode: 'holding',
    });
    setPendingCrossScaleArrival({
      direction: 'in',
      targetScope: 'system',
      durationSec: 0.9,
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
      withTransitionProvider(
        createElement(
          'div',
          null,
          createElement(PassiveProbe),
          createElement(SystemCameraController, {
            scope: 'system',
            position: landingPos,
            target: landingTarget,
            up: landingUp,
            fov: 35,
          }),
        ),
      ),
    );

    expect(hasPendingCrossScaleArrival()).toBe(false);
    expect(mockCamera.fov).toBe(35);
    expect(mockCamera.zoom).toBe(1);
    expect(getCrossScaleInstrumentFade()).toBe(0);
    expect(getCrossScaleSceneScale()).toBeCloseTo(config.minSceneScale, 6);
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);

    const expectedEntry = computeTiltedArrivalEntryPose(
      landingPos,
      landingTarget,
      landingUp,
      'in',
      0,
      undefined,
      config,
    );
    expect(cameraPosAtPassiveEffect).not.toBeNull();
    expect(cameraPosAtPassiveEffect![0]).toBeCloseTo(expectedEntry.position[0], 4);
    expect(cameraPosAtPassiveEffect![1]).toBeCloseTo(expectedEntry.position[1], 4);
    expect(cameraPosAtPassiveEffect![2]).toBeCloseTo(expectedEntry.position[2], 4);

    act(() => {
      advanceTransitionFrames([3000, 3180], nowSpy);
    });
    expect(getCrossScalePlanePreviewState().active).toBe(true);
    expect(getCrossScalePlanePreviewState().opacity).toBeCloseTo(
      computeCrossScalePreviewHandoffOpacity(0.2, config),
      4,
    );
    expect(getCrossScalePlanePreviewState().maxRadius).toBeCloseTo(
      getReferenceFrameRadius('system') * computeCrossScaleSceneScale(0.2, 'in', config.minSceneScale),
      4,
    );

    act(() => {
      advanceTransitionFrames([3450], nowSpy);
    });
    expect(getCrossScaleInstrumentFade()).toBeCloseTo(computeCrossScaleArrivalFade(0.5, config), 4);
    expect(getCrossScaleSceneScale()).toBeCloseTo(
      computeCrossScaleSceneScale(0.5, 'in', config.minSceneScale),
      4,
    );
    expect(getCrossScalePlanePreviewState().opacity).toBeCloseTo(
      computeCrossScalePreviewHandoffOpacity(0.5, config),
      4,
    );
    expect(getCrossScalePlanePreviewState().maxRadius).toBeCloseTo(
      getReferenceFrameRadius('system') * computeCrossScaleSceneScale(0.5, 'in', config.minSceneScale),
      4,
    );

    act(() => {
      advanceTransitionFrames([3900], nowSpy);
    });
    expect(getCrossScalePlanePreviewState().active).toBe(false);
    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(getCrossScaleInstrumentFade()).toBe(1);
    expect(getCrossScaleSceneScale()).toBe(1);
    expect(mockCamera.position.x).toBeCloseTo(landingPos[0], 4);
    expect(mockCamera.position.y).toBeCloseTo(landingPos[1], 4);
    expect(mockCamera.position.z).toBeCloseTo(landingPos[2], 4);
    expect(useCameraStore.getState().position[1]).toBeCloseTo(landingPos[1], 4);
  });

  it('consumes planet arrival only when scope="planet" and resets fade and scene scale on cancel', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(4000);
    const config = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG;
    setPendingCrossScaleArrival({
      direction: 'in',
      targetScope: 'planet',
      durationSec: 0.9,
      config,
    });

    // scope="system" must not consume a planet arrival
    const { unmount } = render(
      withTransitionProvider(
        createElement(SystemCameraController, {
          scope: 'system',
          position: [0, -20, 10],
          target: [0, 0, 0],
          up: [0, 0, 1],
          fov: 35,
        }),
      ),
    );
    expect(hasPendingCrossScaleArrival()).toBe(true);
    expect(getCrossScaleInstrumentFade()).toBe(1);
    unmount();

    // scope="planet" consumes it and resets fade, preview & scene scale if interrupted via OrbitControls start
    setCrossScalePlanePreview({
      position: [0, 0, 0],
      inclinationRad: 0,
      ascendingNodeRad: 0,
      maxRadius: getReferenceFrameRadius('planet') * config.minSceneScale,
      radiusProgress: 1,
      opacity: 1,
      mode: 'holding',
    });
    render(
      withTransitionProvider(
        createElement(SystemCameraController, {
          scope: 'planet',
          position: [0, -100, 60],
          target: [0, 0, 0],
          up: [0, 0, 1],
          fov: 30,
        }),
      ),
    );
    expect(hasPendingCrossScaleArrival()).toBe(false);
    expect(mockCamera.fov).toBe(30);
    expect(getCrossScaleInstrumentFade()).toBe(0);
    expect(getCrossScaleSceneScale()).toBeCloseTo(config.minSceneScale, 6);

    act(() => {
      advanceTransitionFrames([4000, 4450], nowSpy);
    });
    expect(getCrossScaleInstrumentFade()).toBeGreaterThan(0);
    expect(getCrossScaleSceneScale()).toBeGreaterThan(config.minSceneScale);

    act(() => {
      for (const listener of mockControls.listeners['start'] ?? []) {
        listener();
      }
    });
    expect(getCrossScaleInstrumentFade()).toBe(1);
    expect(getCrossScaleSceneScale()).toBe(1);
    expect(getCrossScalePlanePreviewState().active).toBe(false);
    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
  });

  it('supports zoom-out arrival on SystemCameraController with pre-tilted entry and plane preview contraction', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(5000);
    const config = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG;
    const durations = computeCrossScaleStageDurations(config);
    const frameTiltRad = -0.4;

    setPendingCrossScaleArrival({
      direction: 'out',
      targetScope: 'system',
      durationSec: durations.arrivalSec,
      frameTiltRad,
      tiltAxis: [1, 0, 0],
      planePreviewPosition: [2, 0, 0],
      planePreviewInclinationRad: Math.abs(frameTiltRad),
      planePreviewAscendingNodeRad: 0,
      config,
    });

    render(
      withTransitionProvider(
        createElement(SystemCameraController, {
          scope: 'system',
          position: [0, -20, 10],
          target: [0, 0, 0],
          up: [0, 0, 1],
          fov: 35,
        }),
      ),
    );

    expect(getCrossScaleSceneScale()).toBe(1);
    const preview = getCrossScalePlanePreviewState();
    expect(preview.active).toBe(true);
    expect(preview.mode).toBe('holding');
    expect(preview.position).toEqual([2, 0, 0]);

    act(() => {
      advanceTransitionFrames([5000, 5000 + durations.arrivalSec * 1000], nowSpy);
    });

    expect(getCrossScalePlanePreviewState().mode).toBe('contracting');
    expect(getCrossScalePlanePreviewState().durationSec).toBeCloseTo(durations.previewSec, 6);
  });

  it('protects active Stage 2 arrival glide when OrbitControls attaches on render 2 (controls undefined -> defined)', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(8000);
    const transitionToSpy = vi.spyOn(CameraTransitionController.prototype, 'start');
    const config = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG;
    const landingPos: [number, number, number] = [0, -20, 10];
    const landingTarget: [number, number, number] = [0, 0, 0];

    activeMockControls = undefined;
    setPendingCrossScaleArrival({
      direction: 'in',
      targetScope: 'system',
      durationSec: 0.9,
      config,
    });

    const { rerender } = render(
      withTransitionProvider(
        createElement(SystemCameraController, {
          scope: 'system',
          position: landingPos,
          target: landingTarget,
          up: [0, 0, 1],
          fov: 35,
        }),
      ),
    );

    expect(getCrossScaleSceneScale()).toBeCloseTo(config.minSceneScale, 6);
    expect(getCrossScaleInstrumentFade()).toBe(0);
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);

    // Render 2: OrbitControls attaches (`controls` changes from undefined -> mockControls)
    activeMockControls = mockControls;
    rerender(
      withTransitionProvider(
        createElement(SystemCameraController, {
          scope: 'system',
          position: landingPos,
          target: landingTarget,
          up: [0, 0, 1],
          fov: 35,
        }),
      ),
    );

    expect(transitionToSpy).not.toHaveBeenCalled();
    expect(mockControls.update).not.toHaveBeenCalled();
    expect(getCrossScaleSceneScale()).toBeCloseTo(config.minSceneScale, 6);
    expect(getCrossScaleInstrumentFade()).toBe(0);
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);

    act(() => {
      advanceTransitionFrames([8000, 8900], nowSpy);
    });

    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(getCrossScaleSceneScale()).toBe(1);
    expect(getCrossScaleInstrumentFade()).toBe(1);
    expect(mockCamera.position.x).toBeCloseTo(landingPos[0], 4);
    expect(mockCamera.position.y).toBeCloseTo(landingPos[1], 4);
    expect(mockCamera.position.z).toBeCloseTo(landingPos[2], 4);
  });

  it('does not cancel active Stage 2 arrival glide or snap sceneScale when target props update mid-flight', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(9000);
    const transitionToSpy = vi.spyOn(CameraTransitionController.prototype, 'start');
    const config = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG;
    const landingPos: [number, number, number] = [0, -20, 10];

    setPendingCrossScaleArrival({
      direction: 'in',
      targetScope: 'system',
      durationSec: 0.9,
      config,
    });

    const { rerender } = render(
      withTransitionProvider(
        createElement(SystemCameraController, {
          scope: 'system',
          position: landingPos,
          target: [0, 0, 0],
          up: [0, 0, 1],
          fov: 35,
        }),
      ),
    );

    act(() => {
      advanceTransitionFrames([9000, 9200], nowSpy);
    });
    const inFlightScale = getCrossScaleSceneScale();
    expect(inFlightScale).toBeGreaterThan(config.minSceneScale);
    expect(inFlightScale).toBeLessThan(1);

    rerender(
      withTransitionProvider(
        createElement(SystemCameraController, {
          scope: 'system',
          position: [5, -18, 9],
          target: [5, 2, -1],
          up: [0, 0, 1],
          fov: 35,
        }),
      ),
    );

    expect(transitionToSpy).not.toHaveBeenCalled();
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);
    expect(getCrossScaleSceneScale()).toBeCloseTo(inFlightScale, 6);

    act(() => {
      advanceTransitionFrames([9900], nowSpy);
    });
    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(getCrossScaleSceneScale()).toBe(1);
    expect(getCrossScaleInstrumentFade()).toBe(1);
    expect(mockCamera.position.x).toBeCloseTo(landingPos[0], 4);
    expect(mockCamera.position.y).toBeCloseTo(landingPos[1], 4);
    expect(mockCamera.position.z).toBeCloseTo(landingPos[2], 4);
  });

  it('does not invoke an extra invalidate() after the glide completes on the settle frame', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const { rerender } = render(
      withTransitionProvider(
        createElement(SystemCameraController, {
          position: [0, 0, 20],
          target: [1, 2, 3],
          up: [0, 0, 1],
          hasExplicitCenter: true,
        }),
      ),
    );

    rerender(
      withTransitionProvider(
        createElement(SystemCameraController, {
          position: [20, 30, 40],
          target: [11, 2, 3],
          up: [0, 0, 1],
          hasExplicitCenter: true,
        }),
      ),
    );

    act(() => {
      advanceTransitionFrames([1000, 1200], nowSpy);
    });
    mockInvalidate.mockClear();

    act(() => {
      advanceTransitionFrames([2500], nowSpy);
    });

    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(mockInvalidate).not.toHaveBeenCalled();
    nowSpy.mockRestore();
  });
});
