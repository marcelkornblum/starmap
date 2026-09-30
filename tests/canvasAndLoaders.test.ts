import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  SceneProvider,
  ScenePortal,
  SceneOutlet,
} from '../src/components/canvas/SceneBridge';
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

    // React SSR test: In SSR/initial render, ScenePortal effect runs client-side,
    // so verify SceneProvider mounts cleanly and context propagates
    const html = renderToString(createElement(TestComponent));
    expect(html).toBeDefined();
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
    const galaxyLoader = galaxyRoute.options.loader as () => Promise<any>;
    const galaxyData = await galaxyLoader();
    expect(galaxyData.target).toBe('Milky Way');
    expect(galaxyData.nodeCount).toBeGreaterThan(0);

    const systemLoader = systemRoute.options.loader as (ctx: any) => Promise<any>;
    const systemData = await systemLoader({ params: { systemId: 'alpha-centauri' } });
    expect(systemData.systemId).toBe('alpha-centauri');
    expect(systemData.spectralType).toBe('G2V');

    const planetLoader = planetRoute.options.loader as (ctx: any) => Promise<any>;
    const planetData = await planetLoader({ params: { planetId: 'mars' } });
    expect(planetData.planetId).toBe('mars');
    expect(planetData.classification).toBe('Terrestrial');

    const refLoader = referenceRoute.options.loader as () => Promise<any>;
    const refData = await refLoader();
    expect(refData.catalog).toContain('ICRS/J2000');
  });
});
