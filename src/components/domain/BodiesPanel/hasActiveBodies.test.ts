import { describe, expect, it } from 'vitest';
import type {
  GalaxyBodiesSummary,
  PlanetaryBodiesSummary,
  SystemBodiesSummary,
} from '../../../services/details/detailsHierarchyTypes';
import { hasActiveBodiesSummary } from './hasActiveBodies';

function makeGalaxySummary(
  systems: GalaxyBodiesSummary['systems'] = [],
): GalaxyBodiesSummary {
  return {
    scope: 'galaxy',
    centerId: 'sol',
    centerName: 'Sol',
    centerCoordinatesPc: [0, 0, 0],
    apertureRadiusPc: 10,
    apertureRadiusLy: 32.6,
    systems,
  };
}

function makeSystemSummary(
  overrides: {
    stars?: SystemBodiesSummary['stars'];
    planets?: SystemBodiesSummary['planets'];
    disks?: SystemBodiesSummary['disks'];
    moonsAndDwarfPlanets?: SystemBodiesSummary['moonsAndDwarfPlanets'];
    minorBodiesAndSpacecraft?: SystemBodiesSummary['minorBodiesAndSpacecraft'];
  } = {},
): SystemBodiesSummary {
  return {
    scope: 'system',
    systemId: 'sol',
    systemName: 'Sol',
    systemHref: '/system/sol',
    canonAnnotations: [],
    stars: overrides.stars ?? [],
    planets: overrides.planets ?? [],
    disks: overrides.disks,
    moonsAndDwarfPlanets: overrides.moonsAndDwarfPlanets ?? [],
    minorBodiesAndSpacecraft: overrides.minorBodiesAndSpacecraft ?? [],
  };
}

function makePlanetarySummary(
  overrides: {
    planetDetail?: PlanetaryBodiesSummary['planetDetail'];
    moons?: PlanetaryBodiesSummary['moons'];
    minorBodiesAndSpacecraft?: PlanetaryBodiesSummary['minorBodiesAndSpacecraft'];
  } = {},
): PlanetaryBodiesSummary {
  return {
    scope: 'planet',
    systemId: 'sol',
    systemName: 'Sol',
    systemHref: '/system/sol',
    canonAnnotations: [],
    planetId: 'earth',
    planetName: 'Earth',
    planetHref: '/planet/earth',
    planetDetail: overrides.planetDetail,
    moons: overrides.moons ?? [],
    minorBodiesAndSpacecraft: overrides.minorBodiesAndSpacecraft ?? [],
  };
}

describe('hasActiveBodiesSummary', () => {
  it('returns false when elements is null or undefined', () => {
    expect(hasActiveBodiesSummary(null)).toBe(false);
    expect(hasActiveBodiesSummary(undefined)).toBe(false);
  });

  describe('galaxy scope', () => {
    it('returns false when systems list is empty', () => {
      expect(hasActiveBodiesSummary(makeGalaxySummary([]))).toBe(false);
    });

    it('returns true when systems list has at least one system', () => {
      expect(
        hasActiveBodiesSummary(
          makeGalaxySummary([
            {
              id: 'sol',
              name: 'Sol',
              href: '/system/sol',
              tier: 'focused',
              distanceFromFocusPc: 0,
              spectralType: 'G2V',
              planetCount: 8,
              hasHabitableCandidate: true,
              reticleType: 'star',
              hazardCount: 0,
              hazardSummaryLabel: '',
              hasCriticalHazard: false,
            },
          ]),
        ),
      ).toBe(true);
    });
  });

  describe('system scope', () => {
    it('returns false when primary items and minorBodiesAndSpacecraft are empty', () => {
      expect(hasActiveBodiesSummary(makeSystemSummary())).toBe(false);
    });

    it('returns false when moonsAndDwarfPlanets contains only non-dwarf-planet items and other lists are empty', () => {
      expect(
        hasActiveBodiesSummary(
          makeSystemSummary({
            moonsAndDwarfPlanets: [
              {
                id: 'moon',
                name: 'Moon',
                href: '/planet/earth?focus=moon',
                categoryKey: 'moon',
                categoryLabel: 'Moon',
              },
            ],
          }),
        ),
      ).toBe(false);
    });

    it('returns true when a primary star, planet, disk, or dwarf planet exists', () => {
      expect(
        hasActiveBodiesSummary(
          makeSystemSummary({
            stars: [
              {
                id: 'sol-a',
                name: 'Sol',
                href: '/system/sol?focus=sol-a',
                componentDesignation: 'A',
                spectralType: 'G2V',
                mag: -26.7,
                absmag: 4.83,
              },
            ],
          }),
        ),
      ).toBe(true);

      expect(
        hasActiveBodiesSummary(
          makeSystemSummary({
            planets: [
              {
                id: 'earth',
                name: 'Earth',
                href: '/planet/earth',
                composition: 'terrestrial',
                isHabitableCandidate: true,
              },
            ],
          }),
        ),
      ).toBe(true);

      expect(
        hasActiveBodiesSummary(
          makeSystemSummary({
            disks: [
              {
                id: 'asteroid-belt',
                name: 'Asteroid Belt',
                kind: 'asteroid-belt',
                kindLabel: 'Asteroid Belt',
                href: '/system/sol?focus=asteroid-belt',
                innerRadiusAu: 2.2,
                outerRadiusAu: 3.2,
                semiMajorAxisAu: 2.7,
                composition: 'Silicate',
                guideHref: '/guide/disks/asteroid-belt',
              },
            ],
          }),
        ),
      ).toBe(true);

      expect(
        hasActiveBodiesSummary(
          makeSystemSummary({
            moonsAndDwarfPlanets: [
              {
                id: 'pluto',
                name: 'Pluto',
                href: '/system/sol?focus=pluto',
                categoryKey: 'dwarf-planet',
                categoryLabel: 'Dwarf Planet',
              },
            ],
          }),
        ),
      ).toBe(true);
    });

    it('returns true when only minorBodiesAndSpacecraft is non-empty', () => {
      expect(
        hasActiveBodiesSummary(
          makeSystemSummary({
            minorBodiesAndSpacecraft: [
              {
                id: 'voyager-1',
                name: 'Voyager 1',
                href: '/system/sol?focus=voyager-1',
                categoryKey: 'spacecraft',
                categoryLabel: 'Spacecraft',
              },
            ],
          }),
        ),
      ).toBe(true);
    });
  });

  describe('planet scope', () => {
    it('returns false when planetDetail is absent and moons and minorBodiesAndSpacecraft are empty', () => {
      expect(hasActiveBodiesSummary(makePlanetarySummary())).toBe(false);
    });

    it('returns true when planetDetail is present', () => {
      expect(
        hasActiveBodiesSummary(
          makePlanetarySummary({
            planetDetail: {
              id: 'earth',
              name: 'Earth',
              href: '/planet/earth',
              composition: 'terrestrial',
              isHabitableCandidate: true,
            },
          }),
        ),
      ).toBe(true);
    });

    it('returns true when moons is non-empty', () => {
      expect(
        hasActiveBodiesSummary(
          makePlanetarySummary({
            moons: [
              {
                id: 'moon',
                name: 'Moon',
                href: '/planet/earth?focus=moon',
                categoryKey: 'moon',
                categoryLabel: 'Moon',
              },
            ],
          }),
        ),
      ).toBe(true);
    });

    it('returns true when minorBodiesAndSpacecraft is non-empty', () => {
      expect(
        hasActiveBodiesSummary(
          makePlanetarySummary({
            minorBodiesAndSpacecraft: [
              {
                id: 'iss',
                name: 'ISS',
                href: '/planet/earth?focus=iss',
                categoryKey: 'spacecraft',
                categoryLabel: 'Spacecraft',
              },
            ],
          }),
        ),
      ).toBe(true);
    });
  });
});
