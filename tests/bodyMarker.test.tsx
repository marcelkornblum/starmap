// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { render, fireEvent } from '@testing-library/react';
import * as THREE from 'three';
import { BodyMarker } from '../src/components/canvas/entity/BodyMarker';
import { SpatialEntityProvider } from '../src/components/canvas/entity/SpatialEntityContext';
import { SpatialFrameProvider, GALACTIC_FRAME } from '../src/components/canvas/instrument';

const frameCallbackQueue: Array<(state: any, delta: number) => void> = [];

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useFrame: (cb: (state: any, delta: number) => void) => {
      frameCallbackQueue.push(cb);
    },
    useThree: () => ({
      camera: new THREE.PerspectiveCamera(45, 1, 0.1, 1000),
      gl: { setClearColor: vi.fn() },
      scene: new THREE.Scene(),
      size: { width: 1920, height: 1080 },
    }),
  };
});

describe('BodyMarker Interaction & Matrix Updates (AUD-115, AUD-116)', () => {
  beforeEach(() => {
    frameCallbackQueue.length = 0;
    vi.clearAllMocks();
  });

  it('calls billboardRef.current.updateMatrixWorld(true) after updating transforms in useFrame (AUD-115)', () => {
    const spy = vi.spyOn(THREE.Group.prototype, 'updateMatrixWorld');

    render(
      createElement(
        SpatialEntityProvider,
        null,
        createElement(
          SpatialFrameProvider,
          { frame: GALACTIC_FRAME },
          createElement(BodyMarker, {
            id: 'alpha-centauri',
            position: [1, 2, 3],
          }),
        ),
      ),
    );

    expect(frameCallbackQueue.length).toBeGreaterThan(0);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.quaternion.set(0, 0, 0, 1);

    // Execute useFrame callback for BodyMarker
    frameCallbackQueue[frameCallbackQueue.length - 1](
      { camera, size: { width: 1920, height: 1080 } },
      0.016,
    );

    expect(spy).toHaveBeenCalledWith(true);
    spy.mockRestore();
  });

  it('triggers onClick when pointer jitter is <= 8px (AUD-116)', () => {
    const handleClick = vi.fn();

    const { container } = render(
      createElement(
        SpatialEntityProvider,
        null,
        createElement(
          SpatialFrameProvider,
          { frame: GALACTIC_FRAME },
          createElement(BodyMarker, {
            id: 'sirius',
            position: [0, 0, 0],
            onClick: handleClick,
          }),
        ),
      ),
    );

    const hitarea = container.querySelector('[name="celestial-hitarea"]');
    expect(hitarea).not.toBeNull();

    // Pointer down at (100, 100) and pointer up at (104, 103) -> hypot(4, 3) = 5px <= 8px
    fireEvent.pointerDown(hitarea!, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(hitarea!, { clientX: 104, clientY: 103 });

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith('sirius', expect.anything());
  });

  it('suppresses onClick when pointer movement is > 8px (AUD-116)', () => {
    const handleClick = vi.fn();

    const { container } = render(
      createElement(
        SpatialEntityProvider,
        null,
        createElement(
          SpatialFrameProvider,
          { frame: GALACTIC_FRAME },
          createElement(BodyMarker, {
            id: 'vega',
            position: [0, 0, 0],
            onClick: handleClick,
          }),
        ),
      ),
    );

    const hitarea = container.querySelector('[name="celestial-hitarea"]');
    expect(hitarea).not.toBeNull();

    // Pointer down at (100, 100) and pointer up at (110, 100) -> 10px > 8px
    fireEvent.pointerDown(hitarea!, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(hitarea!, { clientX: 110, clientY: 100 });

    expect(handleClick).not.toHaveBeenCalled();
  });
});
