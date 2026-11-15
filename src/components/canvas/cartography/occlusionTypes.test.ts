import { describe, it, expect } from 'vitest';
import { CANDIDATE_MULTIPLIERS } from './occlusionTypes';

describe('occlusionTypes', () => {
  it('defines 9 candidate displacement multipliers including center', () => {
    expect(CANDIDATE_MULTIPLIERS.length).toBe(9);
    expect(CANDIDATE_MULTIPLIERS[0]).toEqual({ x: 0, y: 0 });
  });
});
