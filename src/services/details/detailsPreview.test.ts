import { describe, expect, it } from 'vitest';
import { buildFocusedPreviewSummary } from './detailsPreview';
import type { FocusedPlanetEntityDetails, FocusedSystemEntityDetails } from './detailsEntityTypes';
import type { OrbitalSchematicSummary } from './detailsHierarchyTypes';

describe('detailsPreview', () => {
  it('returns null when details is null', () => {
    expect(buildFocusedPreviewSummary(null)).toBeNull();
  });

  it('builds system preview summary for system focus', () => {
    const systemDetails: FocusedSystemEntityDetails = {
      id: 'sol',
      name: 'Sol',
      systemId: 'sol',
      systemName: 'Sol',
      focusedKind: 'system',
      hazardCount: 0,
      hazards: [],
      hazardSummaryLabel: '0 hazards',
      spectralType: 'G2V',
      reticleType: 'stellar-system',
      starCount: 1,
      planetCount: 1,
      planetCompositionBreakdown: [],
      planetCompositionSummary: '1 terrestrial',
      hasHabitableCandidate: true,
      systemSummary: 'Sol system',
      systemSummarySegments: [],
      coordinatesPc: [0, 0, 0],
      sectorId: 'sol-sector',
      tags: [],
      directionsHref: '/system/sol?select=route',
      canonAnnotations: [],
      stars: [],
      planets: [
        {
          id: 'earth',
          name: 'Earth',
          letter: 'd',
          composition: 'terrestrial',
          semiMajorAxisAu: 1.0,
          periodDays: 365.25,
          isHabitableCandidate: true,
        },
      ],
      disks: [],
    };

    const summary = buildFocusedPreviewSummary(systemDetails);
    expect(summary).not.toBeNull();
    expect(summary?.targetId).toBe('sol');
    expect(summary?.previewMode).toBe('system-orbits');
    expect(summary?.orbitElements).toHaveLength(1);
    expect(summary?.orbitElements[0]?.id).toBe('earth');
  });

  it('builds planetary-system preview summary for planet focus', () => {
    const planetDetails: FocusedPlanetEntityDetails = {
      id: 'earth',
      name: 'Earth',
      systemId: 'sol',
      systemName: 'Sol',
      focusedKind: 'planet',
      hazardCount: 0,
      hazards: [],
      hazardSummaryLabel: '0 hazards',
      reticleType: 'terrestrial',
      starCount: 1,
      planetCount: 1,
      planetCompositionBreakdown: [],
      planetCompositionSummary: '1 terrestrial',
      hasHabitableCandidate: true,
      systemSummary: 'Sol system',
      systemSummarySegments: [],
      coordinatesPc: [0, 0, 0],
      sectorId: 'sol-sector',
      tags: [],
      directionsHref: '/planet/earth?select=route',
      canonAnnotations: [],
      stars: [],
      planets: [],
      planetTelemetry: {
        composition: 'terrestrial',
        massMearth: 1.0,
        radiusRearth: 1.0,
        surfaceGravityG: 1.0,
        equilibriumTempK: 255,
        isHabitableCandidate: true,
        isTidallyLocked: false,
        hazardCount: 0,
        hazards: [],
      },
      orbitingBodies: [
        {
          id: 'moon',
          name: 'Moon',
          href: '/planet/earth?focus=moon',
          categoryKey: 'moon',
          categoryLabel: 'Moon',
        },
      ],
    };

    const summary = buildFocusedPreviewSummary(planetDetails);
    expect(summary).not.toBeNull();
    expect(summary?.previewMode).toBe('planetary-system');
    expect(summary?.orbitElements).toHaveLength(1);
    expect(summary?.orbitElements[0]?.id).toBe('moon');
  });

  it('uses planeInclinationDeg for system/star focus (Sol = 60.19°, unmeasured exoplanet = 0°)', () => {
    const solDetails: FocusedSystemEntityDetails = {
      id: 'sol',
      name: 'Sol',
      systemId: 'sol',
      systemName: 'Sol',
      focusedKind: 'system',
      planeInclinationDeg: 60.19,
      hazardCount: 0,
      hazards: [],
      hazardSummaryLabel: '0 hazards',
      spectralType: 'G2V',
      reticleType: 'stellar-system',
      starCount: 1,
      planetCount: 8,
      planetCompositionBreakdown: [],
      planetCompositionSummary: '',
      hasHabitableCandidate: true,
      systemSummary: 'Sol system',
      systemSummarySegments: [],
      coordinatesPc: [0, 0, 0],
      sectorId: 'sector_+000_+000_+000',
      tags: [],
      directionsHref: '/system/sol?select=route',
      canonAnnotations: [],
      stars: [],
      planets: [],
      disks: [],
    };
    expect(buildFocusedPreviewSummary(solDetails)?.primaryInclinationDeg).toBe(60.19);

    const tauCetiDetails: FocusedSystemEntityDetails = {
      ...solDetails,
      id: 'tau-ceti',
      name: 'Tau Ceti',
      systemId: 'tau-ceti',
      systemName: 'Tau Ceti',
      planeInclinationDeg: undefined,
    };
    expect(buildFocusedPreviewSummary(tauCetiDetails)?.primaryInclinationDeg).toBe(0);

    const solWithoutPlaneDetails: FocusedSystemEntityDetails = {
      ...solDetails,
      planeInclinationDeg: undefined,
    };
    expect(buildFocusedPreviewSummary(solWithoutPlaneDetails)?.primaryInclinationDeg).toBe(0);
  });

  it('prefers planetTelemetry.axialTiltDeg or solar-body axialTiltDeg over orbital inclination (Uranus = 97.77°)', () => {
    const uranusDetails: FocusedPlanetEntityDetails = {
      id: 'uranus',
      name: 'Uranus',
      systemId: 'sol',
      systemName: 'Sol',
      focusedKind: 'planet',
      hazardCount: 0,
      hazards: [],
      hazardSummaryLabel: '0 hazards',
      reticleType: 'ice-giant',
      starCount: 1,
      planetCount: 8,
      planetCompositionBreakdown: [],
      planetCompositionSummary: '',
      hasHabitableCandidate: false,
      systemSummary: 'Sol system',
      systemSummarySegments: [],
      coordinatesPc: [0, 0, 0],
      sectorId: 'sector_+000_+000_+000',
      tags: [],
      directionsHref: '/planet/uranus?select=route',
      canonAnnotations: [],
      stars: [],
      planets: [],
      planetTelemetry: {
        composition: 'ice-giant',
        inclinationDeg: 0.773,
        axialTiltDeg: 97.77,
        isHabitableCandidate: false,
        isTidallyLocked: false,
        hazardCount: 0,
        hazards: [],
      },
      orbitingBodies: [],
    };
    expect(buildFocusedPreviewSummary(uranusDetails)?.primaryInclinationDeg).toBe(97.77);

    const uranusWithoutTelemetryTilt: FocusedPlanetEntityDetails = {
      ...uranusDetails,
      planetTelemetry: {
        ...uranusDetails.planetTelemetry,
        axialTiltDeg: undefined,
      },
    };
    const summaryWithSolarBody = buildFocusedPreviewSummary(uranusWithoutTelemetryTilt, {
      kind: 'solar-body',
      record: {
        id: 'uranus',
        name: 'Uranus',
        classification: 'Planet',
        parentBodyId: 'sol',
        meanRadiusKm: 25362,
        axialTiltDeg: 97.77,
        orbit: {
          semiMajorAxis: 19.2184,
          eccentricity: 0.0463,
          inclination: 0.773,
          ascendingNode: 74.006,
          argumentOfPeriapsis: 96.998,
          meanAnomaly: 142.238,
          periodDays: 30685.4,
        },
      },
    });
    expect(summaryWithSolarBody?.primaryInclinationDeg).toBe(97.77);
  });

  it('derives orbitElements from OrbitalSchematicSummary default visible rows when provided', () => {
    const solDetails: FocusedSystemEntityDetails = {
      id: 'sol',
      name: 'Sol',
      systemId: 'sol',
      systemName: 'Sol',
      focusedKind: 'system',
      hazardCount: 0,
      hazards: [],
      hazardSummaryLabel: '0 hazards',
      spectralType: 'G2V',
      reticleType: 'stellar-system',
      starCount: 1,
      planetCount: 1,
      planetCompositionBreakdown: [],
      planetCompositionSummary: '1 terrestrial',
      hasHabitableCandidate: true,
      systemSummary: 'Sol system',
      systemSummarySegments: [],
      coordinatesPc: [0, 0, 0],
      sectorId: 'sol-sector',
      tags: [],
      directionsHref: '/system/sol?select=route',
      canonAnnotations: [],
      stars: [],
      planets: [
        {
          id: 'earth',
          name: 'Earth',
          composition: 'terrestrial',
          semiMajorAxisAu: 1.0,
          inclinationDeg: 0.0,
          eccentricity: 0.0167,
          isHabitableCandidate: true,
        },
      ],
      disks: [],
    };

    const schematic: OrbitalSchematicSummary = {
      parentId: 'sol',
      parentName: 'Sol',
      parentKind: 'system',
      systemId: 'sol',
      systemName: 'Sol',
      rows: [
        {
          id: 'earth',
          name: 'Earth',
          href: '/system/sol?focus=earth',
          kind: 'planet',
          reticleType: 'terrestrial',
          tier: 'primary',
          sortDistanceAu: 1.0,
          lineStyle: 'dashed',
          inHabitableZone: true,
          isFocused: false,
          isSelected: false,
        },
        {
          id: '1-ceres',
          name: '1 Ceres',
          href: '/system/sol?focus=1-ceres',
          kind: 'dwarf-planet',
          reticleType: 'dwarf-planet',
          tier: 'primary',
          sortDistanceAu: 2.77,
          lineStyle: 'dashed',
          inHabitableZone: false,
          eccentricity: 0.0758,
          inclinationDeg: 10.59,
          isFocused: false,
          isSelected: false,
        },
        {
          id: 'voyager-1',
          name: 'Voyager 1',
          href: '/system/sol?focus=voyager-1',
          kind: 'spacecraft',
          reticleType: 'construct',
          tier: 'minor',
          sortDistanceAu: 169,
          lineStyle: 'dotted',
          inHabitableZone: false,
          isFocused: false,
          isSelected: false,
        },
      ],
      zones: [],
      minorBodyCount: 4,
      hasMinorToggle: true,
    };

    const summary = buildFocusedPreviewSummary(solDetails, undefined, schematic);
    expect(summary?.orbitElements.map((e) => e.id)).toEqual(['earth', '1-ceres']);
    expect(summary?.orbitElements[0]?.eccentricity).toBe(0.0167);
    expect(summary?.orbitElements[1]?.symbolType).toBe('dwarf-planet');
    expect(summary?.orbitElements[1]?.eccentricity).toBe(0.0758);
    expect(summary?.orbitElements[1]?.inclinationDeg).toBe(10.59);

    const fallbackSummary = buildFocusedPreviewSummary(solDetails, undefined, null);
    expect(fallbackSummary?.orbitElements.map((e) => e.id)).toEqual(['earth']);
  });
});
