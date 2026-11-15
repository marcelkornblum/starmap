import { describe, expect, it } from 'vitest';
import { buildPlanetMinimapOrientation } from './planetMinimap';
import type { PlanetaryBodiesSummary } from './detailsHierarchyTypes';

describe('planetMinimap', () => {
  it('builds planet minimap orientation summary', () => {
    const bodiesSummary: PlanetaryBodiesSummary = {
      scope: 'planet',
      planetId: 'jupiter',
      planetName: 'Jupiter',
      planetHref: '/planet/jupiter',
      systemId: 'sol',
      systemName: 'Sol',
      systemHref: '/system/sol',
      moons: [
        {
          id: 'europa',
          name: 'Europa',
          href: '/planet/jupiter?focus=europa',
          categoryKey: 'moon',
          categoryLabel: 'Moon',
        },
      ],
      minorBodiesAndSpacecraft: [],
      canonAnnotations: [],
    };

    const orientation = buildPlanetMinimapOrientation(
      bodiesSummary,
      {
        id: 'europa',
        name: 'Europa',
        position: [5.2, 0, 0],
        classification: 'terrestrial',
      },
    );

    expect(orientation.scope).toBe('planet');
    expect(orientation.anchorId).toBe('jupiter');
    expect(orientation.focusedMarker?.id).toBe('europa');
    expect(orientation.orbitingBodyCount).toBe(1);
  });
});
