import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type React from 'react';
import * as THREE from 'three';
import { renderHook, act } from '@testing-library/react';
import { useFrame } from '@react-three/fiber';
import { useCameraRigStoreSync } from './useCameraRigStoreSync';
import type { CameraRigThreeState } from './useCameraRigProjection';
import type { OrbitControlsLike } from './cameraRigZoomAndPan';
import { CameraTransitionProvider } from './useCameraTransition';
import { GALACTIC_FRAME, PLANETARY_FRAME, SYSTEM_FRAME } from '../../../config/referenceFrames';
import {
  STANDARD_CAMERA_DISTANCES,
  getStandardInitialCamera,
} from '../cartography/cartographyCamera';
import { buildCameraBasis } from '../../../utils/orientationProjectionMath';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useUIStore } from '../../../stores/useUIStore';
import { FRAME_PRIORITY } from '../engineConfig';
import type { CardinalDirection } from '../../../types/spatial';

let liveThreeState: CameraRigThreeState;

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: (selector?: (s: unknown) => unknown) => {
    const state = { ...liveThreeState, get: () => liveThreeState };
    return selector ? selector(state) : state;
  },
}));

type MockStoreSyncControls = OrbitControlsLike & {
  target: THREE.Vector3;
  update: ReturnType<typeof vi.fn<() => void>>;
  addEventListener: ReturnType<typeof vi.fn<(type: string, listener: () => void) => void>>;
  removeEventListener: ReturnType<typeof vi.fn<(type: string, listener: () => void) => void>>;
};

function setReducedMotion(reduced: boolean) {
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

describe('useCameraRigStoreSync', () => {
  let camera: THREE.PerspectiveCamera;
  let orthoCamera: THREE.OrthographicCamera;
  let target: THREE.Vector3;
  let mockControls: MockStoreSyncControls;
  let threeGet: () => CameraRigThreeState;
  let mockGlideToCardinal: ReturnType<typeof vi.fn<(cardinal: CardinalDirection) => void>>;
  let persistentTargetRef: { current: THREE.Vector3 };
  let justUnlockedRef: { current: boolean };
  let mockUnlockFromOrthographic: ReturnType<typeof vi.fn<() => void>>;

  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <CameraTransitionProvider>{children}</CameraTransitionProvider>
  );

  beforeEach(() => {
    setReducedMotion(false);
    vi.clearAllMocks();
    useCameraStore.getState().reset();
    useSettingsStore.getState().resetSettings();
    useUIStore.getState().resetUI();
    camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    camera.position.set(20, 20, 20);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    target = new THREE.Vector3(0, 0, 0);

    mockControls = {
      object: camera,
      target,
      enabled: true,
      enableDamping: true,
      enableRotate: true,
      enablePan: true,
      screenSpacePanning: false,
      mouseButtons: { LEFT: THREE.MOUSE.ROTATE },
      touches: { ONE: THREE.TOUCH.ROTATE },
      addEventListener: vi.fn<(type: string, listener: () => void) => void>(),
      removeEventListener: vi.fn<(type: string, listener: () => void) => void>(),
      update: vi.fn<() => void>(),
    };

    liveThreeState = {
      camera,
      controls: mockControls,
      set: vi.fn((update: { camera?: THREE.PerspectiveCamera | THREE.OrthographicCamera }) => {
        if (update.camera) liveThreeState.camera = update.camera;
      }),
      invalidate: vi.fn(),
    };
    threeGet = () => liveThreeState;
    mockGlideToCardinal = vi.fn<(cardinal: CardinalDirection) => void>();
    persistentTargetRef = { current: new THREE.Vector3(0, 0, 0) };
    justUnlockedRef = { current: false };
    mockUnlockFromOrthographic = vi.fn(() => {
      liveThreeState.camera = camera;
      mockControls.object = camera;
      justUnlockedRef.current = true;
    });
  });

  afterEach(() => {
    setReducedMotion(false);
    vi.restoreAllMocks();
  });

  function renderSyncHook(frame = GALACTIC_FRAME) {
    return renderHook(
      () =>
        useCameraRigStoreSync({
          camera,
          controls: mockControls,
          get: threeGet,
          frame,
          configuredBaseFov: frame.camera.baseFov,
          snapThresholdRad: (10 * Math.PI) / 180,
          perspCamRef: { current: camera },
          orthoCamRef: { current: orthoCamera },
          persistentTargetRef,
          justUnlockedRef,
          isOrthoAllowed: () => true,
          lockToOrthographic: vi.fn(),
          unlockFromOrthographic: mockUnlockFromOrthographic,
          glideToCardinal: mockGlideToCardinal,
        }),
      { wrapper },
    );
  }

  function getFrameCallbacks() {
    const transitionFrameCb = vi.mocked(useFrame).mock.calls.find(
      ([, priority]) => priority === FRAME_PRIORITY.cameraTransition,
    )?.[0];
    const rigFrameCb = vi.mocked(useFrame).mock.calls.find(
      ([, priority]) => priority === FRAME_PRIORITY.cameraRig,
    )?.[0];
    return { transitionFrameCb, rigFrameCb };
  }

  it('responds to pendingAxisRequest by invoking glideToCardinal', () => {
    renderSyncHook();
    act(() => { useCameraStore.getState().requestAxisView('top'); });
    expect(mockGlideToCardinal).toHaveBeenCalledWith('top');
    expect(useCameraStore.getState().pendingAxisRequest).toBeNull();
  });

  it('glides smoothly on reset preset via CameraTransitionProvider and settles at default pose', () => {
    const perfSpy = vi.spyOn(performance, 'now').mockReturnValue(1000);
    renderSyncHook();
    const { transitionFrameCb, rigFrameCb } = getFrameCallbacks();
    expect(transitionFrameCb).toBeDefined();
    expect(rigFrameCb).toBeDefined();

    act(() => { useCameraStore.getState().applyPreset('reset'); });
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);
    expect(camera.position.x).toBe(20);

    act(() => { transitionFrameCb?.(liveThreeState as never, 0.016); });
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);

    perfSpy.mockReturnValue(3000);
    act(() => { transitionFrameCb?.(liveThreeState as never, 0.016); });

    const defPos = GALACTIC_FRAME.camera.defaultPosition ?? [0, -35, 20];
    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(camera.position.x).toBeCloseTo(defPos[0], 3);
    expect(camera.position.y).toBeCloseTo(defPos[1], 3);
    expect(camera.position.z).toBeCloseTo(defPos[2], 3);
    perfSpy.mockRestore();
  });

  it('glides smoothly on radial preset to canonical 32 deg elevation / 14 deg azimuth while preserving target and distance', () => {
    const perfSpy = vi.spyOn(performance, 'now').mockReturnValue(1000);
    target.set(5, -3, 2);
    persistentTargetRef.current.set(5, -3, 2);
    camera.position.set(5, -3, 22);
    camera.up.set(0, 1, 0);
    const initialDist = camera.position.distanceTo(target);
    renderSyncHook();
    const { transitionFrameCb } = getFrameCallbacks();

    act(() => { useCameraStore.getState().applyPreset('radial'); });
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);
    expect(camera.position.x).toBe(5);

    act(() => { transitionFrameCb?.(liveThreeState as never, 0.016); });
    perfSpy.mockReturnValue(3000);
    act(() => { transitionFrameCb?.(liveThreeState as never, 0.016); });

    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(camera.position.distanceTo(target)).toBeCloseTo(initialDist, 2);
    expect(target.toArray()).toEqual([5, -3, 2]);
    expect(camera.up.toArray()).toEqual([0, 0, 1]);

    const expected = getStandardInitialCamera(initialDist, [5, -3, 2], 45);
    expect(camera.position.x).toBeCloseTo(expected.position[0], 2);
    expect(camera.position.y).toBeCloseTo(expected.position[1], 2);
    expect(camera.position.z).toBeCloseTo(expected.position[2], 2);

    const basis = buildCameraBasis(
      [camera.position.x, camera.position.y, camera.position.z],
      [target.x, target.y, target.z],
      [camera.up.x, camera.up.y, camera.up.z],
    );
    expect(basis.elevationDeg).toBeCloseTo(32, 1);
    expect(basis.azimuthDeg).toBeCloseTo(14, 1);
    expect(useCameraStore.getState().savedGalaxyCamera).toBeNull();
    perfSpy.mockRestore();
  });

  it('updates savedGalaxyCamera on radial preset in GALACTIC_FRAME when savedGalaxyCamera is already present', () => {
    setReducedMotion(true);
    target.set(5, -3, 2);
    persistentTargetRef.current.set(5, -3, 2);
    camera.position.set(5, -3, 22);
    camera.up.set(0, 1, 0);
    useCameraStore.getState().setSavedGalaxyCamera({
      position: [5, -3, 22],
      target: [5, -3, 2],
      up: [0, 1, 0],
      zoom: 1,
      focalDistance: 20,
      centerKey: '5,-3,2',
    });

    renderSyncHook(GALACTIC_FRAME);
    act(() => { useCameraStore.getState().applyPreset('radial'); });

    const expected = getStandardInitialCamera(20, [5, -3, 2], GALACTIC_FRAME.camera.baseFov);
    const saved = useCameraStore.getState().savedGalaxyCamera;
    expect(saved).not.toBeNull();
    expect(saved?.target).toEqual([5, -3, 2]);
    expect(saved?.up).toEqual([0, 0, 1]);
    expect(saved?.centerKey).toBe('5,-3,2');
    expect(saved?.focalDistance).toBeCloseTo(20, 2);
    expect(saved?.position[0]).toBeCloseTo(expected.position[0], 2);
    expect(saved?.position[1]).toBeCloseTo(expected.position[1], 2);
    expect(saved?.position[2]).toBeCloseTo(expected.position[2], 2);
  });

  it('handles reset-zoom by preserving target, resetting distance to scope standard, resetting zoom to 1, and updating savedGalaxyCamera if present', () => {
    const perfSpy = vi.spyOn(performance, 'now').mockReturnValue(1000);
    target.set(6, -2, 1);
    persistentTargetRef.current.set(6, -2, 1);
    camera.position.set(6, -2, 81);
    camera.zoom = 2.0;
    camera.updateProjectionMatrix();
    useCameraStore.getState().setSavedGalaxyCamera({
      position: [6, -2, 81],
      target: [6, -2, 1],
      up: [0, 0, 1],
      zoom: 2.0,
      focalDistance: 80,
      centerKey: '6,-2,1',
    });

    renderSyncHook(GALACTIC_FRAME);
    const { transitionFrameCb } = getFrameCallbacks();

    act(() => { useCameraStore.getState().resetZoom(); });
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);

    act(() => { transitionFrameCb?.(liveThreeState as never, 0.016); });
    perfSpy.mockReturnValue(3000);
    act(() => { transitionFrameCb?.(liveThreeState as never, 0.016); });

    const expected = getStandardInitialCamera(
      STANDARD_CAMERA_DISTANCES.galactic,
      [6, -2, 1],
      GALACTIC_FRAME.camera.baseFov,
    );
    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(camera.zoom).toBe(1.0);
    expect(target.toArray()).toEqual([6, -2, 1]);
    expect(camera.position.x).toBeCloseTo(expected.position[0], 2);
    expect(camera.position.y).toBeCloseTo(expected.position[1], 2);
    expect(camera.position.z).toBeCloseTo(expected.position[2], 2);
    expect(useCameraStore.getState().savedGalaxyCamera).toEqual(
      expect.objectContaining({
        target: [6, -2, 1],
        zoom: 1,
        centerKey: '6,-2,1',
      }),
    );
    expect(useCameraStore.getState().savedGalaxyCamera?.focalDistance).toBeCloseTo(
      STANDARD_CAMERA_DISTANCES.galactic,
      2,
    );
    perfSpy.mockRestore();
  });

  it('uses scope standard distances for system and planetary frames on reset-zoom', () => {
    setReducedMotion(true);
    camera.position.set(0, 0, 50);
    const systemHook = renderSyncHook(SYSTEM_FRAME);
    act(() => { useCameraStore.getState().resetZoom(); });
    expect(camera.position.distanceTo(target)).toBeCloseTo(STANDARD_CAMERA_DISTANCES.system, 2);
    systemHook.unmount();

    camera.position.set(0, 0, 200);
    const planetHook = renderSyncHook(PLANETARY_FRAME);
    act(() => { useCameraStore.getState().resetZoom(); });
    expect(camera.position.distanceTo(target)).toBeCloseTo(STANDARD_CAMERA_DISTANCES.planetary, 2);
    planetHook.unmount();
  });

  it('handles reset-position by returning target to origin, clearing pendingCenterSlug, resetting zoom, and saving galactic pose', () => {
    setReducedMotion(true);
    liveThreeState.camera = orthoCamera;
    useSettingsStore.getState().setProjection('top-down');
    persistentTargetRef.current.set(12, -8, 4);
    mockControls.target.set(12, -8, 4);
    camera.position.set(12, -8, 60);
    camera.zoom = 1.8;
    camera.updateProjectionMatrix();
    useCameraStore.getState().setPendingCenterSlug('tau-ceti');

    renderSyncHook(GALACTIC_FRAME);
    act(() => { useCameraStore.getState().resetPosition(); });

    const expected = getStandardInitialCamera(
      STANDARD_CAMERA_DISTANCES.galactic,
      [0, 0, 0],
      GALACTIC_FRAME.camera.baseFov,
    );
    expect(mockUnlockFromOrthographic).toHaveBeenCalledTimes(1);
    expect(useSettingsStore.getState().projection).toBe('3d');
    expect(justUnlockedRef.current).toBe(false);
    expect(useCameraStore.getState().pendingCenterSlug).toBeNull();
    expect(persistentTargetRef.current.toArray()).toEqual([0, 0, 0]);
    expect(mockControls.target.toArray()).toEqual([0, 0, 0]);
    expect(camera.zoom).toBe(1.0);
    expect(camera.position.x).toBeCloseTo(expected.position[0], 2);
    expect(camera.position.y).toBeCloseTo(expected.position[1], 2);
    expect(camera.position.z).toBeCloseTo(expected.position[2], 2);
    expect(useCameraStore.getState().savedGalaxyCamera).toEqual(
      expect.objectContaining({
        target: [0, 0, 0],
        zoom: 1,
        centerKey: '0,0,0',
      }),
    );
    expect(useCameraStore.getState().savedGalaxyCamera?.focalDistance).toBeCloseTo(
      STANDARD_CAMERA_DISTANCES.galactic,
      2,
    );
  });

  it('clears justUnlockedRef and updates persistentTargetRef on reset after ortho-unlock + reduced motion so useFrame does not overwrite target', () => {
    setReducedMotion(true);
    liveThreeState.camera = orthoCamera;
    persistentTargetRef.current.set(50, 25, 0);
    mockControls.target.set(50, 25, 0);

    renderSyncHook();
    const { rigFrameCb } = getFrameCallbacks();

    act(() => { useCameraStore.getState().applyPreset('reset'); });

    const defTarget = GALACTIC_FRAME.camera.defaultTarget ?? [0, 0, 0];
    expect(mockUnlockFromOrthographic).toHaveBeenCalledTimes(1);
    expect(justUnlockedRef.current).toBe(false);
    expect(persistentTargetRef.current.toArray()).toEqual([...defTarget]);
    expect(mockControls.target.toArray()).toEqual([...defTarget]);

    act(() => { rigFrameCb?.(liveThreeState as never, 0.016); });
    expect(mockControls.target.toArray()).toEqual([...defTarget]);
  });

  it('suppresses syncPoseToStore during isCameraTransitioning and syncs once when the transition completes', () => {
    renderSyncHook();
    const changeListener = mockControls.addEventListener.mock.calls.find(([event]) => event === 'change')?.[1];
    const endListener = mockControls.addEventListener.mock.calls.find(([event]) => event === 'end')?.[1];
    const { rigFrameCb } = getFrameCallbacks();
    expect(changeListener).toBeDefined();
    expect(endListener).toBeDefined();

    const setPoseSpy = vi.spyOn(useCameraStore.getState(), 'setCameraPose');
    setPoseSpy.mockClear();

    act(() => { useUIStore.getState().setCameraTransitioning(true); });
    camera.position.set(0, 0, 50);

    act(() => {
      changeListener?.();
      endListener?.();
      rigFrameCb?.(liveThreeState as never, 0.016);
    });
    expect(setPoseSpy).not.toHaveBeenCalled();
    expect(mockGlideToCardinal).not.toHaveBeenCalled();

    act(() => { useUIStore.getState().setCameraTransitioning(false); });
    expect(setPoseSpy).toHaveBeenCalledTimes(1);
    expect(useCameraStore.getState().position).toEqual([0, 0, 50]);
    expect(useCameraStore.getState().up).toEqual([0, 0, 1]);

    camera.position.set(50, 60, 70);
    act(() => {
      useUIStore.getState().setCameraTransitioning(false);
      endListener?.();
    });
    expect(setPoseSpy).toHaveBeenCalledTimes(2);
    expect(useCameraStore.getState().position).toEqual([50, 60, 70]);
    setPoseSpy.mockRestore();
  });

  it('syncs camera.up changes to useCameraStore via setCameraPose when upDiff exceeds 1e-3', () => {
    renderSyncHook();
    const endListener = mockControls.addEventListener.mock.calls.find(([event]) => event === 'end')?.[1];
    expect(useCameraStore.getState().up).toEqual([0, 0, 1]);

    const setPoseSpy = vi.spyOn(useCameraStore.getState(), 'setCameraPose');
    setPoseSpy.mockClear();

    camera.up.set(0, 1, 0);
    act(() => {
      endListener?.();
    });

    expect(setPoseSpy).toHaveBeenCalledTimes(1);
    expect(useCameraStore.getState().up).toEqual([0, 1, 0]);
    setPoseSpy.mockRestore();
  });

  it('exits 2D top-down projection back to 3d when reset or radial preset runs', () => {
    renderSyncHook();

    act(() => {
      useSettingsStore.getState().setProjection('top-down');
      useCameraStore.getState().applyPreset('reset');
    });
    expect(useSettingsStore.getState().projection).toBe('3d');

    act(() => {
      useSettingsStore.getState().setProjection('top-down');
      useCameraStore.getState().applyPreset('radial');
    });
    expect(useSettingsStore.getState().projection).toBe('3d');
  });

  it('enforces orthographic control locks in useFrame when projection is top-down even if enableOrthographicProjection is false', () => {
    useSettingsStore.setState({
      enableOrthographicProjection: false,
      projection: 'top-down',
    });
    useCameraStore.getState().setLocked(true);
    liveThreeState.camera = orthoCamera;

    renderSyncHook();
    const { rigFrameCb } = getFrameCallbacks();

    mockControls.enableRotate = true;
    mockControls.enablePan = false;
    mockControls.screenSpacePanning = false;
    if (mockControls.mouseButtons) mockControls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    if (mockControls.touches) mockControls.touches.ONE = THREE.TOUCH.ROTATE;
    mockControls.object = camera;

    act(() => {
      rigFrameCb?.(liveThreeState as never, 0.016);
    });

    expect(mockControls.enableRotate).toBe(false);
    expect(mockControls.enablePan).toBe(true);
    expect(mockControls.screenSpacePanning).toBe(true);
    expect(mockControls.mouseButtons?.LEFT).toBe(THREE.MOUSE.PAN);
    expect(mockControls.touches?.ONE).toBe(THREE.TOUCH.PAN);
    expect(mockControls.object).toBe(orthoCamera);
  });

  it('reads live get().controls target in syncPoseToStore and avoids setCameraPose when pose is unchanged', () => {
    const { result } = renderSyncHook();
    const setPoseSpy = vi.spyOn(useCameraStore.getState(), 'setCameraPose');
    setPoseSpy.mockClear();

    act(() => {
      result.current.syncPoseToStore();
    });
    expect(setPoseSpy).not.toHaveBeenCalled();

    const replacementTarget = new THREE.Vector3(12, -4, 7);
    liveThreeState.controls = {
      ...mockControls,
      target: replacementTarget,
    };

    act(() => {
      result.current.syncPoseToStore();
    });
    expect(setPoseSpy).toHaveBeenCalledTimes(1);
    expect(useCameraStore.getState().target).toEqual([12, -4, 7]);
    setPoseSpy.mockRestore();
  });
});
