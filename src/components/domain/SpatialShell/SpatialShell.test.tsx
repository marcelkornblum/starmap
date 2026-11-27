import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useRouter } from '@tanstack/react-router';
import { SpatialShell } from './SpatialShell';
import { useUIStore } from '../../../stores/useUIStore';
import { useLayerStore } from '../../../stores/useLayerStore';
import type { MinimapOrientationSummary } from '../../../services/details/detailsNavigationTypes';
import { REDUCED_MOTION_MEDIA_QUERY } from '../../../utils/reducedMotion';

vi.mock('@tanstack/react-router', () => ({
  useRouter: vi.fn(() => undefined),
}));

const MOCK_ORIENTATION: MinimapOrientationSummary = {
  scope: 'galaxy',
  anchorId: 'anchor-a',
  anchorName: 'Anchor A',
  systemId: 'sys-a',
  systemName: 'System A',
  coordinatesPc: [0, 0, 0],
  distanceFromOriginPc: 0,
  cameraAzimuthDeg: 45,
  cameraElevationDeg: 30,
  cameraDistance: 42,
  focusedMarker: null,
  selectedMarkers: [],
  markers: [],
};

describe('SpatialShell Domain Component', () => {
  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue(undefined as never);
    act(() => {
      useUIStore.getState().resetUI();
      useLayerStore.setState({
        index: [
          {
            layerId: 'overlay-recent-discoveries',
            title: 'Recent Discoveries',
            kind: 'scientific-overlay',
            description: 'Confirmed nearby exoplanet discoveries.',
            entryCount: 3,
            path: '/data/overlays/layers/overlay-recent-discoveries.json',
          },
        ],
      });
    });
  });

  describe('Landmarks and Spatial Regions', () => {
    it('renders root landmark with default testId, spatial mode, and ConsoleDock', () => {
      render(<SpatialShell />);

      const root = screen.getByTestId('spatial-shell-root');
      expect(root.tagName).toBe('MAIN');
      expect(root.hasAttribute('data-spatial-shell')).toBe(true);
      expect(root.getAttribute('data-mode')).toBe('spatial');
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('false');
      expect(screen.getByTestId('console-dock')).toBeInTheDocument();
    });

    it('renders custom testId without dynamic className prop', () => {
      render(<SpatialShell testId="custom-shell" />);

      const root = screen.getByTestId('custom-shell');
      expect(root).toBeDefined();
      expect(root.getAttribute('data-spatial-shell')).not.toBeNull();
    });

    it('renders dedicated spatial regions with injected slots and supports data-* root attributes', () => {
      render(
        <SpatialShell
          data-star-type="G2V"
          canvas={<div data-testid="slot-canvas">Canvas Slot</div>}
          breadcrumbs={<div data-testid="slot-breadcrumbs">Breadcrumbs Slot</div>}
          search={<div data-testid="slot-search">Search Slot</div>}
          layerCard={<div data-testid="slot-layer-card">LayerCard Slot</div>}
          detailsPanel={<div data-testid="slot-details">Details Slot</div>}
          minimap={<div data-testid="slot-minimap">Minimap Slot</div>}
          minimapOrientation={MOCK_ORIENTATION}
          bodies={<div data-testid="slot-bodies">Bodies Slot</div>}
        >
          <div data-testid="slot-children">Children Slot</div>
        </SpatialShell>,
      );

      expect(screen.getByTestId('spatial-shell-root')).toHaveAttribute('data-star-type', 'G2V');
      expect(screen.getByTestId('slot-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('slot-breadcrumbs')).toBeInTheDocument();
      expect(screen.getByTestId('slot-search')).toBeInTheDocument();
      expect(screen.getByTestId('slot-layer-card')).toBeInTheDocument();
      expect(screen.getByTestId('slot-details')).toBeInTheDocument();
      expect(screen.getByTestId('slot-minimap')).toBeInTheDocument();
      expect(screen.getByTestId('visor-scale-pill')).toBeInTheDocument();
      expect(screen.getByTestId('slot-bodies')).toBeInTheDocument();
      expect(screen.getByTestId('slot-children')).toBeInTheDocument();
      expect(screen.getByTestId('console-dock')).toBeInTheDocument();

      expect(document.querySelector('[data-spatial-region="console-dock"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="canvas"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="top-bar"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="visor-top-row"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="visor-discovery-row"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="breadcrumbs"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="visor-scale"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="search"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="bodies-trigger"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="layer-card"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="floating-left"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="controls"]')).toBeNull();
      expect(document.querySelector('[data-spatial-region="minimap"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="bodies"]')).not.toBeNull();
    });

    it('renders base regions and omits bodies trigger and VisorScalePill when optional slots are omitted', () => {
      render(<SpatialShell testId="empty-shell" />);

      const root = screen.getByTestId('empty-shell');
      expect(root).toBeDefined();
      expect(root.getAttribute('data-spatial-shell')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="console-dock"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="canvas"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="top-bar"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="floating-left"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="minimap"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="bodies"]')).not.toBeNull();
      expect(screen.queryByTestId('spatial-shell-bodies-toggle')).toBeNull();
      expect(screen.queryByTestId('visor-scale-pill')).toBeNull();
    });
  });

  describe('ConsoleDock, Document Mode, and DiscoverPanel Integration', () => {
    it('syncs lastMapHref in spatial mode for map routes and resolves ConsoleDock activeItem', () => {
      const mockRouter = {
        state: {
          location: {
            pathname: '/system/alpha',
            searchStr: '?focus=beta',
          },
        },
        navigate: vi.fn(),
        subscribe: vi.fn(() => () => {}),
      };
      vi.mocked(useRouter).mockReturnValue(mockRouter as never);

      render(<SpatialShell />);

      expect(useUIStore.getState().lastMapHref).toBe('/system/alpha?focus=beta');
      expect(screen.getByTestId('console-dock-map')).toHaveAttribute('data-active', 'true');
      expect(screen.getByTestId('console-dock-guide')).toHaveAttribute('href', '/guide/star-types');
    });

    it('opens DiscoverPanel in floatingLeft in spatial mode, closes open Bodies drawer, and closes on close/select', () => {
      act(() => {
        useUIStore.getState().setActiveDrawer('bodies');
        useUIStore.getState().setDetailsOpen(true);
      });

      render(
        <SpatialShell
          detailsPanel={<div data-testid="slot-details">Details Slot</div>}
          preview={<div data-testid="slot-preview">Preview Slot</div>}
          bodies={<div data-testid="slot-bodies">Bodies Slot</div>}
        />,
      );

      expect(screen.getByTestId('slot-details')).toBeInTheDocument();
      expect(screen.getByTestId('spatial-shell-root')).toHaveAttribute('data-bodies-drawer-open', 'true');

      fireEvent.click(screen.getByTestId('console-dock-discover'));

      expect(useUIStore.getState().isDiscoverOpen).toBe(true);
      expect(useUIStore.getState().activeDrawer).toBeNull();
      expect(screen.getByTestId('spatial-shell-root')).toHaveAttribute('data-bodies-drawer-open', 'false');
      expect(screen.getByTestId('discover-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('slot-details')).toBeNull();
      expect(screen.getByTestId('console-dock-discover')).toHaveAttribute('data-active', 'true');

      fireEvent.click(screen.getByTestId('discover-layer-link'));
      expect(useUIStore.getState().isDiscoverOpen).toBe(false);
      expect(screen.queryByTestId('discover-panel')).toBeNull();
      expect(screen.getByTestId('slot-details')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('console-dock-discover'));
      expect(screen.getByTestId('discover-panel')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('discover-close-button'));
      expect(useUIStore.getState().isDiscoverOpen).toBe(false);
      expect(screen.queryByTestId('discover-panel')).toBeNull();

      // Clicking Map or Guide in ConsoleDock clears isDiscoverOpen
      fireEvent.click(screen.getByTestId('console-dock-discover'));
      expect(useUIStore.getState().isDiscoverOpen).toBe(true);
      fireEvent.click(screen.getByTestId('console-dock-map'));
      expect(useUIStore.getState().isDiscoverOpen).toBe(false);

      fireEvent.click(screen.getByTestId('console-dock-discover'));
      expect(useUIStore.getState().isDiscoverOpen).toBe(true);
      fireEvent.click(screen.getByTestId('console-dock-guide'));
      expect(useUIStore.getState().isDiscoverOpen).toBe(false);
    });

    it('highlights active layer in DiscoverPanel from ?select=layer:<slug>', () => {
      const mockRouter = {
        state: {
          location: {
            pathname: '/galaxy',
            searchStr: '?select=layer:recent-discoveries',
          },
        },
        navigate: vi.fn(),
        subscribe: vi.fn(() => () => {}),
      };
      vi.mocked(useRouter).mockReturnValue(mockRouter as never);
      act(() => {
        useUIStore.getState().setDiscoverOpen(true);
      });

      render(<SpatialShell />);

      const item = screen.getByTestId('discover-layer-item');
      expect(item).toHaveAttribute('data-layer-slug', 'recent-discoveries');
      expect(item).toHaveAttribute('data-selected', 'true');
    });

    it('renders document mode layout with ConsoleDock, prefers non-default lastMapHref over companionMapHref, and uses companionMapHref on cold load', () => {
      act(() => {
        useUIStore.getState().setLastMapHref('/planet/mars-prime');
      });
      const navigateMock = vi.fn();
      const mockRouter = {
        state: {
          location: {
            pathname: '/guide/star-types',
            searchStr: '',
          },
        },
        navigate: navigateMock,
        subscribe: vi.fn(() => () => {}),
      };
      vi.mocked(useRouter).mockReturnValue(mockRouter as never);

      const { unmount } = render(
        <SpatialShell mode="document" companionMapHref="/galaxy?focus=vega">
          <article data-testid="doc-content">Guide Content</article>
        </SpatialShell>,
      );

      const root = screen.getByTestId('spatial-shell-root');
      expect(root.getAttribute('data-mode')).toBe('document');
      expect(screen.getByTestId('doc-content')).toBeInTheDocument();
      expect(document.querySelector('[data-spatial-region="document"]')).not.toBeNull();
      expect(document.querySelector('[data-spatial-region="canvas"]')).toBeNull();
      expect(document.querySelector('[data-spatial-region="bodies"]')).toBeNull();

      expect(useUIStore.getState().lastMapHref).toBe('/planet/mars-prime');
      expect(screen.getByTestId('console-dock-guide')).toHaveAttribute('data-active', 'true');
      expect(screen.getByTestId('console-dock-map')).toHaveAttribute('href', '/planet/mars-prime');

      fireEvent.click(screen.getByTestId('console-dock-discover'));
      expect(useUIStore.getState().isDiscoverOpen).toBe(true);
      expect(navigateMock).toHaveBeenCalledWith({ href: '/planet/mars-prime' });
      unmount();

      // Cold load (lastMapHref === '/galaxy'): uses companionMapHref
      act(() => {
        useUIStore.getState().resetUI();
      });
      navigateMock.mockClear();
      render(
        <SpatialShell mode="document" companionMapHref="/galaxy?focus=sol">
          <article data-testid="doc-content">Guide Content</article>
        </SpatialShell>,
      );
      expect(screen.getByTestId('console-dock-map')).toHaveAttribute('href', '/galaxy?focus=sol');
      fireEvent.click(screen.getByTestId('console-dock-discover'));
      expect(navigateMock).toHaveBeenCalledWith({ href: '/galaxy?focus=sol' });
    });

    it('falls back to lastMapHref in document mode when companionMapHref is omitted', () => {
      act(() => {
        useUIStore.getState().setLastMapHref('/system/cygnus-a');
      });
      const mockRouter = {
        state: {
          location: {
            pathname: '/search',
            searchStr: '?q=test',
          },
        },
        navigate: vi.fn(),
        subscribe: vi.fn(() => () => {}),
      };
      vi.mocked(useRouter).mockReturnValue(mockRouter as never);

      render(
        <SpatialShell mode="document" activeWorkspace="guide">
          <div>Search Results</div>
        </SpatialShell>,
      );

      expect(screen.getByTestId('console-dock-guide')).toHaveAttribute('data-active', 'true');
      expect(screen.getByTestId('console-dock-map')).toHaveAttribute('href', '/system/cygnus-a');
    });
  });

  describe('Bodies Drawer Mechanics', () => {
    const originalInnerWidth = window.innerWidth;

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: originalInnerWidth,
      });
    });

    it('initialises closed by default and toggles icon-only button via aria-label', () => {
      render(
        <SpatialShell bodies={<div data-testid="bodies-content">Bodies</div>} />,
      );

      const root = screen.getByTestId('spatial-shell-root');
      const toggleBtn = screen.getByTestId('spatial-shell-bodies-toggle');

      expect(root.getAttribute('data-bodies-drawer-open')).toBe('false');
      expect(toggleBtn).toHaveAttribute('aria-label', 'Objects in View');
      expect(toggleBtn.textContent).toBe('');
      expect(toggleBtn.querySelector('svg')).not.toBeNull();
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
      expect(toggleBtn).toBeEnabled();

      fireEvent.click(toggleBtn);

      expect(root.getAttribute('data-bodies-drawer-open')).toBe('true');
      expect(toggleBtn).toHaveAttribute('aria-label', 'Objects in View');
      expect(toggleBtn.textContent).toBe('');
      expect(toggleBtn.querySelector('svg')).not.toBeNull();
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
      expect(useUIStore.getState().activeDrawer).toBe('bodies');
      expect(screen.getByRole('heading', { level: 2, name: 'Objects in View' })).toBeInTheDocument();

      fireEvent.click(toggleBtn);

      expect(root.getAttribute('data-bodies-drawer-open')).toBe('false');
      expect(toggleBtn).toHaveAttribute('aria-label', 'Objects in View');
      expect(toggleBtn.textContent).toBe('');
      expect(toggleBtn.querySelector('svg')).not.toBeNull();
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
      expect(useUIStore.getState().activeDrawer).toBeNull();
    });

    it('disables Objects in View trigger when hasActiveBodies is false and drawer is closed', () => {
      render(
        <SpatialShell
          hasActiveBodies={false}
          bodies={<div data-testid="bodies-content">Bodies</div>}
        />,
      );

      const root = screen.getByTestId('spatial-shell-root');
      const toggleBtn = screen.getByTestId('spatial-shell-bodies-toggle');

      expect(toggleBtn).toBeDisabled();
      fireEvent.click(toggleBtn);
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('false');
      expect(useUIStore.getState().activeDrawer).toBeNull();
    });

    it('keeps Objects in View trigger enabled when hasActiveBodies is false while drawer is already open', () => {
      const onBodiesDrawerOpenChange = vi.fn();
      render(
        <SpatialShell
          hasActiveBodies={false}
          isBodiesDrawerOpen={true}
          onBodiesDrawerOpenChange={onBodiesDrawerOpenChange}
          bodies={<div data-testid="bodies-content">Bodies</div>}
        />,
      );

      const root = screen.getByTestId('spatial-shell-root');
      const toggleBtn = screen.getByTestId('spatial-shell-bodies-toggle');

      expect(root.getAttribute('data-bodies-drawer-open')).toBe('true');
      expect(toggleBtn).toBeEnabled();
      fireEvent.click(toggleBtn);
      expect(onBodiesDrawerOpenChange).toHaveBeenCalledWith(false);
    });

    it('closes drawer when clicking backdrop scrim or sticky close button', () => {
      render(
        <SpatialShell
          initialBodiesDrawerOpen
          bodies={<div data-testid="bodies-content">Bodies</div>}
        />,
      );

      const root = screen.getByTestId('spatial-shell-root');
      const closeBtn = screen.getByTestId('spatial-shell-bodies-close');
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('true');

      fireEvent.click(closeBtn);
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('false');
      expect(useUIStore.getState().activeDrawer).toBeNull();

      fireEvent.click(screen.getByTestId('spatial-shell-bodies-toggle'));
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('true');

      fireEvent.click(screen.getByTestId('spatial-shell-bodies-backdrop'));
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('false');
    });

    it('closes drawer on Escape key and right-swipe touch below 1280px, but ignores on >= 1280px', () => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1024 });

      render(
        <SpatialShell
          initialBodiesDrawerOpen
          bodies={<div data-testid="bodies-content">Bodies</div>}
        />,
      );

      const root = screen.getByTestId('spatial-shell-root');
      const bodiesAside = root.querySelector('[data-spatial-region="bodies"]')!;
      expect(bodiesAside).toHaveAttribute('aria-label', 'Objects in view');
      expect(screen.getByRole('heading', { level: 2, name: 'Objects in View' })).toBeInTheDocument();
      expect(screen.getByTestId('spatial-shell-bodies-close')).toHaveAttribute(
        'aria-label',
        'Close objects in view drawer',
      );
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('true');

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('false');

      fireEvent.click(screen.getByTestId('spatial-shell-bodies-toggle'));
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('true');

      // Diagonal swipe below 1.5x horizontal dominance ratio does not dismiss
      fireEvent.touchStart(bodiesAside, { touches: [{ clientX: 120, clientY: 200 }] });
      fireEvent.touchEnd(bodiesAside, { changedTouches: [{ clientX: 180, clientY: 250 }] });
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('true');

      fireEvent.touchStart(bodiesAside, { touches: [{ clientX: 120, clientY: 200 }] });
      fireEvent.touchEnd(bodiesAside, { changedTouches: [{ clientX: 190, clientY: 210 }] });
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('false');

      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1440 });
      fireEvent.click(screen.getByTestId('spatial-shell-bodies-toggle'));
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('true');

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('true');
    });

    it('auto-closes drawer below 1280px when selecting an entity link while keeping open for guide links or filter buttons', () => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });

      render(
        <SpatialShell
          initialBodiesDrawerOpen
          bodies={
            <div>
              <button type="button" data-testid="body-filter-btn">Filter</button>
              <a
                href="/guide/planet-types/rocky"
                data-testid="body-guide-link"
                onClick={(e) => e.preventDefault()}
              >
                Guide
              </a>
              <a
                href="/system/alpha?focus=beta"
                data-stretch-link="true"
                data-testid="body-entity-link"
                onClick={(e) => e.preventDefault()}
              >
                <span>Beta</span>
              </a>
              <button type="button" data-bodies-select="true" data-testid="body-select-btn">
                Select
              </button>
            </div>
          }
        />,
      );

      const root = screen.getByTestId('spatial-shell-root');
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('true');

      fireEvent.click(screen.getByTestId('body-filter-btn'));
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('true');

      fireEvent.click(screen.getByTestId('body-guide-link'));
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('true');

      fireEvent.click(screen.getByTestId('body-entity-link'));
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('false');

      fireEvent.click(screen.getByTestId('spatial-shell-bodies-toggle'));
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('true');
      fireEvent.click(screen.getByTestId('body-select-btn'));
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('false');
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

    it('sets data-camera-retracted directly on floating-left and minimap regions without relying on ancestor selector invalidation', () => {
      mockReducedMotion(false);
      render(<SpatialShell />);

      const root = screen.getByTestId('spatial-shell-root');
      const floatingLeft = root.querySelector('[data-spatial-region="floating-left"]');
      const minimap = root.querySelector('[data-spatial-region="minimap"]');

      expect(floatingLeft?.getAttribute('data-camera-retracted')).toBe('false');
      expect(minimap?.getAttribute('data-camera-retracted')).toBe('false');

      act(() => {
        useUIStore.getState().setCameraTransitioning(true);
      });
      expect(floatingLeft?.getAttribute('data-camera-retracted')).toBe('true');
      expect(minimap?.getAttribute('data-camera-retracted')).toBe('true');

      act(() => {
        useUIStore.getState().setCameraTransitioning(false);
      });
      expect(floatingLeft?.getAttribute('data-camera-retracted')).toBe('false');
      expect(minimap?.getAttribute('data-camera-retracted')).toBe('false');
    });

    it('memoizes SpatialShell so parent re-renders with identical slot props do not re-render children', () => {
      let renderCount = 0;
      const Probe = () => {
        renderCount += 1;
        return <div data-testid="probe" />;
      };
      const probeNode = <Probe />;

      const { rerender } = render(<SpatialShell detailsPanel={probeNode} />);
      expect(renderCount).toBe(1);

      rerender(<SpatialShell detailsPanel={probeNode} />);
      expect(renderCount).toBe(1);
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
          bodies={<div data-testid="obs-bodies">Bodies</div>}
        />,
      );

      const root = screen.getByTestId('spatial-shell-root');
      const topBar = root.querySelector('[data-spatial-region="top-bar"]');
      const floatingLeft = root.querySelector('[data-spatial-region="floating-left"]');
      const detailsCard = floatingLeft?.firstElementChild ?? null;
      const bodiesRegion = root.querySelector('[data-spatial-region="bodies"]');
      const leftColumn = topBar?.parentElement ?? null;

      setRect(root, { left: 0, top: 0, width: 1440, height: 900 });
      setRect(leftColumn, { left: 0, top: 0, width: 700, height: 800 });
      setRect(topBar, { left: 8, top: 8, width: 377, height: 60 });
      setRect(detailsCard, { left: 8, top: 76, width: 377, height: 420 });
      setRect(bodiesRegion, { left: 1008, top: 0, width: 432, height: 900 });

      expect(leftColumn).not.toBeNull();
      expect(observeSpy).not.toHaveBeenCalledWith(leftColumn);

      vi.useFakeTimers();
      try {
        act(() => {
          resizeCallback?.([], {} as ResizeObserver);
          vi.runAllTimers();
        });
      } finally {
        vi.useRealTimers();
      }

      expect(useUIStore.getState().viewportSafeRect).toEqual({
        top: 0,
        right: 432,
        bottom: 0,
        left: 385,
        width: 1440 - 385 - 432,
        height: 900,
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

      act(() => {
        useUIStore.getState().setDetailsDetent('full');
      });

      render(
        <SpatialShell
          breadcrumbs={<div data-testid="mob-breadcrumbs">Breadcrumbs</div>}
          detailsPanel={<div data-testid="full-sheet">Full Sheet</div>}
        />,
      );

      const root = screen.getByTestId('spatial-shell-root');
      const detentEl = screen.getByTestId('full-sheet');
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

  describe('Tier 1 & Tier 2 Interface Composition', () => {
    it('composes ConsoleDock inside Tier 2 Dock and DiscoverPanel inside Tier 2 Panel', () => {
      act(() => {
        useUIStore.getState().setDiscoverOpen(true);
      });

      render(<SpatialShell minimapOrientation={MOCK_ORIENTATION} />);

      const dockRegion = document.querySelector('[data-spatial-region="console-dock"]');
      const dockSurface = dockRegion?.querySelector('[data-position="floating"]');
      expect(dockSurface).not.toBeNull();
      expect(dockSurface).toHaveAttribute('data-padded', 'false');
      expect(dockSurface).toContainElement(screen.getByTestId('console-dock'));

      const floatingLeft = document.querySelector('[data-spatial-region="floating-left"]');
      const discoverPanelSurface = floatingLeft?.querySelector('[data-padding="tight"]');
      expect(discoverPanelSurface).not.toBeNull();
      expect(discoverPanelSurface).toContainElement(screen.getByTestId('discover-panel'));

      const discoverCloseBtn = screen.getByTestId('discover-close-button');
      expect(discoverCloseBtn.querySelector('svg')).not.toBeNull();
      expect(discoverCloseBtn.textContent).toBe('');

      const topBar = document.querySelector('[data-spatial-region="top-bar"]')!;
      const visorScale = document.querySelector('[data-spatial-region="visor-scale"]')!;
      expect(topBar.contains(visorScale)).toBe(false);
    });

    it('renders Objects in View trigger as subtle when closed, primary when open, and uses an SVG close icon in the drawer', () => {
      render(
        <SpatialShell bodies={<div data-testid="bodies-content">Bodies</div>} />,
      );

      const toggleBtn = screen.getByTestId('spatial-shell-bodies-toggle');
      expect(toggleBtn).toHaveAttribute('data-variant', 'subtle');
      expect(toggleBtn).toHaveAttribute('aria-label', 'Objects in View');
      expect(toggleBtn.querySelector('svg')).not.toBeNull();
      expect(toggleBtn.textContent).toBe('');

      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute('data-variant', 'primary');
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

      const closeBtn = screen.getByTestId('spatial-shell-bodies-close');
      expect(closeBtn.querySelector('svg')).not.toBeNull();
      expect(closeBtn.textContent).toBe('');
    });
  });
});
