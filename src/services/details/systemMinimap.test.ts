import { describe, expect, it } from 'vitest';
import { buildSystemMinimapOrientation } from './systemMinimap';
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
  });
});
