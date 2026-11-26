import { afterEach, describe, expect, it } from 'vitest';
import {
  clearDetailsRepositoryCache,
  getCachedDetailRecord,
  isBulkMinorBodyId,
  seedDetailRecord,
} from '../../data/detailsRepository';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import type {
  FocusedBeltEntityDetails,
  FocusedMinorBodyEntityDetails,
  FocusedPlanetEntityDetails,
  FocusedStarEntityDetails,
  FocusedStructureEntityDetails,
  FocusedSystemEntityDetails,
} from './detailsEntityTypes';
import {
  MINOR_ORBITER_TOGGLE_THRESHOLD,
  buildOrbitalSchematic,
  buildOrbitalSchematicBands,
} from './orbitalSchematicBuilder';

const makeSystemDetails = (
  overrides: Partial<FocusedSystemEntityDetails> = {},
): FocusedSystemEntityDetails => ({
  id: 'sol',
  systemId: 'sol',
  name: 'Sol',
  systemName: 'Sol',
  focusedKind: 'system',
  reticleType: 'stellar-system',
  starCount: 1,
  planetCount: 0,
  planetCompositionBreakdown: [],
  planetCompositionSummary: '0 planets',
  hasHabitableCandidate: false,
  hazardCount: 0,
  hazards: [],
  hazardSummaryLabel: 'None',
  systemSummary: 'Sol',
  systemSummarySegments: [],
  coordinatesPc: [0, 0, 0],
  sectorId: 'sector_+000_+000_+000',
  tags: [],
  directionsHref: '/galaxy?route=sol',
  stars: [
    {
      id: 'sol-star',
      name: 'Sol',
      componentDesignation: 'A',
      spectralType: 'G2V',
      mag: -26.74,
      absmag: 4.83,
      massMsun: 1.0,
      luminosityLsun: 1.0,
    },
  ],
  planets: [],
  canonAnnotations: [],
  ...overrides,
});

const makePlanetDetails = (
  overrides: Partial<FocusedPlanetEntityDetails> = {},
): FocusedPlanetEntityDetails => ({
  id: 'saturn',
  systemId: 'sol',
  name: 'Saturn',
  systemName: 'Sol',
  focusedKind: 'planet',
  reticleType: 'gas-giant',
  starCount: 1,
  planetCount: 1,
  planetCompositionBreakdown: [],
  planetCompositionSummary: '1 gas giant',
  hasHabitableCandidate: false,
  hazardCount: 0,
  hazards: [],
  hazardSummaryLabel: 'None',
  systemSummary: 'Saturn',
  systemSummarySegments: [],
  coordinatesPc: [0, 0, 0],
  sectorId: 'sector_+000_+000_+000',
  tags: [],
  directionsHref: '/galaxy?route=sol',
  stars: [],
  planets: [],
  orbitingBodies: [],
  canonAnnotations: [],
  planetTelemetry: {
    composition: 'gas-giant',
    isHabitableCandidate: false,
    isTidallyLocked: false,
    hazardCount: 0,
    hazards: [],
  },
  ...overrides,
});

describe('orbitalSchematicBuilder', () => {
  afterEach(() => {
    clearDetailsRepositoryCache();
  });

  it('exports MINOR_ORBITER_TOGGLE_THRESHOLD = 3 and detects bulk minor body IDs', () => {
    expect(MINOR_ORBITER_TOGGLE_THRESHOLD).toBe(3);
    expect(isBulkMinorBodyId('pha-99942')).toBe(true);
    expect(isBulkMinorBodyId('distant-90377')).toBe(true);
    expect(isBulkMinorBodyId('comet-1p')).toBe(true);
    expect(isBulkMinorBodyId('halley')).toBe(false);
    expect(isBulkMinorBodyId('ceres')).toBe(false);
    expect(isBulkMinorBodyId('voyager-1')).toBe(false);
  });

  it('returns null for null, belt, structure, or empty schematics', () => {
    expect(buildOrbitalSchematic({ focusedDetails: null })).toBeNull();

    const belt: FocusedBeltEntityDetails = {
      ...makeSystemDetails(),
      id: 'asteroid-belt',
      name: 'Asteroid Belt',
      focusedKind: 'belt',
      orbitingBodies: [],
      diskTelemetry: {
        classification: 'asteroid-belt',
        classificationLabel: 'Asteroid Belt',
        innerRadiusAu: 2.1,
        outerRadiusAu: 3.3,
        semiMajorAxisAu: 2.7,
        composition: 'Rock',
      },
    };
    expect(buildOrbitalSchematic({ focusedDetails: belt })).toBeNull();

    const structure: FocusedStructureEntityDetails = {
      ...makeSystemDetails(),
      id: 'hyades',
      name: 'Hyades',
      focusedKind: 'structure',
      structureTelemetry: {
        structureType: 'Open Cluster',
        symbolType: 'stellar-cluster',
      },
    };
    expect(buildOrbitalSchematic({ focusedDetails: structure })).toBeNull();

    expect(buildOrbitalSchematic({ focusedDetails: makeSystemDetails() })).toBeNull();
  });

  it('builds system/star schematic with HZ, disks, dwarf planets, minor bodies, hyperbolic orbits, and skips moons/bulk shards', () => {
    const j2000PlusOneYearMs = Date.UTC(2001, 0, 1, 12, 0, 0);
    seedDetailRecord('halley', {
      kind: 'solar-body',
      record: {
        id: 'halley',
        name: '1P/Halley',
        classification: 'Comet',
        meanRadiusKm: 5.5,
        reticleType: 'comet',
        orbit: {
          semiMajorAxis: 17.83,
          eccentricity: 0.967,
          inclination: 162,
          ascendingNode: 58,
          argumentOfPeriapsis: 111,
          meanAnomaly: 0,
          periodDays: 27510,
        },
      },
    });
    seedDetailRecord('oumuamua', {
      kind: 'solar-body',
      record: {
        id: 'oumuamua',
        name: "1I/'Oumuamua",
        classification: 'AsteroidNEO',
        meanRadiusKm: 0.1,
        orbit: {
          semiMajorAxis: -1.27,
          eccentricity: 1.2,
          inclination: 122,
          ascendingNode: 24,
          argumentOfPeriapsis: 241,
          meanAnomaly: 0,
          periodDays: 0,
        },
      },
    });

    const corpus: readonly CompactSearchEntry[] = [
      { i: 'earth', n: 'Earth', s: 'sol', k: 2, A: 1.0 },
      { i: 'moon', n: 'Moon', s: 'sol', o: 'earth', k: 3, r: 1 },
      { i: 'ceres', n: 'Ceres', s: 'sol', k: 4, A: 2.77 },
      { i: 'halley', n: '1P/Halley', s: 'sol', k: 6, A: 17.83 },
      { i: 'voyager-1', n: 'Voyager 1', s: 'sol', k: 6, u: 'construct', A: 163.0 },
      { i: 'oumuamua', n: "1I/'Oumuamua", s: 'sol', k: 6 },
      { i: 'unpositioned-asteroid', n: 'Lost Rock', s: 'sol', k: 6 },
      { i: 'pha-99942', n: '99942 Apophis', s: 'sol', k: 6, A: 0.92 },
    ];

    const starDetails: FocusedStarEntityDetails = {
      ...makeSystemDetails({
        planets: [
          {
            id: 'jupiter',
            name: 'Jupiter',
            composition: 'gas-giant',
            semiMajorAxisAu: 5.2,
            isHabitableCandidate: false,
          },
          {
            id: 'earth',
            name: 'Earth',
            composition: 'terrestrial',
            semiMajorAxisAu: 1.0,
            isHabitableCandidate: false,
          },
          {
            id: 'planet-nine',
            name: 'Planet Nine',
            composition: 'ice-giant',
            semiMajorAxisAu: 400,
            isTheoreticalOrbit: true,
            isHabitableCandidate: false,
          },
        ],
        disks: [
          {
            id: 'outer-belt',
            name: 'Outer Belt',
            kind: 'debris-disk',
            kindLabel: 'Debris Disk',
            href: '/system/sol?focus=outer-belt',
            innerRadiusAu: 1.5,
            outerRadiusAu: 4.5,
            semiMajorAxisAu: 3.0,
            composition: 'Dust',
            guideHref: '/guide/semi-major-axis',
          },
          {
            id: 'asteroid-belt',
            name: 'Asteroid Belt',
            kind: 'asteroid-belt',
            kindLabel: 'Asteroid Belt',
            href: '/system/sol?focus=asteroid-belt',
            innerRadiusAu: 2.1,
            outerRadiusAu: 3.3,
            semiMajorAxisAu: 2.7,
            composition: 'Rock',
            guideHref: '/guide/semi-major-axis',
          },
        ],
      }),
      focusedKind: 'star',
      starTelemetry: {
        componentDesignation: 'A',
        spectralType: 'G2V',
        mag: -26.74,
        absmag: 4.83,
      },
    };

    const summary = buildOrbitalSchematic({
      focusedDetails: starDetails,
      corpus,
      selectedEntityIds: ['ceres', 'outer-belt'],
      epochMs: j2000PlusOneYearMs,
      getDetailRecord: getCachedDetailRecord,
    });

    expect(summary).not.toBeNull();
    if (!summary) return;

    expect(summary.parentId).toBe('sol');
    expect(summary.parentKind).toBe('star');
    expect(summary.habitableZoneAu).toEqual([0.75, 1.77]);
    expect(summary.minorBodyCount).toBe(3);
    expect(summary.hasMinorToggle).toBe(false);

    expect(summary.zones.map((z) => z.id)).toEqual(['outer-belt', 'asteroid-belt']);
    expect(summary.zones[0]?.kind).toBe('debris-disk');
    expect(summary.zones[0]?.isSelected).toBe(true);
    expect(summary.zones[1]?.kind).toBe('belt');

    const ids = summary.rows.map((r) => r.id);
    expect(ids).not.toContain('moon');
    expect(ids).not.toContain('pha-99942');
    expect(ids).not.toContain('unpositioned-asteroid');
    expect(ids.filter((id) => id === 'earth')).toHaveLength(1);

    const earth = summary.rows.find((r) => r.id === 'earth');
    expect(earth?.inHabitableZone).toBe(true);
    expect(earth?.lineStyle).toBe('dashed');

    const ceres = summary.rows.find((r) => r.id === 'ceres');
    expect(ceres?.kind).toBe('dwarf-planet');
    expect(ceres?.tier).toBe('primary');
    expect(ceres?.zoneId).toBe('asteroid-belt');
    expect(ceres?.isSelected).toBe(true);

    const halley = summary.rows.find((r) => r.id === 'halley');
    expect(halley?.kind).toBe('comet');
    expect(halley?.tier).toBe('minor');
    expect(halley?.reticleType).toBe('comet');
    expect(halley?.eccentricity).toBe(0.967);
    expect(halley?.inclinationDeg).toBe(162);

    const voyager = summary.rows.find((r) => r.id === 'voyager-1');
    expect(voyager?.kind).toBe('spacecraft');
    expect(voyager?.tier).toBe('minor');

    const oumuamua = summary.rows.find((r) => r.id === 'oumuamua');
    expect(oumuamua?.lineStyle).toBe('dotted');
    expect(oumuamua?.sortDistanceAu).toBeGreaterThan(0);

    const p9 = summary.rows.find((r) => r.id === 'planet-nine');
    expect(p9?.lineStyle).toBe('dotted');
  });

  it('builds planet/dwarf-planet/minor-body schematics with rings, satellites, corpus moons, and deduplication', () => {
    const saturn = makePlanetDetails({
      id: 'saturn',
      name: 'Saturn',
      planets: [
        {
          id: 'saturn',
          name: 'Saturn',
          composition: 'gas-giant',
          isHabitableCandidate: false,
          rings: [
            {
              id: 'saturn-main-rings',
              name: 'Main Rings',
              innerRadiusAu: 0.0005,
              outerRadiusAu: 0.0009,
            },
          ],
        },
      ],
    });

    const corpus: readonly CompactSearchEntry[] = [
      { i: 'mimas', n: 'Mimas', s: 'sol', o: 'saturn', k: 3, A: 0.00124 },
      { i: 'titan', n: 'Titan', s: 'sol', o: 'Saturn', k: 3, A: 0.00817 },
      { i: 'cassini', n: 'Cassini', s: 'sol', o: 'saturn', k: 6, u: 'construct', A: 0.0007 },
      { i: 'pha-saturn', n: 'Ignored Shard', s: 'sol', o: 'saturn', k: 6, A: 0.002 },
    ];

    const summary = buildOrbitalSchematic({
      focusedDetails: saturn,
      systemDetail: {
        kind: 'system',
        record: {
          id: 'sol',
          name: 'Sol',
          x: 0,
          y: 0,
          z: 0,
          dist: 0,
          sectorId: 'sector_0_0_0',
          stars: [],
          planets: [
            {
              id: 'saturn',
              name: 'Saturn',
              letter: 'g',
              satellites: [
                {
                  id: 'mimas',
                  name: 'Mimas',
                  parentId: 'saturn',
                  reticleType: 'moon',
                  orbit: {
                    semiMajorAxis: 0.00124,
                    eccentricity: 0.02,
                    inclination: 1.5,
                    ascendingNode: 0,
                    argumentOfPeriapsis: 0,
                    meanAnomaly: 0,
                    periodDays: 0.94,
                  },
                },
              ],
            },
          ],
        },
      },
      corpus,
      selectedEntityIds: ['titan'],
    });

    expect(summary).not.toBeNull();
    if (!summary) return;

    expect(summary.parentKind).toBe('planet');
    expect(summary.zones).toHaveLength(1);
    expect(summary.zones[0]?.kind).toBe('ring-system');
    expect(summary.zones[0]?.href).toBeUndefined();

    expect(summary.rows.map((r) => r.id)).toEqual(['cassini', 'mimas', 'titan']);
    expect(summary.rows[0]?.zoneId).toBe('saturn-main-rings');
    expect(summary.rows[0]?.kind).toBe('spacecraft');
    expect(summary.rows[1]?.href).toBe('/planet/saturn?focus=mimas');
    expect(summary.rows[2]?.isSelected).toBe(true);

    const pluto: FocusedMinorBodyEntityDetails = {
      ...makeSystemDetails(),
      id: 'pluto',
      name: 'Pluto',
      focusedKind: 'minor-body',
      reticleType: 'terrestrial',
      stars: [],
      planets: [],
      minorBodyTelemetry: {
        classification: 'dwarf-planet',
        categoryLabel: 'Dwarf Planet',
        parentBodyName: 'Sol',
      },
    };
    const plutoSummary = buildOrbitalSchematic({
      focusedDetails: pluto,
      corpus: [{ i: 'charon', n: 'Charon', s: 'sol', o: 'pluto', k: 3, A: 0.000131 }],
    });
    expect(plutoSummary?.parentKind).toBe('dwarf-planet');
    expect(plutoSummary?.rows[0]?.id).toBe('charon');

    const ida: FocusedMinorBodyEntityDetails = {
      ...pluto,
      id: '243-ida',
      name: '243 Ida',
      reticleType: 'terrestrial',
      minorBodyTelemetry: {
        classification: 'asteroid',
        categoryLabel: 'Asteroid',
        parentBodyName: 'Sol',
      },
    };
    const idaSummary = buildOrbitalSchematic({
      focusedDetails: ida,
      corpus: [{ i: 'dactyl', n: 'Dactyl', s: 'sol', o: '243-ida', k: 3, A: 0.0000006 }],
    });
    expect(idaSummary?.parentKind).toBe('minor-body');
  });

  it('toggles minor rows and interleaves row and zone bands cleanly', () => {
    const details = makeSystemDetails({
      planets: [
        {
          id: 'earth',
          name: 'Earth',
          composition: 'terrestrial',
          semiMajorAxisAu: 1.0,
          isHabitableCandidate: true,
        },
        {
          id: 'jupiter',
          name: 'Jupiter',
          composition: 'gas-giant',
          semiMajorAxisAu: 5.2,
          isHabitableCandidate: false,
        },
      ],
      disks: [
        {
          id: 'asteroid-belt',
          name: 'Asteroid Belt',
          kind: 'asteroid-belt',
          kindLabel: 'Asteroid Belt',
          href: '/system/sol?focus=asteroid-belt',
          innerRadiusAu: 2.1,
          outerRadiusAu: 3.3,
          semiMajorAxisAu: 2.7,
          composition: 'Rock',
          guideHref: '/guide/semi-major-axis',
        },
      ],
    });

    const corpus: readonly CompactSearchEntry[] = [
      { i: 'vesta', n: '4 Vesta', s: 'sol', k: 6, A: 2.36 },
      { i: 'pallas', n: '2 Pallas', s: 'sol', k: 6, A: 2.77 },
      { i: 'hygiea', n: '10 Hygiea', s: 'sol', k: 6, A: 3.14 },
      { i: 'juno', n: '3 Juno', s: 'sol', k: 6, A: 2.67 },
    ];

    const summary = buildOrbitalSchematic({ focusedDetails: details, corpus });
    expect(summary).not.toBeNull();
    if (!summary) return;

    expect(summary.minorBodyCount).toBe(4);
    expect(summary.hasMinorToggle).toBe(true);

    const collapsedBands = buildOrbitalSchematicBands(summary, false);
    expect(collapsedBands.map((b) => (b.type === 'row' ? b.row.id : b.zone.id))).toEqual([
      'earth',
      'asteroid-belt',
      'jupiter',
    ]);
    const collapsedZone = collapsedBands[1];
    expect(collapsedZone?.type).toBe('zone');
    if (collapsedZone?.type === 'zone') {
      expect(collapsedZone.rows).toHaveLength(0);
      expect(collapsedZone.titleInsertIndex).toBe(0);
    }

    const expandedBands = buildOrbitalSchematicBands(summary, true);
    expect(expandedBands).toHaveLength(3);
    const expandedZone = expandedBands[1];
    if (expandedZone?.type === 'zone') {
      expect(expandedZone.rows.map((r) => r.id)).toEqual(['vesta', 'juno', 'pallas', 'hygiea']);
      expect(expandedZone.titleInsertIndex).toBe(2);
    }
  });

  it('treats pre-load negative semi-major axis as unbounded dotted fallback outside habitable zone', () => {
    const details = makeSystemDetails({
      planets: [
        {
          id: 'earth',
          name: 'Earth',
          composition: 'terrestrial',
          semiMajorAxisAu: 1.0,
          eccentricity: 0.0167,
          inclinationDeg: 0,
          isHabitableCandidate: true,
        },
      ],
    });
    const corpus: readonly CompactSearchEntry[] = [
      { i: '2i-borisov', n: '2I/Borisov', s: 'sol', k: 6, A: -0.851 },
    ];

    const summary = buildOrbitalSchematic({ focusedDetails: details, corpus });
    expect(summary).not.toBeNull();
    if (!summary) return;

    expect(summary.rows.map((r) => r.id)).toEqual(['earth', '2i-borisov']);
    const earth = summary.rows[0];
    expect(earth?.eccentricity).toBe(0.0167);
    expect(earth?.inclinationDeg).toBe(0);

    const borisov = summary.rows[1];
    expect(borisov?.lineStyle).toBe('dotted');
    expect(borisov?.sortDistanceAu).toBe(Number.POSITIVE_INFINITY);
    expect(borisov?.inHabitableZone).toBe(false);
  });

  it('resolves planetary rings from focusedDetail, getDetailRecord cache, and systemDetail exoplanets', () => {
    const uranus = makePlanetDetails({
      id: 'uranus',
      name: 'Uranus',
      planets: [],
    });
    const corpus: readonly CompactSearchEntry[] = [
      { i: 'miranda', n: 'Miranda', s: 'sol', o: 'uranus', k: 3, A: 0.000868 },
    ];

    const fromFocusedDetail = buildOrbitalSchematic({
      focusedDetails: uranus,
      focusedDetail: {
        kind: 'solar-body',
        record: {
          id: 'uranus',
          name: 'Uranus',
          classification: 'Planet',
          meanRadiusKm: 25362,
          rings: [
            {
              id: 'uranus-epsilon',
              name: 'Epsilon Ring',
              innerRadiusAu: 0.0003,
              outerRadiusAu: 0.00035,
            },
          ],
        },
      },
      corpus,
    });
    expect(fromFocusedDetail?.zones.map((z) => z.id)).toEqual(['uranus-epsilon']);

    seedDetailRecord('uranus', {
      kind: 'solar-body',
      record: {
        id: 'uranus',
        name: 'Uranus',
        classification: 'Planet',
        meanRadiusKm: 25362,
        rings: [
          {
            id: 'uranus-cached-rings',
            name: 'Cached Rings',
            innerRadiusAu: 0.00025,
            outerRadiusAu: 0.00034,
          },
        ],
      },
    });
    const fromCache = buildOrbitalSchematic({
      focusedDetails: uranus,
      corpus,
      getDetailRecord: getCachedDetailRecord,
    });
    expect(fromCache?.zones.map((z) => z.id)).toEqual(['uranus-cached-rings']);

    const exoplanet = makePlanetDetails({
      id: 'j1407b',
      systemId: 'v1400-centauri',
      name: 'J1407b',
      systemName: 'V1400 Centauri',
      planets: [],
    });
    const fromExoplanetSystem = buildOrbitalSchematic({
      focusedDetails: exoplanet,
      systemDetail: {
        kind: 'system',
        record: {
          id: 'v1400-centauri',
          name: 'V1400 Centauri',
          x: 1,
          y: 2,
          z: 3,
          dist: 133,
          sectorId: 'sector_0_0_0',
          stars: [],
          planets: [
            {
              id: 'j1407b',
              name: 'J1407b',
              letter: 'b',
              rings: [
                {
                  id: 'j1407b-super-rings',
                  name: 'Super-Ring System',
                  innerRadiusAu: 0.02,
                  outerRadiusAu: 0.6,
                },
              ],
            },
          ],
        },
      },
      corpus: [{ i: 'j1407b-moon', n: 'Exomoon', s: 'v1400-centauri', o: 'j1407b', k: 3, A: 0.2 }],
    });
    expect(fromExoplanetSystem?.zones.map((z) => z.id)).toEqual(['j1407b-super-rings']);
    expect(fromExoplanetSystem?.rows[0]?.zoneId).toBe('j1407b-super-rings');
  });
});
