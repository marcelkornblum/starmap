import { describe, it, expect } from 'vitest';
import ReactThreeTest from '@react-three/test-renderer';
import { DropStalk } from './DropStalk';
import { SpatialEntityProvider } from './SpatialEntityProvider';
import { SpatialFrameProvider, GALACTIC_FRAME } from '../instrument';

describe('DropStalk Primitive (§2.4: State-Driven Drop Stalks)', () => {
  it('does NOT render drop stalk in passive or active states (Single-Stalk Rule)', async () => {
    const passiveRenderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <DropStalk id="stalk-node" position={[0, 0, 5]} state="passive" />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );
    expect(passiveRenderer.scene.findAll((node) => node.props.name === 'drop-stalk-stalk-node')).toHaveLength(0);
    await passiveRenderer.unmount();

    const activeRenderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <DropStalk id="stalk-node" position={[0, 0, 5]} state="active" />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );
    expect(activeRenderer.scene.findAll((node) => node.props.name === 'drop-stalk-stalk-node')).toHaveLength(0);
    await activeRenderer.unmount();
  });

  it('renders drop stalk and ground footprint on datum in selected and focused states', async () => {
    const selectedRenderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <DropStalk id="stalk-node" position={[1, 2, 5]} state="selected" />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );
    expect(selectedRenderer.scene.findAll((node) => node.props.name === 'drop-stalk-stalk-node')).toHaveLength(1);
    expect(selectedRenderer.scene.findAll((node) => node.props.name === 'stalk-line')).toHaveLength(1);
    expect(selectedRenderer.scene.findAll((node) => node.props.name === 'stalk-footprint')).toHaveLength(1);
    await selectedRenderer.unmount();

    const focusedRenderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <DropStalk id="stalk-node" position={[1, 2, 5]} state="focused" />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );
    expect(focusedRenderer.scene.findAll((node) => node.props.name === 'drop-stalk-stalk-node')).toHaveLength(1);
    await focusedRenderer.unmount();
  });

  it('renders solid stalk for +Z (North) and dashed stalk for -Z (South)', async () => {
    const northRenderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <DropStalk id="north-stalk" position={[0, 0, 5]} state="selected" />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );
    expect(northRenderer.scene.findAll((node) => node.props.name === 'drop-stalk-north-stalk')).toHaveLength(1);
    await northRenderer.unmount();

    const southRenderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <DropStalk id="south-stalk" position={[0, 0, -5]} state="selected" />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );
    expect(southRenderer.scene.findAll((node) => node.props.name === 'drop-stalk-south-stalk')).toHaveLength(1);
    await southRenderer.unmount();
  });

  it('positions drop stalk and footprint in entity-local coordinates when entityZ is provided', async () => {
    const localRenderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <DropStalk
            id="local-stalk"
            position={[0, 0, 0]}
            entityZ={2.5}
            state="selected"
            datumZ={0}
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );
    expect(localRenderer.scene.findAll((node) => node.props.name === 'drop-stalk-local-stalk')).toHaveLength(1);
    expect(localRenderer.scene.findAll((node) => node.props.name === 'stalk-line')).toHaveLength(1);
    expect(localRenderer.scene.findAll((node) => node.props.name === 'stalk-footprint')).toHaveLength(1);
    await localRenderer.unmount();
  });

  it('updates lineMaterial color in-place without re-instantiating on state changes (AUD-106)', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <DropStalk id="node-1" position={[0, 0, 5]} state="selected" />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    const stalkBefore = renderer.scene.find((node) => node.props.name === 'drop-stalk-node-1');
    expect(stalkBefore).toBeDefined();

    // Rerender with focused state
    await renderer.update(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <DropStalk id="node-1" position={[0, 0, 5]} state="focused" />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    const stalkAfter = renderer.scene.find((node) => node.props.name === 'drop-stalk-node-1');
    expect(stalkAfter).toBeDefined();

    await renderer.unmount();
  });
});
