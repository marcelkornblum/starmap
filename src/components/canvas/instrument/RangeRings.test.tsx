import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import ReactThreeTest from '@react-three/test-renderer';
import { RangeRings } from './RangeRings';
import { SpatialFrameProvider, GALACTIC_FRAME } from './index';
import { NOOP_RAYCAST } from '../engineConfig';

describe('RangeRings Primitive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders concentric range rings cleanly', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <RangeRings rings={[2.5, 5, 10]} />
      </SpatialFrameProvider>,
    );

    const group = renderer.scene.findByProps({ name: 'range-rings' });
    expect(group).toBeDefined();

    const ring25 = renderer.scene.findByProps({ name: 'full-ring-2.5' });
    const ring5 = renderer.scene.findByProps({ name: 'full-ring-5' });
    const ring10 = renderer.scene.findByProps({ name: 'full-ring-10' });

    expect(ring25).toBeDefined();
    expect(ring5).toBeDefined();
    expect(ring10).toBeDefined();

    await renderer.unmount();
  });

  it('supports lockToFocusPoint=false and relative position offset', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <RangeRings rings={[5]} lockToFocusPoint={false} position={[1, 2, 3]} />
      </SpatialFrameProvider>,
    );

    const ring5 = renderer.scene.findByProps({ name: 'full-ring-5' });
    expect(ring5).toBeDefined();

    await renderer.unmount();
  });

  it('does not invoke color.copy inside useFrame (AUD-107)', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <RangeRings rings={[2.5, 5, 10]} />
      </SpatialFrameProvider>,
    );

    // Warm up one frame
    await renderer.advanceFrames(1, 0.016);

    const colorCopySpy = vi.spyOn(THREE.Color.prototype, 'copy');

    // Run next frame
    await renderer.advanceFrames(1, 0.016);

    expect(colorCopySpy).not.toHaveBeenCalled();
    colorCopySpy.mockRestore();

    await renderer.unmount();
  });

  it('attaches NOOP_RAYCAST to all ring lineLoop meshes', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <RangeRings rings={[5]} />
      </SpatialFrameProvider>,
    );
    const ring5 = renderer.scene.findByProps({ name: 'full-ring-5' });
    expect(ring5.props.raycast).toBe(NOOP_RAYCAST);
    await renderer.unmount();
  });
});
