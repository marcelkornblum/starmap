import { describe, expect, it } from 'vitest';
import {
  buildResultTargetLink,
  toSearchResultItem,
  parseUrlSelectTokens,
  resolveSelectedSystemsFromStarType,
  resolveSelectedSystemsFromPlanetType,
  resolveSelectedSystemsFromLayer,
  resolveSelectedSystemsFromUrlSelect,
  buildStarTypeGalaxyHref,
  buildPlanetTypeGalaxyHref,
} from './searchService';
import type { CompactSearchEntry } from '../utils/compactDataCodec';
import { LAYER_MANIFESTS } from '../../content/layers';
import { LAYER_INDEX_ENTRIES } from '../../tests/fixtures/layerFixtures';

describe('searchService - Option C ?select= URL Grammar & Layer Target Links', () => {
  it('produces select=layer:<shortSlug>&layer=<shortSlug> for layer search result items while keeping non-layer links unchanged', () => {
    const fictionSystemEntry: CompactSearchEntry = {
      i: 'canon-project-hail-mary:gaia-2452378776434477184',
      k: 7,
      n: 'Tau Ceti (Astrophage Destination)',
      s: 'gaia-2452378776434477184',
      w: 'canon-project-hail-mary',
      c: 'Project Hail Mary',
    };
    const fictionSystemTarget = buildResultTargetLink({
      id: fictionSystemEntry.i,
      name: fictionSystemEntry.n,
      systemId: fictionSystemEntry.s,
      systemName: 'Tau Ceti',
      layerId: fictionSystemEntry.w,
    });
    expect(fictionSystemTarget).toEqual({
      targetView: 'galaxy',
      href: '/galaxy?focus=tau-ceti&select=layer:project-hail-mary&layer=project-hail-mary:tau-ceti',
    });

    const fictionSystemItem = toSearchResultItem(fictionSystemEntry, 850, 'Tau Ceti');
    expect(fictionSystemItem.href).toBe('/galaxy?focus=tau-ceti&select=layer:project-hail-mary&layer=project-hail-mary:tau-ceti');

    const fictionChildEntry: CompactSearchEntry = {
      i: 'canon-project-hail-mary:erid',
      k: 7,
      n: 'Erid',
      s: '40-eridani',
      w: 'canon-project-hail-mary',
      c: 'Project Hail Mary',
    };
    const fictionChildTarget = buildResultTargetLink({
      id: fictionChildEntry.i,
      name: fictionChildEntry.n,
      systemId: fictionChildEntry.s,
      systemName: '40 Eridani',
      layerId: fictionChildEntry.w,
    });
    expect(fictionChildTarget).toEqual({
      targetView: 'system',
      href: '/system/40-eridani?focus=erid&select=layer:project-hail-mary&layer=project-hail-mary:erid',
    });

    const fictionChildItem = toSearchResultItem(fictionChildEntry, 850, '40 Eridani');
    expect(fictionChildItem.href).toBe('/system/40-eridani?focus=erid&select=layer:project-hail-mary&layer=project-hail-mary:erid');

    const starEntry: CompactSearchEntry = {
      i: 'sol',
      k: 1,
      n: 'Sol',
      h: 1,
    };
    const starTarget = buildResultTargetLink({
      id: starEntry.i,
      name: starEntry.n,
      isSolarSystem: true,
    });
    expect(starTarget).toEqual({
      targetView: 'galaxy',
      href: '/galaxy?focus=sol',
    });

    const earthTarget = buildResultTargetLink({
      id: 'earth',
      name: 'Earth',
      systemId: 'sol',
      isSolarSystem: true,
    });
    expect(earthTarget).toEqual({
      targetView: 'system',
      href: '/system/sol?focus=earth',
    });

    const exoTarget = buildResultTargetLink({
      id: 'tau-ceti-e',
      name: 'Tau Ceti e',
      systemId: 'tau-ceti',
      systemName: 'Tau Ceti',
    });
    expect(exoTarget).toEqual({
      targetView: 'system',
      href: '/system/tau-ceti?focus=tau-ceti-e',
    });

    const parentLayerTarget = buildResultTargetLink({
      id: 'canon-project-hail-mary',
      name: 'Project Hail Mary',
      layerId: 'canon-project-hail-mary',
      entityKind: 'layer',
    });
    expect(parentLayerTarget).toEqual({
      targetView: 'galaxy',
      href: '/galaxy?select=layer:project-hail-mary&layer=project-hail-mary',
    });
  });

  it('parses Option C tokens: tag:<slug>, layer:<slug>, star-type:<slug>, planet-type:<slug>, collection:<slug>, and entity slugs', () => {
    expect(parseUrlSelectTokens('?select=tag:habitable-candidate', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'tag', tag: 'habitable-candidate' },
    ]);
    expect(parseUrlSelectTokens('?select=layer:project-hail-mary', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'layer', layerId: 'canon-project-hail-mary' },
    ]);
    expect(parseUrlSelectTokens('?select=layer:recent-discoveries', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'layer', layerId: 'overlay-recent-discoveries' },
    ]);
    expect(parseUrlSelectTokens('?select=star-type:g', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'star-type', starType: 'g' },
    ]);
    expect(parseUrlSelectTokens('?select=star-type:g2v', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'star-type', starType: 'g2v' },
    ]);
    expect(parseUrlSelectTokens('?select=star-type:white-dwarf', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'star-type', starType: 'white-dwarf' },
    ]);
    expect(parseUrlSelectTokens('?select=planet-type:super-earth', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'planet-type', planetType: 'super-earth' },
    ]);
    expect(parseUrlSelectTokens('?select=planet-type:gas-giant', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'planet-type', planetType: 'gas-giant' },
    ]);
    expect(parseUrlSelectTokens('?select=layer:extreme-worlds', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'layer', layerId: 'overlay-extreme-worlds' },
    ]);
    expect(parseUrlSelectTokens('?select=sol', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'entity', slug: 'sol' },
    ]);

    const multi = parseUrlSelectTokens(
      '?select=star-type:g,layer:project-hail-mary,sol',
      LAYER_INDEX_ENTRIES,
    );
    expect(multi).toEqual([
      { kind: 'star-type', starType: 'g' },
      { kind: 'layer', layerId: 'canon-project-hail-mary' },
      { kind: 'entity', slug: 'sol' },
    ]);
  });

  it('resolves selected systems from star types, planet types, collections, and combined ?select= query', () => {
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
        i: 'keid',
        n: 'Keid',
        k: 1,
        m: [4.43, 'K0.5V', 1],
        p: [-2.5, -3.6, -2.4],
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

    const gStars = resolveSelectedSystemsFromStarType('g', testCorpus);
    expect(gStars.map((s) => s.name)).toEqual(['Sol', 'Tau Ceti']);

    const g2vStars = resolveSelectedSystemsFromStarType('g2v', testCorpus);
    expect(g2vStars.map((s) => s.name)).toEqual(['Sol']);

    const whiteDwarfs = resolveSelectedSystemsFromStarType('white-dwarf', testCorpus);
    expect(whiteDwarfs.map((s) => s.name)).toEqual(['Sirius B']);

    const brownDwarfs = resolveSelectedSystemsFromStarType('brown-dwarf', testCorpus);
    expect(brownDwarfs.map((s) => s.name)).toEqual(['Luhman 16']);

    const superEarthSystems = resolveSelectedSystemsFromPlanetType('super-earth', testCorpus);
    expect(superEarthSystems.map((s) => s.name)).toEqual(['Tau Ceti']);

    const gasGiantSystems = resolveSelectedSystemsFromPlanetType('gas-giant', testCorpus);
    expect(gasGiantSystems.map((s) => s.name)).toEqual(['Sol']);

    const starOnlyCorpus = testCorpus.filter((e) => e.k !== 2);
    const fallbackTerrestrial = resolveSelectedSystemsFromPlanetType('terrestrial', starOnlyCorpus);
    expect(fallbackTerrestrial.map((s) => s.name)).toEqual(['Sol', 'Tau Ceti']);

    const fallbackGasGiant = resolveSelectedSystemsFromPlanetType('gas-giant', starOnlyCorpus);
    expect(fallbackGasGiant.map((s) => s.name)).toEqual(['Sol']);

    const extremeWorlds = resolveSelectedSystemsFromLayer('overlay-extreme-worlds', testCorpus, LAYER_MANIFESTS);
    expect(extremeWorlds.length).toBeGreaterThan(0);
    expect(extremeWorlds.some((s) => s.id === 'sol' || s.name === 'Sol')).toBe(true);

    const newlyDiscovered = resolveSelectedSystemsFromLayer('overlay-recent-discoveries', testCorpus, LAYER_MANIFESTS);
    expect(newlyDiscovered.length).toBeGreaterThan(0);

    const combined = resolveSelectedSystemsFromUrlSelect(
      '?select=star-type:g2v,layer:extreme-worlds',
      testCorpus,
      LAYER_INDEX_ENTRIES,
      LAYER_MANIFESTS,
    );
    expect(combined.some((s) => s.id === 'sol')).toBe(true);
  });

  it('builds canonical galaxy view URLs using helper functions', () => {
    expect(buildStarTypeGalaxyHref('G')).toBe('/galaxy?select=star-type:g');
    expect(buildStarTypeGalaxyHref('g2v')).toBe('/galaxy?select=star-type:g2v');
    expect(buildStarTypeGalaxyHref('')).toBe('/galaxy');

    expect(buildPlanetTypeGalaxyHref('super-earth')).toBe('/galaxy?select=planet-type:super-earth');
    expect(buildPlanetTypeGalaxyHref('Super-Earth')).toBe('/galaxy?select=planet-type:super-earth');
    expect(buildPlanetTypeGalaxyHref('')).toBe('/galaxy');
  });
});
