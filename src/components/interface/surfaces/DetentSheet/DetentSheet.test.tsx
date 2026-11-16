import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DetentSheet } from './DetentSheet';
import {
  MIN_SHEET_HEIGHT_PX,
  DEFAULT_MOBILE_SHEET_RATIO,
  PARTIAL_SHEET_RATIO,
  SNAP_PROXIMITY_BAND_RATIO,
  resolveDetentFromHeight,
  computeSheetDragStep,
  computeSheetReleaseSnap,
} from './detentSheetMath';

describe('<DetentSheet />', () => {
  describe('pure math helpers and constants', () => {
    it('exports expected constants', () => {
      expect(MIN_SHEET_HEIGHT_PX).toBe(56);
      expect(DEFAULT_MOBILE_SHEET_RATIO).toBe(0.45);
      expect(PARTIAL_SHEET_RATIO).toBe(0.45);
      expect(SNAP_PROXIMITY_BAND_RATIO).toBe(0.08);
    });

    it('resolves detent from height ratios correctly, including non-positive viewport heights', () => {
      // vh = 1000 => midpoint = 253, full band = 920
      expect(resolveDetentFromHeight(200, 1000)).toBe('peek');
      expect(resolveDetentFromHeight(500, 1000)).toBe('partial');
      expect(resolveDetentFromHeight(950, 1000)).toBe('full');

      expect(resolveDetentFromHeight(50, 0)).toBe('full');
      expect(resolveDetentFromHeight(50, -100)).toBe('full');
    });

    it('computes sheet drag step for upward expansion, clamping, and scroll prevention', () => {
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

      const clampedStep = computeSheetDragStep({
        startHeightPx: 100,
        startClientY: 300,
        currentClientY: 700,
        viewportHeightPx: 1000,
        isFullScreen: false,
        scrollTop: 0,
      });
      expect(clampedStep.nextHeightPx).toBe(MIN_SHEET_HEIGHT_PX);
      expect(clampedStep.effectiveDetent).toBe('peek');

      const scrollingStep = computeSheetDragStep({
        startHeightPx: 1000,
        startClientY: 200,
        currentClientY: 350,
        viewportHeightPx: 1000,
        isFullScreen: true,
        scrollTop: 45,
      });
      expect(scrollingStep.nextHeightPx).toBe(1000);
      expect(scrollingStep.shouldPreventScroll).toBe(false);
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

    it('computes snap physics correctly on release including free-resting and non-positive viewport', () => {
      const snapPeek = computeSheetReleaseSnap({ heightPx: 200, viewportHeightPx: 1000 });
      expect(snapPeek.detent).toBe('peek');
      expect(snapPeek.snappedHeightPx).toBe(56);

      const snapPartial = computeSheetReleaseSnap({ heightPx: 400, viewportHeightPx: 1000 });
      expect(snapPartial.detent).toBe('partial');
      expect(snapPartial.snappedHeightPx).toBe(450);

      const snapFreeRest = computeSheetReleaseSnap({ heightPx: 725.4, viewportHeightPx: 1000 });
      expect(snapFreeRest).toEqual({ snappedHeightPx: 725, detent: 'partial', isFullScreen: false });

      const snapFull = computeSheetReleaseSnap({ heightPx: 950, viewportHeightPx: 1000 });
      expect(snapFull.detent).toBe('full');
      expect(snapFull.snappedHeightPx).toBe(1000);

      const snapNonPositive = computeSheetReleaseSnap({ heightPx: 200, viewportHeightPx: 0 });
      expect(snapNonPositive).toEqual({ snappedHeightPx: 56, detent: 'full', isFullScreen: true });
    });
  });

  it('renders aside element with accessible landmarks, detent sections, and children', () => {
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
      >
        <footer data-testid="footer-content">Footer Content</footer>
      </DetentSheet>
    );

    const panel = screen.getByTestId('details-panel');
    expect(panel.tagName.toLowerCase()).toBe('aside');
    expect(panel.getAttribute('data-detent')).toBe('peek');
    expect(panel.getAttribute('data-is-full-screen')).toBe('false');
    expect(panel.getAttribute('data-min-height-px')).toBe('56');
    expect(panel.getAttribute('data-entity-id')).toBe('trappist-1');
    expect(panel.getAttribute('data-system-id')).toBe('trappist-1-sys');
    expect(panel.getAttribute('data-focused-kind')).toBe('star');

    const heading = screen.getByRole('heading', { level: 2, name: 'Target Details' });
    expect(heading).toBeInTheDocument();

    expect(screen.getByTestId('details-detent-peek').textContent).toContain('Quick Summary');
    expect(screen.getByTestId('details-detent-partial').textContent).toContain('Atmospheric Telemetry');
    expect(screen.getByTestId('details-detent-full').textContent).toContain('Complete Ephemeris Dossier');
    expect(screen.getByTestId('footer-content').textContent).toContain('Footer Content');

    const handle = screen.getByRole('separator', { name: 'Drag to resize panel' });
    expect(handle).toBeInTheDocument();
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

  it('handles pointer and touch drag interactions on resize handle', () => {
    render(
      <DetentSheet
        testIdPrefix="test"
        heading="Interactive Sheet"
        peek={<div>Content</div>}
      />
    );

    const handle = screen.getByTestId('test-drag-handle');
    fireEvent.pointerDown(handle, { clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 200, pointerId: 1, cancelable: true });
    fireEvent.pointerUp(handle, { pointerId: 1 });

    fireEvent.touchStart(handle, { touches: [{ clientY: 500 }] });
    fireEvent.touchMove(handle, { touches: [{ clientY: 350 }], cancelable: true });
    fireEvent.touchEnd(handle);

    const panel = screen.getByTestId('test-panel');
    expect(panel).toBeInTheDocument();
  });

  it('invokes onDetentChange when dragging and releasing to a new detent', () => {
    const onDetentChange = vi.fn();
    render(
      <DetentSheet
        testIdPrefix="test-drag"
        heading="Drag Sheet"
        activeDetent="peek"
        onDetentChange={onDetentChange}
        peek={<div>Peek</div>}
      />
    );

    const handle = screen.getByTestId('test-drag-drag-handle');
    fireEvent.pointerDown(handle, { clientY: 700, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 400, pointerId: 1, cancelable: true });
    fireEvent.pointerUp(handle, { pointerId: 1 });

    expect(onDetentChange).toHaveBeenCalledWith('partial');
  });

  it('sets --detent-sheet-block-size on initial mount when activeDetent is partial', () => {
    const expectedHeight = `${Math.round(window.innerHeight * PARTIAL_SHEET_RATIO)}px`;
    render(
      <DetentSheet
        testIdPrefix="test-mount"
        heading="Mount Sheet"
        activeDetent="partial"
        peek={<div>Peek</div>}
      />
    );

    const panel = screen.getByTestId('test-mount-panel');
    expect(panel.style.getPropertyValue('--detent-sheet-block-size')).toBe(expectedHeight);
  });

  it('expands data-detent to partial, sets --detent-sheet-block-size, and invokes onDetentChange when clicking drag handle or peek section in peek detent', () => {
    const expectedHeight = `${Math.round(window.innerHeight * PARTIAL_SHEET_RATIO)}px`;
    const onDetentChange = vi.fn();
    render(
      <DetentSheet
        testIdPrefix="test-tap"
        heading="Tap Sheet"
        activeDetent="peek"
        onDetentChange={onDetentChange}
        peek={<div><span data-testid="peek-inner">Peek Body</span></div>}
      />
    );

    const panel = screen.getByTestId('test-tap-panel');
    const handle = screen.getByTestId('test-tap-drag-handle');

    // Click drag handle to expand
    fireEvent.click(handle);
    expect(panel.getAttribute('data-detent')).toBe('partial');
    expect(panel.style.getPropertyValue('--detent-sheet-block-size')).toBe(expectedHeight);
    expect(onDetentChange).toHaveBeenCalledTimes(1);
    expect(onDetentChange).toHaveBeenCalledWith('partial');

    // Test peek section click
    onDetentChange.mockClear();
    render(
      <DetentSheet
        testIdPrefix="test-tap-2"
        heading="Tap Sheet 2"
        activeDetent="peek"
        onDetentChange={onDetentChange}
        peek={<div><span data-testid="peek-inner-2">Peek Body 2</span></div>}
      />
    );

    const panel2 = screen.getByTestId('test-tap-2-panel');
    const peekInner = screen.getByTestId('peek-inner-2');
    fireEvent.click(peekInner);
    expect(panel2.getAttribute('data-detent')).toBe('partial');
    expect(panel2.style.getPropertyValue('--detent-sheet-block-size')).toBe(expectedHeight);
    expect(onDetentChange).toHaveBeenCalledTimes(1);
    expect(onDetentChange).toHaveBeenCalledWith('partial');
  });

  it('does not expand or trigger onDetentChange when clicking an anchor link inside peek', () => {
    const onDetentChange = vi.fn();
    render(
      <DetentSheet
        testIdPrefix="test-link"
        heading="Link Sheet"
        activeDetent="peek"
        onDetentChange={onDetentChange}
        peek={
          <div>
            <a href="/target" data-testid="target-link">
              Link Target
            </a>
          </div>
        }
      />
    );

    const panel = screen.getByTestId('test-link-panel');
    const link = screen.getByTestId('target-link');

    fireEvent.click(link);
    expect(onDetentChange).not.toHaveBeenCalled();
    expect(panel.getAttribute('data-detent')).toBe('peek');
  });
});
