import { describe, it, expect } from 'vitest';
import type { SystemElementBodyItem } from '../../../services/details/detailsHierarchyTypes';
import {
  INITIAL_MINOR_BODIES_LIMIT,
  MINOR_BODIES_PAGE_STEP,
  resolveMinorBodiesWindow,
} from './minorBodiesWindow';

const makeItems = (count: number): SystemElementBodyItem[] =>
  Array.from({ length: count }, (_, idx) => ({
    id: `body-${idx}`,
    name: `Body ${idx}`,
    href: `/system/sol?focus=body-${idx}`,
    categoryKey: 'asteroid' as const,
    categoryLabel: 'Minor Body',
  }));

describe('resolveMinorBodiesWindow', () => {
  it('returns the original array with zero remaining when within the visible limit', () => {
    const items = makeItems(10);
    const result = resolveMinorBodiesWindow(items, INITIAL_MINOR_BODIES_LIMIT);
    expect(result.visibleItems).toBe(items);
    expect(result.remainingCount).toBe(0);
  });

  it('caps items at visibleLimit and reports remainingCount', () => {
    const items = makeItems(120);
    const result = resolveMinorBodiesWindow(items, INITIAL_MINOR_BODIES_LIMIT);
    expect(result.visibleItems).toHaveLength(INITIAL_MINOR_BODIES_LIMIT);
    expect(result.visibleItems[0]?.id).toBe('body-0');
    expect(result.visibleItems[INITIAL_MINOR_BODIES_LIMIT - 1]?.id).toBe(
      `body-${INITIAL_MINOR_BODIES_LIMIT - 1}`,
    );
    expect(result.remainingCount).toBe(120 - INITIAL_MINOR_BODIES_LIMIT);
  });

  it('includes focused and selected items that lie beyond visibleLimit without duplicating earlier items', () => {
    const items = makeItems(120);
    const selectedSet = new Set(['body-2', 'body-99']);
    const result = resolveMinorBodiesWindow(items, 50, 'body-75', selectedSet);

    expect(result.visibleItems.map((b) => b.id)).toContain('body-75');
    expect(result.visibleItems.map((b) => b.id)).toContain('body-99');
    expect(result.visibleItems.filter((b) => b.id === 'body-2')).toHaveLength(1);
    expect(result.visibleItems).toHaveLength(52);
    expect(result.remainingCount).toBe(120 - 52);
  });

  it('exports positive page step constant', () => {
    expect(MINOR_BODIES_PAGE_STEP).toBeGreaterThan(0);
  });
});
