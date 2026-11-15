import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { SpatialShell } from './SpatialShell';
import { useUIStore } from '../../../stores/useUIStore';

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
});
