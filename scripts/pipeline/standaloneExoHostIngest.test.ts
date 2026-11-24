import { describe, it, expect, vi } from 'vitest';
import type { ExoplanetRecord, SystemManifest, SystemSummaryNode } from '../../src/types/astro';
import type { ExoplanetHostGroup } from './exoplanetHosts';
import {
  attachPlanetsToCataloguedSystem,
  buildCataloguedKeySet,
  emitStandaloneExoplanetHosts,
  findOfficialStarName,
  hasHygExoplanetMatch,
  toExoHostSlug,
} from './standaloneExoHostIngest';

describe('standaloneExoHostIngest', () => {
  it('generates clean exo host slugs and detects official IAU names', () => {
    expect(toExoHostSlug('Kepler-186')).toBe('kepler-186');
    expect(toExoHostSlug('   ')).toBe('host');
    expect(findOfficialStarName({ id: 1, hip: 8102 })).toBeDefined();
    expect(findOfficialStarName(undefined)).toBeUndefined();
  });

  it('detects HYG exoplanet matches and builds catalogued key sets', () => {
    const hostMap = new Map<string, ExoplanetRecord[]>([
      ['hd10700', [{ id: 'tau-cet-e', name: 'Tau Ceti e', letter: 'e' }]],
    ]);
    expect(
      hasHygExoplanetMatch(
        { id: 8085, hip: 8102, hd: 10700, ra: 1.734, dec: -15.937, dist: 3.65 },
        new Map(),
        hostMap,
      ),
    ).toBe(true);

    const keys = buildCataloguedKeySet(
      [
        {
          id: 'hip-8102',
          name: 'Tau Ceti',
          properName: 'Tau Ceti',
          x: 3.15,
          y: 1.54,
          z: -1.0,
          dist: 3.65,
          mag: 3.5,
          absmag: 5.69,
          starCount: 1,
          planetCount: 0,
          hasHabitableCandidate: false,
          sectorId: 'sector_+000_+000_-025',
        },
      ],
      new Map([['hip-8102', ['hd10700']]]),
    );
    expect(keys.has('hip8102')).toBe(true);
    expect(keys.has('tauceti')).toBe(true);
    expect(keys.has('hd10700')).toBe(true);
  });

  it('emits standalone distant confirmed hosts while spatially matching duplicates onto existing systems', () => {
    const existing: SystemSummaryNode = {
      id: 'hip-99901',
      name: 'Distant Anchor',
      x: 0,
      y: 250,
      z: 0,
      dist: 250,
      mag: 5.2,
      absmag: -1.8,
      spect: 'G8III',
      starCount: 1,
      planetCount: 0,
      hasHabitableCandidate: false,
      sectorId: 'sector_+000_+250_+000',
    };

    const matchedGroup: ExoplanetHostGroup = {
      host: {
        hostName: 'Distant Alias',
        canonicalKey: 'distantalias',
        raDeg: 90.0,
        decDeg: 0.0,
        distPc: 251.0,
        confirmed: true,
      },
      planets: [{ id: 'distant-alias-b', name: 'Distant Alias b', letter: 'b', equilibriumTempK: 300 }],
      aliases: ['Distant Alias'],
    };

    const standaloneGroup: ExoplanetHostGroup = {
      host: {
        hostName: 'Kepler-62',
        canonicalKey: 'kepler62',
        raDeg: 283.21,
        decDeg: 45.35,
        distPc: 300.5,
        confirmed: true,
      },
      planets: [{ id: 'kepler-62-f', name: 'Kepler-62 f', letter: 'f', equilibriumTempK: 250 }],
      aliases: ['Kepler-62'],
    };

    const emitHost = vi.fn();
    const attachPlanetsToExisting = vi.fn();
    const matchedExoplanetIds = new Set<string>();

    emitStandaloneExoplanetHosts({
      canonicalHosts: [matchedGroup, standaloneGroup],
      matchedExoplanetIds,
      cataloguedSummaries: [existing],
      starAliasesById: new Map(),
      emitHost,
      attachPlanetsToExisting,
    });

    expect(attachPlanetsToExisting).toHaveBeenCalledTimes(1);
    expect(attachPlanetsToExisting.mock.calls[0]?.[0].id).toBe('hip-99901');
    expect(emitHost).toHaveBeenCalledTimes(1);
    expect(emitHost.mock.calls[0]?.[0]).toBe('exo-kepler-62');
  });

  it('attaches planets to catalogued system summary and creates manifest when details enabled', () => {
    const existingSummary: SystemSummaryNode = {
      id: 'hip-99901',
      name: 'Distant Anchor',
      x: 0,
      y: 250,
      z: 0,
      dist: 250,
      mag: 5.2,
      absmag: -1.8,
      spect: 'G8III',
      starCount: 1,
      planetCount: 0,
      hasHabitableCandidate: false,
      sectorId: 'sector_+000_+250_+000',
    };
    const allSystemManifests: SystemManifest[] = [];
    const manifestById = new Map<string, SystemManifest>();
    const sectorManifestsMap = new Map<string, SystemManifest[]>();
    const exoplanetHostSummaries: SystemSummaryNode[] = [];
    const starAliasesById = new Map<string, string[]>();
    const matchedExoplanetIds = new Set<string>();

    const added = attachPlanetsToCataloguedSystem({
      existingSummary,
      group: {
        host: {
          hostName: 'Distant Alias',
          canonicalKey: 'distantalias',
          raDeg: 90,
          decDeg: 0,
          distPc: 250,
          confirmed: true,
        },
        planets: [],
        aliases: ['Distant Alias'],
      },
      planets: [{ id: 'distant-alias-b', name: 'Distant Alias b', letter: 'b', equilibriumTempK: 280 }],
      includeDetails: true,
      allSystemManifests,
      manifestById,
      sectorManifestsMap,
      exoplanetHostSummaries,
      starAliasesById,
      matchedExoplanetIds,
    });

    expect(added).toBe(1);
    expect(existingSummary.planetCount).toBe(1);
    expect(existingSummary.tags).toContain('ExoplanetHost');
    expect(allSystemManifests).toHaveLength(1);
    expect(manifestById.get('hip-99901')?.planets).toHaveLength(1);
  });
});
