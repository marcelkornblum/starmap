import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReactThreeTest from '@react-three/test-renderer';
import { screen, render } from '@testing-library/react';
import { ScreenEdgeCue } from './ScreenEdgeCue';
import { ScreenEdgeIndicators } from './ScreenEdgeIndicators';
import { SpatialFrameProvider, GALACTIC_FRAME } from './index';
import { SafeHtmlPortalOutlet } from '../SafeHtml';

describe('ScreenEdgeCue and ScreenEdgeIndicators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('renders ScreenEdgeCue with indicator label and chevron', async () => {
    const bearing = GALACTIC_FRAME.bearings[0];
    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);

    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <ScreenEdgeCue bearing={bearing} />
      </SpatialFrameProvider>,
    );

    const cueGroup = renderer.scene.findByProps({ name: 'screen-edge-cue-core' });
    expect(cueGroup).toBeDefined();

    expect(screen.getByText('CORE 000°')).toBeDefined();

    await renderer.unmount();
    unmountOutlet();
  });

  it('renders ScreenEdgeIndicators for all active bearings with showEdgeCue', async () => {
    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);

    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <ScreenEdgeIndicators />
      </SpatialFrameProvider>,
    );

    const group = renderer.scene.findByProps({ name: 'screen-edge-bearing-indicators' });
    expect(group).toBeDefined();

    expect(screen.getByText('CORE 000°')).toBeDefined();
    expect(screen.getByText('ORB 090°')).toBeDefined();

    await renderer.unmount();
    unmountOutlet();
  });
});
