// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SpatialShell } from './SpatialShell';
import { resolvePrimaryPanels } from './spatialShellHelpers';
import { useUIStore } from '../../../stores/useUIStore';

describe('SpatialShell Domain Component', () => {
  beforeEach(() => {
    useUIStore.getState().resetUI();
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

      expect(screen.getByTestId('slot-canvas')).toBeDefined();
      expect(screen.getByTestId('slot-breadcrumbs')).toBeDefined();
      expect(screen.getByTestId('slot-search')).toBeDefined();
      expect(screen.getByTestId('slot-layer-card')).toBeDefined();
      expect(screen.getByTestId('slot-details')).toBeDefined();
      expect(screen.getByTestId('slot-controls')).toBeDefined();
      expect(screen.getByTestId('slot-minimap')).toBeDefined();
      expect(screen.getByTestId('slot-bodies')).toBeDefined();
      expect(screen.getByTestId('slot-children')).toBeDefined();

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
      useUIStore.getState().setActiveDrawer('bodies');

      render(<SpatialShell bodies={<div>Bodies</div>} />);

      const root = screen.getByTestId('spatial-shell-root');
      expect(root.getAttribute('data-bodies-drawer-open')).toBe('true');
    });
  });

  describe('Primary Float Panel Resolution (resolvePrimaryPanels)', () => {
    it('returns primaryFloat if passed alone', () => {
      const result = resolvePrimaryPanels({
        primaryFloat: <div data-testid="legacy-float">Float</div>,
      });

      render(<div>{result}</div>);
      expect(screen.getByTestId('legacy-float')).toBeDefined();
    });

    it('returns detailsPanel when only detailsPanel is provided and open', () => {
      const result = resolvePrimaryPanels({
        detailsPanel: <div data-testid="details">Details</div>,
        isDetailsOpen: true,
      });

      render(<div>{result}</div>);
      expect(screen.getByTestId('details')).toBeDefined();
    });

    it('returns directionsPanel when only directionsPanel is provided and open', () => {
      const result = resolvePrimaryPanels({
        directionsPanel: <div data-testid="directions">Directions</div>,
        isDirectionsOpen: true,
      });

      render(<div>{result}</div>);
      expect(screen.getByTestId('directions')).toBeDefined();
    });

    it('respects primaryPanelPriority in single-panel mode', () => {
      const detailsResult = resolvePrimaryPanels({
        detailsPanel: <div data-testid="details">Details</div>,
        directionsPanel: <div data-testid="directions">Directions</div>,
        isDetailsOpen: true,
        isDirectionsOpen: true,
        primaryPanelPriority: 'details',
        dualPanelPolicy: 'single',
      });

      const { unmount } = render(<div>{detailsResult}</div>);
      expect(screen.getByTestId('details')).toBeDefined();
      expect(screen.queryByTestId('directions')).toBeNull();
      unmount();

      const directionsResult = resolvePrimaryPanels({
        detailsPanel: <div data-testid="details">Details</div>,
        directionsPanel: <div data-testid="directions">Directions</div>,
        isDetailsOpen: true,
        isDirectionsOpen: true,
        primaryPanelPriority: 'directions',
        dualPanelPolicy: 'single',
      });

      render(<div>{directionsResult}</div>);
      expect(screen.getByTestId('directions')).toBeDefined();
      expect(screen.queryByTestId('details')).toBeNull();
    });

    it('renders both panels when dualPanelPolicy is simultaneous', () => {
      const simultaneousResult = resolvePrimaryPanels({
        detailsPanel: <div data-testid="details">Details</div>,
        directionsPanel: <div data-testid="directions">Directions</div>,
        isDetailsOpen: true,
        isDirectionsOpen: true,
        dualPanelPolicy: 'simultaneous',
      });

      render(<div>{simultaneousResult}</div>);
      expect(screen.getByTestId('details')).toBeDefined();
      expect(screen.getByTestId('directions')).toBeDefined();
    });

    it('handles closed panel states cleanly', () => {
      const result = resolvePrimaryPanels({
        detailsPanel: <div data-testid="details">Details</div>,
        directionsPanel: <div data-testid="directions">Directions</div>,
        isDetailsOpen: false,
        isDirectionsOpen: false,
      });

      expect(result).toBeNull();
    });

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

      expect(screen.getByTestId('details')).toBeDefined();
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
      expect(screen.getByTestId('preview')).toBeDefined();
    });
  });
});
