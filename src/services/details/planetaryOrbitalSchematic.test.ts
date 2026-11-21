import { describe, expect, it } from 'vitest';
import { buildPlanetaryOrbitalSchematic } from './planetaryOrbitalSchematic';

describe('planetaryOrbitalSchematic', () => {
  it('returns null when planetaryBodies is null', () => {
    expect(buildPlanetaryOrbitalSchematic(null)).toBeNull();
  });

  it('builds planetary schematic with host planet and sorted moons', () => {
    const schematic = buildPlanetaryOrbitalSchematic(
      {
        scope: 'planet',
        planetId: 'jupiter',
        planetName: 'Jupiter',
        planetHref: '/planet/jupiter',
        systemId: 'sol',
        systemName: 'Sol',
        systemHref: '/system/sol',
        planetDetail: {
          id: 'jupiter',
          name: 'Jupiter',
          composition: 'gas-giant',
          isHabitableCandidate: false,
        },
        moons: [
          {
            id: 'europa',
            name: 'Europa',
            href: '/planet/jupiter?focus=europa',
            categoryKey: 'moon',
            categoryLabel: 'Moon',
          },
          {
            id: 'io',
            name: 'Io',
            href: '/planet/jupiter?focus=io',
            categoryKey: 'moon',
            categoryLabel: 'Moon',
          },
        ],
        minorBodiesAndSpacecraft: [],
        canonAnnotations: [],
      },
      [
        { i: 'io', n: 'Io', p: [0, 0, 0], r: 1 },
        { i: 'europa', n: 'Europa', p: [0, 0, 0], r: 2 },
      ],
    );

    expect(schematic).not.toBeNull();
    if (!schematic) return;
    expect(schematic.items).toHaveLength(3);
    expect(schematic.items[0]?.id).toBe('jupiter');
    expect(schematic.items[1]?.id).toBe('io');
    expect(schematic.items[2]?.id).toBe('europa');
  });

  it('matches moons by url slug and applies region/rank from corpus', () => {
    const schematic = buildPlanetaryOrbitalSchematic(
      {
        scope: 'planet',
        planetId: 'saturn',
        planetName: 'Saturn',
        planetHref: '/planet/saturn',
        systemId: 'sol',
        systemName: 'Sol',
        systemHref: '/system/sol',
        planetDetail: {
          id: 'saturn',
          name: 'Saturn',
          composition: 'gas-giant',
          isHabitableCandidate: false,
        },
        moons: [
          {
            id: 'Enceladus-Moon',
            name: 'Enceladus',
            href: '/planet/saturn?focus=enceladus',
            categoryKey: 'moon',
            categoryLabel: 'Moon',
          },
        ],
        minorBodiesAndSpacecraft: [],
        canonAnnotations: [],
      },
      [
        { i: 'enceladus-moon', n: 'Enceladus', p: [0, 0, 0], r: 2, z: 1 },
      ],
    );

    expect(schematic).not.toBeNull();
    if (!schematic) return;
    expect(schematic.items).toHaveLength(2);
    expect(schematic.items[1]?.id).toBe('Enceladus-Moon');
    expect(schematic.items[1]?.orbitRank).toBe(2);
    expect(schematic.items[1]?.inHabitableZone).toBe(true);
  });
});
