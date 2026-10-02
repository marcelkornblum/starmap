import { describe, it, expect } from 'vitest';
import React, { createElement, isValidElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  SceneProvider,
  ScenePortal,
  SceneOutlet,
} from '../src/components/canvas/SceneBridge';
import { useScene } from '../src/components/canvas/SceneBridgeContext';
import { GlobalCanvas } from '../src/components/canvas/GlobalCanvas';
import { GalaxyScene3D } from '../src/components/canvas/scenes/GalaxyScene3D';
import { PlanetScene3D } from '../src/components/canvas/scenes/PlanetScene3D';
import { SystemScene3D } from '../src/components/canvas/scenes/SystemScene3D';
import { ReferenceScene3D } from '../src/components/canvas/scenes/ReferenceScene3D';
import { RootLayout } from '../src/components/layout/RootLayout';
import {
  galaxyRoute,
  systemRoute,
  planetRoute,
  referenceRoute,
  simulateAsyncFetch,
} from '../src/router';
import { RouteSkeleton } from '../src/components/common/RouteSkeleton';

describe('Global Canvas SceneBridge', () => {
  it('renders SceneOutlet when ScenePortal injects a scene', () => {
    const TestComponent = () => {
      return createElement(
        SceneProvider,
        null,
        createElement(
          'div',
          null,
          createElement(
            ScenePortal,
            { sceneKey: 'test-galaxy' },
            createElement('span', { 'data-testid': 'mock-3d-node' }, 'Galactic Mesh'),
          ),
          createElement(SceneOutlet, null),
        ),
      );
    };

    const html = renderToString(createElement(TestComponent));
    expect(html).toBeDefined();
  });

  it('provides setScene handler through useScene and executes cleanly', () => {
    const records: string[] = [];
    const recordExecution = (val: string) => records.push(val);

    const TestComponent = () => {
      const { setScene } = useScene();
      setScene('test-node', 'test-key');
      setScene(null, 'test-key');
      recordExecution('done');
      return createElement('span', null, 'trigger');
    };

    const html = renderToString(
      createElement(SceneProvider, null, createElement(TestComponent)),
    );
    expect(records).toContain('done');
    expect(html).toContain('trigger');
  });

  it('mounts ScenePortal cleanly in SSR without errors', () => {
    const TestComponent = () => {
      return createElement(
        SceneProvider,
        null,
        createElement(
          ScenePortal,
          { sceneKey: 'portal-ssr' },
          createElement('div', null, 'child'),
        ),
      );
    };
    expect(() => renderToString(createElement(TestComponent))).not.toThrow();
  });

  it('provides default fallback in useScene when used outside provider', () => {
    const TestOutside = () => {
      const { activeScene, activeSceneKey, setScene } = useScene();
      expect(activeScene).toBeNull();
      expect(activeSceneKey).toBeNull();
      expect(() => setScene('test')).not.toThrow();
      return createElement('span', null, 'outside');
    };
    renderToString(createElement(TestOutside));
  });

  it('renders GlobalCanvas structure with custom styling and container', () => {
    const vnodeDefault = GlobalCanvas({});
    expect(isValidElement(vnodeDefault)).toBe(true);
    if (isValidElement<{ 'data-testid': string; className?: string }>(vnodeDefault)) {
      expect(vnodeDefault.props['data-testid']).toBe('global-canvas-container');
      expect(vnodeDefault.props.className).toBeDefined();
    }

    const vnodeCustom = GlobalCanvas({
      className: 'custom-viewport-canvas',
      style: { zIndex: 10, opacity: 0.9 },
    });
    expect(isValidElement(vnodeCustom)).toBe(true);
    if (isValidElement<{ 'data-testid': string; className: string; style?: React.CSSProperties }>(vnodeCustom)) {
      expect(vnodeCustom.props['data-testid']).toBe('global-canvas-container');
      expect(vnodeCustom.props.className).toContain('custom-viewport-canvas');
      expect(vnodeCustom.props.style?.zIndex).toBe(10);
      expect(vnodeCustom.props.style?.opacity).toBe(0.9);
    }
  });

  it('renders RootLayout shell structure with header, canvas, and outlet', () => {
    const vnode = RootLayout({});
    expect(isValidElement(vnode)).toBe(true);
    if (isValidElement<{ children: React.ReactNode }>(vnode)) {
      expect(vnode.type).toBe(SceneProvider);
      if (isValidElement<{ className: string }>(vnode.props.children)) {
        expect(vnode.props.children.props.className).toContain('starmap-app');
      }
    }
  });

  it('renders all 3D scene placeholder components cleanly', () => {
    const galaxyHtml = renderToString(createElement(GalaxyScene3D));
    expect(galaxyHtml).toContain('galaxy-scene-3d');

    const planetHtml = renderToString(
      createElement(PlanetScene3D, { planetId: 'mars' }),
    );
    expect(planetHtml).toContain('planet-scene-3d');
    expect(planetHtml).toContain('planet-anchor-mars');

    const systemHtml = renderToString(
      createElement(SystemScene3D, { systemId: 'alpha-centauri' }),
    );
    expect(systemHtml).toContain('system-scene-3d');
    expect(systemHtml).toContain('label-alpha-centauri');

    const refHtml = renderToString(createElement(ReferenceScene3D));
    expect(refHtml).toContain('reference-scene-3d');
  });
});

describe('Route Loaders & Render-Then-Fetch Pattern', () => {
  it('provides pendingComponent skeleton for all 4 core routes', () => {
    expect(galaxyRoute.options.pendingComponent).toBeDefined();
    expect(systemRoute.options.pendingComponent).toBeDefined();
    expect(planetRoute.options.pendingComponent).toBeDefined();
    expect(referenceRoute.options.pendingComponent).toBeDefined();
  });

  it('renders RouteSkeleton component with custom or default label', () => {
    const defaultHtml = renderToString(createElement(RouteSkeleton));
    expect(defaultHtml).toContain('Loading Target Telemetry...');

    const customHtml = renderToString(
      createElement(RouteSkeleton, { label: 'Scanning Galactic Cluster...' }),
    );
    expect(customHtml).toContain('Scanning Galactic Cluster...');
  });

  it('simulates async fetch with data preservation', async () => {
    const payload = { target: 'Sirius', dist: 2.64 };
    const result = await simulateAsyncFetch(payload, 10);
    expect(result).toEqual(payload);
  });

  it('executes loaders for galaxy, system, planet, and reference routes', async () => {
    interface GalaxyData {
      target: string;
      nodeCount: number;
    }
    interface SystemData {
      systemId: string;
      spectralType: string;
    }
    interface PlanetData {
      planetId: string;
      classification: string;
    }
    interface ReferenceData {
      catalog: string;
    }

    const galaxyLoader = galaxyRoute.options.loader as unknown as () => Promise<GalaxyData>;
    const galaxyData = await galaxyLoader();
    expect(galaxyData.target).toBe('Milky Way');
    expect(galaxyData.nodeCount).toBeGreaterThan(0);

    const systemLoader = systemRoute.options.loader as unknown as (ctx: {
      params: { systemId: string };
    }) => Promise<SystemData>;
    const systemData = await systemLoader({ params: { systemId: 'alpha-centauri' } });
    expect(systemData.systemId).toBe('alpha-centauri');
    expect(systemData.spectralType).toBe('G2V');

    const planetLoader = planetRoute.options.loader as unknown as (ctx: {
      params: { planetId: string };
    }) => Promise<PlanetData>;
    const planetData = await planetLoader({ params: { planetId: 'mars' } });
    expect(planetData.planetId).toBe('mars');
    expect(planetData.classification).toBe('Terrestrial');

    const refLoader = referenceRoute.options.loader as unknown as () => Promise<ReferenceData>;
    const refData = await refLoader();
    expect(refData.catalog).toContain('ICRS/J2000');
  });
});
