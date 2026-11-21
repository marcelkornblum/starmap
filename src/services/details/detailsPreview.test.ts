import { describe, expect, it } from 'vitest';
import { buildFocusedPreviewSummary } from './detailsPreview';
import type { FocusedPlanetEntityDetails, FocusedSystemEntityDetails } from './detailsEntityTypes';

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
});
