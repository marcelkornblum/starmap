import { useUIStore } from '../stores/useUIStore';

/**
 * Collapses an expanded mobile details sheet back to `peek` on empty-canvas touch taps.
 * Returns `true` when the tap was consumed so entity selection remains preserved.
 */
export function handleSpatialTouchPointerMissed(): boolean {
  const { isDetailsOpen, detailsDetent, setDetailsDetent } = useUIStore.getState();
  if (isDetailsOpen && (detailsDetent === 'partial' || detailsDetent === 'full')) {
    setDetailsDetent('peek');
    return true;
  }
  return false;
}
