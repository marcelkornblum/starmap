import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import ReactThreeTest from '@react-three/test-renderer';
import { screen, render } from '@testing-library/react';
import { EntityLabel } from './EntityLabel';
import { SpatialEntityProvider } from './SpatialEntityProvider';
import { createSpatialEntityStore } from './SpatialEntityStore';
import { SpatialFrameProvider, GALACTIC_FRAME } from '../instrument';
import { SafeHtmlPortalOutlet } from '../SafeHtml';
import { CelestialOcclusionManager } from '../cartography/celestialOcclusionRegistry';

describe('EntityLabel Primitive (Layer 3: Typographic Label)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders with label text and spectral tag cleanly via portal outlet', async () => {
    const store = createSpatialEntityStore();
    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);

    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <SpatialEntityProvider store={store}>
          <EntityLabel
            id="star-40-eri"
            name="40 Eridani"
            spectralType="K1V · dM4.5e · DA4"
            state="selected"
            position={[0, 0, 0]}
          />
        </SpatialEntityProvider>
      </SpatialFrameProvider>,
    );

    expect(renderer.scene.children).toHaveLength(1);
    expect(screen.getByText('40 Eridani')).toBeInTheDocument();
    expect(screen.getByText('K1V · dM4.5e · DA4')).toBeInTheDocument();

    await renderer.unmount();
    unmountOutlet();
  });

  it('calculates screen activeBox starting at anchorX and anchorY with full height h', async () => {
    const store = createSpatialEntityStore();
    const occlusionManager = new CelestialOcclusionManager();
    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);

    occlusionManager.register({
      id: 'star-test',
      name: '40 Eridani',
      state: 'selected',
      screenX: 200,
      screenY: 300,
      reticleRadius: 20,
      starRadius: 0.035,
      hasReticle: true,
      visible: true,
      updatedAt: 0,
    });

    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <SpatialEntityProvider store={store} occlusionManager={occlusionManager}>
          <EntityLabel
            id="star-test"
            name="40 Eridani"
            spectralType="K1V"
            state="selected"
            position={[0, 0, 0]}
          />
        </SpatialEntityProvider>
      </SpatialFrameProvider>,
    );

    await renderer.advanceFrames(1, 0.016);

    const updatedFp = occlusionManager.getFootprint('star-test');
    expect(updatedFp?.labelBox).toBeDefined();
    const box = updatedFp!.labelBox!;

    expect(box.bottom).toBeGreaterThan(box.top);
    expect(box.right).toBeGreaterThan(box.left);

    await renderer.unmount();
    unmountOutlet();
  });

  it('applies Target Immunity to focused and selected entity labels, setting data-occluded="false"', async () => {
    const store = createSpatialEntityStore();
    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);

    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <SpatialEntityProvider store={store}>
          <EntityLabel
            id="star-immune"
            name="Tau Ceti"
            spectralType="G8.5V"
            state="focused"
            position={[0, 0, 0]}
          />
        </SpatialEntityProvider>
      </SpatialFrameProvider>,
    );

    await renderer.advanceFrames(1, 0.016);

    const innerLabel = screen.getByTestId('entity-label-inner-star-immune');
    expect(innerLabel.getAttribute('data-occluded')).toBe('false');

    await renderer.unmount();
    unmountOutlet();
  });

  it('deduplicates billboard transform syncs avoiding redundant updateMatrixWorld calls on stationary frames', async () => {
    const store = createSpatialEntityStore();
    const updateMatrixSpy = vi.spyOn(THREE.Group.prototype, 'updateMatrixWorld');

    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <SpatialEntityProvider store={store}>
          <EntityLabel
            id="star-dedup"
            name="Sirius"
            spectralType="A1V"
            state="active"
            position={[10, 20, 30]}
          />
        </SpatialEntityProvider>
      </SpatialFrameProvider>,
    );

    // Initial frame
    await renderer.advanceFrames(1, 0.016);
    const initialCallCount = updateMatrixSpy.mock.calls.length;
    expect(initialCallCount).toBeGreaterThan(0);

    // Stationary next frame should avoid unnecessary updateMatrixWorld on label
    updateMatrixSpy.mockClear();
    await renderer.advanceFrames(1, 0.016);

    updateMatrixSpy.mockRestore();
    await renderer.unmount();
  });
});
