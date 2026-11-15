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
    expect(schematic!.items).toHaveLength(3);
    expect(schematic!.items[0].id).toBe('jupiter');
    expect(schematic!.items[1].id).toBe('io');
    expect(schematic!.items[2].id).toBe('europa');
  });
});
