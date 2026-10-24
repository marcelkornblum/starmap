import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  DetentSheet,
  MIN_SHEET_HEIGHT_PX,
  DEFAULT_MOBILE_SHEET_RATIO,
  resolveDetentFromHeight,
  computeSheetDragStep,
} from '../src/components/interface/surfaces/DetentSheet';

function findReactElementByTestId(tree: any, testId: string): any {
  if (!tree || typeof tree !== 'object') return null;
  if (tree.props?.['data-testid'] === testId) return tree;
  const children = tree.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const match = findReactElementByTestId(child, testId);
      if (match) return match;
    }
  } else if (children && typeof children === 'object') {
    return findReactElementByTestId(children, testId);
  }
  return null;
}

describe('DetentSheet Mobile Drag & Calculation Suite', () => {
  describe('Constants & Pure Helpers', () => {
    it('exports expected constants', () => {
      expect(MIN_SHEET_HEIGHT_PX).toBe(56);
      expect(DEFAULT_MOBILE_SHEET_RATIO).toBe(0.36);
    });

    describe('resolveDetentFromHeight', () => {
      it('returns "peek" for ratios < 0.45', () => {
        const vh = 1000;
        expect(resolveDetentFromHeight(0, vh)).toBe('peek');
        expect(resolveDetentFromHeight(56, vh)).toBe('peek');
        expect(resolveDetentFromHeight(360, vh)).toBe('peek'); // 0.36
        expect(resolveDetentFromHeight(449, vh)).toBe('peek'); // 0.449
      });

      it('returns "partial" for ratios >= 0.45 and < 0.8', () => {
        const vh = 1000;
        expect(resolveDetentFromHeight(450, vh)).toBe('partial'); // 0.45
        expect(resolveDetentFromHeight(600, vh)).toBe('partial'); // 0.60
        expect(resolveDetentFromHeight(799, vh)).toBe('partial'); // 0.799
      });

      it('returns "full" for ratios >= 0.8', () => {
        const vh = 1000;
        expect(resolveDetentFromHeight(800, vh)).toBe('full'); // 0.80
        expect(resolveDetentFromHeight(900, vh)).toBe('full'); // 0.90
        expect(resolveDetentFromHeight(1000, vh)).toBe('full'); // 1.00
        expect(resolveDetentFromHeight(1200, vh)).toBe('full'); // > 1.00
      });

      it('safely handles non-positive viewport heights', () => {
        expect(resolveDetentFromHeight(50, 0)).toBe('full');
        expect(resolveDetentFromHeight(50, -100)).toBe('full');
      });
    });

    describe('computeSheetDragStep', () => {
      const viewportHeightPx = 800;
      const peekStartHeight = 288; // 800 * 0.36

      it('dragging up resizes the sheet and only sets isFullScreen = true at full viewport height (shouldPreventScroll = true while < maxH)', () => {
        // Drag up by 50px (from 500 to 450) -> stays in peek (< 0.45)
        const step1 = computeSheetDragStep({
          startHeightPx: peekStartHeight, // 288
          startClientY: 500,
          currentClientY: 450, // deltaY = -50
          viewportHeightPx,
          isFullScreen: false,
          scrollTop: 0,
        });

        expect(step1.nextHeightPx).toBe(338); // 288 - (-50) = 338
        expect(step1.isFullScreen).toBe(false);
        expect(step1.shouldPreventScroll).toBe(true);
        expect(step1.effectiveDetent).toBe('peek'); // 338 / 800 = 0.4225 < 0.45

        // Drag up further by 250px (from 500 to 250) -> moves into partial
        const step2 = computeSheetDragStep({
          startHeightPx: peekStartHeight,
          startClientY: 500,
          currentClientY: 250, // deltaY = -250
          viewportHeightPx,
          isFullScreen: false,
          scrollTop: 0,
        });

        expect(step2.nextHeightPx).toBe(538); // 288 - (-250) = 538
        expect(step2.isFullScreen).toBe(false); // 538 < 796 (maxH - 4)
        expect(step2.shouldPreventScroll).toBe(true);
        expect(step2.effectiveDetent).toBe('partial'); // 538 / 800 = 0.6725

        // Drag up almost to full (795px < 796)
        const stepAlmostFull = computeSheetDragStep({
          startHeightPx: 400,
          startClientY: 500,
          currentClientY: 105, // deltaY = -395 => 400 - (-395) = 795
          viewportHeightPx,
          isFullScreen: false,
          scrollTop: 0,
        });
        expect(stepAlmostFull.nextHeightPx).toBe(795);
        expect(stepAlmostFull.isFullScreen).toBe(false);
        expect(stepAlmostFull.shouldPreventScroll).toBe(true);
        expect(stepAlmostFull.effectiveDetent).toBe('full');

        // Drag up to full height (796px >= 796)
        const stepFull = computeSheetDragStep({
          startHeightPx: peekStartHeight,
          startClientY: 500,
          currentClientY: -100, // deltaY = -600 => clamped to maxH = 800
          viewportHeightPx,
          isFullScreen: false,
          scrollTop: 0,
        });

        expect(stepFull.nextHeightPx).toBe(800);
        expect(stepFull.isFullScreen).toBe(true);
        expect(stepFull.shouldPreventScroll).toBe(true);
        expect(stepFull.effectiveDetent).toBe('full');
      });

      it('dragging down clamps at MIN_SHEET_HEIGHT_PX (56px / 2x title line height) and never goes smaller', () => {
        // Drag down by 400px (from 300 to 700)
        const step = computeSheetDragStep({
          startHeightPx: peekStartHeight, // 288
          startClientY: 300,
          currentClientY: 700, // deltaY = 400 => 288 - 400 = -112
          viewportHeightPx,
          isFullScreen: false,
          scrollTop: 0,
        });

        expect(step.nextHeightPx).toBe(MIN_SHEET_HEIGHT_PX); // 56
        expect(step.isFullScreen).toBe(false);
        expect(step.shouldPreventScroll).toBe(true);
        expect(step.effectiveDetent).toBe('peek');
      });

      it('supports custom minHeightPx clamping', () => {
        const step = computeSheetDragStep({
          startHeightPx: 120,
          startClientY: 200,
          currentClientY: 500,
          viewportHeightPx,
          minHeightPx: 90,
          isFullScreen: false,
          scrollTop: 0,
        });

        expect(step.nextHeightPx).toBe(90);
        expect(step.isFullScreen).toBe(false);
        expect(step.shouldPreventScroll).toBe(true);
      });

      it('when isFullScreen = true and scrollTop > 0, dragging down scrolls normally (shouldPreventScroll = false, stays at maxH)', () => {
        const step = computeSheetDragStep({
          startHeightPx: viewportHeightPx,
          startClientY: 200,
          currentClientY: 350, // deltaY = 150
          viewportHeightPx,
          isFullScreen: true,
          scrollTop: 45, // Scrolled down inside sheet
        });

        expect(step.nextHeightPx).toBe(viewportHeightPx);
        expect(step.isFullScreen).toBe(true);
        expect(step.shouldPreventScroll).toBe(false);
        expect(step.effectiveDetent).toBe('full');
      });

      it('when isFullScreen = true and scrollTop === 0, dragging down shrinks nextHeightPx below maxH and sets isFullScreen = false, shouldPreventScroll = true', () => {
        const step = computeSheetDragStep({
          startHeightPx: viewportHeightPx,
          startClientY: 200,
          currentClientY: 300, // deltaY = 100
          viewportHeightPx,
          isFullScreen: true,
          scrollTop: 0, // At the very top
        });

        expect(step.nextHeightPx).toBe(700); // 800 - 100
        expect(step.isFullScreen).toBe(false);
        expect(step.shouldPreventScroll).toBe(true);
        expect(step.effectiveDetent).toBe('full'); // 700 / 800 = 0.875 >= 0.8 -> full

        // Drag down further into partial territory
        const stepPartial = computeSheetDragStep({
          startHeightPx: viewportHeightPx,
          startClientY: 200,
          currentClientY: 450, // deltaY = 250
          viewportHeightPx,
          isFullScreen: true,
          scrollTop: 0,
        });

        expect(stepPartial.nextHeightPx).toBe(550); // 800 - 250
        expect(stepPartial.isFullScreen).toBe(false);
        expect(stepPartial.shouldPreventScroll).toBe(true);
        expect(stepPartial.effectiveDetent).toBe('partial'); // 550 / 800 = 0.6875
      });

      it('when isFullScreen = true and scrollTop <= 0, dragging down extensively shrinks toward minHeight', () => {
        const step = computeSheetDragStep({
          startHeightPx: viewportHeightPx,
          startClientY: 100,
          currentClientY: 900, // deltaY = 800 => 800 - 800 = 0 -> clamped to 56
          viewportHeightPx,
          isFullScreen: true,
          scrollTop: 0,
        });

        expect(step.nextHeightPx).toBe(MIN_SHEET_HEIGHT_PX);
        expect(step.isFullScreen).toBe(false);
        expect(step.shouldPreventScroll).toBe(true);
        expect(step.effectiveDetent).toBe('peek');
      });

      it('when isFullScreen = true and scrollTop <= 0 and deltaY <= 0 (dragging up while already full), stays at maxH', () => {
        const step = computeSheetDragStep({
          startHeightPx: viewportHeightPx,
          startClientY: 300,
          currentClientY: 200, // deltaY = -100
          viewportHeightPx,
          isFullScreen: true,
          scrollTop: 0,
        });

        expect(step.nextHeightPx).toBe(viewportHeightPx);
        expect(step.isFullScreen).toBe(true);
        expect(step.shouldPreventScroll).toBe(false);
        expect(step.effectiveDetent).toBe('full');
      });
    });
  });

  describe('Component DOM Rendering & Landmark Structure', () => {
    it('verifies single sheet structure, data-testid="details-drag-handle", data-is-full-screen="false", data-min-height-px="56", and all sections present', () => {
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

      // Single landmark aside panel
      expect(html).toContain('data-testid="details-panel"');
      expect(html).toContain('data-detent="peek"');
      expect(html).toContain('data-is-full-screen="false"');
      expect(html).toContain('data-min-height-px="56"');
      expect(html).toContain('--sheet-mobile-height:');

      // Drag handle bar
      expect(html).toContain('data-testid="details-drag-handle"');
      expect(html).toContain('role="separator"');
      expect(html).toContain('aria-orientation="horizontal"');
      expect(html).toContain('aria-label="Drag to resize panel"');

      // Semantic heading
      expect(html).toContain('id="details-heading"');
      expect(html).toContain('System Details');

      // All detent sections present in single sheet
      expect(html).toContain('data-testid="details-detent-peek"');
      expect(html).toContain('data-detent-section="peek"');
      expect(html).toContain('data-testid="peek-body"');

      expect(html).toContain('data-testid="details-detent-partial"');
      expect(html).toContain('data-detent-section="partial"');
      expect(html).toContain('data-testid="partial-body"');

      expect(html).toContain('data-testid="details-detent-full"');
      expect(html).toContain('data-detent-section="full"');
      expect(html).toContain('data-testid="full-body"');

      // Children content
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

      expect(html).toContain('data-testid="details-panel"');
      expect(html).toContain('data-detent="full"');
      expect(html).toContain('data-is-full-screen="true"');
      expect(html).toContain('data-min-height-px="56"');
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
      expect(html).toContain('data-detent="partial"');
      expect(html).toContain('data-is-full-screen="false"');
    });

    it('preserves custom className and style', () => {
      const html = renderToString(
        <DetentSheet
          testIdPrefix="details"
          heading="Styled Sheet"
          className="custom-sheet-class"
          style={{ zIndex: 99 }}
          peek={<div>Peek</div>}
        />,
      );

      expect(html).toContain('custom-sheet-class');
      expect(html).toContain('z-index:99');
      expect(html).toContain('--sheet-mobile-height');
    });
  });

  describe('Interactive Event Wiring on Drag Handle & Sheet', () => {
    it('wires pointer and touch handlers to the drag handle bar and sheet', () => {
      let capturedEl: any = null;
      function Harness() {
        capturedEl = DetentSheet({
          testIdPrefix: 'interactive-details',
          heading: 'Interactive Details',
          peek: <div>Peek</div>,
          partial: <div>Partial</div>,
        });
        return capturedEl;
      }

      renderToString(<Harness />);
      expect(capturedEl).not.toBeNull();

      const panel = findReactElementByTestId(capturedEl, 'interactive-details-panel');
      const handle = findReactElementByTestId(capturedEl, 'interactive-details-drag-handle');

      expect(panel).not.toBeNull();
      expect(handle).not.toBeNull();

      // Drag handle has pointer event handlers
      expect(typeof handle.props.onPointerDown).toBe('function');
      expect(typeof handle.props.onPointerMove).toBe('function');
      expect(typeof handle.props.onPointerUp).toBe('function');
      expect(typeof handle.props.onPointerCancel).toBe('function');

      // Drag handle and sheet have touch event handlers
      expect(typeof handle.props.onTouchStart).toBe('function');
      expect(typeof handle.props.onTouchMove).toBe('function');
      expect(typeof handle.props.onTouchEnd).toBe('function');
      expect(typeof panel.props.onTouchStart).toBe('function');
      expect(typeof panel.props.onTouchMove).toBe('function');
      expect(typeof panel.props.onTouchEnd).toBe('function');

      // Exercise pointer lifecycle
      const setPointerCapture = vi.fn();
      const releasePointerCapture = vi.fn();

      expect(() => {
        handle.props.onPointerDown({
          clientY: 400,
          pointerId: 1,
          currentTarget: { setPointerCapture, releasePointerCapture },
        });
      }).not.toThrow();

      const preventDefault = vi.fn();
      expect(() => {
        handle.props.onPointerMove({
          clientY: 300,
          cancelable: true,
          preventDefault,
        });
      }).not.toThrow();
      expect(preventDefault).toHaveBeenCalled();

      expect(() => {
        handle.props.onPointerUp({
          pointerId: 1,
          currentTarget: { releasePointerCapture },
        });
      }).not.toThrow();

      // Exercise touch lifecycle
      expect(() => {
        handle.props.onTouchStart({
          touches: [{ clientY: 500 }],
        });
      }).not.toThrow();

      const touchPreventDefault = vi.fn();
      expect(() => {
        handle.props.onTouchMove({
          touches: [{ clientY: 350 }],
          cancelable: true,
          preventDefault: touchPreventDefault,
        });
      }).not.toThrow();
      expect(touchPreventDefault).toHaveBeenCalled();

      expect(() => {
        handle.props.onTouchEnd();
      }).not.toThrow();
    });
  });
});
