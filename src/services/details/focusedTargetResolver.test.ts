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
});
