import { describe, it, expect } from 'vitest';
import type { SystemSummaryNode, SystemManifest } from '../src/types/astro';
import {
  consolidateMultiStarSystems,
  getStrippedSystemBaseName,
} from '../scripts/build-data';

const makeSummary = (
  id: string,
  name: string,
  x: number,
  y: number,
  z: number,
  mag: number,
  spect: string,
  overrides: Partial<SystemSummaryNode> = {},
): SystemSummaryNode => ({
  id,
  name,
  x,
  y,
  z,
  dist: Math.hypot(x, y, z),
  mag,
  absmag: mag - 5 * (Math.log10(Math.max(0.1, Math.hypot(x, y, z))) - 1),
  spect,
  starCount: 1,
  planetCount: 0,
  hasHabitableCandidate: false,
  sectorId: 'sector_+000_+000_+000',
  ...overrides,
});

describe('getStrippedSystemBaseName', () => {
  it('strips trailing component letter designations and suffixes', () => {
    expect(getStrippedSystemBaseName('61 Cygni A')).toBe('61 Cygni');
    expect(getStrippedSystemBaseName('61 Cygni B')).toBe('61 Cygni');
    expect(getStrippedSystemBaseName('Struve 2398 A')).toBe('Struve 2398');
    expect(getStrippedSystemBaseName('Struve 2398 B')).toBe('Struve 2398');
  });

  it('normalizes historical IAU proper names and component variants for Alpha Centauri', () => {
    expect(getStrippedSystemBaseName('Rigil Kentaurus (Alpha Centauri A)')).toBe('Alpha Centauri');
    expect(getStrippedSystemBaseName('Toliman (Alpha Centauri B)')).toBe('Alpha Centauri');
    expect(getStrippedSystemBaseName('Proxima Centauri')).toBe('Alpha Centauri');
    expect(getStrippedSystemBaseName('Alpha Centauri A')).toBe('Alpha Centauri');
  });

  it('normalizes Sirius and secondary Gliese designations', () => {
    expect(getStrippedSystemBaseName('Sirius')).toBe('Sirius');
    expect(getStrippedSystemBaseName('Sirius A')).toBe('Sirius');
    expect(getStrippedSystemBaseName('Gl 244B')).toBe('Sirius');
  });

  it('strips suffixes attached directly to digits and normalizes special system maps', () => {
    expect(getStrippedSystemBaseName('Gl 22A')).toBe('Gl 22');
    expect(getStrippedSystemBaseName('GJ 1245A')).toBe('GJ 1245');
    expect(getStrippedSystemBaseName('Gl 667A')).toBe('Gl 667');
    expect(getStrippedSystemBaseName('NN 3192A')).toBe('LTT 1445');
    expect(getStrippedSystemBaseName('NN 3192')).toBe('LTT 1445');
    expect(getStrippedSystemBaseName('NN 3193')).toBe('LTT 1445');
    expect(getStrippedSystemBaseName('Gl 53')).toBe('Mu Cassiopeiae');
    expect(getStrippedSystemBaseName('Gl 53B')).toBe('Mu Cassiopeiae');
  });

  it('normalizes Luyten 726-8 and UV / BL Ceti flare star components', () => {
    expect(getStrippedSystemBaseName('Luyten 726-8 A (BL Ceti)')).toBe('Luyten 726-8');
    expect(getStrippedSystemBaseName('UV Ceti (Luyten 726-8 B)')).toBe('Luyten 726-8');
    expect(getStrippedSystemBaseName('Gl 65A')).toBe('Luyten 726-8');
    expect(getStrippedSystemBaseName('Gl 65B')).toBe('Luyten 726-8');
  });
});

describe('consolidateMultiStarSystems', () => {
  it('groups components within 0.06 pc spatial proximity into a single binary node', () => {
    const starA = makeSummary('star-a', 'Unknown Star A', 10.0, 5.0, 2.0, 5.0, 'A0V');
    // Separated by 0.02 pc along x (distance = 0.02 < 0.06 pc)
    const starB = makeSummary('star-b', 'Unknown Star B', 10.02, 5.0, 2.0, 7.5, 'A5V');

    const cataloguedSummaries = [starA, starB];
    const sectorMap = new Map<string, SystemSummaryNode[]>([
      ['sector_+000_+000_+000', [starA, starB]],
    ]);

    const result = consolidateMultiStarSystems({
      cataloguedSummaries,
      sectorMap,
    });

    expect(result.consolidatedCount).toBe(1);
    expect(cataloguedSummaries).toHaveLength(1);
    expect(cataloguedSummaries[0]?.id).toBe('star-a'); // Brightest component kept
    expect(cataloguedSummaries[0]?.starCount).toBe(2);
    expect(cataloguedSummaries[0]?.name).toBe('Unknown Star');
    expect(cataloguedSummaries[0]?.spect).toBe('A0V + A5V');

    // Absorbed star-b removed from sectorMap
    const sectorStars = sectorMap.get('sector_+000_+000_+000') || [];
    expect(sectorStars).toHaveLength(1);
    expect(sectorStars[0]?.id).toBe('star-a');
  });

  it('groups components within 0.18 pc sharing stripped base name', () => {
    const cygA = makeSummary('hip-104214', '61 Cygni A', 3.48, -0.05, 0.35, 5.21, 'K5V');
    // 0.10 pc separation: sqrt(0.06^2 + 0.08^2) = 0.10 pc (0.06 < dist <= 0.18 pc)
    const cygB = makeSummary('hip-104217', '61 Cygni B', 3.54, 0.03, 0.35, 6.03, 'K7V');

    const cataloguedSummaries = [cygA, cygB];
    const local10pcSystems = [cygA, cygB];
    const referenceBrightSystems = [cygA, cygB];

    consolidateMultiStarSystems({
      cataloguedSummaries,
      local10pcSystems,
      referenceBrightSystems,
    });

    expect(cataloguedSummaries).toHaveLength(1);
    expect(cataloguedSummaries[0]?.id).toBe('hip-104214');
    expect(cataloguedSummaries[0]?.name).toBe('61 Cygni');
    expect(cataloguedSummaries[0]?.starCount).toBe(2);
    expect(cataloguedSummaries[0]?.spect).toBe('K5V + K7V');

    expect(local10pcSystems).toHaveLength(1);
    expect(local10pcSystems[0]?.id).toBe('hip-104214');
    expect(referenceBrightSystems).toHaveLength(1);
    expect(referenceBrightSystems[0]?.id).toBe('hip-104214');
  });

  it('consolidates Alpha Centauri triple system (A, B, and Proxima Centauri) with exoplanet merge', () => {
    // Rigil Kentaurus (A)
    const alphaA = makeSummary(
      'hip-71683',
      'Rigil Kentaurus (Alpha Centauri A)',
      -1.34,
      0.45,
      -0.62,
      -0.01,
      'G2V',
      { properName: 'Rigil Kentaurus (Alpha Centauri A)' },
    );
    // Toliman (B) within 0.0001 pc
    const alphaB = makeSummary(
      'hip-71681',
      'Toliman (Alpha Centauri B)',
      -1.34,
      0.4501,
      -0.62,
      1.33,
      'K1V',
      { properName: 'Toliman (Alpha Centauri B)' },
    );
    // Proxima Centauri (C) at ~0.12 pc separation, hosting 1 planet
    const proxima = makeSummary(
      'hip-70890',
      'Proxima Centauri',
      -1.30,
      0.40,
      -0.55,
      11.05,
      'M5.5Ve',
      {
        properName: 'Proxima Centauri',
        planetCount: 1,
        hasHabitableCandidate: true,
        planetCensus: ['terrestrial'],
        planetCompositionCounts: [1, 0, 0, 0],
        tags: ['ExoplanetHost', 'HabitableCandidate'],
      },
    );

    const cataloguedSummaries = [alphaA, alphaB, proxima];
    const local10pcSystems = [alphaA, alphaB, proxima];
    const referenceBrightSystems = [alphaA, alphaB];
    const exoplanetHostSummaries = [proxima];
    const sectorMap = new Map([['sector_+000_+000_+000', [alphaA, alphaB, proxima]]]);

    const proximaManifest: SystemManifest = {
      id: 'hip-70890',
      name: 'Proxima Centauri',
      x: -1.30,
      y: 0.40,
      z: -0.55,
      dist: 1.30,
      sectorId: 'sector_+000_+000_+000',
      stars: [
        {
          id: 'hip-70890-A',
          name: 'Proxima Centauri',
          componentDesignation: 'A',
          spectralType: 'M5.5Ve',
          mag: 11.05,
          absmag: 15.49,
        },
      ],
      planets: [
        {
          id: 'proxima-b',
          name: 'Proxima Centauri b',
          letter: 'b',
          orbit: {
            semiMajorAxis: 0.0485,
            periodDays: 11.186,
            eccentricity: 0.1,
            inclination: 0,
            ascendingNode: 0,
            argumentOfPeriapsis: 0,
            meanAnomaly: 0,
          },
          radiusRearth: 1.07,
          massMearth: 1.17,
          discoveryYear: 2016,
          discoveryMethod: 'Radial Velocity',
          isHabitableCandidate: true,
          composition: 'terrestrial',
        },
      ],
      planetCompositionCounts: [1, 0, 0, 0],
      hasHabitableCandidate: true,
    };

    const allSystemManifests = [proximaManifest];
    const sectorManifestsMap = new Map([['sector_+000_+000_+000', [proximaManifest]]]);
    const starAliasesById = new Map<string, string[]>([
      ['hip-71683', ['rigil kentaurus', 'alpha centauri a']],
      ['hip-71681', ['toliman', 'alpha centauri b']],
      ['hip-70890', ['proxima centauri', 'alpha centauri c', 'v645 centauri']],
    ]);

    consolidateMultiStarSystems({
      cataloguedSummaries,
      local10pcSystems,
      referenceBrightSystems,
      exoplanetHostSummaries,
      sectorMap,
      allSystemManifests,
      sectorManifestsMap,
      starAliasesById,
    });

    expect(cataloguedSummaries).toHaveLength(1);
    const primary = cataloguedSummaries[0]!;
    expect(primary.id).toBe('hip-71683');
    expect(primary.name).toBe('Alpha Centauri');
    expect(primary.starCount).toBe(3);
    expect(primary.spect).toBe('G2V + K1V + M5.5Ve');
    expect(primary.planetCount).toBe(1);
    expect(primary.hasHabitableCandidate).toBe(true);

    // ExoplanetHostSummaries should now contain primary and NOT proxima
    expect(exoplanetHostSummaries).toHaveLength(1);
    expect(exoplanetHostSummaries[0]?.id).toBe('hip-71683');

    // Local 10pc and reference bright systems
    expect(local10pcSystems).toHaveLength(1);
    expect(local10pcSystems[0]?.id).toBe('hip-71683');

    // Manifest inspection
    expect(allSystemManifests).toHaveLength(1);
    const primaryManifest = allSystemManifests[0]!;
    expect(primaryManifest.id).toBe('hip-71683');
    expect(primaryManifest.stars).toHaveLength(3);
    expect(primaryManifest.stars.map((s) => s.componentDesignation)).toEqual(['A', 'B', 'C']);
    expect(primaryManifest.planets).toHaveLength(1);
    expect(primaryManifest.planets[0]?.id).toBe('proxima-b');

    // Aliases inspection: all 3 components' aliases merged under hip-71683
    const mergedAliases = starAliasesById.get('hip-71683') || [];
    expect(mergedAliases).toContain('proxima centauri');
    expect(mergedAliases).toContain('toliman');
    expect(mergedAliases).toContain('alpha centauri');
    expect(starAliasesById.has('hip-71681')).toBe(false);
    expect(starAliasesById.has('hip-70890')).toBe(false);
  });

  it('never consolidates Sol at (0, 0, 0) with nearby stars', () => {
    const sol = makeSummary('sol', 'Sol', 0, 0, 0, -26.74, 'G2V');
    const fakeCloseStar = makeSummary('close-star', 'Close Star', 0.02, 0.01, 0.01, 8.0, 'M4V');

    const cataloguedSummaries = [sol, fakeCloseStar];
    const sectorMap = new Map([['sector_+000_+000_+000', [sol, fakeCloseStar]]]);

    const result = consolidateMultiStarSystems({
      cataloguedSummaries,
      sectorMap,
    });

    expect(result.consolidatedCount).toBe(0);
    expect(cataloguedSummaries).toHaveLength(2);
    expect(cataloguedSummaries.map((s) => s.id)).toEqual(['sol', 'close-star']);
  });

  it('groups components sharing stripped base name key from aliases up to 0.85 pc (Condition 2)', () => {
    // Two components of Gl 22 separated by 0.5 pc due to parallax discrepancy
    const compA = makeSummary('gaia-gl22a', 'Gl 22A', 8.0, 4.0, 1.0, 10.2, 'M2.5V');
    const compB = makeSummary('hip-gl22b', 'Gl 22B', 8.4, 4.2, 1.2, 12.0, 'M3V'); // dist ~ 0.49 pc

    const starAliasesById = new Map<string, string[]>([
      ['gaia-gl22a', ['gl 22', 'gj 22']],
      ['hip-gl22b', ['gl 22', 'gj 22']],
    ]);

    const cataloguedSummaries = [compA, compB];
    const result = consolidateMultiStarSystems({
      cataloguedSummaries,
      starAliasesById,
    });

    expect(result.consolidatedCount).toBe(1);
    expect(cataloguedSummaries).toHaveLength(1);
    expect(cataloguedSummaries[0]?.name).toBe('Gl 22');
    expect(cataloguedSummaries[0]?.starCount).toBe(2);
  });

  it('groups components with tiny sky angular separation and matching radial distance (Condition 3)', () => {
    // Both along line of sight (10, 0, 0):
    // star 1 at distance 10 pc: (10, 0, 0)
    // star 2 at distance 10.5 pc (radial diff = 0.5 / 10 = 0.05 <= 0.12), transverse sep = 0.01 pc:
    // unit vector dot product >= 0.999995
    const s1 = makeSummary('sys-1', 'Star Alpha', 10.0, 0.0, 0.0, 6.0, 'G2V');
    const s2 = makeSummary('sys-2', 'Star Beta', 10.5, 0.008, 0.006, 8.5, 'K0V');

    const cataloguedSummaries = [s1, s2];
    const result = consolidateMultiStarSystems({
      cataloguedSummaries,
    });

    expect(result.consolidatedCount).toBe(1);
    expect(cataloguedSummaries).toHaveLength(1);
    expect(cataloguedSummaries[0]?.id).toBe('sys-1');
  });

  it('deduplicates duplicate single-star catalog entries (one gaia- and one hip-/hyg- without component suffix)', () => {
    // HIP 33226 (gaia) and Gl 251 (hip) for the same single star
    const gaiaEntry = makeSummary('gaia-3147829', 'HIP 33226', 5.5, 1.2, 3.1, 9.8, 'M3V');
    const hipEntry = makeSummary('hip-33226', 'Gl 251', 5.52, 1.21, 3.09, 10.0, 'M3V');

    const starAliasesById = new Map<string, string[]>([
      ['gaia-3147829', ['hip 33226', 'gl 251']],
      ['hip-33226', ['hip 33226', 'gl 251']],
    ]);

    const cataloguedSummaries = [gaiaEntry, hipEntry];
    const allSystemManifests = [
      {
        id: 'gaia-3147829',
        name: 'HIP 33226',
        x: 5.5,
        y: 1.2,
        z: 3.1,
        dist: 6.4,
        sectorId: 'sector_+000_+000_+000',
        stars: [
          {
            id: 'gaia-3147829-A',
            name: 'HIP 33226',
            componentDesignation: 'A',
            spectralType: 'M3V',
            mag: 9.8,
            absmag: 8.5,
          },
        ],
        planets: [],
      },
    ];

    const result = consolidateMultiStarSystems({
      cataloguedSummaries,
      starAliasesById,
      allSystemManifests,
    });

    expect(result.consolidatedCount).toBe(1);
    expect(cataloguedSummaries).toHaveLength(1);
    // Crucial check: starCount must be 1, NOT 2!
    expect(cataloguedSummaries[0]?.starCount).toBe(1);
    // Manifest must have 1 stellar component, NOT 2!
    expect(allSystemManifests[0]?.stars).toHaveLength(1);
  });
});
