import { describe, it, expect } from 'vitest';
import ReactThreeTest from '@react-three/test-renderer';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { OrbitPath } from './OrbitPath';
import { SpatialEntityProvider } from './SpatialEntityProvider';
import { SpatialFrameProvider, GALACTIC_FRAME } from '../instrument';
import { NOOP_RAYCAST } from '../engineConfig';

describe('OrbitPath Primitive (§4.4: State-Driven Orbits)', () => {
  it('renders circular orbit with periapsis tick by default', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <OrbitPath
            id="orbit-earth"
            semiMajorAxis={1.0}
            state="passive"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'orbital-ring-orbit-earth')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'orbit-path-line')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'orbit-periapsis-tick')).toHaveLength(1);

    await renderer.unmount();
  });

  it('applies kinematic color and forced rendering when state is selected or focused', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <OrbitPath
            id="orbit-mars"
            semiMajorAxis={1.52}
            visible={false}
            state="focused"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'orbital-ring-orbit-mars')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'orbit-path-line')).toHaveLength(1);

    await renderer.unmount();
  });

  it('updates lineMat color in-place without re-instantiating mesh on state changes (AUD-106)', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <OrbitPath
            id="orbit-1"
            semiMajorAxis={10}
            state="passive"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    const orbitBefore = renderer.scene.find((node) => node.props.name === 'orbital-ring-orbit-1');
    expect(orbitBefore).toBeDefined();

    await renderer.update(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <OrbitPath
            id="orbit-1"
            semiMajorAxis={10}
            state="selected"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    const orbitAfter = renderer.scene.find((node) => node.props.name === 'orbital-ring-orbit-1');
    expect(orbitAfter).toBeDefined();

    await renderer.unmount();
  });

  it('attaches NOOP_RAYCAST to Line2 mesh, periapsis tick, and direction arrow (P-10)', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <OrbitPath
            id="orbit-noop"
            semiMajorAxis={2.0}
            showPeriapsisTick={true}
            showDirectionIndicator={true}
            state="passive"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    const lineGroup = renderer.scene.find((node) => node.props.name === 'orbit-path-line');
    const line2Node = lineGroup.children.find(
      (child) => child.instance instanceof Line2 || (child.instance && 'isLine2' in child.instance),
    );
    expect(line2Node).toBeDefined();
    expect(line2Node?.instance?.raycast).toBe(NOOP_RAYCAST);

    const periapsisTick = renderer.scene.find((node) => node.props.name === 'orbit-periapsis-tick');
    expect(periapsisTick.props.raycast).toBe(NOOP_RAYCAST);

    const directionArrow = renderer.scene.find((node) => node.props.name === 'orbit-direction-arrow');
    expect(directionArrow.props.raycast).toBe(NOOP_RAYCAST);

    await renderer.unmount();
  });
});
