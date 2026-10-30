import { beforeEach, describe, expect, it } from 'vitest';
import { useActiveStarsStore } from '../src/stores/useActiveStarsStore';
import type { SystemSummaryNode } from '../src/types/astro';

const makeStar = (id: string): SystemSummaryNode => ({
  id,
  name: id,
  x: 0,
  y: 0,
  z: 0,
  dist: 0,
  mag: 5,
  absmag: 4,
  starCount: 1,
  planetCount: 0,
  hasHabitableCandidate: false,
  sectorId: 'sector_+000_+000_+000',
});

describe('useActiveStarsStore', () => {
  beforeEach(() => {
    useActiveStarsStore.getState().clear();
  });

  it('stores the hydrated active stars', () => {
    useActiveStarsStore.getState().setSummaries([makeStar('a'), makeStar('b')]);
    expect(useActiveStarsStore.getState().summaries.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('keeps the same reference when the active set is unchanged so subscribers do not re-render', () => {
    useActiveStarsStore.getState().setSummaries([makeStar('a'), makeStar('b')]);
    const before = useActiveStarsStore.getState().summaries;
    useActiveStarsStore.getState().setSummaries([makeStar('a'), makeStar('b')]);
    expect(useActiveStarsStore.getState().summaries).toBe(before);
  });

  it('updates when the active set changes and empties on clear', () => {
    useActiveStarsStore.getState().setSummaries([makeStar('a')]);
    useActiveStarsStore.getState().setSummaries([makeStar('a'), makeStar('c')]);
    expect(useActiveStarsStore.getState().summaries).toHaveLength(2);

    useActiveStarsStore.getState().clear();
    expect(useActiveStarsStore.getState().summaries).toHaveLength(0);
  });
});
