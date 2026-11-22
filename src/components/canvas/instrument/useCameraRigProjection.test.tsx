import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type React from 'react';
import * as THREE from 'three';
import { renderHook, act } from '@testing-library/react';
import { useFrame } from '@react-three/fiber';
import { useCameraRigProjection, type CameraRigThreeState } from './useCameraRigProjection';
import type { OrbitControlsLike } from './cameraRigZoomAndPan';
import { CameraTransitionProvider } from './useCameraTransition';
import { GALACTIC_FRAME } from '../../../config/referenceFrames';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useUIStore } from '../../../stores/useUIStore';
import { FRAME_PRIORITY } from '../engineConfig';

let liveThreeState: CameraRigThreeState;

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: (selector?: (s: unknown) => unknown) => {
    const state = {
      ...liveThreeState,
      get: () => liveThreeState,
    };
    return selector ? selector(state) : state;
  },
}));

describe('useCameraRigProjection', () => {
  let camera: THREE.PerspectiveCamera;
  let target: THREE.Vector3;
  let mockControls: OrbitControlsLike;
  let threeGet: () => CameraRigThreeState;

  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <CameraTransitionProvider>{children}</CameraTransitionProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    useCameraStore.getState().reset();
    useUIStore.getState().resetUI();
    useSettingsStore.setState({ enableOrthographicProjection: true });

    camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    camera.position.set(20, 20, 20);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    target = new THREE.Vector3(0, 0, 0);

    mockControls = {
      object: camera,
      target,
      enableRotate: true,
      enableDamping: true,
      enablePan: true,
      screenSpacePanning: false,
      mouseButtons: { LEFT: THREE.MOUSE.ROTATE },
      touches: { ONE: THREE.TOUCH.ROTATE },
      update: vi.fn(),
    };

    liveThreeState = {
      camera,
      controls: mockControls,
      size: { width: 1920, height: 1080 },
      set: vi.fn((update: { camera?: THREE.PerspectiveCamera | THREE.OrthographicCamera }) => {
        if (update.camera) liveThreeState.camera = update.camera;
      }),
      invalidate: vi.fn(),
    };
    threeGet = () => liveThreeState;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes projection references and correctly locks and unlocks orthographic mode', () => {
    const { result } = renderHook(
      () =>
        useCameraRigProjection({
          camera,
          controls: mockControls,
          sizeWidth: 1920,
          sizeHeight: 1080,
          get: threeGet,
          frame: GALACTIC_FRAME,
        }),
      { wrapper },
    );

    expect(result.current.configuredBaseFov).toBe(45);
    expect(result.current.perspCamRef.current).toBe(camera);
    expect(result.current.orthoCamRef.current).toBeInstanceOf(THREE.OrthographicCamera);

    act(() => {
      result.current.lockToOrthographic('top');
    });

    expect(useCameraStore.getState().isLocked).toBe(true);
    expect(useCameraStore.getState().mode).toBe('orthographic');
    expect(useCameraStore.getState().activeCardinal).toBe('top');

    act(() => {
      result.current.unlockFromOrthographic();
    });

    expect(useCameraStore.getState().isLocked).toBe(false);
    expect(useCameraStore.getState().mode).toBe('perspective');
    expect(useCameraStore.getState().activeCardinal).toBeNull();
  });

  it('glides to cardinal via CameraTransitionProvider and locks to orthographic on settle (including 180-degree flips without NaN)', () => {
    const perfSpy = vi.spyOn(performance, 'now').mockReturnValue(1000);

    const { result } = renderHook(
      () =>
        useCameraRigProjection({
          camera,
          controls: mockControls,
          sizeWidth: 1920,
          sizeHeight: 1080,
          get: threeGet,
          frame: GALACTIC_FRAME,
          snapDuration: 0.5,
        }),
      { wrapper },
    );

    const transitionFrameCb = vi.mocked(useFrame).mock.calls.find(
      ([, priority]) => priority === FRAME_PRIORITY.cameraTransition,
    )?.[0];
    expect(transitionFrameCb).toBeDefined();

    // Start upside-down at top pole with inverted up vector to exercise 180-degree flip edge case
    camera.position.set(0, 0, 30);
    camera.up.set(0, -1, 0);
    camera.lookAt(0, 0, 0);

    act(() => {
      result.current.glideToCardinal('bottom');
    });

    expect(useUIStore.getState().isCameraTransitioning).toBe(false);

    act(() => {
      transitionFrameCb?.(liveThreeState as never, 0.016);
      perfSpy.mockReturnValue(1250);
      transitionFrameCb?.(liveThreeState as never, 0.016);
    });
    expect(Number.isNaN(camera.position.x)).toBe(false);
    expect(Number.isNaN(camera.up.x)).toBe(false);
    expect(Number.isNaN(camera.up.y)).toBe(false);
    expect(Number.isNaN(camera.up.z)).toBe(false);

    perfSpy.mockReturnValue(1500);
    act(() => {
      transitionFrameCb?.(liveThreeState as never, 0.016);
    });

    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
    expect(useCameraStore.getState().isLocked).toBe(true);
    expect(useCameraStore.getState().activeCardinal).toBe('bottom');
    expect(liveThreeState.camera).toBe(result.current.orthoCamRef.current);

    act(() => {
      result.current.glideToCardinal('front');
    });
    expect(mockControls.object).toBe(camera);
    expect(mockControls.enableRotate).toBe(true);
    expect(useUIStore.getState().isCameraTransitioning).toBe(false);

    perfSpy.mockReturnValue(2000);
    act(() => {
      transitionFrameCb?.(liveThreeState as never, 0.016);
      perfSpy.mockReturnValue(2500);
      transitionFrameCb?.(liveThreeState as never, 0.016);
    });
    expect(useCameraStore.getState().isLocked).toBe(true);
    expect(useCameraStore.getState().activeCardinal).toBe('front');
  });

  it('does not mutate controls minDistance or maxDistance synchronously during render', () => {
    let minVal = 0;
    let maxVal = 0;
    const minCallsDuringRender: number[] = [];
    const maxCallsDuringRender: number[] = [];
    let isRendering = true;

    const trackedControls: OrbitControlsLike = {
      ...mockControls,
      get minDistance() {
        return minVal;
      },
      set minDistance(v: number) {
        minVal = v;
        if (isRendering) minCallsDuringRender.push(v);
      },
      get maxDistance() {
        return maxVal;
      },
      set maxDistance(v: number) {
        maxVal = v;
        if (isRendering) maxCallsDuringRender.push(v);
      },
    };

    renderHook(
      () => {
        isRendering = true;
        const hookResult = useCameraRigProjection({
          camera,
          controls: trackedControls,
          sizeWidth: 1920,
          sizeHeight: 1080,
          get: threeGet,
          frame: GALACTIC_FRAME,
        });
        isRendering = false;
        return hookResult;
      },
      { wrapper },
    );

    expect(minCallsDuringRender).toEqual([]);
    expect(maxCallsDuringRender).toEqual([]);
    expect(minVal).toBe(GALACTIC_FRAME.camera.minDistance);
    expect(maxVal).toBe(GALACTIC_FRAME.camera.maxDistance);
  });

  it('initializes orthoCam far from frame.camera.far and expands PerspectiveCamera far when smaller', () => {
    expect(camera.far).toBe(1000);
    const updateProjSpy = vi.spyOn(camera, 'updateProjectionMatrix');

    const { result } = renderHook(
      () =>
        useCameraRigProjection({
          camera,
          controls: mockControls,
          sizeWidth: 1920,
          sizeHeight: 1080,
          get: threeGet,
          frame: GALACTIC_FRAME,
        }),
      { wrapper },
    );

    expect(result.current.orthoCamRef.current.far).toBe(GALACTIC_FRAME.camera.far);
    expect(camera.far).toBe(GALACTIC_FRAME.camera.far);
    expect(updateProjSpy).toHaveBeenCalled();
  });

  it('allows upward frame.camera.maxDistance increases without clamping to stale controls.maxDistance or restoring prevMax on rerender', () => {
    mockControls.maxDistance = 50;
    const frame50 = {
      ...GALACTIC_FRAME,
      camera: { ...GALACTIC_FRAME.camera, minDistance: 2.5, maxDistance: 50 },
    };
    const frame120 = {
      ...GALACTIC_FRAME,
      camera: { ...GALACTIC_FRAME.camera, minDistance: 2.5, maxDistance: 120 },
    };

    const { rerender } = renderHook(
      ({ frame }) =>
        useCameraRigProjection({
          camera,
          controls: mockControls,
          sizeWidth: 1920,
          sizeHeight: 1080,
          get: threeGet,
          frame,
        }),
      { initialProps: { frame: frame50 }, wrapper },
    );

    expect(mockControls.minDistance).toBe(2.5);
    expect(mockControls.maxDistance).toBe(50);

    rerender({ frame: frame120 });
    expect(mockControls.maxDistance).toBe(120);
  });

  it('syncs orthographic minZoom/maxZoom on lock and reactively updates them when distance bounds change while locked', () => {
    const initialFrame = {
      ...GALACTIC_FRAME,
      camera: { ...GALACTIC_FRAME.camera, minDistance: 2.5, maxDistance: 80 },
    };
    const expandedFrame = {
      ...GALACTIC_FRAME,
      camera: { ...GALACTIC_FRAME.camera, minDistance: 2.5, maxDistance: 160 },
    };

    const { result, rerender } = renderHook(
      ({ frame }) =>
        useCameraRigProjection({
          camera,
          controls: mockControls,
          sizeWidth: 1920,
          sizeHeight: 1080,
          get: threeGet,
          frame,
        }),
      { initialProps: { frame: initialFrame }, wrapper },
    );

    act(() => {
      result.current.lockToOrthographic('top');
    });

    const minZoomAt80 = mockControls.minZoom!;
    expect(minZoomAt80).toBeGreaterThan(0);
    expect(mockControls.maxZoom).toBeGreaterThan(minZoomAt80);

    rerender({ frame: expandedFrame });
    expect(mockControls.minZoom).toBeCloseTo(minZoomAt80 / 2, 6);
    expect(threeGet().invalidate).toHaveBeenCalled();

    act(() => {
      result.current.unlockFromOrthographic();
    });
    expect(mockControls.minZoom).toBe(0);
    expect(mockControls.maxZoom).toBe(Infinity);
  });
});
