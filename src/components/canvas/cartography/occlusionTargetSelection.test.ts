import { describe, it, expect } from 'vitest';
import {
  isReticleSuppressedBySignificant,
  collectSignificantFootprints,
} from './occlusionTargetSelection';
import type { CelestialFootprint } from './occlusionTypes';

describe('occlusionTargetSelection', () => {
  it('suppresses background reticles colliding under significant foreground reticles', () => {
    const significant: CelestialFootprint = {
      id: 'sig',
      state: 'selected',
      screenX: 100,
      screenY: 100,
      camDist: 10,
      reticleRadius: 20,
      starRadius: 3,
      hasReticle: true,
      visible: true,
      updatedAt: 100,
    };
    const background: CelestialFootprint = {
      id: 'bg',
      state: 'active',
      screenX: 102,
      screenY: 101,
      camDist: 20,
      reticleRadius: 20,
      starRadius: 3,
      hasReticle: true,
      visible: true,
      updatedAt: 100,
    };

    expect(isReticleSuppressedBySignificant(background, [significant])).toBe(true);
    expect(isReticleSuppressedBySignificant(significant, [significant])).toBe(false);
  });

  it('collects visible significant reticle footprints', () => {
    const footprints: CelestialFootprint[] = [
      { id: '1', state: 'active', screenX: 0, screenY: 0, reticleRadius: 10, starRadius: 2, hasReticle: true, visible: true, updatedAt: 0 },
      { id: '2', state: 'focused', screenX: 0, screenY: 0, reticleRadius: 10, starRadius: 2, hasReticle: true, visible: true, updatedAt: 0 },
    ];
    const sig = collectSignificantFootprints(footprints);
    expect(sig.length).toBe(1);
    expect(sig[0].id).toBe('2');
  });
});
