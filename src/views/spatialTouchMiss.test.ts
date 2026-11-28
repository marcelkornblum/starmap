import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../stores/useUIStore';
import { handleSpatialTouchPointerMissed } from './spatialTouchMiss';

describe('handleSpatialTouchPointerMissed', () => {
  beforeEach(() => {
    useUIStore.getState().resetUI();
  });

  it('collapses partial or full open details sheet to peek and returns true', () => {
    useUIStore.setState({ isDetailsOpen: true, detailsDetent: 'full' });
    expect(handleSpatialTouchPointerMissed()).toBe(true);
    expect(useUIStore.getState().detailsDetent).toBe('peek');

    useUIStore.setState({ isDetailsOpen: true, detailsDetent: 'partial' });
    expect(handleSpatialTouchPointerMissed()).toBe(true);
    expect(useUIStore.getState().detailsDetent).toBe('peek');
  });

  it('returns false without mutating detent when details are closed or already at peek', () => {
    useUIStore.setState({ isDetailsOpen: true, detailsDetent: 'peek' });
    expect(handleSpatialTouchPointerMissed()).toBe(false);
    expect(useUIStore.getState().detailsDetent).toBe('peek');

    useUIStore.setState({ isDetailsOpen: false, detailsDetent: 'full' });
    expect(handleSpatialTouchPointerMissed()).toBe(false);
    expect(useUIStore.getState().detailsDetent).toBe('full');
  });
});
