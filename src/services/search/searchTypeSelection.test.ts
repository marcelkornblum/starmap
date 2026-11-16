import { describe, expect, it } from 'vitest';
import {
  resolveSelectedSystemsFromPlanetType,
  resolveSelectedSystemsFromStarType,
} from './searchTypeSelection';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';

describe('searchTypeSelection', () => {
  const testCorpus: readonly CompactSearchEntry[] = [
    {
      i: 'sol',
      n: 'Sol',
      k: 1,
      m: [-26.74, 'G2V', 8, 1],
      b: [4, 0, 2, 2],
      p: [0, 0, 0],
      h: 1,
    },
    {
      i: 'tau-ceti',
      n: 'Tau Ceti',
      k: 1,
      m: [3.5, 'G8V', 4, 1],
      b: [2, 1, 0, 0],
      p: [-3.1, -0.4, -2.0],
    },
    {
      i: 'sirius-b',
      n: 'Sirius B',
      k: 1,
      u: 'white-dwarf',
      m: [8.44, 'DA2', 0],
      p: [-0.5, 2.5, -0.6],
    },
    {
      i: 'luhman-16',
      n: 'Luhman 16',
      k: 1,
      u: 'brown-dwarf',
      m: [14.0, 'L7.5', 0],
      p: [-1.0, 1.5, -0.8],
    },
    {
      i: 'tau-ceti-e',
      n: 'Tau Ceti e',
      k: 2,
      s: 'tau-ceti',
      u: 'super-earth',
    },
    {
      i: 'earth',
      n: 'Earth',
      k: 2,
      s: 'sol',
      u: 'terrestrial',
    },
    {
      i: 'jupiter',
      n: 'Jupiter',
      k: 2,
      s: 'sol',
      u: 'gas-giant',
    },
  ];

  it('resolves star systems matching star types', () => {
    const gStars = resolveSelectedSystemsFromStarType('g', testCorpus);
    expect(gStars.map((s) => s.name)).toEqual(['Sol', 'Tau Ceti']);

    const g2vStars = resolveSelectedSystemsFromStarType('g2v', testCorpus);
    expect(g2vStars.map((s) => s.name)).toEqual(['Sol']);

    const whiteDwarfs = resolveSelectedSystemsFromStarType('white-dwarf', testCorpus);
    expect(whiteDwarfs.map((s) => s.name)).toEqual(['Sirius B']);

    const brownDwarfs = resolveSelectedSystemsFromStarType('brown-dwarf', testCorpus);
    expect(brownDwarfs.map((s) => s.name)).toEqual(['Luhman 16']);

    expect(resolveSelectedSystemsFromStarType('', testCorpus)).toEqual([]);
  });

  it('resolves host star systems matching planet types', () => {
    const superEarthSystems = resolveSelectedSystemsFromPlanetType('super-earth', testCorpus);
    expect(superEarthSystems.map((s) => s.name)).toEqual(['Tau Ceti']);

    const gasGiantSystems = resolveSelectedSystemsFromPlanetType('gas-giant', testCorpus);
    expect(gasGiantSystems.map((s) => s.name)).toEqual(['Sol']);

    const starOnlyCorpus = testCorpus.filter((e) => e.k !== 2);
    const fallbackTerrestrial = resolveSelectedSystemsFromPlanetType('terrestrial', starOnlyCorpus);
    expect(fallbackTerrestrial.map((s) => s.name)).toEqual(['Sol', 'Tau Ceti']);

    expect(resolveSelectedSystemsFromPlanetType('', testCorpus)).toEqual([]);
  });
});
