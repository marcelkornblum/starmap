// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  DetentSheet,
  MIN_SHEET_HEIGHT_PX,
  DEFAULT_MOBILE_SHEET_RATIO,
  PARTIAL_SHEET_RATIO,
  SNAP_PROXIMITY_BAND_RATIO,
  resolveDetentFromHeight,
  computeSheetDragStep,
  computeSheetReleaseSnap,
} from '../src/components/interface/surfaces/DetentSheet';

describe('DetentSheet Mobile Drag & Calculation Suite', () => {
  describe('Constants & Pure Helpers', () => {
    it('exports expected constants', () => {
      expect(MIN_SHEET_HEIGHT_PX).toBe(56);
      expect(DEFAULT_MOBILE_SHEET_RATIO).toBe(0.45);
      expect(PARTIAL_SHEET_RATIO).toBe(0.45);
      expect(SNAP_PROXIMITY_BAND_RATIO).toBe(0.08);
    });

    describe('resolveDetentFromHeight', () => {
      const vh = 1000;
      // partialH = 450, bandPx = 80, midpoint = (56 + 450) / 2 = 253

      it('returns "peek" below midpoint (253px)', () => {
        expect(resolveDetentFromHeight(0, vh)).toBe('peek');
        expect(resolveDetentFromHeight(56, vh)).toBe('peek');
        expect(resolveDetentFromHeight(200, vh)).toBe('peek');
        expect(resolveDetentFromHeight(252, vh)).toBe('peek');
      });

      it('returns "partial" at/above midpoint and below full proximity band (253px to 919px)', () => {
        expect(resolveDetentFromHeight(253, vh)).toBe('partial');
        expect(resolveDetentFromHeight(450, vh)).toBe('partial');
        expect(resolveDetentFromHeight(600, vh)).toBe('partial');
        expect(resolveDetentFromHeight(919, vh)).toBe('partial');
      });

      it('returns "full" within top proximity band (>= 920px)', () => {
        expect(resolveDetentFromHeight(920, vh)).toBe('full');
        expect(resolveDetentFromHeight(1000, vh)).toBe('full');
        expect(resolveDetentFromHeight(1200, vh)).toBe('full');
      });

      it('safely handles non-positive viewport heights', () => {
        expect(resolveDetentFromHeight(50, 0)).toBe('full');
        expect(resolveDetentFromHeight(50, -100)).toBe('full');
      });
    });

    describe('computeSheetDragStep', () => {
      const viewportHeightPx = 800;
      const peekStartHeight = 200;

      it('continuous drag resizes sheet and updates effectiveDetent', () => {
        const step1 = computeSheetDragStep({
          startHeightPx: peekStartHeight,
          startClientY: 500,
          currentClientY: 480, // deltaY = -20 => 220px (< midpoint 208)
          viewportHeightPx,
          isFullScreen: false,
          scrollTop: 0,
        });
        expect(step1.nextHeightPx).toBe(220);
        expect(step1.isFullScreen).toBe(false);
        expect(step1.shouldPreventScroll).toBe(true);

        const step2 = computeSheetDragStep({
          startHeightPx: peekStartHeight,
          startClientY: 500,
          currentClientY: 200, // deltaY = -300 => 500px
          viewportHeightPx,
          isFullScreen: false,
          scrollTop: 0,
        });
        expect(step2.nextHeightPx).toBe(500);
        expect(step2.isFullScreen).toBe(false);
        expect(step2.effectiveDetent).toBe('partial');
      });

      it('dragging down clamps at MIN_SHEET_HEIGHT_PX', () => {
        const step = computeSheetDragStep({
          startHeightPx: 100,
          startClientY: 300,
          currentClientY: 700,
          viewportHeightPx,
          isFullScreen: false,
          scrollTop: 0,
        });
        expect(step.nextHeightPx).toBe(MIN_SHEET_HEIGHT_PX);
        expect(step.effectiveDetent).toBe('peek');
      });

      it('allows scrolling when isFullScreen is true and scrollTop > 0', () => {
        const step = computeSheetDragStep({
          startHeightPx: viewportHeightPx,
          startClientY: 200,
          currentClientY: 350,
          viewportHeightPx,
          isFullScreen: true,
          scrollTop: 45,
        });
        expect(step.nextHeightPx).toBe(viewportHeightPx);
        expect(step.shouldPreventScroll).toBe(false);
      });
    });

    describe('computeSheetReleaseSnap (DEC-R051)', () => {
      const viewportHeightPx = 1000;
      // peekH = 56, partialH = 450, bandPx = 80, midpoint = 253

      it('below partialH: snaps to peek when < midpoint (253px)', () => {
        const snap1 = computeSheetReleaseSnap({ heightPx: 100, viewportHeightPx });
        expect(snap1).toEqual({ snappedHeightPx: 56, detent: 'peek', isFullScreen: false });

        const snap2 = computeSheetReleaseSnap({ heightPx: 252, viewportHeightPx });
        expect(snap2).toEqual({ snappedHeightPx: 56, detent: 'peek', isFullScreen: false });
      });

      it('below partialH: snaps to partial when >= midpoint (253px)', () => {
        const snap1 = computeSheetReleaseSnap({ heightPx: 253, viewportHeightPx });
        expect(snap1).toEqual({ snappedHeightPx: 450, detent: 'partial', isFullScreen: false });

        const snap2 = computeSheetReleaseSnap({ heightPx: 450, viewportHeightPx });
        expect(snap2).toEqual({ snappedHeightPx: 450, detent: 'partial', isFullScreen: false });
      });

      it('above partialH: snaps to partial within lower proximity band (<= 530px)', () => {
        const snap = computeSheetReleaseSnap({ heightPx: 500, viewportHeightPx });
        expect(snap).toEqual({ snappedHeightPx: 450, detent: 'partial', isFullScreen: false });
      });

      it('above partialH: snaps to full within upper proximity band (>= 920px)', () => {
        const snap = computeSheetReleaseSnap({ heightPx: 930, viewportHeightPx });
        expect(snap).toEqual({ snappedHeightPx: 1000, detent: 'full', isFullScreen: true });
      });

      it('above partialH: free-rests between proximity bands (531px - 919px)', () => {
        const snap = computeSheetReleaseSnap({ heightPx: 725.4, viewportHeightPx });
        expect(snap).toEqual({ snappedHeightPx: 725, detent: 'partial', isFullScreen: false });
      });

      it('safely handles non-positive viewportHeightPx', () => {
        const snap = computeSheetReleaseSnap({ heightPx: 200, viewportHeightPx: 0 });
        expect(snap).toEqual({ snappedHeightPx: 56, detent: 'full', isFullScreen: true });
      });
    });
  });

  describe('Component DOM Rendering & Landmark Structure', () => {
    it('verifies single sheet structure, landmarks and detent sections', () => {
      const html = renderToString(
        <DetentSheet
          testIdPrefix="details"
          heading="System Details"
          headingId="details-heading"
          activeDetent="peek"
          peek={<div data-testid="peek-body">Peek Content</div>}
          partial={<div data-testid="partial-body">Partial Content</div>}
          full={<div data-testid="full-body">Full Content</div>}
        >
          <footer data-testid="footer-content">Footer Content</footer>
        </DetentSheet>,
      );

      expect(html).toContain('data-testid="details-panel"');
      expect(html).toContain('data-detent="peek"');
      expect(html).toContain('data-is-full-screen="false"');
      expect(html).toContain('data-min-height-px="56"');
      expect(html).toContain('data-testid="details-drag-handle"');
      expect(html).toContain('role="separator"');
      expect(html).toContain('id="details-heading"');
      expect(html).toContain('System Details');
      expect(html).toContain('data-testid="details-detent-peek"');
      expect(html).toContain('data-testid="details-detent-partial"');
      expect(html).toContain('data-testid="details-detent-full"');
      expect(html).toContain('data-testid="footer-content"');
    });

    it('renders data-is-full-screen="true" when activeDetent="full"', () => {
      const html = renderToString(
        <DetentSheet
          testIdPrefix="details"
          heading="Full Details"
          activeDetent="full"
          peek={<div>Peek</div>}
        />,
      );
      expect(html).toContain('data-is-full-screen="true"');
      expect(html).toContain('data-detent="full"');
    });

    it('renders entity and system telemetry metadata attributes', () => {
      const html = renderToString(
        <DetentSheet
          testIdPrefix="details"
          heading="Sol System"
          activeDetent="partial"
          data-entity-id="sol"
          data-system-id="milky-way"
          data-focused-kind="star"
          peek={<div>Peek</div>}
        />,
      );
      expect(html).toContain('data-entity-id="sol"');
      expect(html).toContain('data-system-id="milky-way"');
      expect(html).toContain('data-focused-kind="star"');
    });
  });

  describe('Interactive Event Wiring on Drag Handle & Sheet', () => {
    it('wires pointer and touch handlers to the drag handle bar and sheet', () => {
      render(
        <DetentSheet
          testIdPrefix="interactive-details"
          heading="Interactive Details"
          peek={<div>Peek</div>}
          partial={<div>Partial</div>}
        />,
      );

      const panel = screen.getByTestId('interactive-details-panel');
      const handle = screen.getByTestId('interactive-details-drag-handle');

      expect(panel).toBeDefined();
      expect(handle).toBeDefined();

      fireEvent.pointerDown(handle, { clientY: 400, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientY: 300, pointerId: 1, cancelable: true });
      fireEvent.pointerUp(handle, { pointerId: 1 });

      fireEvent.touchStart(handle, { touches: [{ clientY: 500 }] });
      fireEvent.touchMove(handle, { touches: [{ clientY: 350 }], cancelable: true });
      fireEvent.touchEnd(handle);
    });
  });
});
