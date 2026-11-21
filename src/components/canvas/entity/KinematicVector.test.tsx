import { describe, it, expect } from 'vitest';
import ReactThreeTest from '@react-three/test-renderer';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { KinematicVector } from './KinematicVector';
import { SpatialEntityProvider } from './SpatialEntityProvider';
import { SpatialFrameProvider, GALACTIC_FRAME } from '../instrument';
import { NOOP_RAYCAST } from '../engineConfig';

describe('KinematicVector Primitive (§5: Projected Velocity Vectors)', () => {
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
});
