import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ReactThreeTest from '@react-three/test-renderer';
import * as THREE from 'three';
import * as reticleGeomModule from '../cartography/reticleGeometry';
import {
  PlanarGrid,
  PlanarFootprintItem,
  type PlanarFootprintItem as PlanarFootprintItemType,
} from './PlanarGrid';
import { SpatialFrameProvider } from './SpatialFrameProvider';
import { GALACTIC_FRAME } from '../../../config/referenceFrames';
import { NOOP_RAYCAST } from '../engineConfig';

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
    vi.restoreAllMocks();
  });

  it('allocates geometry once and does not re-invoke createReticleGeometry on re-render with identical props', async () => {
    const fp: PlanarFootprintItemType = {
      id: 'test-star-1',
      position: [10, 20, 0],
      classification: 'star',
      size: 15,
      color: '#ffffff',
      opacity: 0.8,
    };

    const renderer = await ReactThreeTest.create(
      <PlanarFootprintItem
        footprint={fp}
        defaultSize={12}
        defaultColor="#ffffff"
        defaultAlpha={1.0}
      />,
    );

    expect(createReticleSpy).toHaveBeenCalledTimes(1);
    expect(createReticleSpy).toHaveBeenCalledWith('star', 15, {
      multiplicity: undefined,
      planets: undefined,
    });

    // Re-render with identical footprint data
    await renderer.update(
      <PlanarFootprintItem
        footprint={fp}
        defaultSize={12}
        defaultColor="#ffffff"
        defaultAlpha={1.0}
      />,
    );

    // Geometry creation should remain memoised
    expect(createReticleSpy).toHaveBeenCalledTimes(1);
    expect(disposeSpy).not.toHaveBeenCalled();

    await renderer.unmount();
  });

  it('calls .dispose() on the geometry when PlanarFootprintItem is unmounted', async () => {
    const fp: PlanarFootprintItemType = {
      id: 'test-star-2',
      position: [0, 0, 0],
      classification: 'gas-giant',
    };

    const renderer = await ReactThreeTest.create(
      <PlanarFootprintItem footprint={fp} />,
    );

    expect(createReticleSpy).toHaveBeenCalledTimes(1);
    expect(disposeSpy).not.toHaveBeenCalled();

    await renderer.unmount();

    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });

  it('disposes previous geometry and re-allocates when geometry-defining props change', async () => {
    const fp1: PlanarFootprintItemType = {
      id: 'test-star-3',
      position: [0, 0, 0],
      classification: 'star',
      size: 10,
    };

    const newGeom = new THREE.BufferGeometry();
    const newDisposeSpy = vi.spyOn(newGeom, 'dispose');

    const renderer = await ReactThreeTest.create(
      <PlanarFootprintItem footprint={fp1} />,
    );

    expect(createReticleSpy).toHaveBeenCalledTimes(1);

    // Return new geometry for next invocation
    createReticleSpy.mockReturnValueOnce(newGeom);

    const fp2: PlanarFootprintItemType = {
      ...fp1,
      size: 25, // size changed
    };

    await renderer.update(
      <PlanarFootprintItem footprint={fp2} />,
    );

    expect(createReticleSpy).toHaveBeenCalledTimes(2);
    // Old geometry should be disposed
    expect(disposeSpy).toHaveBeenCalledTimes(1);
    expect(newDisposeSpy).not.toHaveBeenCalled();

    await renderer.unmount();
  });

  it('renders footprints inside PlanarGrid without crashing and cleans up on unmount', async () => {
    const footprints: PlanarFootprintItemType[] = [
      { id: 'alpha', position: [5, 5, 0], classification: 'star' },
      { id: 'beta', position: [-5, -5, 0], classification: 'terrestrial' },
    ];

    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <PlanarGrid showPlanarFootprint={false} footprints={footprints} />
      </SpatialFrameProvider>,
    );

    expect(renderer.scene).toBeDefined();
    // 1 primary footprint geom + 2 explicit footprints
    expect(createReticleSpy).toHaveBeenCalledTimes(3);

    await renderer.unmount();
    // Primary footprint geom + both footprint geometries disposed
    expect(disposeSpy).toHaveBeenCalledTimes(3);
  });

  it('attaches NOOP_RAYCAST to PlanarFootprintItem and PlanarGrid elements', async () => {
    const fp: PlanarFootprintItemType = {
      id: 'test-star-fp',
      position: [0, 0, 0],
      classification: 'star',
    };
    const fpRenderer = await ReactThreeTest.create(
      <PlanarFootprintItem footprint={fp} />,
    );
    const fpLines = fpRenderer.scene.find((node) => node.type === 'LineSegments');
    expect(fpLines.props.raycast).toBe(NOOP_RAYCAST);
    await fpRenderer.unmount();

    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <PlanarGrid showFill={true} showPlanarGrid={true} showPlanarFootprint={true} />
      </SpatialFrameProvider>,
    );
    const fill = renderer.scene.find((node) => node.props.name === 'datum-plane-fill');
    expect(fill.props.raycast).toBe(NOOP_RAYCAST);
    const boundary = renderer.scene.find((node) => node.props.name === 'datum-plane-boundary');
    expect(boundary.props.raycast).toBe(NOOP_RAYCAST);
    const grid = renderer.scene.find((node) => node.props.name === 'planar-galactic-grid');
    expect(grid.props.raycast).toBe(NOOP_RAYCAST);
    const core = renderer.scene.find((node) => node.props.name === 'bearing-core');
    expect(core.props.raycast).toBe(NOOP_RAYCAST);
    const orbital = renderer.scene.find((node) => node.props.name === 'bearing-orbital');
    expect(orbital.props.raycast).toBe(NOOP_RAYCAST);
    const footprint = renderer.scene.find((node) => node.props.name === 'planar-footprint');
    expect(footprint.children[0].props.raycast).toBe(NOOP_RAYCAST);
    await renderer.unmount();
  });
});
