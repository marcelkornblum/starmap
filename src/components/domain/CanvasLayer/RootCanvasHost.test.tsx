// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import React, { createElement } from 'react';
import { render, screen, act } from '@testing-library/react';
import * as THREE from 'three';
import {
  CanvasLayer,
  _resetWebGLSupportedForTesting,
} from './CanvasLayer';
import { RootCanvasHost } from './RootCanvasHost';
import {
  useCanvasStageStore,
  getStageCallbacks,
} from '../../../stores/useCanvasStageStore';
import { useCameraStore } from '../../../stores/useCameraStore';

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

const mockCanvasRender = vi.fn();

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    Canvas: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
      mockCanvasRender();
      return createElement('div', { 'data-testid': 'mock-canvas', className }, children);
    },
    useFrame: vi.fn(),
    useThree: () => ({
      camera: new THREE.PerspectiveCamera(45, 1, 0.1, 1000),
      gl: { setClearColor: vi.fn() },
      scene: new THREE.Scene(),
      controls: { target: new THREE.Vector3(), update: vi.fn() },
    }),
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

  it('mounts root persistent canvas and syncs isRootCanvasMounted lifecycle and camera telemetry', () => {
    expect(useCanvasStageStore.getState().isRootCanvasMounted).toBe(false);

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

    // Root host child canvas has isRootHost=true, so it renders canvas-layer (not slot)
    const hostChild = screen.getByTestId('canvas-layer');
    expect(hostChild).toBeDefined();
    expect(hostChild.getAttribute('data-scope')).toBe('galaxy');

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

  it('maintains a single persistent <Canvas> element when RootCanvasHost transitions across scopes via stageProps', () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
      if (contextId === 'webgl2' || contextId === 'webgl') {
        return {} as WebGLRenderingContext;
      }
      return null;
    });
    _resetWebGLSupportedForTesting();

    act(() => {
      useCanvasStageStore.getState().setStageProps({
        scope: 'galaxy',
        centerId: 'sol',
      });
    });

    render(<RootCanvasHost />);

    const canvasGalaxy = screen.getByTestId('mock-canvas');
    expect(canvasGalaxy).toBeDefined();

    act(() => {
      useCanvasStageStore.getState().setStageProps({
        scope: 'system',
        targetId: 'sol',
        centerId: 'sol',
      });
    });

    const canvasSystem = screen.getByTestId('mock-canvas');
    expect(canvasSystem).toBe(canvasGalaxy);

    act(() => {
      useCanvasStageStore.getState().setStageProps({
        scope: 'planet',
        targetId: 'earth',
      });
    });

    const canvasPlanet = screen.getByTestId('mock-canvas');
    expect(canvasPlanet).toBe(canvasGalaxy);
  });

  it('updates data-camera-* DOM attributes imperatively without re-rendering CanvasLayer or child tree', () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
      if (contextId === 'webgl2' || contextId === 'webgl') {
        return {} as WebGLRenderingContext;
      }
      return null;
    });
    _resetWebGLSupportedForTesting();

    render(<RootCanvasHost />);
    const host = screen.getByTestId('root-canvas-host');

    expect(host.getAttribute('data-camera-pos')).toBe('0.00,0.00,0.00');
    expect(host.getAttribute('data-camera-target')).toBe('0.00,0.00,0.00');
    expect(host.getAttribute('data-camera-dist')).toBe('0.00');

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
});
