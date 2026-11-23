import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type React from 'react';
import * as THREE from 'three';
import { renderHook, act } from '@testing-library/react';
import { useFrame } from '@react-three/fiber';
import { useCameraRigStoreSync } from './useCameraRigStoreSync';
import type { CameraRigThreeState } from './useCameraRigProjection';
import type { OrbitControlsLike } from './cameraRigZoomAndPan';
import { CameraTransitionProvider } from './useCameraTransition';
import { GALACTIC_FRAME } from '../../../config/referenceFrames';
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

  function renderSyncHook() {
    return renderHook(
      () =>
        useCameraRigStoreSync({
          camera,
          controls: mockControls,
          get: threeGet,
          frame: GALACTIC_FRAME,
          configuredBaseFov: 45,
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

  it('glides smoothly on radial preset and settles at 30 deg pitch / -45 deg yaw', () => {
    const perfSpy = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const initialDist = camera.position.distanceTo(target);
    renderSyncHook();
    const { transitionFrameCb } = getFrameCallbacks();

    act(() => { useCameraStore.getState().applyPreset('radial'); });
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);
    expect(camera.position.x).toBe(20);

    act(() => { transitionFrameCb?.(liveThreeState as never, 0.016); });
    perfSpy.mockReturnValue(3000);
    act(() => { transitionFrameCb?.(liveThreeState as never, 0.016); });

    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(camera.position.distanceTo(target)).toBeCloseTo(initialDist, 2);
    const dir = camera.position.clone().sub(target).normalize();
    expect(dir.z).toBeCloseTo(Math.sin((30 * Math.PI) / 180), 3);
    perfSpy.mockRestore();
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

  it('suppresses syncPoseToStore in OrbitControls change, end, and useFrame while isCameraTransitioning is true', () => {
    renderSyncHook();
    const changeListener = mockControls.addEventListener.mock.calls.find(([event]) => event === 'change')?.[1];
    const endListener = mockControls.addEventListener.mock.calls.find(([event]) => event === 'end')?.[1];
    const { rigFrameCb } = getFrameCallbacks();
    expect(changeListener).toBeDefined();
    expect(endListener).toBeDefined();

    const setTransformSpy = vi.spyOn(useCameraStore.getState(), 'setCameraTransform');
    setTransformSpy.mockClear();

    act(() => { useUIStore.getState().setCameraTransitioning(true); });
    camera.position.set(0, 0, 50);

    act(() => {
      changeListener?.();
      endListener?.();
      rigFrameCb?.(liveThreeState as never, 0.016);
    });
    expect(setTransformSpy).not.toHaveBeenCalled();
    expect(mockGlideToCardinal).not.toHaveBeenCalled();

    camera.position.set(50, 60, 70);
    act(() => {
      useUIStore.getState().setCameraTransitioning(false);
      endListener?.();
    });
    expect(setTransformSpy).toHaveBeenCalledTimes(1);
    expect(useCameraStore.getState().position).toEqual([50, 60, 70]);
    setTransformSpy.mockRestore();
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
});
