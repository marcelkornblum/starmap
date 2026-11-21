import { describe, expect, it } from 'vitest';
import {
  buildDiskSchematicCandidate,
  resolveSchematicRegion,
  sortSchematicCandidates,
} from './orbitalSchematicHelpers';

describe('orbitalSchematicHelpers', () => {
  it('builds disk schematic candidate with radial spans', () => {
    const candidate = buildDiskSchematicCandidate(
      {
        id: 'asteroid-belt',
        name: 'Main Asteroid Belt',
        kind: 'asteroid-belt',
        innerRadiusAu: 2.1,
        outerRadiusAu: 3.3,
        semiMajorAxisAu: 2.7,
        composition: 'rock',
      },
      'sol',
      0,
    );
    expect(candidate.kind).toBe('belt');
    expect(candidate.summaryLabel).toBe('Asteroid Belt');
    expect(candidate.radialSpanAu).toEqual([2.1, 3.3]);
  });

  it('resolves schematic regions correctly', () => {
    expect(resolveSchematicRegion({ i: 'a', n: 'A', p: [0, 0, 0], e: 'belt' }, false)).toBe('asteroid-belt');
    expect(resolveSchematicRegion({ i: 'b', n: 'B', p: [0, 0, 0], e: 'kuiper' }, false)).toBe('kuiper-belt');
    expect(resolveSchematicRegion(undefined, true)).toBe('habitable-zone');
    expect(resolveSchematicRegion(undefined, false)).toBeUndefined();
  });

  it('sorts schematic candidates by semiMajorAxisAu then rank', () => {
    const candidates = [
      { id: 'b', name: 'B', href: '', kind: 'planet' as const, summaryLabel: '', semiMajorAxisAu: 5.2, isHabitableCandidate: false, originalIndex: 0 },
      { id: 'a', name: 'A', href: '', kind: 'planet' as const, summaryLabel: '', semiMajorAxisAu: 1.0, isHabitableCandidate: true, originalIndex: 1 },
    ];
    const sorted = sortSchematicCandidates(candidates);
    expect(sorted[0]?.id).toBe('a');
    expect(sorted[1]?.id).toBe('b');
  });
});
