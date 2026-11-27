import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DetentSheet, DetentSheetMidStage } from './DetentSheet';
import {
  DEFAULT_PEEK_HEIGHT_PX,
  FALLBACK_PARTIAL_SHEET_RATIO,
} from './detentSheetMath';

describe('<DetentSheet />', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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
    expect(panel.getAttribute('data-is-dragging')).toBe('false');
    expect(panel.getAttribute('data-beyond-partial')).toBe('false');
    expect(panel.getAttribute('data-min-height-px')).toBe(String(DEFAULT_PEEK_HEIGHT_PX));
    expect(panel.getAttribute('data-entity-id')).toBe('trappist-1');
    expect(panel.getAttribute('data-system-id')).toBe('trappist-1-sys');
    expect(panel.getAttribute('data-focused-kind')).toBe('star');
    expect(panel.style.getPropertyValue('--detent-sheet-block-size')).toBe(`${DEFAULT_PEEK_HEIGHT_PX}px`);
    expect(panel.style.getPropertyValue('--detent-expand-progress')).toBe('0');
    expect(panel.style.getPropertyValue('--detent-mid-stage-size')).toBe('0px');

    const heading = screen.getByRole('heading', { level: 2, name: 'Target Details' });
    expect(heading).toBeInTheDocument();

    expect(screen.getByTestId('details-detent-peek').textContent).toContain('Quick Summary');
    expect(screen.getByTestId('details-detent-partial').textContent).toContain('Atmospheric Telemetry');
    expect(screen.getByTestId('details-detent-full').textContent).toContain('Complete Ephemeris Dossier');
    expect(screen.getByTestId('footer-content').textContent).toContain('Footer Content');

    const handle = screen.getByRole('separator', { name: 'Drag to resize panel' });
    expect(handle).toBeInTheDocument();
  });

  it('reacts to activeDetent prop updates and reflects progress & beyond-partial flags', () => {
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
    expect(panel.getAttribute('data-beyond-partial')).toBe('false');
    expect(panel.style.getPropertyValue('--detent-expand-progress')).toBe('0');

    rerender(
      <DetentSheet
        testIdPrefix="catalog"
        heading="Catalog"
        activeDetent="partial"
        peek={<div>Peek View</div>}
      />
    );

    panel = screen.getByTestId('catalog-panel');
    expect(panel.getAttribute('data-detent')).toBe('partial');
    expect(panel.getAttribute('data-is-full-screen')).toBe('false');
    expect(panel.getAttribute('data-beyond-partial')).toBe('false');
    expect(panel.style.getPropertyValue('--detent-expand-progress')).toBe('1');

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
    expect(panel.getAttribute('data-beyond-partial')).toBe('true');
    expect(panel.style.getPropertyValue('--detent-expand-progress')).toBe('1');
  });

  it('defers data-is-dragging until drag threshold is exceeded and snaps on touch drag anywhere on <aside>', () => {
    const onDetentChange = vi.fn();
    render(
      <DetentSheet
        testIdPrefix="test"
        heading="Interactive Sheet"
        activeDetent="peek"
        onDetentChange={onDetentChange}
        peek={<div data-testid="peek-child">Content</div>}
      />
    );

    const panel = screen.getByTestId('test-panel');
    const handle = screen.getByTestId('test-drag-handle');
    const peekChild = screen.getByTestId('peek-child');

    // Dragging via touch starting on a child inside peek (peek -> partial)
    fireEvent.touchStart(peekChild, { touches: [{ clientY: 700 }] });
    expect(panel.getAttribute('data-is-dragging')).toBe('false');

    // Below 5px threshold keeps data-is-dragging false
    fireEvent.touchMove(panel, { touches: [{ clientY: 697 }], cancelable: true });
    expect(panel.getAttribute('data-is-dragging')).toBe('false');

    // Exceeding threshold starts drag and updates progress
    fireEvent.touchMove(panel, { touches: [{ clientY: 470 }], cancelable: true });
    expect(panel.getAttribute('data-is-dragging')).toBe('true');
    const progressDuringDrag = Number(panel.style.getPropertyValue('--detent-expand-progress'));
    expect(progressDuringDrag).toBeGreaterThan(0);
    expect(progressDuringDrag).toBeLessThanOrEqual(1);

    fireEvent.touchEnd(panel);
    expect(panel.getAttribute('data-is-dragging')).toBe('false');
    expect(panel.getAttribute('data-detent')).toBe('partial');
    expect(onDetentChange).toHaveBeenLastCalledWith('partial');

    // Touch drag partial -> full
    fireEvent.touchStart(peekChild, { touches: [{ clientY: 700 }] });
    fireEvent.touchMove(panel, { touches: [{ clientY: 150 }], cancelable: true });
    fireEvent.touchEnd(panel);
    expect(panel.getAttribute('data-detent')).toBe('full');
    expect(onDetentChange).toHaveBeenLastCalledWith('full');

    // Touch drag on handle in full collapses to partial even when panel is scrolled
    Object.defineProperty(panel, 'scrollTop', { configurable: true, writable: true, value: 120 });
    fireEvent.touchStart(handle, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(panel, { touches: [{ clientY: 500 }], cancelable: true });
    fireEvent.touchEnd(panel);
    expect(panel.getAttribute('data-detent')).toBe('partial');
    expect(onDetentChange).toHaveBeenLastCalledWith('partial');

    // Touch drag partial -> peek
    fireEvent.touchStart(peekChild, { touches: [{ clientY: 400 }] });
    fireEvent.touchMove(panel, { touches: [{ clientY: 700 }], cancelable: true });
    fireEvent.touchEnd(panel);
    expect(panel.getAttribute('data-detent')).toBe('peek');
    expect(onDetentChange).toHaveBeenLastCalledWith('peek');
  });

  it('supports pointer drag on <aside> via window listeners, suppresses child onClick after drag, and preserves pure taps', () => {
    const onChildClick = vi.fn();
    render(
      <DetentSheet
        testIdPrefix="ptr"
        heading="Pointer Sheet"
        activeDetent="peek"
        peek={
          <button type="button" data-testid="ptr-child-btn" onClick={onChildClick}>
            Child Action
          </button>
        }
      />
    );

    const panel = screen.getByTestId('ptr-panel');
    const childBtn = screen.getByTestId('ptr-child-btn');

    // Pure tap without movement fires child onClick cleanly
    fireEvent.pointerDown(childBtn, { clientY: 700, button: 0, pointerId: 1 });
    expect(panel.getAttribute('data-is-dragging')).toBe('false');
    fireEvent.pointerUp(window, { clientY: 700, pointerId: 1 });
    fireEvent.click(childBtn);
    expect(onChildClick).toHaveBeenCalledTimes(1);

    // Real pointer drag (> 5px) via window listeners suppresses child onClick via onClickCapture
    onChildClick.mockClear();
    fireEvent.pointerDown(childBtn, { clientY: 700, button: 0, pointerId: 2 });
    expect(panel.getAttribute('data-is-dragging')).toBe('false');
    fireEvent.pointerMove(window, { clientY: 460, pointerId: 2, cancelable: true });
    expect(panel.getAttribute('data-is-dragging')).toBe('true');
    fireEvent.pointerUp(window, { clientY: 460, pointerId: 2 });
    expect(panel.getAttribute('data-is-dragging')).toBe('false');
    expect(panel.getAttribute('data-detent')).toBe('partial');

    fireEvent.click(childBtn);
    expect(onChildClick).not.toHaveBeenCalled();
  });

  it('sets data-scrollable="false" in peek and unclamped partial, and "true" in full or clamped partial', () => {
    const { rerender } = render(
      <DetentSheet
        testIdPrefix="scroll"
        heading="Scrollable Sheet"
        activeDetent="peek"
        peek={<div>Peek</div>}
        peekMidStage={<div data-testid="scroll-mid">Mid</div>}
      />
    );

    const panel = screen.getByTestId('scroll-panel');
    expect(panel.getAttribute('data-scrollable')).toBe('false');

    rerender(
      <DetentSheet
        testIdPrefix="scroll"
        heading="Scrollable Sheet"
        activeDetent="partial"
        peek={<div>Peek</div>}
        peekMidStage={<div data-testid="scroll-mid">Mid</div>}
      />
    );
    expect(panel.getAttribute('data-scrollable')).toBe('false');

    // Clamped partial (tall mid-stage exceeding MAX_PARTIAL_SHEET_RATIO) becomes scrollable
    const midInner = screen.getByTestId('scroll-overview-mid-stage').querySelector('[data-detent-mid-inner="true"]') as HTMLElement;
    Object.defineProperty(midInner, 'scrollHeight', { configurable: true, value: 900 });
    fireEvent(window, new Event('resize'));
    expect(panel.getAttribute('data-scrollable')).toBe('true');

    rerender(
      <DetentSheet
        testIdPrefix="scroll"
        heading="Scrollable Sheet"
        activeDetent="full"
        peek={<div>Peek</div>}
        peekMidStage={<div data-testid="scroll-mid">Mid</div>}
      />
    );
    expect(panel.getAttribute('data-scrollable')).toBe('true');
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
    const expectedHeight = `${Math.round(window.innerHeight * FALLBACK_PARTIAL_SHEET_RATIO)}px`;
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
    expect(panel.style.getPropertyValue('--detent-expand-progress')).toBe('1');
  });

  it('toggles Peek -> Partial and Partial -> Peek on drag handle click, and expands Peek -> Partial on peek section click', () => {
    const expectedHeight = `${Math.round(window.innerHeight * FALLBACK_PARTIAL_SHEET_RATIO)}px`;
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

    // Click drag handle to expand Peek -> Partial
    fireEvent.click(handle);
    expect(panel.getAttribute('data-detent')).toBe('partial');
    expect(panel.style.getPropertyValue('--detent-sheet-block-size')).toBe(expectedHeight);
    expect(panel.style.getPropertyValue('--detent-expand-progress')).toBe('1');
    expect(onDetentChange).toHaveBeenCalledTimes(1);
    expect(onDetentChange).toHaveBeenCalledWith('partial');

    // Click drag handle again to collapse Partial -> Peek
    fireEvent.click(handle);
    expect(panel.getAttribute('data-detent')).toBe('peek');
    expect(panel.style.getPropertyValue('--detent-sheet-block-size')).toBe(`${DEFAULT_PEEK_HEIGHT_PX}px`);
    expect(panel.style.getPropertyValue('--detent-expand-progress')).toBe('0');
    expect(onDetentChange).toHaveBeenCalledTimes(2);
    expect(onDetentChange).toHaveBeenLastCalledWith('peek');

    // Test peek section click expands Peek -> Partial
    onDetentChange.mockClear();
    const peekInner = screen.getByTestId('peek-inner');
    fireEvent.click(peekInner);
    expect(panel.getAttribute('data-detent')).toBe('partial');
    expect(panel.style.getPropertyValue('--detent-sheet-block-size')).toBe(expectedHeight);
    expect(onDetentChange).toHaveBeenCalledTimes(1);
    expect(onDetentChange).toHaveBeenCalledWith('partial');
  });

  it('collapses Full -> Peek when clicking drag handle in full detent', () => {
    const onDetentChange = vi.fn();
    render(
      <DetentSheet
        testIdPrefix="test-full-tap"
        heading="Full Tap Sheet"
        activeDetent="full"
        onDetentChange={onDetentChange}
        peek={<div>Peek</div>}
      />
    );

    const panel = screen.getByTestId('test-full-tap-panel');
    const handle = screen.getByTestId('test-full-tap-drag-handle');

    fireEvent.click(handle);
    expect(panel.getAttribute('data-detent')).toBe('peek');
    expect(panel.getAttribute('data-is-full-screen')).toBe('false');
    expect(panel.getAttribute('data-beyond-partial')).toBe('false');
    expect(onDetentChange).toHaveBeenCalledWith('peek');
  });

  it('does not expand or trigger onDetentChange when clicking an anchor link or button inside peek', () => {
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
            <button type="button" data-testid="target-button">
              Button Target
            </button>
          </div>
        }
      />
    );

    const panel = screen.getByTestId('test-link-panel');
    fireEvent.click(screen.getByTestId('target-link'));
    fireEvent.click(screen.getByTestId('target-button'));
    expect(onDetentChange).not.toHaveBeenCalled();
    expect(panel.getAttribute('data-detent')).toBe('peek');
  });

  it('supports keyboard navigation (Enter, Space, ArrowUp, ArrowDown) on drag handle', () => {
    const onDetentChange = vi.fn();
    render(
      <DetentSheet
        testIdPrefix="kbd"
        heading="Keyboard Sheet"
        activeDetent="peek"
        onDetentChange={onDetentChange}
        peek={<div>Peek</div>}
      />
    );

    const panel = screen.getByTestId('kbd-panel');
    const handle = screen.getByTestId('kbd-drag-handle');
    expect(handle).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(handle, { key: 'Enter' });
    expect(panel.getAttribute('data-detent')).toBe('partial');
    expect(onDetentChange).toHaveBeenLastCalledWith('partial');

    fireEvent.keyDown(handle, { key: ' ' });
    expect(panel.getAttribute('data-detent')).toBe('peek');
    expect(onDetentChange).toHaveBeenLastCalledWith('peek');

    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(panel.getAttribute('data-detent')).toBe('partial');
    expect(onDetentChange).toHaveBeenLastCalledWith('partial');

    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(panel.getAttribute('data-detent')).toBe('full');
    expect(onDetentChange).toHaveBeenLastCalledWith('full');

    onDetentChange.mockClear();
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(panel.getAttribute('data-detent')).toBe('full');
    expect(onDetentChange).not.toHaveBeenCalled();

    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(panel.getAttribute('data-detent')).toBe('partial');
    expect(onDetentChange).toHaveBeenLastCalledWith('partial');

    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(panel.getAttribute('data-detent')).toBe('peek');
    expect(onDetentChange).toHaveBeenLastCalledWith('peek');

    onDetentChange.mockClear();
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(panel.getAttribute('data-detent')).toBe('peek');
    expect(onDetentChange).not.toHaveBeenCalled();
  });

  it('ignores synthetic clicks within 350ms of drag end and allows clicks afterward', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const onDetentChange = vi.fn();

    render(
      <DetentSheet
        testIdPrefix="guard"
        heading="Guard Sheet"
        activeDetent="peek"
        onDetentChange={onDetentChange}
        peek={<div><span data-testid="guard-peek-body">Peek</span></div>}
      />
    );

    const panel = screen.getByTestId('guard-panel');
    const handle = screen.getByTestId('guard-drag-handle');

    fireEvent.pointerDown(handle, { clientY: 600, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 400, pointerId: 1, cancelable: true });
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(panel.getAttribute('data-detent')).toBe('partial');
    onDetentChange.mockClear();

    // Immediate synthetic click (< 350ms) should be ignored
    vi.advanceTimersByTime(100);
    fireEvent.click(handle);
    expect(panel.getAttribute('data-detent')).toBe('partial');
    expect(onDetentChange).not.toHaveBeenCalled();

    // After 350ms window, click toggles detent normally
    vi.advanceTimersByTime(300);
    fireEvent.click(handle);
    expect(panel.getAttribute('data-detent')).toBe('peek');
    expect(onDetentChange).toHaveBeenCalledWith('peek');
  });

  it('renders peekMidStage and peekActions slots inside peek section with DetentSheet data attributes', () => {
    render(
      <DetentSheet
        testIdPrefix="slots"
        heading="Slots Sheet"
        activeDetent="partial"
        peek={<div>Title Row</div>}
        peekMidStage={<div data-testid="slot-mid-content">Prose + Preview</div>}
        peekActions={<button type="button" data-testid="slot-action">Go</button>}
      />
    );

    const peekSection = screen.getByTestId('slots-detent-peek');
    const midStage = screen.getByTestId('slots-overview-mid-stage');
    expect(peekSection).toContainElement(midStage);
    expect(midStage).toHaveAttribute('data-detent-mid-stage', 'true');
    const midInner = midStage.querySelector('[data-detent-mid-inner="true"]');
    expect(midInner).not.toBeNull();
    expect(midInner).toContainElement(screen.getByTestId('slot-mid-content'));

    const actions = peekSection.querySelector('[data-detent-actions="true"]');
    expect(actions).not.toBeNull();
    expect(actions).toContainElement(screen.getByTestId('slot-action'));
  });

  it('measures intrinsic mid-stage scrollHeight via ResizeObserver without observing sheet or churning on peek prop updates', () => {
    const disconnectSpy = vi.fn();
    const observeSpy = vi.fn();
    class MockResizeObserver {
      callback: ResizeObserverCallback;
      observe = observeSpy;
      unobserve = vi.fn();
      disconnect = disconnectSpy;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }
    }
    vi.stubGlobal('ResizeObserver', MockResizeObserver);

    const { rerender, unmount } = render(
      <DetentSheet
        testIdPrefix="measured"
        heading="Measured Sheet"
        activeDetent="partial"
        peek={
          <DetentSheetMidStage testId="measured-mid-stage">
            <div data-testid="mid-content">Overview Prose + Preview</div>
          </DetentSheetMidStage>
        }
      />
    );

    const panel = screen.getByTestId('measured-panel');
    const midStage = screen.getByTestId('measured-mid-stage');
    const midInner = midStage.querySelector('[data-detent-mid-inner="true"]') as HTMLElement;
    expect(midInner).not.toBeNull();
    Object.defineProperty(midInner, 'scrollHeight', { configurable: true, value: 180 });
    fireEvent(window, new Event('resize'));

    expect(observeSpy).toHaveBeenCalled();
    expect(observeSpy).not.toHaveBeenCalledWith(panel);
    expect(observeSpy).toHaveBeenCalledWith(midInner);
    expect(panel.style.getPropertyValue('--detent-mid-stage-size')).toBe('180px');
    expect(panel.style.getPropertyValue('--detent-sheet-block-size')).toBe(`${DEFAULT_PEEK_HEIGHT_PX + 180}px`);

    const observeCountBeforeRerender = observeSpy.mock.calls.length;
    rerender(
      <DetentSheet
        testIdPrefix="measured"
        heading="Measured Sheet"
        activeDetent="partial"
        peek={
          <DetentSheetMidStage testId="measured-mid-stage">
            <div data-testid="mid-content">Updated Prose + Preview</div>
          </DetentSheetMidStage>
        }
      />
    );
    expect(observeSpy.mock.calls.length).toBe(observeCountBeforeRerender);

    unmount();
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('re-binds ResizeObserver via MutationObserver when mid-inner node mounts dynamically', async () => {
    const observeSpy = vi.fn();
    const disconnectSpy = vi.fn();
    class MockResizeObserver {
      observe = observeSpy;
      unobserve = vi.fn();
      disconnect = disconnectSpy;
    }
    vi.stubGlobal('ResizeObserver', MockResizeObserver);

    const { rerender } = render(
      <DetentSheet
        testIdPrefix="mut"
        heading="Mutation Sheet"
        activeDetent="partial"
        peek={<div>Header Only</div>}
      />
    );

    const initialObserveCalls = observeSpy.mock.calls.length;

    rerender(
      <DetentSheet
        testIdPrefix="mut"
        heading="Mutation Sheet"
        activeDetent="partial"
        peek={<div>Header Only</div>}
        peekMidStage={<div data-testid="dynamic-mid">Dynamic Mid Stage</div>}
      />
    );

    // Wait a microtask for MutationObserver callback
    await Promise.resolve();
    const midInner = screen.getByTestId('mut-overview-mid-stage').querySelector('[data-detent-mid-inner="true"]');
    expect(midInner).not.toBeNull();
    expect(observeSpy.mock.calls.length).toBeGreaterThan(initialObserveCalls);
    expect(observeSpy).toHaveBeenCalledWith(midInner);
  });

  it('measures stage height from [data-detent-stage="true"] ancestor rather than an auto-sized immediate wrapper', () => {
    render(
      <div data-testid="stage-host" data-detent-stage="true">
        <div data-testid="auto-wrapper">
          <DetentSheet
            testIdPrefix="stage"
            heading="Stage Sheet"
            activeDetent="peek"
            peek={<div>Title Row</div>}
            peekMidStage={<div>Mid Stage Prose</div>}
          />
        </div>
      </div>
    );

    const stageHost = screen.getByTestId('stage-host');
    const autoWrapper = screen.getByTestId('auto-wrapper');
    const panel = screen.getByTestId('stage-panel');
    const peekSection = screen.getByTestId('stage-detent-peek');
    const midInner = screen.getByTestId('stage-overview-mid-stage').querySelector('[data-detent-mid-inner="true"]') as HTMLElement;

    Object.defineProperty(stageHost, 'clientHeight', { configurable: true, value: 789 });
    Object.defineProperty(autoWrapper, 'clientHeight', { configurable: true, value: 116 });
    Object.defineProperty(panel, 'offsetHeight', { configurable: true, value: 116 });
    Object.defineProperty(peekSection, 'offsetHeight', { configurable: true, value: 100 });
    Object.defineProperty(midInner, 'scrollHeight', { configurable: true, value: 240 });

    fireEvent.click(peekSection);
    expect(panel).toHaveAttribute('data-detent', 'partial');
    expect(parseFloat(panel.style.getPropertyValue('--detent-sheet-block-size'))).toBeGreaterThan(300);
  });
});
