import { useRef } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useUIStore } from '../../../stores/useUIStore';
import {
  useViewportSafeRectObserver,
  type SpatialShellRegionRefs,
} from './useViewportSafeRectObserver';

function setRect(
  el: Element | null,
  rect: { left: number; top: number; width: number; height: number },
): void {
  if (!el) return;
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      ...rect,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => rect,
    }),
  });
}

interface HarnessProps {
  readonly isBodiesDrawerOpen: boolean;
  readonly onRefsReady: (refs: {
    readonly shell: HTMLElement | null;
    readonly topBar: HTMLElement | null;
    readonly floatingLeft: HTMLElement | null;
    readonly floatingChild: HTMLElement | null;
    readonly bodiesRegion: HTMLElement | null;
    readonly controlsRegion: HTMLElement | null;
    readonly minimapRegion: HTMLElement | null;
  }) => void;
}

function ObserverHarness({ isBodiesDrawerOpen, onRefsReady }: HarnessProps) {
  const shellRef = useRef<HTMLElement>(null);
  const topBarRef = useRef<HTMLElement>(null);
  const floatingLeftRef = useRef<HTMLDivElement>(null);
  const bodiesRegionRef = useRef<HTMLElement>(null);
  const controlsRegionRef = useRef<HTMLDivElement>(null);
  const floatingChildRef = useRef<HTMLDivElement>(null);
  const minimapRegionRef = useRef<HTMLDivElement>(null);

  const refs: SpatialShellRegionRefs = {
    shellRef,
    topBarRef,
    floatingLeftRef,
    bodiesRegionRef,
    controlsRegionRef,
  };

  useViewportSafeRectObserver(refs, isBodiesDrawerOpen);

  return (
    <main
      ref={(node) => {
        shellRef.current = node;
        onRefsReady({
          shell: shellRef.current,
          topBar: topBarRef.current,
          floatingLeft: floatingLeftRef.current,
          floatingChild: floatingChildRef.current,
          bodiesRegion: bodiesRegionRef.current,
          controlsRegion: controlsRegionRef.current,
          minimapRegion: minimapRegionRef.current,
        });
      }}
    >
      <header ref={topBarRef} />
      <div ref={floatingLeftRef}>
        <div ref={floatingChildRef} />
      </div>
      <div ref={minimapRegionRef} />
      <div ref={controlsRegionRef} />
      <aside ref={bodiesRegionRef} />
    </main>
  );
}

describe('useViewportSafeRectObserver', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;
  const originalResizeObserver = globalThis.ResizeObserver;

  beforeEach(() => {
    act(() => {
      useUIStore.getState().resetUI();
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: originalInnerHeight,
    });
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: originalResizeObserver,
    });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('measures HUD regions via explicit refs without data-spatial-region DOM queries', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1440,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 900,
    });

    let captured: Parameters<HarnessProps['onRefsReady']>[0] | null = null;
    const { unmount } = render(
      <ObserverHarness
        isBodiesDrawerOpen={false}
        onRefsReady={(refs) => {
          captured = refs;
        }}
      />,
    );

    setRect(captured!.shell, { left: 0, top: 0, width: 1440, height: 900 });
    setRect(captured!.topBar, { left: 8, top: 8, width: 380, height: 56 });
    setRect(captured!.floatingChild, { left: 8, top: 72, width: 360, height: 420 });
    setRect(captured!.bodiesRegion, { left: 1040, top: 0, width: 400, height: 900 });
    setRect(captured!.controlsRegion, { left: 0, top: 840, width: 1440, height: 60 });

    vi.useFakeTimers();
    act(() => {
      window.dispatchEvent(new Event('resize'));
      vi.runAllTimers();
    });

    expect(useUIStore.getState().viewportSafeRect).toEqual({
      top: 0,
      right: 400,
      bottom: 60,
      left: 368,
      width: 1440 - 368 - 400,
      height: 900 - 60,
      bypass: false,
    });

    unmount();
    expect(useUIStore.getState().viewportSafeRect).toBeNull();
  });

  it('reads detailsDetent from useUIStore and sets bypass=true when detailsDetent is full on mobile', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 390,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 844,
    });

    let captured: Parameters<HarnessProps['onRefsReady']>[0] | null = null;
    render(
      <ObserverHarness
        isBodiesDrawerOpen={false}
        onRefsReady={(refs) => {
          captured = refs;
        }}
      />,
    );

    setRect(captured!.shell, { left: 0, top: 0, width: 390, height: 844 });
    setRect(captured!.floatingChild, { left: 0, top: 580, width: 390, height: 264 });

    vi.useFakeTimers();
    act(() => {
      useUIStore.getState().setDetailsDetent('peek');
      window.dispatchEvent(new Event('resize'));
      vi.runAllTimers();
    });

    expect(useUIStore.getState().viewportSafeRect?.bypass).toBe(false);
    expect(useUIStore.getState().viewportSafeRect?.bottom).toBe(264);

    setRect(captured!.floatingChild, { left: 0, top: 60, width: 390, height: 784 });
    act(() => {
      useUIStore.getState().setDetailsDetent('full');
      vi.runAllTimers();
    });

    expect(useUIStore.getState().viewportSafeRect?.bypass).toBe(true);
  });

  it('gates bodiesRegion measurement on isBodiesDrawerOpen below desktop breakpoint and includes it when open', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 768,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 1024,
    });

    let captured: Parameters<HarnessProps['onRefsReady']>[0] | null = null;
    const { rerender } = render(
      <ObserverHarness
        isBodiesDrawerOpen={false}
        onRefsReady={(refs) => {
          captured = refs;
        }}
      />,
    );

    setRect(captured!.shell, { left: 0, top: 0, width: 768, height: 1024 });
    setRect(captured!.bodiesRegion, { left: 384, top: 0, width: 384, height: 1024 });

    vi.useFakeTimers();
    act(() => {
      window.dispatchEvent(new Event('resize'));
      vi.runAllTimers();
    });

    expect(useUIStore.getState().viewportSafeRect?.right).toBe(0);

    rerender(
      <ObserverHarness
        isBodiesDrawerOpen={true}
        onRefsReady={(refs) => {
          captured = refs;
        }}
      />,
    );

    setRect(captured!.shell, { left: 0, top: 0, width: 768, height: 1024 });
    setRect(captured!.bodiesRegion, { left: 384, top: 0, width: 384, height: 1024 });

    act(() => {
      vi.runAllTimers();
    });

    expect(useUIStore.getState().viewportSafeRect?.right).toBe(384);
  });

  it('re-measures safe rect when transitionend fires or bubbles onto shellEl', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1280,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 800,
    });

    let captured: Parameters<HarnessProps['onRefsReady']>[0] | null = null;
    render(
      <ObserverHarness
        isBodiesDrawerOpen={false}
        onRefsReady={(refs) => {
          captured = refs;
        }}
      />,
    );

    setRect(captured!.shell, { left: 0, top: 0, width: 1280, height: 800 });
    setRect(captured!.floatingChild, { left: 8, top: 80, width: 300, height: 400 });

    vi.useFakeTimers();
    act(() => {
      window.dispatchEvent(new Event('resize'));
      vi.runAllTimers();
    });

    expect(useUIStore.getState().viewportSafeRect?.left).toBe(308);

    setRect(captured!.floatingChild, { left: 8, top: 80, width: 420, height: 400 });
    act(() => {
      captured!.minimapRegion?.dispatchEvent(
        new Event('transitionend', { bubbles: true }),
      );
      vi.runAllTimers();
    });

    expect(useUIStore.getState().viewportSafeRect?.left).toBe(428);

    setRect(captured!.floatingChild, { left: 8, top: 80, width: 350, height: 400 });
    act(() => {
      captured!.shell?.dispatchEvent(new Event('transitionend', { bubbles: true }));
      vi.runAllTimers();
    });

    expect(useUIStore.getState().viewportSafeRect?.left).toBe(358);
  });

  it('defers safe-rect re-measurement while camera is in flight and flushes on settle', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1280,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 800,
    });

    let captured: Parameters<HarnessProps['onRefsReady']>[0] | null = null;
    render(
      <ObserverHarness
        isBodiesDrawerOpen={false}
        onRefsReady={(refs) => {
          captured = refs;
        }}
      />,
    );

    setRect(captured!.shell, { left: 0, top: 0, width: 1280, height: 800 });
    setRect(captured!.floatingChild, { left: 8, top: 80, width: 320, height: 400 });

    vi.useFakeTimers();
    act(() => {
      window.dispatchEvent(new Event('resize'));
      vi.runAllTimers();
    });
    expect(useUIStore.getState().viewportSafeRect?.left).toBe(328);

    act(() => {
      useUIStore.getState().setCameraTransitioning(true);
    });

    setRect(captured!.floatingChild, { left: -360, top: 80, width: 320, height: 400 });
    act(() => {
      captured!.shell?.dispatchEvent(new Event('transitionend', { bubbles: true }));
      vi.runAllTimers();
    });

    expect(useUIStore.getState().viewportSafeRect?.left).toBe(328);

    setRect(captured!.floatingChild, { left: 8, top: 80, width: 380, height: 400 });
    act(() => {
      useUIStore.getState().setCameraTransitioning(false);
      vi.runAllTimers();
    });

    expect(useUIStore.getState().viewportSafeRect?.left).toBe(388);
  });
});
