import { describe, it, expect } from 'vitest';
import {
  COMPACT_SOLAR_BODY_TAG,
  SOL_REFERENCE_TARGET,
  EARTH_REFERENCE_TARGET,
  DEFAULT_GUIDE_BENCHMARKS,
  DEFAULT_ORIGIN_TARGETS,
} from './referenceTargets';

describe('Structural Reference Target Configuration (H1)', () => {
  it('defines only structural identifiers, routes, and origin coordinates on SOL_REFERENCE_TARGET', () => {
    expect(SOL_REFERENCE_TARGET).toEqual({
      id: 'sol',
      systemId: 'sol',
      href: '/system/sol',
      coordinatesPc: [0, 0, 0],
    });
    expect(Object.keys(SOL_REFERENCE_TARGET).sort()).toEqual([
      'coordinatesPc',
      'href',
      'id',
      'systemId',
    ]);
  });

  it('defines only structural identifiers, routes, and origin coordinates on EARTH_REFERENCE_TARGET', () => {
    expect(EARTH_REFERENCE_TARGET).toEqual({
      id: 'earth',
      systemId: 'sol',
      href: '/planet/earth',
      coordinatesPc: [0, 0, 0],
    });
    expect(Object.keys(EARTH_REFERENCE_TARGET).sort()).toEqual([
      'coordinatesPc',
      'href',
      'id',
      'systemId',
    ]);
  });

  it('defines structural guide benchmark IDs only', () => {
    expect(DEFAULT_GUIDE_BENCHMARKS).toEqual({
      stellarBenchmarkId: 'tau-ceti',
      orbitalBenchmarkId: 'tau-ceti-e',
    });
  });

  it('defines structural default origin IDs and [0, 0, 0] origin coordinates only', () => {
    expect(DEFAULT_ORIGIN_TARGETS).toEqual({
      interstellarOriginId: 'sol',
      intraSystemOriginId: 'earth',
      galacticOriginCoordinates: [0, 0, 0],
    });
    expect(COMPACT_SOLAR_BODY_TAG).toBe('sol');
  });
});
