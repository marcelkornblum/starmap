import { describe, it, expect } from 'vitest';
import {
  compareComponentsByMagnitude,
  consolidateMultiStarSystems,
} from './multiStarConsolidation';
import type { SystemSummaryNode } from '../../src/types/astro';

describe('compareComponentsByMagnitude', () => {
  it('orders finite magnitudes with brighter (lower numerical magnitude) stars first', () => {
    const starA = { id: 'star-a', mag: -1.44 };
    const starB = { id: 'star-b', mag: 0.03 };
    const starC = { id: 'star-c', mag: 4.5 };

    expect(compareComponentsByMagnitude(starA, starB)).toBeLessThan(0);
    expect(compareComponentsByMagnitude(starB, starA)).toBeGreaterThan(0);
    expect(compareComponentsByMagnitude(starB, starC)).toBeLessThan(0);
    expect(compareComponentsByMagnitude(starC, starB)).toBeGreaterThan(0);

    const sorted = [starC, starA, starB].sort(compareComponentsByMagnitude);
    expect(sorted.map((s) => s.id)).toEqual(['star-a', 'star-b', 'star-c']);
  });

  it('orders finite magnitudes before undefined, NaN, and infinite magnitudes', () => {
    const finite = { id: 'star-finite', mag: 6.2 };
    const undef = { id: 'star-undef', mag: undefined };
    const nan = { id: 'star-nan', mag: Number.NaN };
    const inf = { id: 'star-inf', mag: Number.POSITIVE_INFINITY };

    expect(compareComponentsByMagnitude(finite, undef)).toBeLessThan(0);
    expect(compareComponentsByMagnitude(undef, finite)).toBeGreaterThan(0);

    expect(compareComponentsByMagnitude(finite, nan)).toBeLessThan(0);
    expect(compareComponentsByMagnitude(nan, finite)).toBeGreaterThan(0);

    expect(compareComponentsByMagnitude(finite, inf)).toBeLessThan(0);
    expect(compareComponentsByMagnitude(inf, finite)).toBeGreaterThan(0);
  });

  it('falls back to deterministic ID tie-breaking when magnitudes are equal or non-finite', () => {
    const compA = { id: 'hip-100', mag: 3.5 };
    const compB = { id: 'hip-200', mag: 3.5 };

    expect(compareComponentsByMagnitude(compA, compB)).toBeLessThan(0);
    expect(compareComponentsByMagnitude(compB, compA)).toBeGreaterThan(0);

    const nonFiniteA = { id: 'alpha', mag: undefined };
    const nonFiniteB = { id: 'beta', mag: Number.NaN };

    expect(compareComponentsByMagnitude(nonFiniteA, nonFiniteB)).toBeLessThan(0);
    expect(compareComponentsByMagnitude(nonFiniteB, nonFiniteA)).toBeGreaterThan(0);

    const identical = { id: 'hip-100', mag: 3.5 };
    expect(compareComponentsByMagnitude(compA, identical)).toBe(0);
  });

  it('prioritizes canonical catalog IDs (sol > hip/gaia/hyg/RECONS > exo-*) regardless of magnitude', () => {
    const sol = { id: 'sol', mag: 10.0 };
    const hip = { id: 'hip-21421', mag: 0.87 };
    const gaia = { id: 'gaia-123456', mag: 12.5 };
    const recons = { id: 'proxima-centauri', mag: 11.13 };
    const exoBrighter = { id: 'exo-alf-tau', mag: 0.85 };

    expect(compareComponentsByMagnitude(sol, hip)).toBeLessThan(0);
    expect(compareComponentsByMagnitude(hip, exoBrighter)).toBeLessThan(0);
    expect(compareComponentsByMagnitude(exoBrighter, hip)).toBeGreaterThan(0);
    expect(compareComponentsByMagnitude(gaia, exoBrighter)).toBeLessThan(0);
    expect(compareComponentsByMagnitude(recons, exoBrighter)).toBeLessThan(0);
  });
});

describe('consolidateMultiStarSystems canonical primary priority', () => {
  it('retains canonical hip-* ID and starCount=1 when merged with a brighter-magnitude exo-* duplicate', () => {
    const hipNode: SystemSummaryNode = {
      id: 'hip-21421',
      name: 'Aldebaran',
      properName: 'Aldebaran',
      x: 7.027,
      y: 18.287,
      z: 5.806,
      dist: 20.433,
      mag: 0.87,
      absmag: -0.68,
      spect: 'K5III',
      starCount: 1,
      planetCount: 0,
      hasHabitableCandidate: false,
      sectorId: 'sector_+000_+000_+000',
    };
    const exoDuplicate: SystemSummaryNode = {
      id: 'exo-alf-tau',
      name: 'alf Tau',
      x: 7.028,
      y: 18.287,
      z: 5.806,
      dist: 20.433,
      mag: 0.85,
      absmag: -0.7,
      spect: 'K5III',
      starCount: 1,
      planetCount: 1,
      hasHabitableCandidate: false,
      sectorId: 'sector_+000_+000_+000',
    };

    const cataloguedSummaries = [exoDuplicate, hipNode];
    const result = consolidateMultiStarSystems({ cataloguedSummaries });

    expect(result.consolidatedCount).toBe(1);
    expect(result.absorbedIdToPrimary.get('exo-alf-tau')?.id).toBe('hip-21421');
    expect(cataloguedSummaries).toHaveLength(1);
    expect(cataloguedSummaries[0]?.id).toBe('hip-21421');
    expect(cataloguedSummaries[0]?.starCount).toBe(1);
    expect(cataloguedSummaries[0]?.planetCount).toBe(1);
  });
});
