// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import * as THREE from 'three';
import * as reticleGeomModule from '../cartography/reticleGeometry';
import {
  PlanarGrid,
  PlanarFootprintItem,
  type PlanarFootprintItem as PlanarFootprintItemType,
} from './PlanarGrid';
import { SpatialFrameProvider } from './SpatialFrameProvider';
import { GALACTIC_FRAME } from './referenceFrame';

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useFrame: vi.fn(),
    useThree: () => ({
      camera: new THREE.PerspectiveCamera(45, 1, 0.1, 1000),
      gl: { setClearColor: vi.fn() },
      scene: new THREE.Scene(),
      size: { width: 1920, height: 1080 },
    }),
  };
});

describe('AUD-021: PlanarGrid PlanarFootprintItem BufferGeometry Lifecycle', () => {
  let createReticleSpy: ReturnType<typeof vi.spyOn>;
  let mockGeom: THREE.BufferGeometry;
  let disposeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockGeom = new THREE.BufferGeometry();
    disposeSpy = vi.spyOn(mockGeom, 'dispose');
    createReticleSpy = vi
      .spyOn(reticleGeomModule, 'createReticleGeometry')
      .mockReturnValue(mockGeom);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('allocates geometry once and does not re-invoke createReticleGeometry on re-render with identical props', () => {
    const fp: PlanarFootprintItemType = {
      id: 'test-star-1',
      position: [10, 20, 0],
      classification: 'star',
      size: 15,
      color: '#ffffff',
      opacity: 0.8,
    };

    const { rerender } = render(
      <PlanarFootprintItem
        footprint={fp}
        defaultSize={12}
        defaultColor="#ffffff"
        defaultAlpha={1.0}
      />
    );

    expect(createReticleSpy).toHaveBeenCalledTimes(1);
    expect(createReticleSpy).toHaveBeenCalledWith('star', 15, {
      multiplicity: undefined,
      planets: undefined,
    });

    // Re-render with identical footprint data
    rerender(
      <PlanarFootprintItem
        footprint={fp}
        defaultSize={12}
        defaultColor="#ffffff"
        defaultAlpha={1.0}
      />
    );

    // Geometry creation should remain memoised
    expect(createReticleSpy).toHaveBeenCalledTimes(1);
    expect(disposeSpy).not.toHaveBeenCalled();
  });

  it('calls .dispose() on the geometry when PlanarFootprintItem is unmounted', () => {
    const fp: PlanarFootprintItemType = {
      id: 'test-star-2',
      position: [0, 0, 0],
      classification: 'gas-giant',
    };

    const { unmount } = render(
      <PlanarFootprintItem footprint={fp} />
    );

    expect(createReticleSpy).toHaveBeenCalledTimes(1);
    expect(disposeSpy).not.toHaveBeenCalled();

    unmount();

    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });

  it('disposes previous geometry and re-allocates when geometry-defining props change', () => {
    const fp1: PlanarFootprintItemType = {
      id: 'test-star-3',
      position: [0, 0, 0],
      classification: 'star',
      size: 10,
    };

    const newGeom = new THREE.BufferGeometry();
    const newDisposeSpy = vi.spyOn(newGeom, 'dispose');

    const { rerender } = render(
      <PlanarFootprintItem footprint={fp1} />
    );

    expect(createReticleSpy).toHaveBeenCalledTimes(1);

    // Return new geometry for next invocation
    createReticleSpy.mockReturnValueOnce(newGeom);

    const fp2: PlanarFootprintItemType = {
      ...fp1,
      size: 25, // size changed
    };

    rerender(
      <PlanarFootprintItem footprint={fp2} />
    );

    expect(createReticleSpy).toHaveBeenCalledTimes(2);
    // Old geometry should be disposed
    expect(disposeSpy).toHaveBeenCalledTimes(1);
    expect(newDisposeSpy).not.toHaveBeenCalled();
  });

  it('renders footprints inside PlanarGrid without crashing and cleans up on unmount', () => {
    const footprints: PlanarFootprintItemType[] = [
      { id: 'alpha', position: [5, 5, 0], classification: 'star' },
      { id: 'beta', position: [-5, -5, 0], classification: 'terrestrial' },
    ];

    const { unmount, container } = render(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <PlanarGrid showPlanarFootprint={false} footprints={footprints} />
      </SpatialFrameProvider>
    );

    expect(container).toBeDefined();
    // 1 primary footprint geom + 2 explicit footprints
    expect(createReticleSpy).toHaveBeenCalledTimes(3);

    unmount();
    // Primary footprint geom + both footprint geometries disposed
    expect(disposeSpy).toHaveBeenCalledTimes(3);
  });
});
