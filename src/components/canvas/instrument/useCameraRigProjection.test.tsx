import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { renderHook, act } from '@testing-library/react';
import { useCameraRigProjection } from './useCameraRigProjection';
import { GALACTIC_FRAME } from '../../../config/referenceFrames';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';

describe('useCameraRigProjection', () => {
  let camera: THREE.PerspectiveCamera;
  let target: THREE.Vector3;
  let mockControls: any;
  let threeGet: () => any;

  beforeEach(() => {
    useCameraStore.getState().reset();
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
      enablePan: true,
      screenSpacePanning: false,
      mouseButtons: { LEFT: THREE.MOUSE.ROTATE },
      touches: { ONE: THREE.TOUCH.ROTATE },
      update: vi.fn(),
    };

    const threeState = {
      camera,
      controls: mockControls,
      size: { width: 1920, height: 1080 },
      set: vi.fn((update: any) => {
        if (update.camera) threeState.camera = update.camera;
      }),
      invalidate: vi.fn(),
    };
    threeGet = () => threeState;
  });

  it('initializes projection references and correctly locks and unlocks orthographic mode', () => {
    const { result } = renderHook(() =>
      useCameraRigProjection({
        camera,
        controls: mockControls,
        sizeWidth: 1920,
        sizeHeight: 1080,
        get: threeGet,
        frame: GALACTIC_FRAME,
      }),
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
});
