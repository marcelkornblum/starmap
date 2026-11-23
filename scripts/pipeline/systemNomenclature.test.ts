import { describe, it, expect } from 'vitest';
import type { SystemSummaryNode } from '../../src/types/astro';
import {
  addKeyVariants,
  getStrippedSystemBaseName,
  isConstellationName,
  isDuplicateCatalogRecord,
  mergeSystemAliases,
} from './systemNomenclature';

function makeNode(overrides: Partial<SystemSummaryNode> & { id: string; name: string }): SystemSummaryNode {
  return {
    x: 10,
    y: 20,
    z: 30,
    dist: 37.4,
    mag: 5.0,
    absmag: 2.1,
    spect: 'G2V',
    starCount: 1,
    planetCount: 0,
    hasHabitableCandidate: false,
    sectorId: 'sector_+000_+000_+025',
    ...overrides,
  };
}

describe('systemNomenclature', () => {
  it('strips component suffixes and normalizes special system names', () => {
    expect(getStrippedSystemBaseName('Sirius A')).toBe('Sirius');
    expect(getStrippedSystemBaseName('Alpha Centauri AB')).toBe('Alpha Centauri');
    expect(getStrippedSystemBaseName('61 Cygni B (V1803 Cygni)')).toBe('61 Cygni');
  });

  it('detects constellation names and adds normalized key variants', () => {
    expect(isConstellationName('Orion')).toBe(true);
    expect(isConstellationName('Tau Ceti')).toBe(false);

    const keys = new Set<string>();
    addKeyVariants(keys, 'Tau Ceti A');
    expect(keys.has('tauceti')).toBe(true);
    expect(keys.has('taucetia')).toBe(true);
  });

  it('treats gaia-* vs hip-*/hyg-* without component suffixes as duplicate catalog records', () => {
    const gaiaNode = makeNode({ id: 'gaia-111', name: 'Tau Ceti' });
    const hipNode = makeNode({ id: 'hip-8102', name: 'Tau Ceti' });
    const compA = makeNode({ id: 'gaia-112', name: 'Sirius A' });
    const compB = makeNode({ id: 'hip-32349', name: 'Sirius B' });

    expect(isDuplicateCatalogRecord(gaiaNode, hipNode)).toBe(true);
    expect(isDuplicateCatalogRecord(compA, compB)).toBe(false);
  });

  it('treats exo-* vs gaia-*/hip-*/hyg-* with matching position or name as duplicate catalog records', () => {
    const hipNode = makeNode({ id: 'hip-21421', name: 'Aldebaran', x: 7.027, y: 18.287, z: 5.806 });
    const exoSamePos = makeNode({ id: 'exo-alf-tau', name: 'alf Tau', x: 7.028, y: 18.287, z: 5.806 });
    const exoSameName = makeNode({ id: 'exo-aldebaran', name: 'Aldebaran', x: 7.5, y: 18.5, z: 6.0 });
    const exoDistinctComp = makeNode({ id: 'exo-alpha-tau-b', name: 'Alpha Tau B', x: 7.028, y: 18.287, z: 5.806 });
    const exoUnrelated = makeNode({ id: 'exo-other', name: 'Completely Different', x: 100, y: 200, z: 300 });

    expect(isDuplicateCatalogRecord(exoSamePos, hipNode)).toBe(true);
    expect(isDuplicateCatalogRecord(hipNode, exoSamePos)).toBe(true);
    expect(isDuplicateCatalogRecord(exoSameName, hipNode)).toBe(true);
    expect(isDuplicateCatalogRecord(exoDistinctComp, hipNode)).toBe(false);
    expect(isDuplicateCatalogRecord(exoUnrelated, hipNode)).toBe(false);
  });

  it('merges secondary aliases onto the primary system and deletes secondary entries', () => {
    const aliases = new Map<string, string[]>([
      ['hip-8102', ['tauceti']],
      ['exo-tau-ceti', ['hd10700']],
    ]);
    mergeSystemAliases(
      { id: 'hip-8102', name: 'Tau Ceti' },
      [{ id: 'exo-tau-ceti', name: 'Tau Cet' }],
      aliases,
    );
    expect(aliases.has('exo-tau-ceti')).toBe(false);
    expect(aliases.get('hip-8102')).toEqual(expect.arrayContaining(['tauceti', 'hd10700', 'tau cet']));
  });
});
