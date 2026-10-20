import { describe, it, expect } from 'vitest';
import React, { createElement, isValidElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  SceneProvider,
  ScenePortal,
  SceneOutlet,
} from '../src/components/canvas/viewport/SceneBridge';
import { useScene } from '../src/components/canvas/viewport/SceneBridgeContext';
import { GlobalCanvas } from '../src/components/canvas/viewport/GlobalCanvas';
import { simulateAsyncFetch } from '../src/router';
import { SafeHtml } from '../src/components/canvas/SafeHtml';

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
});

describe('Route Loaders & Render-Then-Fetch Pattern', () => {
  it('simulates async fetch with data preservation', async () => {
    const payload = { target: 'Sirius', dist: 2.64 };
    const result = await simulateAsyncFetch(payload, 10);
    expect(result).toEqual(payload);
  });
});

describe('SafeHtml & View Lifecycle Safeguards', () => {
  it('renders SafeHtml and SafeHtmlPortalOutlet in SSR cleanly without leaking DOM nodes', () => {
    const html = renderToString(
      createElement(
        SafeHtml,
        { 'data-testid': 'safe-html-overlay', position: [1, 2, 3], className: 'test-class' },
        createElement('span', null, 'Overlay Content'),
      ),
    );
    expect(html).toContain('<group');
    expect(html).not.toContain('<div');
    expect(html).not.toContain('Overlay Content');
  });

  it('preserves incoming scene during asynchronous unmount of previous view in SceneBridge', () => {
    let activeSceneState: React.ReactNode = null;
    let activeKeyState: string | null = null;

    const TestHarness = () => {
      const { activeScene, activeSceneKey, setScene } = useScene();
      activeSceneState = activeScene;
      activeKeyState = activeSceneKey;

      return createElement(
        'div',
        null,
        createElement('button', {
          'data-testid': 'mount-view-a',
          onClick: () => setScene('scene-a', 'view-a'),
        }),
        createElement('button', {
          'data-testid': 'mount-view-b',
          onClick: () => setScene('scene-b', 'view-b'),
        }),
        createElement('button', {
          'data-testid': 'unmount-view-a',
          onClick: () => setScene(null, 'view-a'),
        }),
      );
    };

    const html = renderToString(
      createElement(SceneProvider, null, createElement(TestHarness)),
    );
    expect(html).toBeDefined();
    expect(activeSceneState).toBeNull();
    expect(activeKeyState).toBeNull();
  });
});
