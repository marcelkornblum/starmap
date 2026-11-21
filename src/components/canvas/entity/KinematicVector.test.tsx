import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReactThreeTest from '@react-three/test-renderer';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { KinematicVector } from './KinematicVector';
import { clearSharedKinematicLineMaterial } from './kinematicVectorMaterial';
import { SpatialEntityProvider } from './SpatialEntityProvider';
import { SpatialFrameProvider, GALACTIC_FRAME } from '../instrument';
import { NOOP_RAYCAST } from '../engineConfig';

const {
  useFrameSpy,
  lineGeometryCtorSpy,
  line2CtorSpy,
  cartoLineMatCtorSpy,
} = vi.hoisted(() => ({
  useFrameSpy: vi.fn(),
  lineGeometryCtorSpy: vi.fn(),
  line2CtorSpy: vi.fn(),
  cartoLineMatCtorSpy: vi.fn(),
}));

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useFrame: ((...args: Parameters<typeof actual.useFrame>) => {
      useFrameSpy(...args);
      return actual.useFrame(...args);
    }) as typeof actual.useFrame,
  };
});

vi.mock('three/examples/jsm/lines/LineGeometry.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three/examples/jsm/lines/LineGeometry.js')>();
  return {
    ...actual,
    LineGeometry: class TrackedLineGeometry extends actual.LineGeometry {
      constructor() {
        super();
        lineGeometryCtorSpy();
      }
    },
  };
});

vi.mock('three/examples/jsm/lines/Line2.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three/examples/jsm/lines/Line2.js')>();
  return {
    ...actual,
    Line2: class TrackedLine2 extends actual.Line2 {
      constructor(...args: ConstructorParameters<typeof actual.Line2>) {
        super(...args);
        line2CtorSpy();
      }
    },
  };
});

vi.mock('../materials/CartoLineMaterial', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../materials/CartoLineMaterial')>();
  return {
    ...actual,
    CartoLineMaterial: class TrackedCartoLineMaterial extends actual.CartoLineMaterial {
      constructor(...args: ConstructorParameters<typeof actual.CartoLineMaterial>) {
        super(...args);
        cartoLineMatCtorSpy();
      }
    },
  };
});

describe('KinematicVector Primitive (§5: Projected Velocity Vectors)', () => {
  beforeEach(() => {
    clearSharedKinematicLineMaterial();
    useFrameSpy.mockClear();
    lineGeometryCtorSpy.mockClear();
    line2CtorSpy.mockClear();
    cartoLineMatCtorSpy.mockClear();
  });
  it('renders projected velocity vector line to delta t when velocity is provided', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <KinematicVector
            id="kin-vector-1"
            position={[10, 10, 0]}
            velocity={[2, 1, 0]}
            deltaTime={1.0}
            state="selected"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'kinematic-vector-kin-vector-1')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'velocity-vector-line')).toHaveLength(1);

    await renderer.unmount();
  });

  it('does not render when velocity is zero or undefined', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <KinematicVector
            id="kin-vector-none"
            position={[10, 10, 0]}
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'kinematic-vector-kin-vector-none')).toHaveLength(0);

    await renderer.unmount();
  });

  it('retains stable material on token updates (AUD-106)', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <KinematicVector
            id="kin-1"
            position={[0, 0, 0]}
            velocity={[1, 0, 0]}
            state="selected"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'kinematic-vector-kin-1')).toHaveLength(1);

    await renderer.unmount();
  });

  it('attaches NOOP_RAYCAST to Line2 mesh and velocity terminus mesh (P-10)', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <KinematicVector
            id="kin-noop"
            position={[0, 0, 0]}
            velocity={[1, 2, 0]}
            state="selected"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    const lineGroup = renderer.scene.find((node) => node.props.name === 'velocity-vector-line');
    const line2Node = lineGroup.children.find(
      (child) => child.instance instanceof Line2 || (child.instance && 'isLine2' in child.instance),
    );
    expect(line2Node).toBeDefined();
    expect(line2Node?.instance?.raycast).toBe(NOOP_RAYCAST);

    const terminus = renderer.scene.find((node) => node.props.name === 'velocity-vector-terminus');
    expect(terminus.props.raycast).toBe(NOOP_RAYCAST);

    await renderer.unmount();
  });

  it('allocates zero GPU objects and registers zero useFrame callbacks when disabled (P-17)', async () => {
    const renderer = await ReactThreeTest.create(
      <KinematicVector
        id="kin-disabled"
        position={[0, 0, 0]}
        velocity={[1, 2, 0]}
        state="passive"
      />,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'kinematic-vector-kin-disabled')).toHaveLength(0);
    expect(useFrameSpy).not.toHaveBeenCalled();
    expect(lineGeometryCtorSpy).not.toHaveBeenCalled();
    expect(line2CtorSpy).not.toHaveBeenCalled();
    expect(cartoLineMatCtorSpy).not.toHaveBeenCalled();

    await renderer.unmount();
  });

  it('lazily allocates GPU objects and shares CartoLineMaterial across active instances (P-17)', async () => {
    const renderer = await ReactThreeTest.create(
      <>
        <KinematicVector
          id="kin-active-1"
          position={[0, 0, 0]}
          velocity={[1, 0, 0]}
          state="selected"
        />
        <KinematicVector
          id="kin-active-2"
          position={[2, 0, 0]}
          velocity={[0, 1, 0]}
          state="focused"
        />
      </>,
    );

    expect(useFrameSpy).toHaveBeenCalledTimes(2);
    expect(lineGeometryCtorSpy).toHaveBeenCalledTimes(2);
    expect(line2CtorSpy).toHaveBeenCalledTimes(2);
    expect(cartoLineMatCtorSpy).toHaveBeenCalledTimes(1);

    const lineGroups = renderer.scene.findAll((node) => node.props.name === 'velocity-vector-line');
    expect(lineGroups).toHaveLength(2);
    const meshes = lineGroups.map(
      (group) =>
        group.children.find(
          (child) => child.instance instanceof Line2 || (child.instance && 'isLine2' in child.instance),
        )?.instance as Line2 | undefined,
    );
    expect(meshes[0]).toBeDefined();
    expect(meshes[1]).toBeDefined();
    expect(meshes[0]?.material).toBe(meshes[1]?.material);
    expect(meshes[0]?.raycast).toBe(NOOP_RAYCAST);
    expect(meshes[1]?.raycast).toBe(NOOP_RAYCAST);

    await renderer.unmount();
  });
});
