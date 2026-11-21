import { describe, expect, it } from 'vitest';
import {
  buildSystemOrbitalSchematic,
  getOrBuildSchematicCorpusIndex,
} from './systemOrbitalSchematic';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';

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
    if (!schematic) return;
    expect(schematic.items.length).toBe(4);
    expect(schematic.items[0]?.id).toBe('sol-star');
    expect(schematic.items[1]?.id).toBe('earth');
    expect(schematic.items[2]?.id).toBe('asteroid-belt');
    expect(schematic.items[3]?.id).toBe('jupiter');
  });

  it('populates moons and dwarf planets from corpus when omitted in input', () => {
    const corpus: readonly CompactSearchEntry[] = [
      { i: 'io', n: 'Io', s: 'sol', o: 'jupiter', k: 3, r: 1 },
      { i: 'ceres', n: 'Ceres', s: 'sol', k: 4, A: 2.7 },
    ];

    const schematic = buildSystemOrbitalSchematic(
      {
        systemId: 'sol',
        systemName: 'Sol',
        stars: [],
        planets: [
          {
            id: 'jupiter',
            name: 'Jupiter',
            composition: 'gas-giant',
            semiMajorAxisAu: 5.2,
            isHabitableCandidate: false,
          },
        ],
      },
      corpus,
    );

    expect(schematic).not.toBeNull();
    const ceres = schematic!.items.find((item) => item.id === 'ceres');
    expect(ceres).toBeDefined();
    expect(ceres?.kind).toBe('dwarf-planet');
  });

  it('getOrBuildSchematicCorpusIndex caches lookups by id and slug', () => {
    const corpus: readonly CompactSearchEntry[] = [
      { i: 'hd-10180-b', n: 'HD 10180 b', k: 2 },
    ];
    const index1 = getOrBuildSchematicCorpusIndex(corpus);
    const index2 = getOrBuildSchematicCorpusIndex(corpus);

    expect(index1).toBe(index2);
    expect(index1.byId.get('hd-10180-b')?.n).toBe('HD 10180 b');
    expect(index1.bySlug.get('hd-10180-b')?.n).toBe('HD 10180 b');
  });
});
