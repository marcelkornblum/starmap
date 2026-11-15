import { describe, expect, it } from 'vitest';
import { buildSystemOrbitalSchematic } from './systemOrbitalSchematic';

describe('systemOrbitalSchematic', () => {
  it('returns null when systemBodies is null', () => {
    expect(buildSystemOrbitalSchematic(null)).toBeNull();
  });

  it('interleaves stars, planets, and disks sorted by orbital radius', () => {
    const schematic = buildSystemOrbitalSchematic(
      {
        systemId: 'sol',
        systemName: 'Sol',
        stars: [
          {
            id: 'sol-star',
            name: 'Sol',
            componentDesignation: 'A',
            spectralType: 'G2V',
            mag: -26.74,
            absmag: 4.83,
          },
        ],
        planets: [
          {
            id: 'earth',
            name: 'Earth',
            letter: 'd',
            composition: 'terrestrial',
            isHabitableCandidate: true,
            semiMajorAxisAu: 1.0,
            periodDays: 365.25,
          },
          {
            id: 'jupiter',
            name: 'Jupiter',
            letter: 'e',
            composition: 'gas-giant',
            isHabitableCandidate: false,
            semiMajorAxisAu: 5.2,
            periodDays: 4333,
          },
        ],
        disks: [
          {
            id: 'asteroid-belt',
            name: 'Main Asteroid Belt',
            kind: 'asteroid-belt',
            kindLabel: 'Asteroid Belt',
            href: '/system/sol?focus=asteroid-belt',
            semiMajorAxisAu: 2.7,
            composition: 'Rocky & metallic planetesimals',
            innerRadiusAu: 2.1,
            outerRadiusAu: 3.3,
          },
        ],
      },
      [],
    );

    expect(schematic).not.toBeNull();
    expect(schematic!.items.length).toBe(4);
    expect(schematic!.items[0].id).toBe('sol-star');
    expect(schematic!.items[1].id).toBe('earth');
    expect(schematic!.items[2].id).toBe('asteroid-belt');
    expect(schematic!.items[3].id).toBe('jupiter');
  });
});
