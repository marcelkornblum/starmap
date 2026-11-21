import { describe, expect, it } from 'vitest';
import { buildFocusedEntityDetails } from './focusedEntityDetails';
import {
  PLANET_HAZARD_BITS,
  SYSTEM_HAZARD_BITS,
} from '../../utils/compactDataConstants';
import type {
  CircumstellarDiskRecord,
  SystemManifest,
} from '../../types/astro';
import type {
  FocusedBeltEntityDetails,
  FocusedPlanetEntityDetails,
} from './detailsEntityTypes';

const mockProximaManifest: SystemManifest = {
  id: 'proxima-centauri',
  name: 'Proxima Centauri',
  x: -0.47,
  y: 1.32,
  z: -0.33,
  dist: 1.3,
  hazardMask: SYSTEM_HAZARD_BITS.FLARE_STAR,
  sectorId: 'sector_-000_+001_-000',
  planetCompositionCounts: [1, 1, 0, 0],
  stars: [
    {
      id: 'proxima-centauri-a',
      name: 'Proxima Centauri',
      componentDesignation: 'A',
      spectralType: 'M5.5Ve',
      mag: 11.13,
      absmag: 15.6,
      massMsun: 0.12,
    },
  ],
  planets: [
    {
      id: 'proxima-centauri-b',
      name: 'Proxima Centauri b',
      letter: 'b',
      composition: 'terrestrial',
      massMearth: 1.07,
      radiusRearth: 1.03,
      surfaceGravityG: 1.01,
      equilibriumTempK: 234,
      esi: 0.87,
      orbit: {
        semiMajorAxis: 0.0485,
        periodDays: 11.186,
        eccentricity: 0.02,
        inclination: 0,
        ascendingNode: 0,
        argumentOfPeriapsis: 0,
        meanAnomaly: 0,
      },
      hazardMask: PLANET_HAZARD_BITS.TIDAL_LOCKING,
      isTidallyLocked: true,
      isHabitableCandidate: true,
    },
    {
      id: 'proxima-centauri-c',
      name: 'Proxima Centauri c',
      letter: 'c',
      composition: 'super-earth',
      massMearth: 7.0,
      radiusRearth: 1.8,
      surfaceGravityG: 2.16,
      equilibriumTempK: 39,
      esi: 0.2,
      orbit: {
        semiMajorAxis: 1.48,
        periodDays: 1928,
        eccentricity: 0.04,
        inclination: 0,
        ascendingNode: 0,
        argumentOfPeriapsis: 0,
        meanAnomaly: 0,
      },
      hazardMask: PLANET_HAZARD_BITS.CRYOGENIC_COLD | PLANET_HAZARD_BITS.HIGH_GRAVITY,
      isTidallyLocked: false,
      isHabitableCandidate: false,
    },
  ],
};

const SAMPLE_DISKS: CircumstellarDiskRecord[] = [
  {
    id: 'sol-asteroid-belt',
    name: 'Asteroid Belt',
    kind: 'asteroid-belt',
    innerRadiusAu: 2.1,
    outerRadiusAu: 3.3,
    semiMajorAxisAu: 2.7,
    composition: 'Rocky & metallic planetesimals',
  },
];

describe('focusedEntityDetails', () => {
  it('host system inherits its own hazard mask in details', () => {
    const details = buildFocusedEntityDetails({
      focusedEntity: null,
      systemDetail: { kind: 'system', record: mockProximaManifest },
      urlSystemSlug: 'proxima-centauri',
    });

    expect(details).not.toBeNull();
    expect(details?.focusedKind).toBe('system');
    expect(details?.hazardCount).toBe(1);
    expect(details?.hazards).toHaveLength(1);
    expect(details?.hazards[0]?.code).toBe('flare-star');
    expect(details?.hazardSummaryLabel).toBe('1 hazard');
    expect(details?.planetCompositionBreakdown).toEqual([
      { composition: 'terrestrial', count: 1 },
      { composition: 'super-earth', count: 1 },
    ]);
  });

  it('focused planet inherits host system hazards and combines them with planet hazards', () => {
    const details = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'proxima-centauri-b',
        name: 'Proxima Centauri b',
        position: [-0.47, 1.32, -0.33],
      },
      systemDetail: { kind: 'system', record: mockProximaManifest },
      urlSystemSlug: 'proxima-centauri',
      hasExplicitFocus: true,
    });

    expect(details).not.toBeNull();
    expect(details?.focusedKind).toBe('planet');
    expect(details?.hazardCount).toBe(2);
    expect(details?.hazardSummaryLabel).toBe('2 hazards');
    const codes = details?.hazards.map((h) => h.code);
    expect(codes).toContain('flare-star');
    expect(codes).toContain('tidal-locking');

    const planetDetails = details as FocusedPlanetEntityDetails;
    expect(planetDetails.planetTelemetry).toBeDefined();
    expect(planetDetails.planetTelemetry.surfaceGravityG).toBe(1.01);
    expect(planetDetails.planetTelemetry.isTidallyLocked).toBe(true);
    expect(planetDetails.planetTelemetry.esi).toBe(0.87);
    expect(planetDetails.planetTelemetry.hazardCount).toBe(2);
  });

  it('focused super-earth planet displays super-earth reticle classification and telemetries', () => {
    const details = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'proxima-centauri-c',
        name: 'Proxima Centauri c',
        position: [-0.47, 1.32, -0.33],
      },
      systemDetail: { kind: 'system', record: mockProximaManifest },
      urlSystemSlug: 'proxima-centauri',
      hasExplicitFocus: true,
    });

    expect(details).not.toBeNull();
    expect(details?.focusedKind).toBe('planet');
    expect(details?.reticleType).toBe('super-earth');
    expect(details?.hazardCount).toBe(3);
    expect(details?.hazardSummaryLabel).toBe('3 hazards');

    const planetDetails = details as FocusedPlanetEntityDetails;
    expect(planetDetails.planetTelemetry.composition).toBe('super-earth');
    expect(planetDetails.planetTelemetry.surfaceGravityG).toBe(2.16);
    expect(planetDetails.planetTelemetry.isTidallyLocked).toBe(false);
  });

  it('focused star in the system also inherits the host system hazards', () => {
    const details = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'proxima-centauri-a',
        name: 'Proxima Centauri',
        position: [-0.47, 1.32, -0.33],
      },
      systemDetail: { kind: 'system', record: mockProximaManifest },
      urlSystemSlug: 'proxima-centauri',
      hasExplicitFocus: true,
    });

    expect(details).not.toBeNull();
    expect(details?.focusedKind).toBe('star');
    expect(details?.hazardCount).toBe(1);
    expect(details?.hazards[0]?.code).toBe('flare-star');
  });

  it('resolves focusedKind to system on GalaxyView and star when in SystemView', () => {
    const galaxySol = buildFocusedEntityDetails({
      focusedEntity: { id: 'sol', name: 'Sol', spectralType: 'G2V', position: [0, 0, 0] },
      hasExplicitFocus: true,
      urlSystemSlug: null,
    });
    expect(galaxySol?.focusedKind).toBe('system');

    const systemSol = buildFocusedEntityDetails({
      focusedEntity: { id: 'sol', name: 'Sol', spectralType: 'G2V', position: [0, 0, 0] },
      hasExplicitFocus: true,
      urlSystemSlug: 'sol',
    });
    expect(systemSol?.focusedKind).toBe('star');
  });

  it('resolves belt details directly through urlFocusSlug without synthetic entity workaround', () => {
    const details = buildFocusedEntityDetails({
      focusedEntity: null,
      urlSystemSlug: 'sol',
      urlFocusSlug: 'asteroid-belt',
      systemDetail: {
        kind: 'system',
        record: {
          id: 'sol',
          name: 'Sol',
          x: 0,
          y: 0,
          z: 0,
          dist: 0,
          sectorId: 'sector_+000_+000_+000',
          stars: [
            {
              id: 'sol',
              name: 'Sol',
              componentDesignation: 'A',
              spectralType: 'G2V',
              mag: -26.74,
              absmag: 4.83,
            },
          ],
          planets: [],
          disks: SAMPLE_DISKS,
        },
      },
    });

    expect(details).not.toBeNull();
    expect(details!.focusedKind).toBe('belt');
    const belt = details as FocusedBeltEntityDetails;
    expect(belt.id).toBe('sol-asteroid-belt');
    expect(belt.name).toBe('Asteroid Belt');
    expect(belt.diskTelemetry.classification).toBe('asteroid-belt');
    expect(belt.centerHref).toBe('/system/sol?center=sol-asteroid-belt&focus=sol-asteroid-belt');
  });
});
