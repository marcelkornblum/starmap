import { describe, expect, it } from 'vitest';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import type { FocusedEntityDetails } from './detailsEntityTypes';
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

  it('caches moonsAndDwarfPlanets and minorBodiesAndSpacecraft per (corpus, systemId, systemName)', () => {
    const details: FocusedEntityDetails = {
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
    };

    const corpus: CompactSearchEntry[] = [
      { i: 'ceres', n: 'Ceres', p: [0, 0, 0], s: 'sol', k: 4 },
      { i: 'voyager-1', n: 'Voyager 1', p: [0, 0, 0], s: 'sol', k: 6 },
      { i: 'proxima-b', n: 'Proxima b', p: [1, 0, 0], s: 'proxima-centauri', k: 2 },
    ];

    const first = buildSystemBodiesSummary({ details, corpus, focusedEntityId: 'earth' });
    const second = buildSystemBodiesSummary({ details, corpus, focusedEntityId: 'sol' });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second?.minorBodiesAndSpacecraft).toBe(first?.minorBodiesAndSpacecraft);
    expect(second?.moonsAndDwarfPlanets).toBe(first?.moonsAndDwarfPlanets);

    const renamedSystem = buildSystemBodiesSummary({
      details: { ...details, systemName: 'Solaris' },
      corpus,
    });
    expect(renamedSystem?.minorBodiesAndSpacecraft).not.toBe(first?.minorBodiesAndSpacecraft);
    expect(renamedSystem?.minorBodiesAndSpacecraft[0]?.href).toBe('/system/solaris?focus=voyager-1');
  });
});
