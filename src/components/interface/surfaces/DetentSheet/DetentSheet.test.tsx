// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DetentSheet } from './DetentSheet';
import {
  resolveDetentFromHeight,
  computeSheetDragStep,
  computeSheetReleaseSnap,
} from './detentSheetMath';

describe('<DetentSheet />', () => {
  describe('pure math helpers', () => {
    it('resolves detent from height ratios correctly', () => {
      // vh = 1000 => midpoint = 253, full band = 920
      expect(resolveDetentFromHeight(200, 1000)).toBe('peek');
      expect(resolveDetentFromHeight(500, 1000)).toBe('partial');
      expect(resolveDetentFromHeight(950, 1000)).toBe('full');
    });

    it('computes sheet drag step for upward expansion', () => {
      const step = computeSheetDragStep({
        startHeightPx: 100,
        startClientY: 500,
        currentClientY: 400, // dragged up by 100px => 200px
        viewportHeightPx: 1000,
        isFullScreen: false,
        scrollTop: 0,
      });

      expect(step.nextHeightPx).toBe(200);
      expect(step.isFullScreen).toBe(false);
      expect(step.shouldPreventScroll).toBe(true);
      expect(step.effectiveDetent).toBe('peek');
    });

    it('computes sheet drag step at full screen boundary', () => {
      const step = computeSheetDragStep({
        startHeightPx: 950,
        startClientY: 200,
        currentClientY: 100, // dragged up by 100px towards 1000
        viewportHeightPx: 1000,
        isFullScreen: false,
        scrollTop: 0,
      });

      expect(step.nextHeightPx).toBe(1000);
      expect(step.isFullScreen).toBe(true);
      expect(step.effectiveDetent).toBe('full');
    });

    it('computes snap physics correctly on release', () => {
      const snapPeek = computeSheetReleaseSnap({ heightPx: 200, viewportHeightPx: 1000 });
      expect(snapPeek.detent).toBe('peek');
      expect(snapPeek.snappedHeightPx).toBe(56);

      const snapPartial = computeSheetReleaseSnap({ heightPx: 400, viewportHeightPx: 1000 });
      expect(snapPartial.detent).toBe('partial');
      expect(snapPartial.snappedHeightPx).toBe(450);

      const snapFull = computeSheetReleaseSnap({ heightPx: 950, viewportHeightPx: 1000 });
      expect(snapFull.detent).toBe('full');
      expect(snapFull.snappedHeightPx).toBe(1000);
    });
  });

  it('renders aside element with accessible landmarks and detent sections', () => {
    render(
      <DetentSheet
        testIdPrefix="details"
        heading="Target Details"
        peek={<div>Quick Summary</div>}
        partial={<div>Atmospheric Telemetry</div>}
        full={<div>Complete Ephemeris Dossier</div>}
        data-entity-id="trappist-1"
        data-system-id="trappist-1-sys"
        data-focused-kind="star"
      />
    );

    const panel = screen.getByTestId('details-panel');
    expect(panel.tagName.toLowerCase()).toBe('aside');
    expect(panel.getAttribute('data-detent')).toBe('peek');
    expect(panel.getAttribute('data-is-full-screen')).toBe('false');
    expect(panel.getAttribute('data-entity-id')).toBe('trappist-1');
    expect(panel.getAttribute('data-system-id')).toBe('trappist-1-sys');
    expect(panel.getAttribute('data-focused-kind')).toBe('star');

    const heading = screen.getByRole('heading', { level: 2, name: 'Target Details' });
    expect(heading).toBeDefined();

    expect(screen.getByTestId('details-detent-peek').textContent).toContain('Quick Summary');
    expect(screen.getByTestId('details-detent-partial').textContent).toContain('Atmospheric Telemetry');
    expect(screen.getByTestId('details-detent-full').textContent).toContain('Complete Ephemeris Dossier');

    const handle = screen.getByRole('separator', { name: 'Drag to resize panel' });
    expect(handle).toBeDefined();
  });

  it('reacts to activeDetent prop updates', () => {
    const { rerender } = render(
      <DetentSheet
        testIdPrefix="catalog"
        heading="Catalog"
        activeDetent="peek"
        peek={<div>Peek View</div>}
      />
    );

    let panel = screen.getByTestId('catalog-panel');
    expect(panel.getAttribute('data-detent')).toBe('peek');
    expect(panel.getAttribute('data-is-full-screen')).toBe('false');

    rerender(
      <DetentSheet
        testIdPrefix="catalog"
        heading="Catalog"
        activeDetent="full"
        peek={<div>Peek View</div>}
      />
    );

    panel = screen.getByTestId('catalog-panel');
    expect(panel.getAttribute('data-detent')).toBe('full');
    expect(panel.getAttribute('data-is-full-screen')).toBe('true');
  });

  it('handles pointer drag interactions on resize handle', () => {
    render(
      <DetentSheet
        testIdPrefix="test"
        heading="Interactive Sheet"
        peek={<div>Content</div>}
      />
    );

    const handle = screen.getByTestId('test-drag-handle');
    fireEvent.pointerDown(handle, { clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(handle, { pointerId: 1 });

    const panel = screen.getByTestId('test-panel');
    expect(panel).toBeDefined();
  });
});
