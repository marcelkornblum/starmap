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

  it('propagates planeInclinationDeg from systemDetail or summaryNode and omits when unmeasured', () => {
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
      sysManifest: {
        id: 'sol',
        name: 'Sol',
        x: 0,
        y: 0,
        z: 0,
        dist: 0,
        sectorId: 'sector_+000_+000_+000',
        planeInclinationDeg: 60.19,
        stars: [],
        planets: [],
      },
    };

    const fromManifest = buildFocusedBaseDetails(
      resolved,
      { focusedEntity: { id: 'sol', name: 'Sol', position: [0, 0, 0] } },
      1,
      8,
      true,
      [],
      '8 planets',
      [],
      'Sol system',
    );
    expect(fromManifest.baseDetails.planeInclinationDeg).toBe(60.19);

    const fromSummary = buildFocusedBaseDetails(
      { ...resolved, sysManifest: undefined },
      {
        focusedEntity: { id: 'sol', name: 'Sol', position: [0, 0, 0] },
        summaryNode: {
          id: 'sol',
          name: 'Sol',
          x: 0,
          y: 0,
          z: 0,
          dist: 0,
          mag: -26.74,
          absmag: 4.83,
          starCount: 1,
          planetCount: 8,
          hasHabitableCandidate: true,
          sectorId: 'sector_+000_+000_+000',
          planeInclinationDeg: 60.19,
        },
      },
      1,
      8,
      true,
      [],
      '8 planets',
      [],
      'Sol system',
    );
    expect(fromSummary.baseDetails.planeInclinationDeg).toBe(60.19);

    const unmeasured = buildFocusedBaseDetails(
      { ...resolved, sysManifest: undefined, systemId: 'tau-ceti', systemName: 'Tau Ceti' },
      { focusedEntity: { id: 'tau-ceti', name: 'Tau Ceti', position: [3.1, 1.5, -1.0] } },
      1,
      4,
      true,
      [],
      '4 planets',
      [],
      'Tau Ceti system',
    );
    expect(unmeasured.baseDetails.planeInclinationDeg).toBeUndefined();
  });
});
