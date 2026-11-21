import { describe, expect, it } from 'vitest';
import type { FocusedEntityDetailsBase } from './detailsEntityTypes';
import {
  buildFocusedSystemDetails,
  buildFocusedStarDetails,
} from './focusedStarSystemDetails';

describe('focusedStarSystemDetails', () => {
  const base: FocusedEntityDetailsBase = {
    id: 'sol',
    name: 'Sol',
    systemId: 'sol',
    systemName: 'Sol',
    reticleType: 'stellar-system',
    starCount: 1,
    planetCount: 0,
    planetCompositionBreakdown: [],
    planetCompositionSummary: '',
    hasHabitableCandidate: false,
    hazardCount: 0,
    hazards: [],
    hazardSummaryLabel: '0 hazards',
    systemSummary: '',
    systemSummarySegments: [],
    coordinatesPc: [0, 0, 0],
    sectorId: '',
    tags: [],
    directionsHref: '',
    stars: [
      {
        id: 'sol-star',
        name: 'Sol',
        componentDesignation: 'A',
        spectralType: 'G2V',
        mag: -26.74,
        absmag: 4.83,
      },
    ],
    planets: [],
    canonAnnotations: [],
  };

  it('builds system entity details', () => {
    const details = buildFocusedSystemDetails(base);
    expect(details.focusedKind).toBe('system');
  });

  it('builds star entity details', () => {
    const details = buildFocusedStarDetails(base, base.stars[0], base.stars);
    expect(details.focusedKind).toBe('star');
    expect(details.starTelemetry.spectralType).toBe('G2V');
    expect(details.starTelemetry.componentDesignation).toBe('A');
  });
});
