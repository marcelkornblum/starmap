import { describe, it, expect } from 'vitest';
import { loadAllGalacticStructures } from './galacticStructures';

describe('Galactic Structures & Distance Verification (AUD-044, AUD-051, DEC-R026)', () => {
  it('produces real measured distances and populates reticleType without placeholder values', () => {
    const structures = loadAllGalacticStructures();
    expect(structures.length).toBeGreaterThan(0);
    for (const s of structures) {
      expect(s.dist).toBeGreaterThan(0);
      expect(s.reticleType).toBeDefined();
    }
    const bulkSnrPlaceholders = structures.filter((s) => s.id.startsWith('snr-') && s.dist === 1500);
    expect(bulkSnrPlaceholders.length).toBe(0);
    const bulkBarnardPlaceholders = structures.filter((s) => s.id.startsWith('barnard-') && s.dist === 300);
    expect(bulkBarnardPlaceholders.length).toBe(0);
  });
});
