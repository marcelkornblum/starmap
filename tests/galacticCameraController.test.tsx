// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { render } from '@testing-library/react';
import * as THREE from 'three';
import { GalacticCameraController } from '../src/components/canvas/scenes/GalacticCameraController';
import { useCameraStore } from '../src/stores/useCameraStore';

let mockCamera: THREE.PerspectiveCamera;
let mockControls: {
  target: THREE.Vector3;
  update: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useThree: () => ({
      camera: mockCamera,
      controls: mockControls,
      size: { width: 1920, height: 1080 },
    }),
  };
});

describe('GalacticCameraController Camera Ownership (AUD-110)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCameraStore.getState().reset();
    mockCamera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    mockCamera.position.set(0, -35, 20);
    mockCamera.up.set(0, 0, 1);
    mockCamera.lookAt(0, 0, 0);

    mockControls = {
      target: new THREE.Vector3(0, 0, 0),
      update: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  });

  it('updates camera and controls target when target coordinates change', () => {
    const { rerender } = render(
      createElement(GalacticCameraController, {
        target: [0, 0, 0],
      }),
    );

    expect(mockControls.target.x).toBe(0);
    expect(mockControls.target.y).toBe(0);
    expect(mockControls.target.z).toBe(0);

    // Rerender with new target
    rerender(
      createElement(GalacticCameraController, {
        target: [10, -5, 2],
      }),
    );

    expect(mockControls.target.x).toBe(10);
    expect(mockControls.target.y).toBe(-5);
    expect(mockControls.target.z).toBe(2);
    expect(mockControls.update).toHaveBeenCalled();
  });

  it('does not imperatively stomp camera pose with duplicate restore when target matches savedGalaxyCamera (AUD-110)', () => {
    // Set a saved camera pose matching target [5, 5, 0]
    useCameraStore.getState().setSavedGalaxyCamera({
      position: [5, -30, 20],
      target: [5, 5, 0],
      up: [0, 0, 1],
      zoom: 1.5,
      focalDistance: 35,
      centerKey: '5,5,0',
    });

    // Camera has already been positioned by initial canvas/CameraRig setup
    mockCamera.position.set(5, -30, 20);
    mockCamera.up.set(0, 0, 1);
    mockControls.target.set(5, 5, 0);

    const initialPosCopy = mockCamera.position.clone();

    render(
      createElement(GalacticCameraController, {
        target: [5, 5, 0],
      }),
    );

    // Position remains stable, not jumped or offset
    expect(mockCamera.position.x).toBe(initialPosCopy.x);
    expect(mockCamera.position.y).toBe(initialPosCopy.y);
    expect(mockCamera.position.z).toBe(initialPosCopy.z);
  });
});
