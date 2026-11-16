import { describe, expect, it } from 'vitest';
import {
  buildIntrinsicSystemSummarySegments,
  buildIntrinsicSystemSummary,
} from './detailsSystemSummary';

describe('detailsSystemSummary', () => {
  it('builds summary segments for a stellar system', () => {
    const input = {
      name: 'Tau Ceti',
      systemName: 'Tau Ceti',
      isChildEntity: false,
      spectralType: 'G8V',
      starCount: 1,
      planetCount: 4,
      hasHabitableCandidate: true,
    };
    const segments = buildIntrinsicSystemSummarySegments(input);
    expect(segments.length).toBeGreaterThan(0);
    expect(segments.some((s) => s.kind === 'spectral-badge')).toBe(true);
    expect(segments.some((s) => s.kind === 'habitable-badge')).toBe(true);

    const prose = buildIntrinsicSystemSummary(input);
    expect(prose).toContain('Tau Ceti is a G8V stellar system hosting 4 confirmed planets, including a habitable zone candidate.');
  });

  it('builds summary for a planet', () => {
    const input = {
      name: 'Earth',
      systemName: 'Sol',
      isChildEntity: true,
      focusedKind: 'planet' as const,
      starCount: 1,
      planetCount: 8,
      hasHabitableCandidate: true,
      planetComposition: 'terrestrial' as const,
      planetIsHabitable: true,
      orbitingBodyCount: 1,
    };
    const segments = buildIntrinsicSystemSummarySegments(input);
    expect(segments.some((s) => s.kind === 'planet-type-badge')).toBe(true);

    const prose = buildIntrinsicSystemSummary(input);
    expect(prose).toContain('Earth is a terrestrial planet orbiting Sol, within the habitable zone candidate with 1 catalogued body in orbit.');
  });
});
