import { describe, expect, it } from 'vitest';
import { resolveFocusedTarget } from './focusedTargetResolver';

describe('focusedTargetResolver', () => {
  it('resolves star system targets and kind', () => {
    const target = resolveFocusedTarget(
      { id: 'sol', name: 'Sol', position: [0, 0, 0] },
      [],
      undefined,
      undefined,
      undefined,
      'sol',
      null,
      null,
      false,
      'galaxy',
    );

    expect(target.systemId).toBe('sol');
    expect(target.systemName).toBe('Sol');
    expect(target.focusedKind).toBe('system');
  });

  it('resolves planet target kind when explicitly focused in system view', () => {
    const target = resolveFocusedTarget(
      { id: 'earth', name: 'Earth', position: [1, 0, 0] },
      [{ i: 'earth', n: 'Earth', p: [1, 0, 0], s: 'sol', k: 2 }],
      undefined,
      undefined,
      undefined,
      'sol',
      null,
      'earth',
      true,
      'system',
    );

    expect(target.focusedKind).toBe('planet');
    expect(target.resolvedName).toBe('Earth');
  });

  it('resolves planetless star systems with empty planets array without scanning unrelated corpus', () => {
    const unparentedOrOtherCorpus = [
      { i: 'hip-87937-b', n: "Barnard's Star b", p: [0, 0, 0] as [number, number, number], s: 'hip-87937', k: 2 },
      { i: 'orphan-planet', n: 'Rogue Planet', p: [5, 5, 5] as [number, number, number], k: 2 },
    ];
    const target = resolveFocusedTarget(
      { id: 'hip-32349', name: 'Sirius', position: [-0.49, 2.47, -0.75], spectralType: 'A1V' },
      unparentedOrOtherCorpus,
      undefined,
      undefined,
      undefined,
      'hip-32349',
      null,
      null,
      false,
      'galaxy',
    );

    expect(target.systemId).toBe('hip-32349');
    expect(target.systemName).toBe('Sirius');
    expect(target.planets).toEqual([]);
    expect(target.stars.length).toBeGreaterThan(0);
  });
});
