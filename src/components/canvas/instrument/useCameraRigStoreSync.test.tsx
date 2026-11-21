import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { renderHook, act } from '@testing-library/react';
import { useFrame } from '@react-three/fiber';
import { useCameraRigStoreSync } from './useCameraRigStoreSync';
import type { CameraRigThreeState } from './useCameraRigProjection';
import type { OrbitControlsLike } from './cameraRigZoomAndPan';
import { GALACTIC_FRAME } from '../../../config/referenceFrames';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useUIStore } from '../../../stores/useUIStore';
import { CardinalTransitionController } from './cameraRigControls';
import type { CardinalDirection } from '../../../types/spatial';

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

type MockStoreSyncControls = OrbitControlsLike & {
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
  let target: THREE.Vector3;
  let mockControls: MockStoreSyncControls;
  let threeState: CameraRigThreeState;
  let threeGet: () => CameraRigThreeState;
  let controller: CardinalTransitionController;
  let mockGlideToCardinal: ReturnType<typeof vi.fn<(cardinal: CardinalDirection) => void>>;

  beforeEach(() => {
    setReducedMotion(false);
    vi.clearAllMocks();
    useCameraStore.getState().reset();
    useUIStore.getState().resetUI();
    camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    camera.position.set(20, 20, 20);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    target = new THREE.Vector3(0, 0, 0);

    mockControls = {
      object: camera,
      target,
      enabled: true,
      enableRotate: true,
      enablePan: true,
      screenSpacePanning: false,
      mouseButtons: { LEFT: THREE.MOUSE.ROTATE },
      touches: { ONE: THREE.TOUCH.ROTATE },
      addEventListener: vi.fn<(type: string, listener: () => void) => void>(),
      removeEventListener: vi.fn<(type: string, listener: () => void) => void>(),
      update: vi.fn(),
    };

    threeState = {
      camera,
      controls: mockControls,
      set: vi.fn(),
      invalidate: vi.fn(),
    };
    threeGet = () => threeState;

    controller = new CardinalTransitionController();
    mockGlideToCardinal = vi.fn<(cardinal: CardinalDirection) => void>();
  });

  afterEach(() => {
    setReducedMotion(false);
  });

  function renderSyncHook() {
    return renderHook(() =>
      useCameraRigStoreSync({
        camera,
        controls: mockControls,
        get: threeGet,
        frame: GALACTIC_FRAME,
        configuredBaseFov: 45,
        snapThresholdRad: (10 * Math.PI) / 180,
        controllerRef: { current: controller },
        perspCamRef: { current: camera },
        orthoCamRef: { current: new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000) },
        persistentTargetRef: { current: new THREE.Vector3(0, 0, 0) },
        justUnlockedRef: { current: false },
        isOrthoAllowed: () => true,
        lockToOrthographic: vi.fn(),
        unlockFromOrthographic: vi.fn(),
        glideToCardinal: mockGlideToCardinal,
      }),
    );
  }

  it('responds to pendingAxisRequest by invoking glideToCardinal', () => {
    renderSyncHook();

    act(() => {
      useCameraStore.getState().requestAxisView('top');
    });

    expect(mockGlideToCardinal).toHaveBeenCalledWith('top');
    expect(useCameraStore.getState().pendingAxisRequest).toBeNull();
  });

  it('glides smoothly on reset preset via CameraTransitionController and settles at default pose', () => {
    const perfSpy = vi.spyOn(performance, 'now').mockReturnValue(1000);
    renderSyncHook();

    const frameCb = vi.mocked(useFrame).mock.calls[0]?.[0];
    expect(frameCb).toBeDefined();

    act(() => {
      useCameraStore.getState().applyPreset('reset');
    });

    // Should enter transitioning state rather than snapping synchronously
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);
    expect(camera.position.x).toBe(20);

    // Frame 0 anchors startTime = 1000
    act(() => {
      frameCb?.(threeState as never, 0.016);
    });
    expect(useUIStore.getState().isCameraTransitioning).toBe(true);

    // Settle after duration
    perfSpy.mockReturnValue(3000);
    act(() => {
      frameCb?.(threeState as never, 0.016);
    });

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
    const frameCb = vi.mocked(useFrame).mock.calls[0]?.[0];

    act(() => {
      useCameraStore.getState().applyPreset('radial');
    });

    expect(useUIStore.getState().isCameraTransitioning).toBe(true);
    expect(camera.position.x).toBe(20);

    act(() => {
      frameCb?.(threeState as never, 0.016);
    });
    perfSpy.mockReturnValue(3000);
    act(() => {
      frameCb?.(threeState as never, 0.016);
    });

    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(camera.position.distanceTo(target)).toBeCloseTo(initialDist, 2);
    const dir = camera.position.clone().sub(target).normalize();
    expect(dir.z).toBeCloseTo(Math.sin((30 * Math.PI) / 180), 3);
    perfSpy.mockRestore();
  });

  it('snaps reset preset immediately when prefersReducedMotion is active', () => {
    setReducedMotion(true);
    renderSyncHook();

    act(() => {
      useCameraStore.getState().applyPreset('reset');
    });

    const defPos = GALACTIC_FRAME.camera.defaultPosition ?? [0, -35, 20];
    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(camera.position.x).toBeCloseTo(defPos[0], 3);
    expect(camera.position.y).toBeCloseTo(defPos[1], 3);
    expect(camera.position.z).toBeCloseTo(defPos[2], 3);
  });

  it('suppresses syncPoseToStore in OrbitControls change and useFrame while isCameraTransitioning is true', () => {
    renderSyncHook();

    const changeListener = mockControls.addEventListener.mock.calls.find(
      ([event]) => event === 'change',
    )?.[1];
    const endListener = mockControls.addEventListener.mock.calls.find(
      ([event]) => event === 'end',
    )?.[1];
    const frameCb = vi.mocked(useFrame).mock.calls[0]?.[0];
    expect(changeListener).toBeDefined();
    expect(endListener).toBeDefined();

    const setTransformSpy = vi.spyOn(useCameraStore.getState(), 'setCameraTransform');
    setTransformSpy.mockClear();

    act(() => {
      useUIStore.getState().setCameraTransitioning(true);
    });
    camera.position.set(50, 60, 70);

    // Trigger OrbitControls 'change' and useFrame during transition -> suppressed
    act(() => {
      changeListener?.();
      frameCb?.(threeState as never, 0.016);
    });
    expect(setTransformSpy).not.toHaveBeenCalled();

    // Settle transition / 'end' -> syncs once
    act(() => {
      useUIStore.getState().setCameraTransitioning(false);
      endListener?.();
    });
    expect(setTransformSpy).toHaveBeenCalledTimes(1);
    expect(useCameraStore.getState().position).toEqual([50, 60, 70]);
    setTransformSpy.mockRestore();
  });
});
