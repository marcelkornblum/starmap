import { describe, expect, it } from 'vitest';
import { resolveGalaxyFocusContext } from './galaxyFocusResolver';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';

describe('galaxyFocusResolver', () => {
  const corpus: readonly CompactSearchEntry[] = [
    { i: 'sol', n: 'Sol', p: [0, 0, 0], c: 'stars' },
    { i: 'earth', n: 'Earth', p: [0, 0, 0], s: 'sol', k: 2 },
  ];

  it('resolves parent system when child entity is focused', () => {
    const ctx = resolveGalaxyFocusContext(
      { id: 'earth', name: 'Earth', position: [0, 0, 0] },
      undefined,
      corpus,
    );
    expect(ctx.focusedSystemId).toBe('sol');
    expect(ctx.focusedSystemName).toBe('Sol');
    expect(ctx.focusedSysSlug).toBe('sol');
  });

  it('resolves system slug when urlSystemSlug is provided', () => {
    const ctx = resolveGalaxyFocusContext(undefined, 'sol', corpus);
    expect(ctx.focusedSystemId).toBe('sol');
    expect(ctx.focusedSystemName).toBe('Sol');
  });

  it('returns empty context when neither focusedEntity nor urlSystemSlug is provided', () => {
    const ctx = resolveGalaxyFocusContext(undefined, undefined, corpus);
    expect(ctx).toEqual({});
  });
});
