import { describe, expect, it } from 'vitest';
import { buildSystemBodiesSummary } from './systemBodiesSummary';

describe('systemBodiesSummary', () => {
  it('returns null when details is not provided', () => {
    expect(buildSystemBodiesSummary({ details: null })).toBeNull();
  });

  it('builds system bodies summary from details and corpus', () => {
    const summary = buildSystemBodiesSummary({
      details: {
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
        systemSummary: 'Sol',
        systemSummarySegments: [],
        coordinatesPc: [0, 0, 0],
        sectorId: 'sol-sector',
        tags: [],
        directionsHref: '/system/sol',
        canonAnnotations: [],
        stars: [],
        planets: [
          {
            id: 'earth',
            name: 'Earth',
            composition: 'terrestrial',
            isHabitableCandidate: true,
          },
        ],
      },
      corpus: [
        { i: 'ceres', n: 'Ceres', p: [0, 0, 0], s: 'sol', k: 4 },
        { i: 'voyager-1', n: 'Voyager 1', p: [0, 0, 0], s: 'sol', k: 6 },
      ],
    });

    expect(summary).not.toBeNull();
    expect(summary?.planets).toHaveLength(1);
    expect(summary?.moonsAndDwarfPlanets).toHaveLength(1);
    expect(summary?.moonsAndDwarfPlanets[0]?.id).toBe('ceres');
    expect(summary?.minorBodiesAndSpacecraft).toHaveLength(1);
    expect(summary?.minorBodiesAndSpacecraft[0]?.id).toBe('voyager-1');
  });
});
