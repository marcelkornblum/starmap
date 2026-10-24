import { describe, it, expect, beforeEach, vi } from 'vitest';
import React, { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  SpatialShell,
  CanvasLayer,
  Breadcrumbs,
  ControlBar,
  canMountWebGLCanvas,
  _resetWebGLSupportedForTesting,
} from '../src/components/domain';
import { Search } from '../src/components/search';
import { GalaxyView } from '../src/views/GalaxyView';
import { SystemView } from '../src/views/SystemView';
import { PlanetView } from '../src/views/PlanetView';
import { SpatialEntityProvider } from '../src/components/canvas/entity/SpatialEntityContext';
import { createSpatialEntityStore } from '../src/components/canvas/entity/SpatialEntityStore';
import type { CompactSearchEntry } from '../src/utils/compactDataCodec';

vi.mock('@react-three/drei', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/drei')>();
  return {
    ...actual,
    Html: ({ children, 'data-testid': testId }: { children: React.ReactNode; 'data-testid'?: string }) =>
      createElement('div', { 'data-testid': testId ?? 'drei-html' }, children),
    OrbitControls: () => createElement('div', { 'data-testid': 'orbit-controls' }),
    Sphere: ({ children }: { children?: React.ReactNode }) =>
      createElement('mesh', null, children),
  };
});

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    Canvas: ({ children }: { children?: React.ReactNode }) =>
      createElement('div', { 'data-testid': 'mock-canvas' }, children),
    useFrame: vi.fn(),
    useThree: () => ({
      camera: { position: [0, 0, 10], up: [0, 1, 0], fov: 45 },
      gl: { setClearColor: vi.fn() },
      scene: {},
      controls: { target: [0, 0, 0], update: vi.fn() },
    }),
  };
});

const SAMPLE_CORPUS: readonly CompactSearchEntry[] = [
  {
    i: 'sol',
    n: 'Sol',
    k: 1,
    p: [0, 0, 0],
    m: [-26.74, 'G2V', 8, 1],
  },
  {
    i: 'earth',
    n: 'Earth',
    k: 2,
    s: 'sol',
    p: [0, 0, 0],
    u: 'terrestrial',
    z: 1,
  },
];

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

describe('SpatialShell Component & View Integration Suite', () => {
  beforeEach(() => {
    _resetWebGLSupportedForTesting();
  });

  describe('<SpatialShell /> Region Landmarks', () => {
    it('renders all 7 spatial regions and root shell landmark', () => {
      const html = renderToString(
        <SpatialShell
          testId="test-shell"
          canvas={<div data-testid="mock-canvas-content">Canvas</div>}
          breadcrumbs={<nav data-testid="mock-breadcrumbs">Breadcrumbs</nav>}
          search={<div data-testid="mock-search">Search</div>}
          layerCard={<div data-testid="mock-layer-card">LayerCard</div>}
          primaryFloat={<div data-testid="mock-primary-float">Primary Float</div>}
          preview={<div data-testid="mock-preview">Preview</div>}
          controls={<div data-testid="mock-controls">Controls</div>}
          minimap={<div data-testid="mock-minimap">Minimap</div>}
          bodies={<div data-testid="mock-bodies">Bodies</div>}
        />,
      );

      expect(html).toContain('data-testid="test-shell"');
      expect(html).toContain('data-spatial-shell');
      expect(html).toContain('data-spatial-region="canvas"');
      expect(html).toContain('data-spatial-region="top-bar"');
      expect(html).toContain('data-spatial-region="floating-left"');
      expect(html).toContain('data-spatial-region="controls"');
      expect(html).toContain('data-spatial-region="minimap"');
      expect(html).toContain('data-spatial-region="bodies"');

      expect(html).toContain('data-testid="mock-canvas-content"');
      expect(html).toContain('data-testid="mock-breadcrumbs"');
      expect(html).toContain('data-testid="mock-search"');
      expect(html).toContain('data-testid="mock-layer-card"');
      expect(html).toContain('data-testid="mock-primary-float"');
      expect(html).toContain('data-testid="mock-preview"');
      expect(html).toContain('data-testid="mock-controls"');
      expect(html).toContain('data-testid="mock-minimap"');
      expect(html).toContain('data-testid="mock-bodies"');
    });

    it('renders all regions even when slot props are omitted', () => {
      const html = renderToString(<SpatialShell testId="empty-shell" />);

      expect(html).toContain('data-testid="empty-shell"');
      expect(html).toContain('data-spatial-shell');
      expect(html).toContain('data-spatial-region="canvas"');
      expect(html).toContain('data-spatial-region="top-bar"');
      expect(html).toContain('data-spatial-region="floating-left"');
      expect(html).toContain('data-spatial-region="controls"');
      expect(html).toContain('data-spatial-region="minimap"');
      expect(html).toContain('data-spatial-region="bodies"');
    });
  });

  describe('Bodies Drawer Toggle Behavior', () => {
    it('is minimised by default and sets data-bodies-drawer-open="false" and aria-expanded="false"', () => {
      const html = renderToString(
        <SpatialShell
          testId="drawer-shell"
          bodies={<div data-testid="bodies-content">Drawer Content</div>}
        />,
      );

      expect(html).toContain('data-spatial-region="bodies"');
      expect(html).toContain('data-bodies-drawer-open="false"');
      expect(html).toContain('data-testid="spatial-shell-bodies-toggle"');
      expect(html).toContain('aria-expanded="false"');
      // Bodies content remains mounted in the DOM when drawer is minimised
      expect(html).toContain('data-testid="bodies-content"');
    });

    it('supports initialBodiesDrawerOpen="true" and reflects open state in attributes', () => {
      const html = renderToString(
        <SpatialShell
          testId="drawer-shell-open"
          initialBodiesDrawerOpen={true}
          bodies={<div data-testid="bodies-content">Drawer Content</div>}
        />,
      );

      expect(html).toContain('data-bodies-drawer-open="true"');
      expect(html).toContain('aria-expanded="true"');
      expect(html).toContain('data-testid="bodies-content"');
    });

    it('provides interactive click handlers for the toggle button and backdrop scrim', () => {
      let capturedEl: any = null;
      function Harness() {
        capturedEl = SpatialShell({
          testId: 'interactive-drawer-shell',
          bodies: <div data-testid="bodies-content">Drawer Content</div>,
        });
        return capturedEl;
      }

      renderToString(<Harness />);
      expect(capturedEl).not.toBeNull();

      const toggleBtn = findReactElementByTestId(capturedEl, 'spatial-shell-bodies-toggle');
      const backdrop = findReactElementByTestId(capturedEl, 'spatial-shell-bodies-backdrop');

      expect(toggleBtn).not.toBeNull();
      expect(backdrop).not.toBeNull();
      expect(toggleBtn.props['data-testid']).toBe('spatial-shell-bodies-toggle');
      expect(backdrop.props['data-testid']).toBe('spatial-shell-bodies-backdrop');

      // Exercise click handlers
      expect(() => toggleBtn.props.onClick()).not.toThrow();
      expect(() => backdrop.props.onClick()).not.toThrow();
    });
  });

  describe('Search Focus Expansion Behavior', () => {
    it('renders search panel collapsed by default in spatial scopes and expanded in search scope', () => {
      const store = createSpatialEntityStore();
      const galaxyHtml = renderToString(
        <SpatialEntityProvider store={store}>
          <Search.Root initialCorpus={SAMPLE_CORPUS} syncUrl={false}>
            <Search.Panel scope="galaxy" />
            <Search.Results />
          </Search.Root>
        </SpatialEntityProvider>,
      );

      expect(galaxyHtml).toContain('data-testid="search-root"');
      expect(galaxyHtml).toContain('data-search-focused="false"');

      const searchHtml = renderToString(
        <SpatialEntityProvider store={store}>
          <Search.Root initialCorpus={SAMPLE_CORPUS} syncUrl={false}>
            <Search.Panel scope="search" />
            <Search.Results />
          </Search.Root>
        </SpatialEntityProvider>,
      );

      expect(searchHtml).toContain('data-scope="search"');
      expect(searchHtml).toContain('data-search-focused="true"');
      expect(searchHtml).toContain('data-testid="search-expanded-drawer"');
    });

    it('handles focusCapture and blurCapture events to manage focus expansion state', () => {
      let rootChildEl: any = null;
      function RootProbe() {
        const rootInstance = Search.Root({
          initialCorpus: SAMPLE_CORPUS,
          syncUrl: false,
          children: <div data-testid="probe-child" />,
        }) as any;
        rootChildEl = findReactElementByTestId(rootInstance, 'search-root');
        return rootInstance;
      }

      renderToString(<RootProbe />);
      expect(rootChildEl).not.toBeNull();
      expect(rootChildEl.props['data-testid']).toBe('search-root');
      expect(rootChildEl.props['data-search-focused']).toBe('false');

      // Exercise onFocusCapture
      expect(() => rootChildEl.props.onFocusCapture()).not.toThrow();

      // Exercise onBlurCapture when relatedTarget is outside currentTarget
      const dummyBlurOutside = {
        relatedTarget: null,
        currentTarget: { contains: () => false },
      };
      expect(() => rootChildEl.props.onBlurCapture(dummyBlurOutside)).not.toThrow();

      // Exercise onBlurCapture when relatedTarget is inside currentTarget
      const dummyBlurInside = {
        relatedTarget: {},
        currentTarget: { contains: () => true },
      };
      expect(() => rootChildEl.props.onBlurCapture(dummyBlurInside)).not.toThrow();
    });
  });

  describe('<CanvasLayer /> and WebGL mounting', () => {
    it('returns false for canMountWebGLCanvas in non-browser/node environment', () => {
      expect(canMountWebGLCanvas()).toBe(false);
    });

    it('renders CanvasLayer container with telemetry data attributes', () => {
      const html = renderToString(
        <CanvasLayer
          scope="galaxy"
          centerId="sol"
          centerCoordinates={[1, 2, 3]}
          cameraAzimuthDeg={45}
          cameraElevationDeg={30}
          cameraDistance={15}
          activeJourneyMethod="direct-subspace"
        />,
      );

      expect(html).toContain('data-testid="canvas-layer"');
      expect(html).toContain('data-scope="galaxy"');
      expect(html).toContain('data-center-id="sol"');
      expect(html).toContain('data-center-coords="1,2,3"');
      expect(html).toContain('data-camera-az="45"');
      expect(html).toContain('data-camera-el="30"');
      expect(html).toContain('data-camera-dist="15"');
      expect(html).toContain('data-journey-method="direct-subspace"');
    });
  });

  describe('View Integration with <SpatialShell />', () => {
    it('renders GalaxyView inside <SpatialShell> with galaxy-view-root and all landmarks', () => {
      const store = createSpatialEntityStore();
      const html = renderToString(
        <SpatialEntityProvider store={store}>
          <GalaxyView
            initialCorpus={SAMPLE_CORPUS}
            locationPathname="/galaxy"
            locationSearch="?dist=20"
          />
        </SpatialEntityProvider>,
      );

      expect(html).toContain('data-testid="galaxy-view-root"');
      expect(html).toContain('data-spatial-shell');

      expect(html).toContain('data-spatial-region="canvas"');
      expect(html).toContain('data-spatial-region="top-bar"');
      expect(html).toContain('data-spatial-region="floating-left"');
      expect(html).toContain('data-spatial-region="controls"');
      expect(html).toContain('data-spatial-region="minimap"');
      expect(html).toContain('data-spatial-region="bodies"');

      expect(html).toContain('data-testid="canvas-layer"');
      expect(html).toContain('data-testid="view-breadcrumbs"');
      expect(html).toContain('data-testid="control-bar"');
      expect(html).toContain('data-testid="search-panel"');
      expect(html).toContain('data-testid="bodies-panel"');
    });

    it('renders SystemView inside <SpatialShell> with system-view-root and all landmarks', () => {
      const store = createSpatialEntityStore();
      const html = renderToString(
        <SpatialEntityProvider store={store}>
          <SystemView
            initialCorpus={SAMPLE_CORPUS}
            locationPathname="/system/sol"
          />
        </SpatialEntityProvider>,
      );

      expect(html).toContain('data-testid="system-view-root"');
      expect(html).toContain('data-spatial-shell');

      expect(html).toContain('data-spatial-region="canvas"');
      expect(html).toContain('data-spatial-region="top-bar"');
      expect(html).toContain('data-spatial-region="floating-left"');
      expect(html).toContain('data-spatial-region="controls"');
      expect(html).toContain('data-spatial-region="minimap"');
      expect(html).toContain('data-spatial-region="bodies"');

      expect(html).toContain('data-testid="canvas-layer"');
      expect(html).toContain('data-testid="view-breadcrumbs"');
      expect(html).toContain('data-testid="control-bar"');
      expect(html).toContain('data-testid="bodies-panel"');
    });

    it('renders PlanetView inside <SpatialShell> with planet-view-root and all landmarks', () => {
      const store = createSpatialEntityStore();
      const html = renderToString(
        <SpatialEntityProvider store={store}>
          <PlanetView
            initialCorpus={SAMPLE_CORPUS}
            locationPathname="/planet/earth"
          />
        </SpatialEntityProvider>,
      );

      expect(html).toContain('data-testid="planet-view-root"');
      expect(html).toContain('data-spatial-shell');

      expect(html).toContain('data-spatial-region="canvas"');
      expect(html).toContain('data-spatial-region="top-bar"');
      expect(html).toContain('data-spatial-region="floating-left"');
      expect(html).toContain('data-spatial-region="controls"');
      expect(html).toContain('data-spatial-region="minimap"');
      expect(html).toContain('data-spatial-region="bodies"');

      expect(html).toContain('data-testid="canvas-layer"');
      expect(html).toContain('data-testid="view-breadcrumbs"');
      expect(html).toContain('data-testid="control-bar"');
      expect(html).toContain('data-testid="bodies-panel"');
    });
  });

  describe('<Breadcrumbs> Persistent Galaxy / Guide Mode Navigation', () => {
    it('renders Galaxy as active and Guide as companion on map/galaxy views', () => {
      const html = renderToString(
        <Breadcrumbs items={[{ label: 'Galaxy' }, { label: 'Sol' }]} />,
      );

      expect(html).toContain('data-testid="breadcrumbs-mode-menu"');
      expect(html).toContain('aria-label="Primary mode"');

      // Galaxy is active
      expect(html).toContain('href="/galaxy"');
      expect(html).toContain('aria-current="page"');
      expect(html).toContain('data-active="true"');
      expect(html).toContain('data-variant="primary"');

      // Guide is inactive companion
      expect(html).toContain('href="/guide/star-types"');
      expect(html).toContain('data-testid="breadcrumbs-companion-link"');
      expect(html).toContain('data-variant="subtle"');
    });

    it('renders Guide as active and Galaxy as companion on guide views', () => {
      const html = renderToString(
        <Breadcrumbs
          items={[
            { label: 'Guide', href: '/guide/star-types' },
            { label: 'Star Types' },
          ]}
        />,
      );

      expect(html).toContain('data-testid="breadcrumbs-mode-menu"');

      // Guide is active
      expect(html).toContain('href="/guide/star-types"');
      expect(html).toContain('aria-current="page"');
      expect(html).toContain('data-active="true"');
      expect(html).toContain('data-variant="primary"');

      // Galaxy is inactive companion
      expect(html).toContain('href="/galaxy"');
      expect(html).toContain('data-testid="breadcrumbs-companion-link"');
      expect(html).toContain('data-variant="subtle"');
    });

    it('returns null for empty items', () => {
      const html = renderToString(<Breadcrumbs items={[]} />);
      expect(html).toBe('');
    });
  });

  describe('<ControlBar> Mobile Minimization', () => {
    it('renders compact icon toggle button and data-mobile-expanded state attribute', () => {
      const html = renderToString(<ControlBar scope="galaxy" />);

      expect(html).toContain('data-testid="control-bar"');
      expect(html).toContain('data-mobile-expanded="false"');
      expect(html).toContain('data-testid="control-bar-mobile-toggle"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain('aria-label="Expand controls"');

      // Full controls are present in DOM for hydration / CSS visibility toggling
      expect(html).toContain('data-testid="control-bar-time-controller"');
      expect(html).toContain('data-testid="control-bar-mode-group"');
    });
  });
});
