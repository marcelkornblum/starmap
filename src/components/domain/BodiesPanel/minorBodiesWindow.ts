import type { SystemElementBodyItem } from '../../../services/details/detailsHierarchyTypes';

export const INITIAL_MINOR_BODIES_LIMIT = 50;
export const MINOR_BODIES_PAGE_STEP = 50;

export interface MinorBodiesWindowResult {
  readonly visibleItems: readonly SystemElementBodyItem[];
  readonly remainingCount: number;
}

/**
 * Slices minor bodies to `visibleLimit` while ensuring any currently focused or
 * selected bodies beyond the window remain visible without duplicating earlier rows.
 */
export function resolveMinorBodiesWindow(
  items: readonly SystemElementBodyItem[],
  visibleLimit: number,
  focusedId?: string,
  selectedSet?: ReadonlySet<string> | null,
): MinorBodiesWindowResult {
  if (items.length <= visibleLimit) {
    return { visibleItems: items, remainingCount: 0 };
  }

  const head = items.slice(0, visibleLimit);
  if (!focusedId && (!selectedSet || selectedSet.size === 0)) {
    return {
      visibleItems: head,
      remainingCount: items.length - head.length,
    };
  }

  const tailActive: SystemElementBodyItem[] = [];
  for (let i = visibleLimit; i < items.length; i++) {
    const item = items[i];
    if (item && (item.id === focusedId || selectedSet?.has(item.id))) {
      tailActive.push(item);
    }
  }

  const visibleItems = tailActive.length > 0 ? [...head, ...tailActive] : head;
  return {
    visibleItems,
    remainingCount: items.length - visibleItems.length,
  };
}
