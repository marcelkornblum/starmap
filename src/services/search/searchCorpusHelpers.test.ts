import { describe, expect, it } from 'vitest';
import {
  findFocusedEntryInCorpus,
  isArtificialSpacecraftEntry,
  isChildOfHostSystem,
  resolveEntityKind,
  resolveEntryCategory,
  resolveResultDisplayTitle,
  resolveResultSystemTitle,
  resolveReticleType,
} from './searchCorpusHelpers';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { SAMPLE_CORPUS } from '../../../tests/fixtures/searchFixtures';

describe('searchCorpusHelpers', () => {
  it('maps CompactSearchEntry kind codes to categories and entity kinds', () => {
    expect(resolveEntryCategory(SAMPLE_CORPUS[0])).toBe('stars');
    expect(resolveEntityKind(SAMPLE_CORPUS[0])).toBe('star-system');

    expect(resolveEntryCategory(SAMPLE_CORPUS[3])).toBe('planets');
    expect(resolveEntityKind(SAMPLE_CORPUS[3])).toBe('planet');

    expect(resolveEntryCategory(SAMPLE_CORPUS[5])).toBe('planets');
    expect(resolveEntityKind(SAMPLE_CORPUS[5])).toBe('moon');

    expect(resolveEntryCategory(SAMPLE_CORPUS[6])).toBe('planets');
    expect(resolveEntityKind(SAMPLE_CORPUS[6])).toBe('dwarf-planet');

    expect(resolveEntryCategory(SAMPLE_CORPUS[7])).toBe('structures');
    expect(resolveEntityKind(SAMPLE_CORPUS[7])).toBe('galactic-structure');

    expect(resolveEntryCategory(SAMPLE_CORPUS[8])).toBe('minor-bodies');
    expect(resolveEntityKind(SAMPLE_CORPUS[8])).toBe('minor-body');

    expect(resolveEntryCategory(SAMPLE_CORPUS[9])).toBe('layers');
    expect(resolveEntityKind(SAMPLE_CORPUS[9])).toBe('fictional-entry');

    const parentLayerEntry: CompactSearchEntry = {
      i: 'canon-project-hail-mary',
      k: 7,
      n: 'Project Hail Mary',
      w: 'canon-project-hail-mary',
    };
    expect(resolveEntryCategory(parentLayerEntry)).toBe('layers');
    expect(resolveEntityKind(parentLayerEntry)).toBe('layer');
  });

  it('evaluates host/child relationships and artificial spacecraft predicates', () => {
    expect(isChildOfHostSystem('earth', 'sol')).toBe(true);
    expect(isChildOfHostSystem('sol', 'sol')).toBe(false);
    expect(isChildOfHostSystem('phm:tau-ceti', 'tau-ceti')).toBe(false);
    expect(isChildOfHostSystem('earth', undefined)).toBe(false);

    expect(
      isArtificialSpacecraftEntry({
        i: 'voyager-1',
        k: 6,
        n: 'Voyager 1',
        u: 'construct',
      }),
    ).toBe(true);
    expect(
      isArtificialSpacecraftEntry({
        i: 'custom-probe',
        k: 6,
        n: 'Custom Probe',
        a: 'customprobe spacecraft',
      }),
    ).toBe(true);
    expect(isArtificialSpacecraftEntry({ i: '433-eros', k: 6, n: '433 Eros' })).toBe(false);
  });

  it('resolves display titles and parent system titles', () => {
    expect(resolveResultDisplayTitle({ i: 'sol', n: '  Sol  ' })).toBe('Sol');
    expect(resolveResultDisplayTitle({ i: 'fallback-id', n: '   ' })).toBe('fallback-id');

    const sysMap = new Map<string, string>([['sol', 'Sol']]);
    expect(resolveResultSystemTitle({ i: 'earth', k: 2, n: 'Earth', s: 'sol' }, sysMap)).toBe('Sol');
    expect(resolveResultSystemTitle({ i: 'sol', n: 'Sol' }, sysMap)).toBeUndefined();
  });

  it('resolves reticle classification types with overrides', () => {
    expect(resolveReticleType({ i: 's1', n: 'WD', u: 'white-dwarf', m: [11, 'DA2', 0] })).toBe('white-dwarf');
    expect(resolveReticleType({ i: 's2', n: 'BD', u: 'brown-dwarf', m: [16, 'T8', 0] })).toBe('brown-dwarf');
    expect(resolveReticleType({ i: 's3', n: 'PSR', u: 'neutron-star', m: [20, 'PSR', 0] })).toBe('neutron-star');
    expect(resolveReticleType({ i: 'jupiter', k: 2, n: 'Jupiter', u: 'gas-giant' })).toBe('gas-giant');
    expect(resolveReticleType({ i: 'neptune', k: 2, n: 'Neptune', u: 'sub-neptune' })).toBe('ice-giant');
    expect(resolveReticleType({ i: 'snr-crab', k: 5, n: 'Crab Remnant', u: 'hazard' })).toBe('hazard');
    expect(resolveReticleType({ i: 'voyager-1', k: 6, n: 'Voyager 1', u: 'construct' })).toBe('construct');
    expect(resolveReticleType({ i: '433-eros', k: 6, n: '433 Eros' })).toBe('terrestrial');
    expect(
      resolveReticleType({ i: 'phm:tau-ceti', k: 7, n: 'Tau Ceti', s: 'tau-ceti' }),
    ).toBe('stellar-system');
  });

  it('finds focused entries in corpus with WeakMap indexing', () => {
    expect(findFocusedEntryInCorpus('   ', SAMPLE_CORPUS)).toBeUndefined();
    expect(findFocusedEntryInCorpus('tau-ceti', [])).toBeUndefined();

    const tau = findFocusedEntryInCorpus('tau-ceti', SAMPLE_CORPUS);
    expect(tau?.i).toBe('gaia-2452378776434477184');

    const planet = findFocusedEntryInCorpus('tau-ceti-e', SAMPLE_CORPUS);
    expect(planet?.n).toBe('tau Ceti e');

    const segmentMatch = findFocusedEntryInCorpus('astrophage-destination', SAMPLE_CORPUS);
    expect(segmentMatch).toBeDefined();
  });
});
