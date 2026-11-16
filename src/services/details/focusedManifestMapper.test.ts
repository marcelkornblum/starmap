import { describe, expect, it } from 'vitest';
import { mapManifestToStarsAndPlanets } from './focusedManifestMapper';
import type { SystemManifest } from '../../types/astro';

describe('focusedManifestMapper', () => {
  it('maps manifest stars, planets, and disks accurately', () => {
    const manifest: SystemManifest = {
      id: 'sol',
      name: 'Sol',
      x: 0,
      y: 0,
      z: 0,
      dist: 0,
      sectorId: 'sol',
      stars: [
        {
          id: 'sol',
          name: 'Sol',
          componentDesignation: 'A',
          spectralType: 'G2V',
          mag: -26.74,
          absmag: 4.83,
          massMsun: 1.0,
        },
      ],
      planets: [
        {
          id: 'earth',
          name: 'Earth',
          letter: 'd',
          massMearth: 1.0,
          radiusRearth: 1.0,
          orbit: {
            semiMajorAxis: 1.0,
            periodDays: 365.25,
            eccentricity: 0.0167,
            inclination: 0,
            ascendingNode: 0,
            argumentOfPeriapsis: 0,
            meanAnomaly: 0,
          },
        },
      ],
      disks: [
        {
          id: 'asteroid-belt',
          name: 'Asteroid Belt',
          kind: 'asteroid-belt',
          innerRadiusAu: 2.1,
          outerRadiusAu: 3.3,
          semiMajorAxisAu: 2.7,
          composition: 'rock',
        },
      ],
    };

    const mapped = mapManifestToStarsAndPlanets(manifest, 'sol');
    expect(mapped.stars).toHaveLength(1);
    expect(mapped.stars[0].id).toBe('sol');
    expect(mapped.planets).toHaveLength(1);
    expect(mapped.planets[0].id).toBe('earth');
    expect(mapped.planets[0].composition).toBe('terrestrial');
    expect(mapped.disks).toHaveLength(1);
    expect(mapped.disks[0].id).toBe('asteroid-belt');
  });
});
