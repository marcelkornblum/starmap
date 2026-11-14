import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReactThreeTest from '@react-three/test-renderer';
import { BearingVectors } from './BearingVectors';
import { SpatialFrameProvider, GALACTIC_FRAME, SYSTEM_FRAME } from './index';

describe('BearingVectors Primitive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders axis spokes and cardinal bearings for GALACTIC_FRAME', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <BearingVectors showAxisLines={true} showCardinalBearings={true} />
      </SpatialFrameProvider>,
    );

    expect(renderer.scene.findByProps({ name: 'bearing-vectors' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'axis-spokes' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'axis-neg-x' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'axis-pos-z' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'cardinal-bearings' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'bearing-core' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'bearing-orbital' })).toBeDefined();

    await renderer.unmount();
  });

  it('renders zero bearings when cardinal bearings are disabled or absent', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={SYSTEM_FRAME}>
        <BearingVectors showCardinalBearings={false} />
      </SpatialFrameProvider>,
    );

    expect(renderer.scene.findByProps({ name: 'bearing-vectors' })).toBeDefined();
    const cardinalBearings = renderer.scene.findAll((node) => node.props.name === 'cardinal-bearings');
    expect(cardinalBearings).toHaveLength(0);

    await renderer.unmount();
  });

  it('supports frame-neutral props (centerDistance, extent)', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <BearingVectors centerDistance={3000} extent={1500} />
      </SpatialFrameProvider>,
    );

    expect(renderer.scene.findByProps({ name: 'bearing-vectors' })).toBeDefined();
    await renderer.unmount();
  });
});
