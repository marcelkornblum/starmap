// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  DetentSheet,
  resolveDetentFromHeight,
  computeSheetDragStep,
} from './DetentSheet';

describe('<DetentSheet />', () => {
  describe('pure math helpers', () => {
    it('resolves detent from height ratios correctly', () => {
      expect(resolveDetentFromHeight(200, 1000)).toBe('peek'); // 0.2 < 0.45
      expect(resolveDetentFromHeight(500, 1000)).toBe('partial'); // 0.5 >= 0.45 and < 0.8
      expect(resolveDetentFromHeight(850, 1000)).toBe('full'); // 0.85 >= 0.8
    });

    it('computes sheet drag step for upward expansion', () => {
      const step = computeSheetDragStep({
        startHeightPx: 300,
        startClientY: 500,
        currentClientY: 400, // dragged up by 100px
        viewportHeightPx: 1000,
        isFullScreen: false,
        scrollTop: 0,
      });

      expect(step.nextHeightPx).toBe(400);
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
