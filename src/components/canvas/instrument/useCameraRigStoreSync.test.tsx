import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { renderHook, act } from '@testing-library/react';
import { useCameraRigStoreSync } from './useCameraRigStoreSync';
import { GALACTIC_FRAME } from '../../../config/referenceFrames';
import { useCameraStore } from '../../../stores/useCameraStore';
import { CardinalTransitionController } from './cameraRigControls';
import type { CardinalDirection } from '../../../types/spatial';

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

describe('useCameraRigStoreSync', () => {
  let camera: THREE.PerspectiveCamera;
  let target: THREE.Vector3;
  let mockControls: any;
  let threeGet: () => any;
  let controller: CardinalTransitionController;
  let mockGlideToCardinal: ReturnType<typeof vi.fn<(cardinal: CardinalDirection) => void>>;

  beforeEach(() => {
    useCameraStore.getState().reset();
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
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      update: vi.fn(),
    };

    const threeState = {
      camera,
      controls: mockControls,
      set: vi.fn(),
      invalidate: vi.fn(),
    };
    threeGet = () => threeState;

    controller = new CardinalTransitionController();
    mockGlideToCardinal = vi.fn<(cardinal: CardinalDirection) => void>();
  });

  it('responds to pendingAxisRequest by invoking glideToCardinal', () => {
    renderHook(() =>
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

    act(() => {
      useCameraStore.getState().requestAxisView('top');
    });

    expect(mockGlideToCardinal).toHaveBeenCalledWith('top');
    expect(useCameraStore.getState().pendingAxisRequest).toBeNull();
  });
});
