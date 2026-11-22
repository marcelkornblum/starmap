import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, screen, act } from '@testing-library/react';
import * as THREE from 'three';
import { CrossScaleStageHost } from './CrossScaleStageHost';
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
  SpatialEntityStoreContext,
} from '../../canvas/entity/SpatialEntityContext';
import { createSpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useUIStore } from '../../../stores/useUIStore';
import { DEG_TO_RADIANS } from '../../../utils/astroCoordinates';
import {
  CROSS_SCALE_STAGE_DURATION_SEC,
  GALACTIC_TO_ECLIPTIC_TILT_DEG,
  computeCrossScaleDepartureFade,
  getCrossScaleTiltRad,
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
    useFrame: (cb: (state: unknown, delta: number) => void) => {
      frameCallbacks.push(cb);
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

function advanceTransitionFrames(stepMs: number[], nowSpy: ReturnType<typeof vi.spyOn>) {
  for (const t of stepMs) {
    nowSpy.mockReturnValue(t);
    for (const cb of [...frameCallbacks]) {
      cb({ camera: mockCamera, controls: mockControls, invalidate: mockInvalidate }, 0.016);
    }
  }
}

describe('CrossScaleStageHost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    frameCallbacks.length = 0;
    setMockReducedMotion(false);
    clearPendingCrossScaleArrival();
    resetCrossScaleInstrumentFade();
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
    clearPendingCrossScaleArrival();
    resetCrossScaleInstrumentFade();
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

  it('executes Stage 1 departure glide, snapshots savedGalaxyCamera, fades instruments, and queues Stage 2 arrival on galaxy -> system', async () => {
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

    // Preload kicked off immediately; outgoing galactic scene stays mounted during Stage 1
    expect(preloadSpy).toHaveBeenCalledWith('system');
    expect(screen.getByTestId('mock-galactic-scene')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-system-scene')).toBeNull();
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);

    // Pre-dive galaxy camera pose was snapshotted before Stage 1 tilted/zoomed
    const saved = useCameraStore.getState().savedGalaxyCamera;
    expect(saved).not.toBeNull();
    expect(saved?.position).toEqual([0, -35, 20]);
    expect(saved?.target).toEqual([0, 0, 0]);

    // Advance halfway (450ms of 900ms Stage 1)
    act(() => {
      advanceTransitionFrames([1000, 1450], nowSpy);
    });

    expect(getCrossScaleInstrumentFade()).toBeCloseTo(computeCrossScaleDepartureFade(0.5), 4);
    expect(mockControls.target.x).toBeGreaterThan(0);

    // Complete Stage 1 (900ms) and flush preload promise
    await act(async () => {
      advanceTransitionFrames([1900], nowSpy);
      await Promise.resolve();
    });

    expect(getCrossScaleInstrumentFade()).toBe(0);
    expect(mockControls.target.x).toBeCloseTo(1.3, 4);
    expect(mockControls.target.y).toBeCloseTo(0.2, 4);
    expect(mockControls.target.z).toBeCloseTo(-0.1, 4);

    // Orbital plane tilt applied (~60.19 deg)
    const upAfterTilt = mockCamera.up.clone().normalize();
    const expectedAngle = GALACTIC_TO_ECLIPTIC_TILT_DEG * DEG_TO_RADIANS;
    expect(Math.acos(Math.min(1, Math.max(-1, upAfterTilt.dot(new THREE.Vector3(0, 0, 1)))))).toBeCloseTo(
      expectedAngle,
      3,
    );

    expect(consumePendingCrossScaleArrival('system')).toEqual({
      direction: 'in',
      targetScope: 'system',
      durationSec: CROSS_SCALE_STAGE_DURATION_SEC,
    });
    const sysScene = await screen.findByTestId('mock-system-scene');
    expect(sysScene.getAttribute('data-system-id')).toBe('alpha-centauri');
  });

  it('uses outward direction and negative tilt when navigating system -> galaxy', async () => {
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
    expect(getCrossScaleTiltRad('system', 'galaxy')).toBeLessThan(0);

    await act(async () => {
      advanceTransitionFrames([2000, 2900], nowSpy);
      await Promise.resolve();
    });

    expect(mockCamera.position.length()).toBeCloseTo(Math.hypot(0, -10, 6) * 2.2, 2);
    expect(consumePendingCrossScaleArrival('galaxy')).toEqual({
      direction: 'out',
      targetScope: 'galaxy',
      durationSec: CROSS_SCALE_STAGE_DURATION_SEC,
    });
    expect(await screen.findByTestId('mock-galactic-scene')).toBeInTheDocument();
  });

  it('triggers two-stage transition and remounts SystemScene when targetId changes across systems', async () => {
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
      advanceTransitionFrames([3000, 3900], nowSpy);
      await Promise.resolve();
    });

    const tauScene = await screen.findByTestId('mock-system-scene');
    expect(tauScene.getAttribute('data-system-id')).toBe('tau-ceti');
    expect(tauScene).not.toBe(solScene);
  });

  it('clears arrival, resets instrument fade, and commits nextProps immediately when interrupted via OrbitControls start', async () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(4000);
    vi.spyOn(sceneEntryLoader, 'preloadSceneEntry').mockResolvedValue(undefined);

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

    act(() => {
      advanceTransitionFrames([4000, 4450], nowSpy);
    });
    expect(getCrossScaleInstrumentFade()).toBeLessThan(1);

    // User grabs controls -> triggers onCancel
    act(() => {
      for (const listener of mockControls.listeners['start'] ?? []) {
        listener();
      }
    });

    expect(hasPendingCrossScaleArrival()).toBe(false);
    expect(getCrossScaleInstrumentFade()).toBe(1);
    expect(await screen.findByTestId('mock-system-scene')).toBeInTheDocument();
  });

  it('swaps immediately with full instrument fade and no arrival glide when prefersReducedMotion is true', async () => {
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
    expect(await screen.findByTestId('mock-system-scene')).toBeInTheDocument();
  });

  it('clears pending arrival and resets instrument fade on unmount during Stage 1', async () => {
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

    act(() => {
      advanceTransitionFrames([5000, 5450], nowSpy);
    });
    expect(getCrossScaleInstrumentFade()).toBeLessThan(1);

    unmount();

    expect(hasPendingCrossScaleArrival()).toBe(false);
    expect(getCrossScaleInstrumentFade()).toBe(1);
  });
});
