import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReactThreeTest from '@react-three/test-renderer';
import { screen, render } from '@testing-library/react';
import { CartographicInstrument } from './CartographicInstrument';
import { SpatialFrameProvider, GALACTIC_FRAME, SYSTEM_FRAME, PLANETARY_FRAME } from './index';
import { SafeHtmlPortalOutlet } from '../SafeHtml';

describe('CartographicInstrument (Composite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('renders full galactic instrument matching GALACTIC_FRAME', async () => {
    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);

    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <CartographicInstrument rangeRings={[2.5, 5, 10]} />
      </SpatialFrameProvider>,
    );

    expect(renderer.scene.findByProps({ name: 'cartographic-grid' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'datum-plane' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'range-rings' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'travelling-fins' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'bearing-vectors' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'screen-edge-bearing-indicators' })).toBeDefined();

    expect(screen.getByText('CORE 000°')).toBeInTheDocument();
    expect(screen.getByText('ORB 090°')).toBeInTheDocument();

    expect(renderer.scene.findByProps({ name: 'full-ring-2.5' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'full-ring-5' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'full-ring-10' })).toBeDefined();

    await renderer.unmount();
    unmountOutlet();
  });

  it('renders system instrument with shared planar grid and orbital bearing (core suppressed)', async () => {
    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);

    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={SYSTEM_FRAME}>
        <CartographicInstrument rangeRings={[1, 5, 10]} />
      </SpatialFrameProvider>,
    );

    expect(renderer.scene.findByProps({ name: 'cartographic-grid' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'datum-plane' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'planar-galactic-grid' })).toBeDefined();

    expect(screen.queryByText('CORE 000°')).toBeNull();
    expect(screen.getByText('ORB 090°')).toBeInTheDocument();

    await renderer.unmount();
    unmountOutlet();
  });

  it('renders planetary instrument with shared planar grid and datum fill without bearings', async () => {
    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);

    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={PLANETARY_FRAME}>
        <CartographicInstrument rangeRings={[2000, 5000, 10000]} />
      </SpatialFrameProvider>,
    );

    expect(renderer.scene.findByProps({ name: 'cartographic-grid' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'datum-plane-fill' })).toBeDefined();
    expect(renderer.scene.findByProps({ name: 'planar-galactic-grid' })).toBeDefined();

    expect(screen.queryByText('CORE 000°')).toBeNull();
    expect(screen.queryByText('ORB 090°')).toBeNull();

    await renderer.unmount();
    unmountOutlet();
  });

  it('supports showDatumPlane=false', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <CartographicInstrument showDatumPlane={false} />
      </SpatialFrameProvider>,
    );

    expect(renderer.scene.findByProps({ name: 'cartographic-grid' })).toBeDefined();
    const planarGrids = renderer.scene.findAll((node) => node.props.name === 'planar-galactic-grid');
    expect(planarGrids).toHaveLength(0);

    await renderer.unmount();
  });
});
