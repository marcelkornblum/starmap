import { describe, expect, it } from 'vitest';
import { buildPlanetaryBodiesSummary } from './planetaryBodiesSummary';
import { EARTH_REFERENCE_TARGET } from '../../config/referenceTargets';

describe('planetaryBodiesSummary', () => {
  it('returns null when details is not provided and urlPlanetSlug is empty', () => {
    expect(buildPlanetaryBodiesSummary({ details: null })).toBeNull();
  });

  it('falls back to EARTH_REFERENCE_TARGET when planet id and name are absent', () => {
    const summary = buildPlanetaryBodiesSummary({
      details: {
        id: '',
        name: '',
        systemId: 'sol',
        systemName: 'Sol',
        focusedKind: 'star',
        stars: [],
        planets: [],
        disks: [],
        hazardCount: 0,
        hazards: [],
        hazardSummaryLabel: '0 hazards',
        reticleType: 'stellar-system',
        starCount: 1,
        planetCount: 0,
        planetCompositionBreakdown: [],
        planetCompositionSummary: '',
        hasHabitableCandidate: false,
        systemSummary: '',
        systemSummarySegments: [],
        coordinatesPc: [0, 0, 0],
        sectorId: '',
        tags: [],
        directionsHref: '',
        canonAnnotations: [],
      } as any,
    });

    expect(summary).not.toBeNull();
    expect(summary?.planetId).toBe(EARTH_REFERENCE_TARGET.id);
    expect(summary?.planetName).toBe('Earth');
  });
});
