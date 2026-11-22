import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { SpatialShell } from './SpatialShell';
import { useUIStore } from '../../../stores/useUIStore';
import { REDUCED_MOTION_MEDIA_QUERY } from '../../../utils/reducedMotion';

describe('SpatialShell Domain Component', () => {
  beforeEach(() => {
    act(() => {
      useUIStore.getState().resetUI();
    });
  });

  describe('Landmarks and Spatial Regions', () => {
    it('renders root landmark with default testId and data attributes', () => {
      render(<SpatialShell />);

      const root = screen.getByTestId('spatial-shell-root');
      expect(root.tagName).toBe('MAIN');
      expect(root.hasAttribute('data-spatial-shell')).toBe(true);
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('false');
    });

    it('renders custom testId and custom className', () => {
      render(
        <SpatialShell testId="custom-shell" className="custom-spatial-shell" />,
      );

      const root = screen.getByTestId('custom-shell');
      expect(root).toBeDefined();
      expect(root.className).toContain('custom-spatial-shell');
    });

    it('renders all dedicated spatial regions with injected slots', () => {
      render(
        <SpatialShell
          canvas={<div data-testid="slot-canvas">Canvas Slot</div>}
          breadcrumbs={<div data-testid="slot-breadcrumbs">Breadcrumbs Slot</div>}
          search={<div data-testid="slot-search">Search Slot</div>}
          layerCard={<div data-testid="slot-layer-card">LayerCard Slot</div>}
          detailsPanel={<div data-testid="slot-details">Details Slot</div>}
          controls={<div data-testid="slot-controls">Controls Slot</div>}
          minimap={<div data-testid="slot-minimap">Minimap Slot</div>}
          bodies={<div data-testid="slot-bodies">Bodies Slot</div>}
        >
          <div data-testid="slot-children">Children Slot</div>
        </SpatialShell>,
      );

      expect(screen.getByTestId('slot-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('slot-breadcrumbs')).toBeInTheDocument();
      expect(screen.getByTestId('slot-search')).toBeInTheDocument();
      expect(screen.getByTestId('slot-layer-card')).toBeInTheDocument();
      expect(screen.getByTestId('slot-details')).toBeInTheDocument();
      expect(screen.getByTestId('slot-controls')).toBeInTheDocument();
      expect(screen.getByTestId('slot-minimap')).toBeInTheDocument();
      expect(screen.getByTestId('slot-bodies')).toBeInTheDocument();
      expect(screen.getByTestId('slot-children')).toBeInTheDocument();

      expect(document.querySelector('[data-spatial-region="canvas"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="top-bar"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="breadcrumbs"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="search"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="layer-card"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="floating-left"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="controls"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="minimap"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="bodies"]')).not.toBeNull();
    });

    it('renders all regions even when slot props are omitted', () => {
      render(<SpatialShell testId="empty-shell" />);

      const root = screen.getByTestId('empty-shell');
      expect(root).toBeDefined();
      expect(root.getAttribute('data-spatial-shell')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="canvas"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="top-bar"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="floating-left"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="controls"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="minimap"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="bodies"]')).not.toBeNull();
    });
  });

  describe('Bodies Drawer Mechanics', () => {
    it('initialises closed by default and toggles via toggle button', () => {
      render(
        <SpatialShell bodies={<div data-testid="bodies-content">Bodies</div>} />,
      );

      const root = screen.getByTestId('spatial-shell-root');
      const toggleBtn = screen.getByTestId('spatial-shell-bodies-toggle');

      expect(root.getAttribute('data-bodies-drawer-open')).toBe('false');
      expect(toggleBtn.textContent).toContain('Bodies');
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');

      fireEvent.click(toggleBtn);

      expect(root.getAttribute('data-bodies-drawer-open')).toBe('true');
      expect(toggleBtn.textContent).toContain('Close Bodies');
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
      expect(useUIStore.getState().activeDrawer).toBe('bodies');

      fireEvent.click(toggleBtn);

      expect(root.getAttribute('data-bodies-drawer-open')).toBe('false');
      expect(toggleBtn.textContent).toContain('Bodies');
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
      expect(useUIStore.getState().activeDrawer).toBeNull();
    });

    it('closes drawer when clicking backdrop scrim', () => {
      render(
        <SpatialShell
          initialBodiesDrawerOpen
          bodies={<div data-testid="bodies-content">Bodies</div>}
        />,
      );

      const root = screen.getByTestId('spatial-shell-root');
      const backdrop = screen.getByTestId('spatial-shell-bodies-backdrop');

      expect(root.getAttribute('data-bodies-drawer-open')).toBe('true');

      fireEvent.click(backdrop);

      expect(root.getAttribute('data-bodies-drawer-open')).toBe('false');
      expect(useUIStore.getState().activeDrawer).toBeNull();
    });

    it('honours controlled isBodiesDrawerOpen and onBodiesDrawerOpenChange', () => {
      const onBodiesDrawerOpenChange = vi.fn();
      const { rerender } = render(
        <SpatialShell
          isBodiesDrawerOpen={false}
          onBodiesDrawerOpenChange={onBodiesDrawerOpenChange}
          bodies={<div data-testid="bodies-content">Bodies</div>}
        />,
      );

      const root = screen.getByTestId('spatial-shell-root');
      const toggleBtn = screen.getByTestId('spatial-shell-bodies-toggle');

      expect(root.getAttribute('data-bodies-drawer-open')).toBe('false');

      fireEvent.click(toggleBtn);
      expect(onBodiesDrawerOpenChange).toHaveBeenCalledWith(true);

      rerender(
        <SpatialShell
          isBodiesDrawerOpen={true}
          onBodiesDrawerOpenChange={onBodiesDrawerOpenChange}
          bodies={<div data-testid="bodies-content">Bodies</div>}
        />,
      );

      expect(root.getAttribute('data-bodies-drawer-open')).toBe('true');
    });

    it('reads initial state from useUIStore activeDrawer', () => {
      act(() => {
        useUIStore.getState().setActiveDrawer('bodies');
      });

      render(<SpatialShell bodies={<div>Bodies</div>} />);

      const root = screen.getByTestId('spatial-shell-root');
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('true');
    });

    it('supports controlled isBodiesDrawerOpen prop taking priority over store state', () => {
      act(() => {
        useUIStore.getState().setActiveDrawer('bodies');
      });

      const { rerender } = render(
        <SpatialShell
          testId="controlled-shell"
          isBodiesDrawerOpen={false}
          bodies={<div data-testid="bodies-content">Bodies</div>}
        />,
      );

      const root = screen.getByTestId('controlled-shell');
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('false');

      act(() => {
        useUIStore.getState().setActiveDrawer(null);
      });

      rerender(
        <SpatialShell
          testId="controlled-shell"
          isBodiesDrawerOpen={true}
          bodies={<div data-testid="bodies-content">Bodies</div>}
        />,
      );

      expect(root.getAttribute('data-bodies-drawer-open')).toBe('true');
    });
  });

  describe('Primary Float Panel Integration', () => {
    it('suppresses preview when detailsPanel is showing and shows it when details is closed', () => {
      act(() => {
        useUIStore.getState().setDetailsOpen(true);
      });

      const { rerender } = render(
        <SpatialShell
          detailsPanel={<div data-testid="details">Details</div>}
          preview={<div data-testid="preview">Preview</div>}
        />,
      );

      expect(screen.getByTestId('details')).toBeInTheDocument();
      expect(screen.queryByTestId('preview')).toBeNull();

      act(() => {
        useUIStore.getState().setDetailsOpen(false);
      });

      rerender(
        <SpatialShell
          detailsPanel={<div data-testid="details">Details</div>}
          preview={<div data-testid="preview">Preview</div>}
        />,
      );

      expect(screen.queryByTestId('details')).toBeNull();
      expect(screen.getByTestId('preview')).toBeInTheDocument();
    });

    it('integrates with useUIStore panel state and dual-panel policy', () => {
      act(() => {
        useUIStore.getState().setPrimaryPanelPriority('directions');
        useUIStore.getState().setDualPanelPolicy('single');
      });

      const { rerender } = render(
        <SpatialShell
          detailsPanel={<div data-testid="store-details">Details</div>}
          directionsPanel={<div data-testid="store-directions">Directions</div>}
        />,
      );

      expect(screen.getByTestId('store-directions')).toBeInTheDocument();
      expect(screen.queryByTestId('store-details')).toBeNull();

      act(() => {
        useUIStore.getState().setPrimaryPanelPriority('details');
      });

      rerender(
        <SpatialShell
          detailsPanel={<div data-testid="store-details">Details</div>}
          directionsPanel={<div data-testid="store-directions">Directions</div>}
        />,
      );

      expect(screen.getByTestId('store-details')).toBeInTheDocument();
      expect(screen.queryByTestId('store-directions')).toBeNull();

      act(() => {
        useUIStore.getState().setDualPanelPolicy('simultaneous');
      });

      rerender(
        <SpatialShell
          detailsPanel={<div data-testid="store-details">Details</div>}
          directionsPanel={<div data-testid="store-directions">Directions</div>}
        />,
      );

      expect(screen.getByTestId('store-details')).toBeInTheDocument();
      expect(screen.getByTestId('store-directions')).toBeInTheDocument();
    });
  });

  describe('Camera Flight Retraction & Safe-Rect Observer', () => {
    const originalMatchMedia = window.matchMedia;
    const originalResizeObserver = globalThis.ResizeObserver;
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;

    function mockReducedMotion(matches: boolean): void {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: vi.fn((query: string) => ({
          matches: query === REDUCED_MOTION_MEDIA_QUERY ? matches : false,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          onchange: null,
          dispatchEvent: vi.fn(),
        })),
      });
    }

    function setRect(el: Element | null, rect: { left: number; top: number; width: number; height: number }): void {
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

    afterEach(() => {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
      Object.defineProperty(globalThis, 'ResizeObserver', {
        configurable: true,
        writable: true,
        value: originalResizeObserver,
      });
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
      vi.restoreAllMocks();
    });

    it('sets data-camera-in-flight="true" during camera transitions when reduced motion is false', () => {
      mockReducedMotion(false);
      render(<SpatialShell />);

      const root = screen.getByTestId('spatial-shell-root');
      expect(root.getAttribute('data-camera-in-flight')).toBe('false');

      act(() => {
        useUIStore.getState().setCameraTransitioning(true);
      });
      expect(root.getAttribute('data-camera-in-flight')).toBe('true');

      act(() => {
        useUIStore.getState().setCameraTransitioning(false);
      });
      expect(root.getAttribute('data-camera-in-flight')).toBe('false');
    });

    it('keeps data-camera-in-flight="false" during camera transitions when prefers-reduced-motion is true', () => {
      mockReducedMotion(true);
      act(() => {
        useUIStore.getState().setCameraTransitioning(true);
      });

      render(<SpatialShell />);

      const root = screen.getByTestId('spatial-shell-root');
      expect(root.getAttribute('data-camera-in-flight')).toBe('false');
    });

    it('measures individual HUD panels into useUIStore.viewportSafeRect (never .leftColumn) and resets on unmount', () => {
      let resizeCallback: ResizeObserverCallback | null = null;
      const observeSpy = vi.fn();
      const disconnectSpy = vi.fn();

      class MockResizeObserver {
        constructor(cb: ResizeObserverCallback) {
          resizeCallback = cb;
        }
        observe = observeSpy;
        unobserve = vi.fn();
        disconnect = disconnectSpy;
      }

      Object.defineProperty(globalThis, 'ResizeObserver', {
        configurable: true,
        writable: true,
        value: MockResizeObserver,
      });

      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1440 });
      Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 900 });

      const { unmount } = render(
        <SpatialShell
          breadcrumbs={<div data-testid="obs-breadcrumbs">Breadcrumbs</div>}
          detailsPanel={<div data-testid="obs-details">Details</div>}
          controls={<div data-testid="obs-controls">Controls</div>}
          bodies={<div data-testid="obs-bodies">Bodies</div>}
        />,
      );

      const root = screen.getByTestId('spatial-shell-root');
      const topBar = root.querySelector('[data-spatial-region="top-bar"]');
      const floatingLeft = root.querySelector('[data-spatial-region="floating-left"]');
      const detailsCard = floatingLeft?.firstElementChild ?? null;
      const bodiesRegion = root.querySelector('[data-spatial-region="bodies"]');
      const controlsRegion = root.querySelector('[data-spatial-region="controls"]');
      const leftColumn = floatingLeft?.parentElement ?? null;

      setRect(root, { left: 0, top: 0, width: 1440, height: 900 });
      setRect(leftColumn, { left: 0, top: 0, width: 700, height: 800 });
      setRect(topBar, { left: 8, top: 8, width: 377, height: 60 });
      setRect(detailsCard, { left: 8, top: 76, width: 377, height: 420 });
      setRect(bodiesRegion, { left: 1008, top: 0, width: 432, height: 900 });
      setRect(controlsRegion, { left: 0, top: 844, width: 1440, height: 56 });

      // Ensure .leftColumn itself was never observed by ResizeObserver
      expect(leftColumn).not.toBeNull();
      expect(observeSpy).not.toHaveBeenCalledWith(leftColumn);

      // Trigger resize observer and flush rAF
      vi.useFakeTimers();
      try {
        act(() => {
          resizeCallback?.([], {} as ResizeObserver);
          vi.runAllTimers();
        });
      } finally {
        vi.useRealTimers();
      }

      // Left inset comes from detailsCard (385), NOT .leftColumn (700)
      expect(useUIStore.getState().viewportSafeRect).toEqual({
        top: 0,
        right: 432,
        bottom: 56,
        left: 385,
        width: 1440 - 385 - 432,
        height: 900 - 56,
        bypass: false,
      });

      unmount();
      expect(disconnectSpy).toHaveBeenCalled();
      expect(useUIStore.getState().viewportSafeRect).toBeNull();
    });

    it('gracefully handles missing ResizeObserver and measures mobile detent sheet bypass', () => {
      Object.defineProperty(globalThis, 'ResizeObserver', {
        configurable: true,
        writable: true,
        value: undefined,
      });
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
      Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 844 });

      render(
        <SpatialShell
          breadcrumbs={<div data-testid="mob-breadcrumbs">Breadcrumbs</div>}
          detailsPanel={<div data-detent="full">Full Sheet</div>}
        />,
      );

      const root = screen.getByTestId('spatial-shell-root');
      const detentEl = root.querySelector('[data-detent]');
      setRect(root, { left: 0, top: 0, width: 390, height: 844 });
      setRect(detentEl, { left: 0, top: 60, width: 390, height: 784 });

      vi.useFakeTimers();
      try {
        act(() => {
          window.dispatchEvent(new Event('resize'));
          vi.runAllTimers();
        });
      } finally {
        vi.useRealTimers();
      }

      expect(useUIStore.getState().viewportSafeRect?.bypass).toBe(true);
    });

    it('treats desktop DetentSheet as left occlusion rather than mobile bottom sheet and excludes closed tablet drawer', () => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 768 });
      Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 1024 });

      render(
        <SpatialShell
          isBodiesDrawerOpen={false}
          detailsPanel={<div data-detent="peek">Desktop/Tablet Details</div>}
          bodies={<div>Bodies Drawer</div>}
        />,
      );

      const root = screen.getByTestId('spatial-shell-root');
      const detentEl = root.querySelector('[data-detent]');
      const bodiesEl = root.querySelector('[data-spatial-region="bodies"]');

      setRect(root, { left: 0, top: 0, width: 768, height: 1024 });
      setRect(detentEl, { left: 8, top: 100, width: 377, height: 400 });
      // Closed drawer on tablet still occupies layout box in jsdom, but must be ignored when closed
      setRect(bodiesEl, { left: 391, top: 0, width: 377, height: 1024 });

      vi.useFakeTimers();
      try {
        act(() => {
          window.dispatchEvent(new Event('resize'));
          vi.runAllTimers();
        });
      } finally {
        vi.useRealTimers();
      }

      expect(useUIStore.getState().viewportSafeRect).toEqual({
        top: 0,
        right: 0,
        bottom: 0,
        left: 385,
        width: 768 - 385,
        height: 1024,
        bypass: false,
      });
    });

    it('immediately accounts for opening Bodies drawer width on tablet even while CSS translateX(100%) is still sliding in', () => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1000 });
      Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 800 });

      render(
        <SpatialShell
          isBodiesDrawerOpen={true}
          bodies={<div data-testid="sliding-bodies">Bodies</div>}
        />,
      );

      const root = screen.getByTestId('spatial-shell-root');
      const bodiesEl = root.querySelector('[data-spatial-region="bodies"]');

      setRect(root, { left: 0, top: 0, width: 1000, height: 800 });
      // Mid-transition translateX(100%): left is still 1000 (off-screen), width is 384
      setRect(bodiesEl, { left: 1000, top: 0, width: 384, height: 800 });

      vi.useFakeTimers();
      try {
        act(() => {
          window.dispatchEvent(new Event('resize'));
          vi.runAllTimers();
        });
      } finally {
        vi.useRealTimers();
      }

      expect(useUIStore.getState().viewportSafeRect).toEqual({
        top: 0,
        right: 384,
        bottom: 0,
        left: 0,
        width: 1000 - 384,
        height: 800,
        bypass: false,
      });
    });
  });
});
