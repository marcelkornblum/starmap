import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import ReactThreeTest from '@react-three/test-renderer';
import { useCelestialEntityOcclusion } from './useCelestialEntityOcclusion';
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
});
