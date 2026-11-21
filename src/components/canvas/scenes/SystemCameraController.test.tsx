import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { render } from '@testing-library/react';
import * as THREE from 'three';
import { SystemCameraController } from './SystemCameraController';

let mockCamera: THREE.PerspectiveCamera;
let mockControls: {
  target: { set: ReturnType<typeof vi.fn> };
  update: ReturnType<typeof vi.fn>;
};
const mockInvalidate = vi.fn();

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useThree: (selector?: (s: unknown) => unknown) => {
      const state = {
        camera: mockCamera,
        controls: mockControls,
        size: { width: 1920, height: 1080 },
        invalidate: mockInvalidate,
      };
      return selector ? selector(state) : state;
    },
  };
});

describe('SystemCameraController Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCamera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    mockCamera.position.set(0, 0, 0);
    mockCamera.up.set(0, 1, 0);

    mockControls = {
      target: { set: vi.fn() },
      update: vi.fn(),
    };
  });

  it('updates camera position, up vector, and controls target on mount', () => {
    render(
      createElement(SystemCameraController, {
        position: [10, 20, 30],
        target: [1, 2, 3],
        up: [0, 0, 1],
      }),
    );

    expect(mockCamera.position.x).toBe(10);
    expect(mockCamera.position.y).toBe(20);
    expect(mockCamera.position.z).toBe(30);
    expect(mockCamera.up.z).toBe(1);
    expect(mockControls.target.set).toHaveBeenCalledWith(1, 2, 3);
    expect(mockControls.update).toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
  });

  it('calls invalidate() when camera pose props update', () => {
    const { rerender } = render(
      createElement(SystemCameraController, {
        position: [10, 20, 30],
        target: [1, 2, 3],
        up: [0, 0, 1],
      }),
    );

    mockInvalidate.mockClear();
    rerender(
      createElement(SystemCameraController, {
        position: [20, 30, 40],
        target: [2, 3, 4],
        up: [0, 0, 1],
      }),
    );

    expect(mockInvalidate).toHaveBeenCalledTimes(1);
  });
});
