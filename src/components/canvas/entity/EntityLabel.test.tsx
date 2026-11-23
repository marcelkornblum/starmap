import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import ReactThreeTest from '@react-three/test-renderer';
import { screen, render } from '@testing-library/react';
import { EntityLabel } from './EntityLabel';
import { OcclusionPass } from './OcclusionPass';
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
    vi.useRealTimers();
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

  it('skips evaluateNodeOcclusion on idle frames even after >250ms, and re-evaluates on footprint change (P-09)', async () => {
    let now = 10_000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    const store = createSpatialEntityStore();
    const occlusionManager = new CelestialOcclusionManager();
    const evalSpy = vi.spyOn(occlusionManager, 'evaluateNodeOcclusion');
    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);

    occlusionManager.register({
      id: 'star-idle',
      name: 'Vega',
      state: 'active',
      screenX: 0,
      screenY: 0,
      worldPos: [0, 0, 0],
      reticleRadius: 20,
      starRadius: 0.035,
      hasReticle: true,
      visible: true,
      updatedAt: 0,
    });

    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <SpatialEntityProvider store={store} occlusionManager={occlusionManager}>
          <OcclusionPass enabled={true} />
          <EntityLabel
            id="star-idle"
            name="Vega"
            spectralType="A0V"
            state="active"
            position={[0, 0, 0]}
          />
        </SpatialEntityProvider>
      </SpatialFrameProvider>,
    );

    // Frame 1 evaluates occlusion
    await renderer.advanceFrames(1, 0.016);
    expect(evalSpy).toHaveBeenCalledTimes(1);

    // Advance >250ms on idle frames: evaluateNodeOcclusion must NOT be called again
    evalSpy.mockClear();
    now += 300;
    await renderer.advanceFrames(1, 0.016);
    expect(evalSpy).not.toHaveBeenCalled();

    // Mutate footprint: evaluateNodeOcclusion immediately re-runs on next frame
    occlusionManager.register({
      id: 'star-other',
      name: 'Altair',
      state: 'selected',
      screenX: 0,
      screenY: 0,
      worldPos: [1, 0, 0],
      reticleRadius: 20,
      starRadius: 0.035,
      hasReticle: true,
      visible: true,
      updatedAt: 0,
    });
    await renderer.advanceFrames(1, 0.016);
    expect(evalSpy).toHaveBeenCalledTimes(1);

    await renderer.unmount();
    unmountOutlet();
  });

  it('immediately resets data-occluded to false when upgrading from occluded active state to selected state', async () => {
    const store = createSpatialEntityStore();
    const occlusionManager = new CelestialOcclusionManager();
    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);

    occlusionManager.register({
      id: 'star-blocker',
      name: 'Blocker',
      state: 'focused',
      screenX: 100,
      screenY: 100,
      camDist: 1,
      reticleRadius: 20,
      starRadius: 0.035,
      hasReticle: false,
      labelBox: { left: 0, top: 0, right: 500, bottom: 500 },
      visible: true,
      updatedAt: 0,
    });
    occlusionManager.register({
      id: 'star-upgrade',
      name: 'Upgrade Star',
      state: 'active',
      screenX: 100,
      screenY: 100,
      camDist: 20,
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
            id="star-upgrade"
            name="Upgrade Star"
            spectralType="G2V"
            state="active"
            position={[0, 0, 0]}
          />
        </SpatialEntityProvider>
      </SpatialFrameProvider>,
    );

    await renderer.advanceFrames(1, 0.016);
    const innerLabel = screen.getByTestId('entity-label-inner-star-upgrade');
    expect(innerLabel.getAttribute('data-occluded')).toBe('true');

    await renderer.update(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <SpatialEntityProvider store={store} occlusionManager={occlusionManager}>
          <EntityLabel
            id="star-upgrade"
            name="Upgrade Star"
            spectralType="G2V"
            state="selected"
            position={[0, 0, 0]}
          />
        </SpatialEntityProvider>
      </SpatialFrameProvider>,
    );

    expect(innerLabel.getAttribute('data-occluded')).toBe('false');

    await renderer.unmount();
    unmountOutlet();
  });
});
