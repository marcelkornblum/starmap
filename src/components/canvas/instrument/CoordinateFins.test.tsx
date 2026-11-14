import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import ReactThreeTest from '@react-three/test-renderer';
import { CoordinateFins } from './CoordinateFins';
import { SpatialFrameProvider, GALACTIC_FRAME } from './index';

describe('CoordinateFins Primitive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the 3 orthogonal travelling fins with perimeter arcs and ticks', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <CoordinateFins rings={[2.5, 5, 10]} />
      </SpatialFrameProvider>,
    );

    const fins = renderer.scene.findByProps({ name: 'travelling-fins' });
    expect(fins).toBeDefined();

    expect(renderer.scene.findByProps({ name: 'fin-xy' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'fin-xz' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'fin-yz' })).toBeDefined();

    expect(renderer.scene.findByProps({ name: 'xy-perimeter-q0' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'xy-ticks-q0' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'xy-baseline-q0' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'xz-baseline-q0' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'yz-baseline-q0' })).toBeDefined();

    expect(renderer.scene.findAllByProps({ name: 'arc-tier-2.5' })).toHaveLength(3);
    expect(renderer.scene.findAllByProps({ name: 'arc-tier-5' })).toHaveLength(3);
    expect(renderer.scene.findAllByProps({ name: 'arc-tier-10' })).toHaveLength(3);

    await renderer.unmount();
  });

  it('respects enabled=false toggle', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <CoordinateFins enabled={false} />
      </SpatialFrameProvider>,
    );

    const fins = renderer.scene.findAll((node) => node.props.name === 'travelling-fins');
    expect(fins).toHaveLength(0);

    await renderer.unmount();
  });

  it('does not invoke color.copy inside useFrame (AUD-107)', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <CoordinateFins enabled={true} />
      </SpatialFrameProvider>,
    );

    await renderer.advanceFrames(1, 0.016);

    const colorCopySpy = vi.spyOn(THREE.Color.prototype, 'copy');

    await renderer.advanceFrames(1, 0.016);

    expect(colorCopySpy).not.toHaveBeenCalled();
    colorCopySpy.mockRestore();

    await renderer.unmount();
  });
});
