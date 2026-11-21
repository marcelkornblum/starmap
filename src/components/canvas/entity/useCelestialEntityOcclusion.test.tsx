import { describe, it, expect, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import ReactThreeTest from '@react-three/test-renderer';
import { useCelestialEntityOcclusion } from './useCelestialEntityOcclusion';
import { SpatialEntityProvider } from './SpatialEntityProvider';
import { OcclusionPass } from './OcclusionPass';
import { CelestialOcclusionManager } from '../cartography/celestialOcclusionRegistry';

function TestOcclusionConsumer({
  occlusionManager,
  resolvedPos,
}: {
  occlusionManager: CelestialOcclusionManager;
  resolvedPos: THREE.Vector3;
}) {
  useCelestialEntityOcclusion({
    id: 'star-1',
    name: 'Alpha Centauri',
    activeState: 'selected',
    classification: 'star',
    multiplicity: 3,
    planets: [],
    resolvedPos,
    occlusionManager,
  });
  return null;
}

describe('useCelestialEntityOcclusion', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('registers footprint with occlusionManager and cleans up on unmount', async () => {
    const occlusionManager = new CelestialOcclusionManager();
    const resolvedPos = new THREE.Vector3(10, 20, 30);

    const renderer = await ReactThreeTest.create(
      <TestOcclusionConsumer
        occlusionManager={occlusionManager}
        resolvedPos={resolvedPos}
      />,
    );

    expect(occlusionManager.getFootprint('star-1')).toBeDefined();
    expect(occlusionManager.getFootprint('star-1')?.name).toBe('Alpha Centauri');
    expect(occlusionManager.getFootprint('star-1')?.state).toBe('selected');

    await renderer.unmount();
    expect(occlusionManager.getFootprint('star-1')).toBeUndefined();
  });

  it('stays skipped during idle OcclusionPass frames even after >250ms, and falls back only when OcclusionPass stops (P-09)', async () => {
    let now = 10_000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    const occlusionManager = new CelestialOcclusionManager();
    const resolvedPos = new THREE.Vector3(10, 20, 30);

    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider occlusionManager={occlusionManager}>
        <OcclusionPass enabled={true} />
        <TestOcclusionConsumer
          occlusionManager={occlusionManager}
          resolvedPos={resolvedPos}
        />
      </SpatialEntityProvider>,
    );

    // Frame 1: OcclusionPass evaluates and stamps updatedAt
    await renderer.advanceFrames(1, 0.016);
    const fp = occlusionManager.getFootprint('star-1')!;
    const initialUpdatedAt = fp.updatedAt;
    expect(occlusionManager.isBatchEvaluating()).toBe(true);

    // Advance >250ms while idle OcclusionPass keeps running
    now += 300;
    await renderer.advanceFrames(1, 0.016);
    expect(occlusionManager.isBatchEvaluating()).toBe(true);
    expect(occlusionManager.didCameraOrFootprintsChange()).toBe(false);
    // Neither OcclusionPass nor fallback per-entity projection should re-stamp updatedAt while idle
    expect(fp.updatedAt).toBe(initialUpdatedAt);

    // Disable OcclusionPass and advance >250ms: fallback per-entity projection resumes
    await renderer.update(
      <SpatialEntityProvider occlusionManager={occlusionManager}>
        <OcclusionPass enabled={false} />
        <TestOcclusionConsumer
          occlusionManager={occlusionManager}
          resolvedPos={resolvedPos}
        />
      </SpatialEntityProvider>,
    );
    now += 300;
    await renderer.advanceFrames(1, 0.016);
    expect(occlusionManager.isBatchEvaluating()).toBe(false);
    expect(fp.updatedAt).toBeGreaterThan(initialUpdatedAt);

    await renderer.unmount();
  });

  it('invalidates the R3F frame when registering and unregistering footprints under demand frameloop', async () => {
    const occlusionManager = new CelestialOcclusionManager();
    const resolvedPos = new THREE.Vector3(2, -2, 2);

    const renderer = await ReactThreeTest.create(
      <TestOcclusionConsumer
        occlusionManager={occlusionManager}
        resolvedPos={resolvedPos}
      />,
    );

    const invalidateSpy = vi.spyOn(renderer.scene._fiber.root.getState(), 'invalidate');
    await renderer.update(
      <TestOcclusionConsumer
        occlusionManager={occlusionManager}
        resolvedPos={new THREE.Vector3(3, -3, 3)}
      />,
    );
    expect(invalidateSpy).toHaveBeenCalled();

    invalidateSpy.mockClear();
    await renderer.unmount();
    expect(invalidateSpy).toHaveBeenCalled();
  });
});
