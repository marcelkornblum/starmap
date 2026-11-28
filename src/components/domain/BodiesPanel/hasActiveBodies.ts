import type { BodiesPanelSummary } from '../../../services/details/detailsHierarchyTypes';
import { buildPrimaryItems } from './bodiesPrimaryItems';

/**
 * Returns whether the given BodiesPanel summary has at least one active item
 * to display in the Objects in View drawer.
 */
export function hasActiveBodiesSummary(
  elements: BodiesPanelSummary | null | undefined,
): boolean {
  if (!elements) {
    return false;
  }

  if (elements.scope === 'galaxy') {
    return elements.systems.length > 0;
  }

  return (
    buildPrimaryItems(elements).length > 0 ||
    elements.minorBodiesAndSpacecraft.length > 0
  );
}
