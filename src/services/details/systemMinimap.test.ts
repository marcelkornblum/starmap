import { describe, expect, it } from 'vitest';
import { buildSystemMinimapOrientation } from './systemMinimap';
import type { FocusedSystemEntityDetails } from './detailsEntityTypes';
import type { SystemBodiesSummary } from './detailsHierarchyTypes';

describe('systemMinimap', () => {
  it('builds system minimap orientation summary', () => {
    const bodiesSummary: SystemBodiesSummary = {
      scope: 'system',
      systemId: 'sol',
      systemName: 'Sol',
      systemHref: '/system/sol',
      stars: [],
      planets: [
        {
          id: 'earth',
          name: 'Earth',
          composition: 'terrestrial',
          semiMajorAxisAu: 1.0,
          isHabitableCandidate: true,
        },
      ],
      moonsAndDwarfPlanets: [],
      minorBodiesAndSpacecraft: [],
      canonAnnotations: [],
    };

    const orientation = buildSystemMinimapOrientation(
      bodiesSummary,
      null,
      null,
      {
        id: 'earth',
        name: 'Earth',
        position: [1, 0, 0],
        classification: 'terrestrial',
      },
    );

    expect(orientation.scope).toBe('system');
    expect(orientation.anchorId).toBe('sol');
    expect(orientation.focusedMarker?.id).toBe('earth');
    expect(orientation.outerOrbitalRadiusAu).toBe(1.0);
    expect(orientation.planeInclinationDeg).toBeUndefined();
  });

  it('populates planeInclinationDeg from systemDetails when measured', () => {
    const bodiesSummary: SystemBodiesSummary = {
      scope: 'system',
      systemId: 'sol',
      systemName: 'Sol',
      systemHref: '/system/sol',
      stars: [],
      planets: [],
      moonsAndDwarfPlanets: [],
      minorBodiesAndSpacecraft: [],
      canonAnnotations: [],
    };

    const systemDetails: FocusedSystemEntityDetails = {
      id: 'sol',
      name: 'Sol',
      systemId: 'sol',
      systemName: 'Sol',
      focusedKind: 'system',
      reticleType: 'stellar-system',
      planeInclinationDeg: 60.19,
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
      stars: [],
      planets: [],
      canonAnnotations: [],
    };

    const orientation = buildSystemMinimapOrientation(
      bodiesSummary,
      null,
      systemDetails,
      null,
    );

    expect(orientation.planeInclinationDeg).toBe(60.19);
  });

  it('computes habitableZoneAu fallback from star luminosity when schematic habitableZoneAu is undefined', () => {
    const bodiesSummary: SystemBodiesSummary = {
      scope: 'system',
      systemId: 'sol',
      systemName: 'Sol',
      systemHref: '/system/sol',
      stars: [
        {
          id: 'sol-star',
          name: 'Sol',
          componentDesignation: 'A',
          spectralType: 'G2V',
          mag: -26.74,
          absmag: 4.83,
          luminosityLsun: 1.0,
        },
      ],
      planets: [],
      moonsAndDwarfPlanets: [],
      minorBodiesAndSpacecraft: [],
      canonAnnotations: [],
    };

    const orientation = buildSystemMinimapOrientation(
      bodiesSummary,
      null,
      null,
      null,
    );

    expect(orientation.habitableZoneAu).toEqual([0.75, 1.77]);
  });
});
