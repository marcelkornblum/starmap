import { describe, expect, it } from 'vitest';
import { buildFocusedBaseDetails } from './focusedBaseDetails';
import type { ResolvedFocusedTarget } from './focusedTargetResolverTypes';

describe('focusedBaseDetails', () => {
  it('assembles base details and computes hazards correctly', () => {
    const resolved: ResolvedFocusedTarget = {
      systemId: 'sol',
      systemName: 'Sol',
      stars: [],
      planets: [],
      disks: [],
      focusedKind: 'system',
      resolvedName: 'Sol',
      planetComposition: 'terrestrial',
      planetIsHabitable: false,
      orbitingBodies: [],
      reticleType: 'stellar-system',
    };

    const result = buildFocusedBaseDetails(
      resolved,
      {
        focusedEntity: { id: 'sol', name: 'Sol', position: [0, 0, 0] },
      },
      1,
      8,
      true,
      [],
      '8 planets',
      [],
      'Sol system',
    );

    expect(result.baseDetails.id).toBe('sol');
    expect(result.baseDetails.name).toBe('Sol');
    expect(result.baseDetails.starCount).toBe(1);
    expect(result.baseDetails.planetCount).toBe(8);
    expect(result.baseDetails.hasHabitableCandidate).toBe(true);
  });
});
