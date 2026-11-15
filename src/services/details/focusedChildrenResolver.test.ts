import { describe, expect, it } from 'vitest';
import {
  getCorpusSystemChildrenIndex,
  resolveOrbitingBodies,
  resolveDiskResidentBodies,
} from './focusedChildrenResolver';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';

describe('focusedChildrenResolver', () => {
  const corpus: readonly CompactSearchEntry[] = [
    { i: 'jupiter', n: 'Jupiter', p: [0, 0, 0], s: 'sol', k: 2 },
    { i: 'europa', n: 'Europa', p: [0, 0, 0], s: 'sol', o: 'jupiter', k: 3 },
    { i: 'ceres', n: 'Ceres', p: [0, 0, 0], s: 'sol', k: 4, A: 2.7 },
  ];

  it('builds system children index by system slug', () => {
    const index = getCorpusSystemChildrenIndex(corpus);
    expect(index.get('sol')).toHaveLength(3);
  });

  it('resolves orbiting bodies matching planet slug', () => {
    const bodies = resolveOrbitingBodies(new Set(['jupiter']), 'sol', corpus);
    expect(bodies).toHaveLength(1);
    expect(bodies[0].id).toBe('europa');
    expect(bodies[0].categoryKey).toBe('moon');
  });

  it('resolves disk resident bodies', () => {
    const disk = {
      id: 'asteroid-belt',
      name: 'Asteroid Belt',
      kind: 'asteroid-belt' as const,
      kindLabel: 'Asteroid Belt',
      href: '',
      innerRadiusAu: 2.1,
      outerRadiusAu: 3.3,
      semiMajorAxisAu: 2.7,
      composition: 'rock',
      guideHref: '',
    };
    const residents = resolveDiskResidentBodies(disk, 'sol', corpus, 'sol');
    expect(residents).toHaveLength(1);
    expect(residents[0].id).toBe('ceres');
    expect(residents[0].categoryKey).toBe('dwarf-planet');
  });
});
