import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import React, { createElement } from 'react';
import { render, screen, act } from '@testing-library/react';
import * as THREE from 'three';
import { CanvasLayer } from './CanvasLayer';
import { _resetWebGLSupportedForTesting } from './webglSupport.testing';
import { RootCanvasHost } from './RootCanvasHost';
import { useCanvasStageStore } from '../../../stores/useCanvasStageStore';
import { getStageCallbacks } from '../../../stores/canvasStageCallbacks';
import { useCameraStore } from '../../../stores/useCameraStore';
import {
  CanvasRouterBridgeContext,
  type AppRouterAdapter,
} from '../../../hooks/useSpaLocation';

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

vi.mock('../../canvas/scenes/GalacticSceneEntry', () => ({
  default: () => createElement('div', { 'data-testid': 'mock-galactic-scene' }),
  GalacticSceneContent: () => createElement('div', { 'data-testid': 'mock-galactic-scene' }),
}));

vi.mock('../../canvas/scenes/SystemSceneEntry', () => ({
  default: () => createElement('div', { 'data-testid': 'mock-system-scene' }),
  SystemSceneContent: () => createElement('div', { 'data-testid': 'mock-system-scene' }),
}));

vi.mock('../../canvas/scenes/PlanetarySceneEntry', () => ({
  default: () => createElement('div', { 'data-testid': 'mock-planetary-scene' }),
  PlanetarySceneContent: () => createElement('div', { 'data-testid': 'mock-planetary-scene' }),
}));

vi.mock('../../canvas/SceneTokenBridge', () => ({
  SceneTokenBridge: () => createElement('div', { 'data-testid': 'mock-theme-token-bridge' }),
}));

const mockCanvasRender = vi.fn();

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    Canvas: ({
      children,
      className,
      frameloop,
    }: {
      children?: React.ReactNode;
      className?: string;
      frameloop?: string;
    }) => {
      mockCanvasRender();
      return createElement(
        'div',
        { 'data-testid': 'mock-canvas', 'data-frameloop': frameloop, className },
        children,
      );
    },
    useFrame: vi.fn(),
    useThree: (selector?: (s: unknown) => unknown) => {
      const state = {
        camera: new THREE.PerspectiveCamera(45, 1, 0.1, 1000),
        gl: { setClearColor: vi.fn() },
        scene: new THREE.Scene(),
        controls: { target: new THREE.Vector3(), update: vi.fn() },
      };
      return selector ? selector(state) : state;
    },
  };
});

describe('RootCanvasHost Domain Component', () => {
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    act(() => {
      useCanvasStageStore.getState().resetCanvasStageStore();
      useCameraStore.getState().reset();
    });
    _resetWebGLSupportedForTesting();
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    _resetWebGLSupportedForTesting();
  });

  it('does NOT mount CanvasLayer or WebGL on cold load when activeSlotCount === 0, while keeping root-canvas-host and telemetry mounted', () => {
    expect(useCanvasStageStore.getState().isRootCanvasMounted).toBe(false);
    expect(useCanvasStageStore.getState().activeSlotCount).toBe(0);

    const { unmount } = render(<RootCanvasHost />);

    expect(useCanvasStageStore.getState().isRootCanvasMounted).toBe(true);
    const host = screen.getByTestId('root-canvas-host');
    expect(host).toBeDefined();
    expect(host.getAttribute('data-stage-inactive')).toBe('true');

    // Camera telemetry attributes
    expect(host.getAttribute('data-camera-mode')).toBe('perspective');
    expect(host.getAttribute('data-camera-pos')).toBe('0.00,0.00,10.00');
    expect(host.getAttribute('data-camera-target')).toBe('0.00,0.00,0.00');
    expect(host.getAttribute('data-camera-dist')).toBe('10.00');

    // Cold non-spatial load must NOT mount root CanvasLayer or <Canvas>
    expect(screen.queryByTestId('canvas-layer')).toBeNull();
    expect(screen.queryByTestId('mock-canvas')).toBeNull();

    unmount();
    expect(useCanvasStageStore.getState().isRootCanvasMounted).toBe(false);
  });

  it('renders with data-slot="true" and immediately syncs onInspect / onSelect callbacks into useCanvasStageStore when RootCanvasHost is mounted', () => {
    const handleInspect = vi.fn();
    const handleSelect = vi.fn();

    render(
      <div>
        <RootCanvasHost />
        <CanvasLayer
          scope="galaxy"
          centerId="sol"
          onInspect={handleInspect}
          onSelect={handleSelect}
        />
      </div>,
    );

    const slot = screen.getByTestId('canvas-layer-slot');
    expect(slot).toBeDefined();
    expect(slot.getAttribute('data-slot')).toBe('true');

    const stageProps = useCanvasStageStore.getState().stageProps;
    expect(stageProps).not.toBeNull();
    expect('onInspect' in (stageProps ?? {})).toBe(false);
    expect('onSelect' in (stageProps ?? {})).toBe(false);

    const callbacks = getStageCallbacks();
    expect(callbacks.onInspect).toBe(handleInspect);
    expect(callbacks.onSelect).toBe(handleSelect);

    // Verify callbacks route correctly
    callbacks.onInspect?.('alpha-centauri');
    expect(handleInspect).toHaveBeenCalledTimes(1);
    expect(handleInspect).toHaveBeenCalledWith('alpha-centauri');

    callbacks.onSelect?.('sol');
    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith('sol');
  });

  it('updates persistent <RootCanvasHost /> when a view slot changes stageProps', () => {
    const { rerender } = render(
      <div>
        <RootCanvasHost />
        <CanvasLayer
          scope="galaxy"
          centerId="sol"
        />
      </div>,
    );

    const host = screen.getByTestId('root-canvas-host');
    const slot = screen.getByTestId('canvas-layer-slot');

    expect(host).toBeDefined();
    expect(host.getAttribute('data-stage-inactive')).toBeNull();
    expect(slot.getAttribute('data-scope')).toBe('galaxy');

    // Now view transitions to system scope
    rerender(
      <div>
        <RootCanvasHost />
        <CanvasLayer
          scope="system"
          targetId="alpha-centauri"
          centerId="alpha-centauri"
        />
      </div>,
    );

    const updatedSlot = screen.getByTestId('canvas-layer-slot');
    expect(updatedSlot.getAttribute('data-scope')).toBe('system');
    expect(updatedSlot.getAttribute('data-target-id')).toBe('alpha-centauri');

    // The stage store is updated
    expect(useCanvasStageStore.getState().stageProps?.scope).toBe('system');
    expect(useCanvasStageStore.getState().stageProps?.targetId).toBe('alpha-centauri');
  });

  it('maintains a single persistent <Canvas> element when RootCanvasHost transitions across scopes via stageProps', async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
      if (contextId === 'webgl2' || contextId === 'webgl') {
        return {} as WebGLRenderingContext;
      }
      return null;
    });
    _resetWebGLSupportedForTesting();

    act(() => {
      useCanvasStageStore.getState().mountSlot();
      useCanvasStageStore.getState().setStageProps({
        scope: 'galaxy',
        centerId: 'sol',
      });
    });

    render(<RootCanvasHost />);

    const canvasGalaxy = await screen.findByTestId('mock-canvas');
    expect(canvasGalaxy).toBeDefined();

    act(() => {
      useCanvasStageStore.getState().setStageProps({
        scope: 'system',
        targetId: 'sol',
        centerId: 'sol',
      });
    });

    const canvasSystem = await screen.findByTestId('mock-canvas');
    expect(canvasSystem).toBe(canvasGalaxy);

    act(() => {
      useCanvasStageStore.getState().setStageProps({
        scope: 'planet',
        targetId: 'earth',
      });
    });

    const canvasPlanet = await screen.findByTestId('mock-canvas');
    expect(canvasPlanet).toBe(canvasGalaxy);
  });

  it('updates data-camera-* DOM attributes imperatively without re-rendering CanvasLayer or child tree', async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
      if (contextId === 'webgl2' || contextId === 'webgl') {
        return {} as WebGLRenderingContext;
      }
      return null;
    });
    _resetWebGLSupportedForTesting();

    act(() => {
      useCanvasStageStore.getState().mountSlot();
      useCanvasStageStore.getState().setStageProps({ scope: 'galaxy', centerId: 'sol' });
    });

    render(<RootCanvasHost />);
    const host = screen.getByTestId('root-canvas-host');
    await screen.findByTestId('mock-canvas');

    expect(host.getAttribute('data-camera-pos')).toBe('0.00,0.00,10.00');
    expect(host.getAttribute('data-camera-target')).toBe('0.00,0.00,0.00');
    expect(host.getAttribute('data-camera-dist')).toBe('10.00');

    mockCanvasRender.mockClear();
    const useMemoSpy = vi.spyOn(React, 'useMemo');

    act(() => {
      useCameraStore.getState().setCameraPose({
        position: [12.5, 23.4, 34.5],
        target: [1.1, 2.2, 3.3],
        up: [0, 1, 0],
        zoom: 1,
        focalDistance: 45.67,
      });
    });

    expect(host.getAttribute('data-camera-pos')).toBe('12.50,23.40,34.50');
    expect(host.getAttribute('data-camera-target')).toBe('1.10,2.20,3.30');
    expect(host.getAttribute('data-camera-dist')).toBe('45.67');

    // Neither RootCanvasHost nor child tree re-rendered
    expect(useMemoSpy).not.toHaveBeenCalled();
    expect(mockCanvasRender).not.toHaveBeenCalled();
    useMemoSpy.mockRestore();
  });

  it('latches WebGL host off on cold load (activeSlotCount === 0), mounts on first activeSlotCount > 0, and stays mounted with frameloop="never" when returning to 0', async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
      if (contextId === 'webgl2' || contextId === 'webgl') {
        return {} as WebGLRenderingContext;
      }
      return null;
    });
    _resetWebGLSupportedForTesting();

    const { rerender } = render(
      <div>
        <RootCanvasHost />
      </div>,
    );

    expect(screen.getByTestId('root-canvas-host').getAttribute('data-stage-inactive')).toBe('true');
    expect(screen.queryByTestId('canvas-layer')).toBeNull();
    expect(screen.queryByTestId('mock-canvas')).toBeNull();

    // Mount a route slot -> activates latch and mounts WebGL + galactic scene
    rerender(
      <div>
        <RootCanvasHost />
        <CanvasLayer scope="galaxy" centerId="sol" />
      </div>,
    );

    const persistentCanvas = await screen.findByTestId('mock-canvas');
    expect(screen.getByTestId('canvas-layer')).toBeInTheDocument();
    expect(persistentCanvas.getAttribute('data-frameloop')).toBe('demand');
    expect(screen.getByTestId('mock-theme-token-bridge')).toBeInTheDocument();
    expect(await screen.findByTestId('mock-galactic-scene')).toBeInTheDocument();

    // Navigate away to non-spatial route (slot unmounts) -> stays latched & mounted with frameloop="never"
    rerender(
      <div>
        <RootCanvasHost />
      </div>,
    );

    expect(screen.getByTestId('root-canvas-host').getAttribute('data-stage-inactive')).toBe('true');
    expect(screen.getByTestId('canvas-layer')).toBeInTheDocument();
    expect(screen.getByTestId('mock-canvas')).toBe(persistentCanvas);
    expect(persistentCanvas.getAttribute('data-frameloop')).toBe('never');
    expect(screen.getByTestId('mock-theme-token-bridge')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-galactic-scene')).toBeNull();

    // Return to spatial route with identical stageProps -> transitions back to demand and remounts scene
    rerender(
      <div>
        <RootCanvasHost />
        <CanvasLayer scope="galaxy" centerId="sol" />
      </div>,
    );

    expect(screen.getByTestId('mock-canvas')).toBe(persistentCanvas);
    expect(persistentCanvas.getAttribute('data-frameloop')).toBe('demand');
    expect(await screen.findByTestId('mock-galactic-scene')).toBeInTheDocument();
  });

  it('keeps RootCanvasHost active during spatial-to-spatial Suspense transitions (activeSlotCount === 0 on /system/sol with stageProps), and deactivates on /guide', async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
      if (contextId === 'webgl2' || contextId === 'webgl') {
        return {} as WebGLRenderingContext;
      }
      return null;
    });
    _resetWebGLSupportedForTesting();

    let currentPathname = '/galaxy';
    const historyListeners = new Set<() => void>();
    const mockRouter: AppRouterAdapter = {
      get state() {
        return { location: { pathname: currentPathname, searchStr: '' } };
      },
      history: {
        subscribe: (cb) => {
          historyListeners.add(cb);
          return () => historyListeners.delete(cb);
        },
      },
    };

    const { rerender } = render(
      <CanvasRouterBridgeContext.Provider value={mockRouter}>
        <RootCanvasHost />
        <CanvasLayer scope="galaxy" centerId="sol" />
      </CanvasRouterBridgeContext.Provider>,
    );

    const persistentCanvas = await screen.findByTestId('mock-canvas');
    expect(screen.getByTestId('root-canvas-host').getAttribute('data-stage-inactive')).toBeNull();
    expect(persistentCanvas.getAttribute('data-frameloop')).toBe('demand');

    // Simulate Suspense suspending the outgoing GalaxyView slot while router has moved to /system/sol
    act(() => {
      currentPathname = '/system/sol';
      for (const listener of historyListeners) listener();
    });

    rerender(
      <CanvasRouterBridgeContext.Provider value={mockRouter}>
        <RootCanvasHost />
      </CanvasRouterBridgeContext.Provider>,
    );

    expect(useCanvasStageStore.getState().activeSlotCount).toBe(0);
    expect(useCanvasStageStore.getState().stageProps).not.toBeNull();
    expect(screen.getByTestId('root-canvas-host').getAttribute('data-stage-inactive')).toBeNull();
    expect(persistentCanvas.getAttribute('data-frameloop')).toBe('demand');
    expect(await screen.findByTestId('mock-galactic-scene')).toBeInTheDocument();

    // Navigating to a non-spatial route (/guide) marks stage inactive and pauses frameloop
    act(() => {
      currentPathname = '/guide';
      for (const listener of historyListeners) listener();
    });

    expect(screen.getByTestId('root-canvas-host').getAttribute('data-stage-inactive')).toBe('true');
    expect(persistentCanvas.getAttribute('data-frameloop')).toBe('never');
    expect(screen.queryByTestId('mock-galactic-scene')).toBeNull();
  });
});
