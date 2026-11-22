import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, screen, act } from '@testing-library/react';
import * as THREE from 'three';
import { CrossScaleStageHost } from './CrossScaleStageHost';
import {
  preloadSystemData,
  preloadTargetScaleEntry,
  resolveTargetPlaneMetadata,
} from './crossScaleStageHelpers';
import { registerSpatialViewPreloader } from './sceneEntryLoader';
import {
  getPendingSpatialRouteTarget,
  setPendingSpatialNavigationHref,
} from '../../../utils/spatialRoute';
import { CameraTransitionProvider } from '../../canvas/instrument/useCameraTransition';
import {
  clearPendingCrossScaleArrival,
  consumePendingCrossScaleArrival,
  hasPendingCrossScaleArrival,
} from '../../canvas/instrument/crossScaleArrivalState';
import {
  getCrossScaleInstrumentFade,
  resetCrossScaleInstrumentFade,
} from '../../canvas/instrument/crossScaleFadeState';
import {
  clearCrossScalePlanePreview,
  getCrossScalePlanePreviewState,
  getCrossScaleSceneScale,
  resetCrossScaleSceneScale,
} from '../../canvas/instrument/crossScaleVisualState';
import {
  SpatialEntityStoreContext,
} from '../../canvas/entity/SpatialEntityContext';
import { createSpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';
import {
  CanvasRouterBridgeContext,
  type AppRouterAdapter,
} from '../../../hooks/useSpaLocation';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useUIStore } from '../../../stores/useUIStore';
import * as detailsRepo from '../../../data/detailsRepository';
import { DEG_TO_RADIANS } from '../../../utils/astroCoordinates';
import {
  DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG,
  GALACTIC_TO_ECLIPTIC_TILT_DEG,
  computeCrossScaleDepartureFade,
  computeCrossScaleSceneScale,
  computeCrossScaleStageDurations,
  resolveTargetReferencePlane,
} from '../../../utils/referenceFrameOrientation';
import * as sceneEntryLoader from './sceneEntryLoader';

let mockCamera: THREE.PerspectiveCamera;
let mockControls: {
  target: THREE.Vector3;
  enabled: boolean;
  enableDamping: boolean;
  update: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  listeners: Record<string, Array<() => void>>;
};
const mockInvalidate = vi.fn();
const frameCallbacks: Array<{ cb: (state: unknown, delta: number) => void; priority?: number }> = [];

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

vi.mock('../../canvas/scenes/GalacticSceneEntry', () => ({
  default: (props: { centerId?: string }) =>
    createElement('div', {
      'data-testid': 'mock-galactic-scene',
      'data-center-id': props.centerId,
    }),
  GalacticSceneContent: (props: { centerId?: string }) =>
    createElement('div', {
      'data-testid': 'mock-galactic-scene',
      'data-center-id': props.centerId,
    }),
}));

vi.mock('../../canvas/scenes/SystemSceneEntry', () => ({
  default: (props: { systemId?: string; centerId?: string }) =>
    createElement('div', {
      'data-testid': 'mock-system-scene',
      'data-system-id': props.systemId,
      'data-center-id': props.centerId,
    }),
  SystemSceneContent: (props: { systemId?: string; centerId?: string }) =>
    createElement('div', {
      'data-testid': 'mock-system-scene',
      'data-system-id': props.systemId,
      'data-center-id': props.centerId,
    }),
}));

vi.mock('../../canvas/scenes/PlanetarySceneEntry', () => ({
  default: (props: { planetId?: string }) =>
    createElement('div', {
      'data-testid': 'mock-planetary-scene',
      'data-planet-id': props.planetId,
    }),
  PlanetarySceneContent: (props: { planetId?: string }) =>
    createElement('div', {
      'data-testid': 'mock-planetary-scene',
      'data-planet-id': props.planetId,
    }),
}));

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useFrame: (cb: (state: unknown, delta: number) => void, priority?: number) => {
      frameCallbacks.push({ cb, priority });
    },
    useThree: (selector?: (s: unknown) => unknown) => {
      const state = {
        camera: mockCamera,
        controls: mockControls,
        invalidate: mockInvalidate,
        get: () => ({ camera: mockCamera, controls: mockControls }),
      };
      return selector ? selector(state) : state;
    },
  };
});

function advanceTransitionFrames(
  stepMs: number[],
  nowSpy: ReturnType<typeof vi.spyOn>,
  deltaSec = 0.05,
) {
  for (const t of stepMs) {
    nowSpy.mockReturnValue(t);
    for (const entry of [...frameCallbacks]) {
      entry.cb({ camera: mockCamera, controls: mockControls, invalidate: mockInvalidate }, deltaSec);
    }
  }
}

function advanceDuration(
  startMs: number,
  durationMs: number,
  nowSpy: ReturnType<typeof vi.spyOn>,
  stepMs = 50,
): number {
  const steps: number[] = [];
  for (let elapsed = 0; elapsed <= durationMs; elapsed += stepMs) {
    steps.push(startMs + elapsed);
  }
  if (steps[steps.length - 1] !== startMs + durationMs) {
    steps.push(startMs + durationMs);
  }
  advanceTransitionFrames(steps, nowSpy, stepMs / 1000);
  return startMs + durationMs;
}

describe('CrossScaleStageHost', () => {
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
    mockCamera.position.set(0, -35, 20);
    mockCamera.up.set(0, 0, 1);
    mockCamera.lookAt(0, 0, 0);

    const listeners: Record<string, Array<() => void>> = {};
    mockControls = {
      target: new THREE.Vector3(0, 0, 0),
      enabled: true,
      enableDamping: true,
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
    vi.useRealTimers();
    setPendingSpatialNavigationHref(null);
    registerSpatialViewPreloader(null);
    clearPendingCrossScaleArrival();
    resetCrossScaleInstrumentFade();
    clearCrossScalePlanePreview();
    resetCrossScaleSceneScale();
    setMockReducedMotion(false);
  });

  it('commits same-scale updates on galaxy immediately without cross-scale transition or fade', async () => {
    const preloadSpy = vi.spyOn(sceneEntryLoader, 'preloadSceneEntry');
    const { rerender } = render(
      <CameraTransitionProvider>
        <CrossScaleStageHost scope="galaxy" centerId="sol" isSpatialSceneMounted />
      </CameraTransitionProvider>,
    );

    const initialScene = await screen.findByTestId('mock-galactic-scene');
    expect(initialScene.getAttribute('data-center-id')).toBe('sol');

    rerender(
      <CameraTransitionProvider>
        <CrossScaleStageHost scope="galaxy" centerId="sirius" isSpatialSceneMounted />
      </CameraTransitionProvider>,
    );

    expect(screen.getByTestId('mock-galactic-scene').getAttribute('data-center-id')).toBe('sirius');
    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(getCrossScaleInstrumentFade()).toBe(1);
    expect(hasPendingCrossScaleArrival()).toBe(false);
    expect(preloadSpy).not.toHaveBeenCalled();
  });

  it('executes 3-beat zoom-in choreography (preview expand -> tilted departure -> minSceneScale swap) on galaxy -> system', async () => {
    const config = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG;
    const durations = computeCrossScaleStageDurations(config);
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const preloadSpy = vi
      .spyOn(sceneEntryLoader, 'preloadSceneEntry')
      .mockResolvedValue(undefined);

    const outerStore = createSpatialEntityStore();
    outerStore.getState().registerEntity({
      id: 'alpha-centauri',
      name: 'Alpha Centauri',
      position: [1.3, 0.2, -0.1],
      classification: 'star',
    });

    const { rerender } = render(
      <SpatialEntityStoreContext.Provider value={outerStore}>
        <CameraTransitionProvider>
          <CrossScaleStageHost scope="galaxy" centerId="sol" isSpatialSceneMounted />
        </CameraTransitionProvider>
      </SpatialEntityStoreContext.Provider>,
    );

    expect(await screen.findByTestId('mock-galactic-scene')).toBeInTheDocument();
    expect(frameCallbacks.some((entry) => entry.priority === -1)).toBe(true);

    rerender(
      <SpatialEntityStoreContext.Provider value={outerStore}>
        <CameraTransitionProvider>
          <CrossScaleStageHost
            scope="system"
            targetId="alpha-centauri"
            centerId="alpha-centauri"
            isSpatialSceneMounted
          />
        </CameraTransitionProvider>
      </SpatialEntityStoreContext.Provider>,
    );

    // Preload kicked off immediately; Beat 1 expands preview disc before camera moves
    expect(preloadSpy).toHaveBeenCalledWith('system');
    expect(screen.getByTestId('mock-galactic-scene')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-system-scene')).toBeNull();
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);

    const preview = getCrossScalePlanePreviewState();
    expect(preview.active).toBe(true);
    expect(preview.mode).toBe('expanding');
    expect(preview.position).toEqual([1.3, 0.2, -0.1]);

    // Pre-dive galaxy camera pose was snapshotted before Stage 1 tilted/zoomed
    const saved = useCameraStore.getState().savedGalaxyCamera;
    expect(saved).not.toBeNull();
    expect(saved?.position).toEqual([0, -35, 20]);
    expect(saved?.target).toEqual([0, 0, 0]);

    // Complete Beat 1 (previewSec = 400ms) -> transitions into Beat 2 camera flight
    let t = 1000;
    act(() => {
      t = advanceDuration(t, durations.previewSec * 1000, nowSpy);
    });
    expect(getCrossScalePlanePreviewState().mode).toBe('holding');

    // Advance halfway through Beat 2 (departureSec = 1000ms)
    act(() => {
      t = advanceDuration(t, durations.departureSec * 500, nowSpy);
    });
    expect(getCrossScaleInstrumentFade()).toBeCloseTo(
      computeCrossScaleDepartureFade(0.5, config),
      3,
    );
    expect(getCrossScalePlanePreviewState().opacity).toBeLessThan(1);
    expect(mockControls.target.x).toBeGreaterThan(0);

    // Complete Beat 2 and flush preload promise
    await act(async () => {
      advanceDuration(t, durations.departureSec * 500, nowSpy);
      await Promise.resolve();
    });

    expect(getCrossScalePlanePreviewState().active).toBe(false);
    expect(getCrossScaleInstrumentFade()).toBe(0);
    expect(getCrossScaleSceneScale()).toBeCloseTo(config.minSceneScale, 6);
    expect(mockControls.target.x).toBeCloseTo(1.3, 4);
    expect(mockControls.target.y).toBeCloseTo(0.2, 4);
    expect(mockControls.target.z).toBeCloseTo(-0.1, 4);

    // Orbital plane tilt applied (~60.19 deg)
    const upAfterTilt = mockCamera.up.clone().normalize();
    const expectedAngle = GALACTIC_TO_ECLIPTIC_TILT_DEG * DEG_TO_RADIANS;
    expect(
      Math.acos(Math.min(1, Math.max(-1, upAfterTilt.dot(new THREE.Vector3(0, 0, 1))))),
    ).toBeCloseTo(expectedAngle, 3);

    const plane = resolveTargetReferencePlane('galaxy', 'system');
    expect(consumePendingCrossScaleArrival('system')).toEqual({
      direction: 'in',
      targetScope: 'system',
      durationSec: durations.arrivalSec,
      frameTiltRad: plane.inclinationRad,
      tiltAxis: plane.tiltAxis,
      config,
    });
    const sysScene = await screen.findByTestId('mock-system-scene');
    expect(sysScene.getAttribute('data-system-id')).toBe('alpha-centauri');
  });

  it('executes reverse zoom-out departure (no tilt yet, shrinks sceneScale, passes child plane preview) on system -> galaxy', async () => {
    const config = DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG;
    const durations = computeCrossScaleStageDurations(config);
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(2000);
    vi.spyOn(sceneEntryLoader, 'preloadSceneEntry').mockResolvedValue(undefined);
    mockCamera.position.set(0, -10, 6);
    mockControls.target.set(0, 0, 0);

    const { rerender } = render(
      <CameraTransitionProvider>
        <CrossScaleStageHost
          scope="system"
          targetId="sol"
          centerId="sol"
          isSpatialSceneMounted
        />
      </CameraTransitionProvider>,
    );

    expect(await screen.findByTestId('mock-system-scene')).toBeInTheDocument();

    rerender(
      <CameraTransitionProvider>
        <CrossScaleStageHost scope="galaxy" centerId="sol" isSpatialSceneMounted />
      </CameraTransitionProvider>,
    );

    expect(screen.getByTestId('mock-system-scene')).toBeInTheDocument();

    // Advance halfway through Beat 1 departureSec: scene shrinks, NO tilt yet
    let t = 2000;
    act(() => {
      t = advanceDuration(t, durations.departureSec * 500, nowSpy);
    });
    expect(getCrossScaleSceneScale()).toBeCloseTo(
      computeCrossScaleSceneScale(0.5, 'out', config.minSceneScale),
      3,
    );
    expect(mockCamera.up.toArray()).toEqual([0, 0, 1]);

    await act(async () => {
      advanceDuration(t, durations.departureSec * 500, nowSpy);
      await Promise.resolve();
    });

    expect(getCrossScaleSceneScale()).toBe(1);
    expect(getCrossScaleInstrumentFade()).toBe(0);
    expect(mockCamera.position.length()).toBeCloseTo(
      Math.hypot(0, -10, 6) * config.departureOutDistanceMultiplier,
      2,
    );
    const plane = resolveTargetReferencePlane('system', 'galaxy');
    expect(consumePendingCrossScaleArrival('galaxy')).toEqual({
      direction: 'out',
      targetScope: 'galaxy',
      durationSec: durations.arrivalSec,
      frameTiltRad: plane.inclinationRad,
      tiltAxis: plane.tiltAxis,
      planePreviewTargetId: 'sol',
      planePreviewInclinationRad: Math.abs(plane.inclinationRad),
      planePreviewAscendingNodeRad: plane.ascendingNodeRad,
      config,
    });
    expect(await screen.findByTestId('mock-galactic-scene')).toBeInTheDocument();
  });

  it('triggers two-stage transition and remounts SystemScene when targetId changes across systems', async () => {
    const durations = computeCrossScaleStageDurations(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG);
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(3000);
    vi.spyOn(sceneEntryLoader, 'preloadSceneEntry').mockResolvedValue(undefined);

    const { rerender } = render(
      <CameraTransitionProvider>
        <CrossScaleStageHost scope="system" targetId="sol" isSpatialSceneMounted />
      </CameraTransitionProvider>,
    );

    const solScene = await screen.findByTestId('mock-system-scene');
    expect(solScene.getAttribute('data-system-id')).toBe('sol');

    rerender(
      <CameraTransitionProvider>
        <CrossScaleStageHost scope="system" targetId="tau-ceti" isSpatialSceneMounted />
      </CameraTransitionProvider>,
    );

    expect(screen.getByTestId('mock-system-scene').getAttribute('data-system-id')).toBe('sol');

    await act(async () => {
      advanceDuration(3000, durations.departureSec * 1000, nowSpy);
      await Promise.resolve();
    });

    const tauScene = await screen.findByTestId('mock-system-scene');
    expect(tauScene.getAttribute('data-system-id')).toBe('tau-ceti');
    expect(tauScene).not.toBe(solScene);
  });

  it('aborts cleanly during Beat 1 or Beat 2 when interrupted via OrbitControls start', async () => {
    const durations = computeCrossScaleStageDurations(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG);
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(4000);
    vi.spyOn(sceneEntryLoader, 'preloadSceneEntry').mockResolvedValue(undefined);

    // Subcase 1: Interrupt during Beat 1 (while plane preview expands)
    const { rerender, unmount } = render(
      <CameraTransitionProvider>
        <CrossScaleStageHost scope="galaxy" centerId="sol" isSpatialSceneMounted />
      </CameraTransitionProvider>,
    );
    await screen.findByTestId('mock-galactic-scene');

    rerender(
      <CameraTransitionProvider>
        <CrossScaleStageHost scope="system" targetId="sol" isSpatialSceneMounted />
      </CameraTransitionProvider>,
    );
    expect(getCrossScalePlanePreviewState().mode).toBe('expanding');

    act(() => {
      for (const listener of mockControls.listeners['start'] ?? []) {
        listener();
      }
    });
    expect(getCrossScalePlanePreviewState().active).toBe(false);
    expect(getCrossScaleSceneScale()).toBe(1);
    expect(getCrossScaleInstrumentFade()).toBe(1);
    expect(hasPendingCrossScaleArrival()).toBe(false);
    expect(await screen.findByTestId('mock-system-scene')).toBeInTheDocument();
    unmount();

    // Subcase 2: Interrupt during Beat 2
    const second = render(
      <CameraTransitionProvider>
        <CrossScaleStageHost scope="galaxy" centerId="sol" isSpatialSceneMounted />
      </CameraTransitionProvider>,
    );
    await screen.findByTestId('mock-galactic-scene');

    second.rerender(
      <CameraTransitionProvider>
        <CrossScaleStageHost scope="system" targetId="sol" isSpatialSceneMounted />
      </CameraTransitionProvider>,
    );

    let t = 4000;
    act(() => {
      t = advanceDuration(t, durations.previewSec * 1000, nowSpy);
      advanceDuration(t, durations.departureSec * 500, nowSpy);
    });
    expect(getCrossScaleInstrumentFade()).toBeLessThan(1);

    act(() => {
      for (const listener of mockControls.listeners['start'] ?? []) {
        listener();
      }
    });

    expect(hasPendingCrossScaleArrival()).toBe(false);
    expect(getCrossScaleInstrumentFade()).toBe(1);
    expect(getCrossScaleSceneScale()).toBe(1);
    expect(getCrossScalePlanePreviewState().active).toBe(false);
    expect(await screen.findByTestId('mock-system-scene')).toBeInTheDocument();
  });

  it('swaps immediately with reset visual state and no arrival glide when prefersReducedMotion is true', async () => {
    setMockReducedMotion(true);
    const preloadSpy = vi
      .spyOn(sceneEntryLoader, 'preloadSceneEntry')
      .mockResolvedValue(undefined);

    const { rerender } = render(
      <CameraTransitionProvider>
        <CrossScaleStageHost scope="galaxy" centerId="sol" isSpatialSceneMounted />
      </CameraTransitionProvider>,
    );
    await screen.findByTestId('mock-galactic-scene');

    rerender(
      <CameraTransitionProvider>
        <CrossScaleStageHost scope="system" targetId="sol" isSpatialSceneMounted />
      </CameraTransitionProvider>,
    );

    expect(preloadSpy).toHaveBeenCalledWith('system');
    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(hasPendingCrossScaleArrival()).toBe(false);
    expect(getCrossScaleInstrumentFade()).toBe(1);
    expect(getCrossScaleSceneScale()).toBe(1);
    expect(getCrossScalePlanePreviewState().active).toBe(false);
    expect(await screen.findByTestId('mock-system-scene')).toBeInTheDocument();
  });

  it('clears arrival, plane preview, scene scale, and instrument fade on unmount during Stage 1', async () => {
    const durations = computeCrossScaleStageDurations(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG);
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(5000);
    vi.spyOn(sceneEntryLoader, 'preloadSceneEntry').mockResolvedValue(undefined);

    const { rerender, unmount } = render(
      <CameraTransitionProvider>
        <CrossScaleStageHost scope="galaxy" centerId="sol" isSpatialSceneMounted />
      </CameraTransitionProvider>,
    );
    await screen.findByTestId('mock-galactic-scene');

    rerender(
      <CameraTransitionProvider>
        <CrossScaleStageHost scope="system" targetId="sol" isSpatialSceneMounted />
      </CameraTransitionProvider>,
    );

    let t = 5000;
    act(() => {
      t = advanceDuration(t, durations.previewSec * 1000, nowSpy);
      advanceDuration(t, durations.departureSec * 500, nowSpy);
    });
    expect(getCrossScaleInstrumentFade()).toBeLessThan(1);

    unmount();

    expect(hasPendingCrossScaleArrival()).toBe(false);
    expect(getCrossScaleInstrumentFade()).toBe(1);
    expect(getCrossScaleSceneScale()).toBe(1);
    expect(getCrossScalePlanePreviewState().active).toBe(false);
  });

  it('triggers Stage 1 on frame 1 when router pathname changes before props catch up and synthesizes swap if needed', async () => {
    const durations = computeCrossScaleStageDurations(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG);
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(6000);
    const preloadSpy = vi
      .spyOn(sceneEntryLoader, 'preloadSceneEntry')
      .mockResolvedValue(undefined);

    let currentPathname = '/galaxy';
    const historyListeners = new Set<() => void>();
    const mockRouter: AppRouterAdapter = {
      get state() {
        return { location: { pathname: currentPathname, searchStr: '' } };
      },
      history: {
        subscribe: (cb) => {
          historyListeners.add(cb);
          return () => historyListeners.delete(cb);
        },
      },
    };

    const { rerender } = render(
      <CanvasRouterBridgeContext.Provider value={mockRouter}>
        <CameraTransitionProvider>
          <CrossScaleStageHost scope="galaxy" centerId="sol" isSpatialSceneMounted />
        </CameraTransitionProvider>
      </CanvasRouterBridgeContext.Provider>,
    );
    await screen.findByTestId('mock-galactic-scene');

    // Route changes immediately to /system/alpha-centauri while props still have scope="galaxy"
    act(() => {
      currentPathname = '/system/alpha-centauri';
      for (const listener of historyListeners) listener();
    });

    expect(preloadSpy).toHaveBeenCalledWith('system');
    expect(getCrossScalePlanePreviewState().mode).toBe('expanding');
    expect(screen.getByTestId('mock-galactic-scene')).toBeInTheDocument();

    // Complete Beat 1 + Beat 2 BEFORE props catch up -> synthesizes swap without stalling
    let t = 6000;
    await act(async () => {
      t = advanceDuration(t, durations.previewSec * 1000, nowSpy);
      advanceDuration(t, durations.departureSec * 1000, nowSpy);
      await Promise.resolve();
    });

    const sysScene = await screen.findByTestId('mock-system-scene');
    expect(sysScene.getAttribute('data-system-id')).toBe('alpha-centauri');
    expect(sysScene.getAttribute('data-center-id')).toBeNull();

    // When real props later catch up, same-target sync updates committedProps cleanly without re-departing
    rerender(
      <CanvasRouterBridgeContext.Provider value={mockRouter}>
        <CameraTransitionProvider>
          <CrossScaleStageHost
            scope="system"
            targetId="alpha-centauri"
            centerId="alpha-centauri-a"
            isSpatialSceneMounted
          />
        </CameraTransitionProvider>
      </CanvasRouterBridgeContext.Provider>,
    );
    expect(screen.getByTestId('mock-system-scene').getAttribute('data-center-id')).toBe(
      'alpha-centauri-a',
    );
    expect(getCrossScalePlanePreviewState().active).toBe(false);
  });

  it('extracts target plane metadata from outerStore and preloads system data in parallel', async () => {
    const outerStore = createSpatialEntityStore();
    outerStore.getState().registerEntity({
      id: 'planet-tilted',
      name: 'Tilted World',
      position: [4, 5, 6],
      orbit: {
        semiMajorAxis: 1.5,
        inclination: 12.5,
        ascendingNode: 45,
      },
      data: {
        axialTiltDeg: 97.77,
        obliquityDeg: 98.0,
      },
    });

    expect(resolveTargetPlaneMetadata(outerStore, 'tilted-world')).toEqual({
      inclinationDeg: 12.5,
      ascendingNodeDeg: 45,
      axialTiltDeg: 97.77,
      obliquityDeg: 98.0,
    });
    expect(resolveTargetPlaneMetadata(outerStore, 'missing')).toBeUndefined();

    vi.spyOn(detailsRepo, 'getCachedDetailRecord').mockReturnValue(undefined);
    vi.spyOn(detailsRepo, 'getCachedSummaryNode').mockReturnValue(undefined);
    const fetchDetailSpy = vi
      .spyOn(detailsRepo, 'fetchDetailRecord')
      .mockResolvedValue(undefined);
    const fetchSummarySpy = vi
      .spyOn(detailsRepo, 'fetchSummaryNode')
      .mockResolvedValue(undefined);

    await preloadSystemData('alpha-centauri', true);
    expect(fetchDetailSpy).toHaveBeenCalledWith('alpha-centauri');
    expect(fetchSummarySpy).toHaveBeenCalledWith('alpha-centauri');
  });

  it('cancels Beat 1 cleanly and restarts choreography when a new navigation arrives mid-preview', async () => {
    const durations = computeCrossScaleStageDurations(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG);
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(7000);
    vi.spyOn(sceneEntryLoader, 'preloadSceneEntry').mockResolvedValue(undefined);

    const outerStore = createSpatialEntityStore();
    outerStore.getState().registerEntity({
      id: 'alpha-centauri',
      name: 'Alpha Centauri',
      position: [1.3, 0.2, -0.1],
    });
    outerStore.getState().registerEntity({
      id: 'tau-ceti',
      name: 'Tau Ceti',
      position: [3.2, 1.5, -1.0],
    });

    const { rerender } = render(
      <SpatialEntityStoreContext.Provider value={outerStore}>
        <CameraTransitionProvider>
          <CrossScaleStageHost scope="galaxy" centerId="sol" isSpatialSceneMounted />
        </CameraTransitionProvider>
      </SpatialEntityStoreContext.Provider>,
    );
    await screen.findByTestId('mock-galactic-scene');

    rerender(
      <SpatialEntityStoreContext.Provider value={outerStore}>
        <CameraTransitionProvider>
          <CrossScaleStageHost scope="system" targetId="alpha-centauri" isSpatialSceneMounted />
        </CameraTransitionProvider>
      </SpatialEntityStoreContext.Provider>,
    );

    let t = 7000;
    act(() => {
      t = advanceDuration(t, durations.previewSec * 500, nowSpy);
    });
    expect(getCrossScalePlanePreviewState().mode).toBe('expanding');
    expect(getCrossScalePlanePreviewState().position).toEqual([1.3, 0.2, -0.1]);

    // Navigate to tau-ceti during Beat 1
    rerender(
      <SpatialEntityStoreContext.Provider value={outerStore}>
        <CameraTransitionProvider>
          <CrossScaleStageHost scope="system" targetId="tau-ceti" isSpatialSceneMounted />
        </CameraTransitionProvider>
      </SpatialEntityStoreContext.Provider>,
    );

    expect(getCrossScalePlanePreviewState().mode).toBe('expanding');
    expect(getCrossScalePlanePreviewState().position).toEqual([3.2, 1.5, -1.0]);

    await act(async () => {
      t = advanceDuration(t, durations.previewSec * 1000, nowSpy);
      advanceDuration(t, durations.departureSec * 1000, nowSpy);
      await Promise.resolve();
    });

    const tauScene = await screen.findByTestId('mock-system-scene');
    expect(tauScene.getAttribute('data-system-id')).toBe('tau-ceti');
    expect(mockControls.target.x).toBeCloseTo(3.2, 4);
  });

  it('starts Stage 1 at t=0ms from pending navigation intent and clears intent once router pathname catches up', async () => {
    const viewPreloader = vi.fn().mockResolvedValue(undefined);
    registerSpatialViewPreloader(viewPreloader);
    await preloadTargetScaleEntry('system', 'alpha-centauri', true);
    expect(viewPreloader).toHaveBeenCalledWith('system');

    vi.spyOn(sceneEntryLoader, 'preloadSceneEntry').mockResolvedValue(undefined);
    let currentPathname = '/galaxy';
    const historyListeners = new Set<() => void>();
    const mockRouter: AppRouterAdapter = {
      get state() {
        return { location: { pathname: currentPathname, searchStr: '' } };
      },
      history: {
        subscribe: (cb) => {
          historyListeners.add(cb);
          return () => historyListeners.delete(cb);
        },
      },
    };

    render(
      <CanvasRouterBridgeContext.Provider value={mockRouter}>
        <CameraTransitionProvider>
          <CrossScaleStageHost scope="galaxy" centerId="sol" isSpatialSceneMounted />
        </CameraTransitionProvider>
      </CanvasRouterBridgeContext.Provider>,
    );
    await screen.findByTestId('mock-galactic-scene');

    // Navigation intent fires while router.state.location.pathname is still '/galaxy'
    act(() => {
      setPendingSpatialNavigationHref('/system/alpha-centauri');
    });

    expect(getCrossScalePlanePreviewState().mode).toBe('expanding');
    expect(screen.getByTestId('mock-galactic-scene')).toBeInTheDocument();

    // Once router catches up to /system/alpha-centauri, pending intent is cleared
    act(() => {
      currentPathname = '/system/alpha-centauri';
      for (const listener of historyListeners) listener();
    });
    expect(getPendingSpatialRouteTarget()).toBeNull();
  });

  it('starts Stage 1 at t=0ms from router.state.pendingLocation during Back/Forward navigation', async () => {
    vi.spyOn(sceneEntryLoader, 'preloadSceneEntry').mockResolvedValue(undefined);
    let currentPathname = '/galaxy';
    let pendingPathname: string | undefined;
    const historyListeners = new Set<() => void>();
    const mockRouter = {
      get state() {
        return {
          location: { pathname: currentPathname, searchStr: '' },
          ...(pendingPathname ? { pendingLocation: { pathname: pendingPathname } } : {}),
        };
      },
      history: {
        subscribe: (cb: () => void) => {
          historyListeners.add(cb);
          return () => historyListeners.delete(cb);
        },
      },
    } as unknown as AppRouterAdapter;

    render(
      <CanvasRouterBridgeContext.Provider value={mockRouter}>
        <CameraTransitionProvider>
          <CrossScaleStageHost scope="galaxy" centerId="sol" isSpatialSceneMounted />
        </CameraTransitionProvider>
      </CanvasRouterBridgeContext.Provider>,
    );
    await screen.findByTestId('mock-galactic-scene');

    act(() => {
      pendingPathname = '/system/alpha-centauri';
      for (const listener of historyListeners) listener();
    });

    expect(getCrossScalePlanePreviewState().mode).toBe('expanding');
    expect(screen.getByTestId('mock-galactic-scene')).toBeInTheDocument();
  });

  it('holds swap after Stage 1 until matching props arrive (single atomic swap) and falls back after 800ms if props stall', async () => {
    vi.useFakeTimers();
    const durations = computeCrossScaleStageDurations(DEFAULT_CROSS_SCALE_CHOREOGRAPHY_CONFIG);
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(8000);
    vi.spyOn(sceneEntryLoader, 'preloadSceneEntry').mockResolvedValue(undefined);

    let currentPathname = '/galaxy';
    const historyListeners = new Set<() => void>();
    const mockRouter: AppRouterAdapter = {
      get state() {
        return { location: { pathname: currentPathname, searchStr: '' } };
      },
      history: {
        subscribe: (cb) => {
          historyListeners.add(cb);
          return () => historyListeners.delete(cb);
        },
      },
    };

    const { rerender, unmount } = render(
      <CanvasRouterBridgeContext.Provider value={mockRouter}>
        <CameraTransitionProvider>
          <CrossScaleStageHost scope="galaxy" centerId="sol" isSpatialSceneMounted />
        </CameraTransitionProvider>
      </CanvasRouterBridgeContext.Provider>,
    );
    expect(screen.getByTestId('mock-galactic-scene')).toBeInTheDocument();

    act(() => {
      currentPathname = '/system/alpha-centauri';
      for (const listener of historyListeners) listener();
    });

    // Complete Stage 1 while props still have scope="galaxy"
    let t = 8000;
    await act(async () => {
      t = advanceDuration(t, durations.previewSec * 1000, nowSpy);
      advanceDuration(t, durations.departureSec * 1000, nowSpy);
      await Promise.resolve();
    });

    // Must NOT swap yet to synthesized props while waiting (<= 800ms) for matching props
    expect(screen.getByTestId('mock-galactic-scene')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-system-scene')).toBeNull();

    // Matching props arrive 120ms later -> swaps atomically with real centerId
    act(() => {
      vi.advanceTimersByTime(120);
      rerender(
        <CanvasRouterBridgeContext.Provider value={mockRouter}>
          <CameraTransitionProvider>
            <CrossScaleStageHost
              scope="system"
              targetId="alpha-centauri"
              centerId="alpha-centauri-b"
              isSpatialSceneMounted
            />
          </CameraTransitionProvider>
        </CanvasRouterBridgeContext.Provider>,
      );
    });

    const sysScene = screen.getByTestId('mock-system-scene');
    expect(sysScene.getAttribute('data-system-id')).toBe('alpha-centauri');
    expect(sysScene.getAttribute('data-center-id')).toBe('alpha-centauri-b');
    unmount();

    // Subcase 2: falls back after 800ms if matching props never arrive
    currentPathname = '/galaxy';
    const second = render(
      <CanvasRouterBridgeContext.Provider value={mockRouter}>
        <CameraTransitionProvider>
          <CrossScaleStageHost scope="galaxy" centerId="sol" isSpatialSceneMounted />
        </CameraTransitionProvider>
      </CanvasRouterBridgeContext.Provider>,
    );
    expect(screen.getByTestId('mock-galactic-scene')).toBeInTheDocument();

    act(() => {
      currentPathname = '/system/tau-ceti';
      for (const listener of historyListeners) listener();
    });

    t = 9000;
    await act(async () => {
      t = advanceDuration(t, durations.previewSec * 1000, nowSpy);
      advanceDuration(t, durations.departureSec * 1000, nowSpy);
      await Promise.resolve();
    });

    expect(screen.queryByTestId('mock-system-scene')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(799);
    });
    expect(screen.queryByTestId('mock-system-scene')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByTestId('mock-system-scene').getAttribute('data-system-id')).toBe('tau-ceti');
    second.unmount();
  });
});
