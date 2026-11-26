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

  it('excludes bulk minor IDs from orbitingBodyCount while counting curated bodies', () => {
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
      planets: [
        {
          id: 'earth',
          name: 'Earth',
          composition: 'terrestrial',
          semiMajorAxisAu: 1.0,
          isHabitableCandidate: true,
        },
      ],
      moonsAndDwarfPlanets: [
        {
          id: 'ceres',
          name: '1 Ceres',
          href: '/system/sol?focus=ceres',
          categoryLabel: 'Dwarf Planet',
        },
        {
          id: 'pha-99942',
          name: '99942 Apophis',
          href: '/system/sol?focus=pha-99942',
          categoryLabel: 'Minor Body',
        },
      ],
      minorBodiesAndSpacecraft: [
        {
          id: 'voyager-1',
          name: 'Voyager 1',
          href: '/system/sol?focus=voyager-1',
          categoryLabel: 'Spacecraft',
        },
        {
          id: 'distant-90377',
          name: '90377 Sedna',
          href: '/system/sol?focus=distant-90377',
          categoryLabel: 'Distant',
        },
        {
          id: 'comet-1p',
          name: '1P/Halley',
          href: '/system/sol?focus=comet-1p',
          categoryLabel: 'Comet',
        },
      ],
      canonAnnotations: [],
    };

    const orientation = buildSystemMinimapOrientation(
      bodiesSummary,
      null,
      null,
      null,
    );

    expect(orientation.orbitingBodyCount).toBe(3);
  });
});
