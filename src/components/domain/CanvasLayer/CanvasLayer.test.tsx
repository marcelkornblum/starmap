import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import React, { createElement } from 'react';
import { render, screen, act } from '@testing-library/react';
import * as THREE from 'three';
import { CanvasLayer } from './CanvasLayer';
import {
  canMountWebGLCanvas,
  _resetWebGLSupportedForTesting,
} from './webglSupport';
import {
  getRegisteredWebGLGpuTelemetry,
  resetDeviceTierRuntimeState,
} from '../../../services/deviceTierService';
import {
  useCanvasStageStore,
  RootCanvasStageContext,
} from '../../../stores/useCanvasStageStore';
import { useCameraStore } from '../../../stores/useCameraStore';
import {
  SpatialEntityStoreContext,
  useOptionalSpatialEntityStoreApi,
} from '../../canvas/entity/SpatialEntityContext';
import { createSpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';

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

vi.mock('../../canvas/scenes/PlanetarySceneEntry', () => {
  const MockPlanetarySceneContent = (props: {
    planetId?: string;
    onInspectSatellite?: (id: string) => void;
    onSelectEntity?: (id: string | null) => void;
  }) => {
    const store = useOptionalSpatialEntityStoreApi();
    return createElement('div', {
      'data-testid': 'mock-planetary-scene',
      'data-has-inspect': String(Boolean(props.onInspectSatellite)),
      'data-has-select': String(Boolean(props.onSelectEntity)),
      'data-has-bridged-store': String(Boolean(store)),
    });
  };
  return {
    default: MockPlanetarySceneContent,
    PlanetarySceneContent: MockPlanetarySceneContent,
  };
});

vi.mock('../../canvas/SceneTokenBridge', () => ({
  SceneTokenBridge: () => createElement('div', { 'data-testid': 'mock-theme-token-bridge' }),
}));

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
    }) =>
      createElement(
        'div',
        { 'data-testid': 'mock-canvas', 'data-frameloop': frameloop, className },
        children,
      ),
    useFrame: vi.fn(),
    useThree: () => ({
      camera: new THREE.PerspectiveCamera(45, 1, 0.1, 1000),
      gl: { setClearColor: vi.fn() },
      scene: new THREE.Scene(),
      controls: { target: new THREE.Vector3(), update: vi.fn() },
    }),
  };
});

describe('CanvasLayer Domain Component', () => {
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
    resetDeviceTierRuntimeState();
  });

  describe('Standalone Direct Mode (when isRootCanvasMounted is false)', () => {
    it('renders direct canvas layer container with telemetry attributes', () => {
      render(
        <CanvasLayer
          scope="galaxy"
          targetId="sol"
          centerId="sol"
          centerCoordinates={[1, 2, 3]}
          cameraAzimuthDeg={45}
          cameraElevationDeg={30}
          cameraDistance={120}
          journeyLegs={[{ from: 'sol', to: 'alpha-centauri', distancePc: 1.34 } as never]}
          activeJourneyMethod="direct-subspace"
        />,
      );

      const layer = screen.getByTestId('canvas-layer');
      expect(layer).toBeDefined();
      expect(layer.getAttribute('data-scope')).toBe('galaxy');
      expect(layer.getAttribute('data-target-id')).toBe('sol');
      expect(layer.getAttribute('data-center-id')).toBe('sol');
      expect(layer.getAttribute('data-center-coords')).toBe('1,2,3');
      expect(layer.getAttribute('data-camera-az')).toBe('45');
      expect(layer.getAttribute('data-camera-el')).toBe('30');
      expect(layer.getAttribute('data-camera-dist')).toBe('120');
      expect(layer.getAttribute('data-journey-legs-count')).toBe('1');
      expect(layer.getAttribute('data-journey-method')).toBe('direct-subspace');
      expect(layer.getAttribute('aria-label')).toBe('galaxy 3D canvas layer');
    });

    it('honours custom testId in direct mode', () => {
      render(<CanvasLayer scope="system" testId="custom-canvas-direct" />);

      const layer = screen.getByTestId('custom-canvas-direct');
      expect(layer).toBeDefined();
      expect(layer.getAttribute('data-scope')).toBe('system');
    });

    it('omits optional data attributes when props are undefined', () => {
      render(<CanvasLayer scope="planet" />);

      const layer = screen.getByTestId('canvas-layer');
      expect(layer.getAttribute('data-scope')).toBe('planet');
      expect(layer.getAttribute('data-target-id')).toBeNull();
      expect(layer.getAttribute('data-center-id')).toBeNull();
      expect(layer.getAttribute('data-center-coords')).toBeNull();
      expect(layer.getAttribute('data-journey-legs-count')).toBeNull();
      expect(layer.getAttribute('data-journey-method')).toBeNull();
    });

    it('reports webgl support accurately via canMountWebGLCanvas', () => {
      // By default in jsdom, getContext('webgl') / getContext('webgl2') returns null
      expect(canMountWebGLCanvas()).toBe(false);

      _resetWebGLSupportedForTesting();

      // Mock HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
        if (contextId === 'webgl2' || contextId === 'webgl') {
          return {} as WebGLRenderingContext;
        }
        return null;
      });

      expect(canMountWebGLCanvas()).toBe(true);
    });

    it('probes WebGL GPU telemetry and releases the temporary probe context via WEBGL_lose_context', () => {
      const loseContext = vi.fn();
      const UNMASKED_RENDERER_WEBGL = 0x9246;
      const mockGl = {
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_VERTEX_ATTRIBS: 0x8869,
        RENDERER: 0x1f01,
        getExtension: vi.fn((name: string) => {
          if (name === 'WEBGL_debug_renderer_info') return { UNMASKED_RENDERER_WEBGL };
          if (name === 'WEBGL_lose_context') return { loseContext };
          return null;
        }),
        getParameter: vi.fn((param: number) => {
          if (param === 0x0d33) return 16384;
          if (param === 0x8869) return 16;
          if (param === UNMASKED_RENDERER_WEBGL) return 'NVIDIA GeForce RTX 4090';
          return 'WebGL';
        }),
      } as unknown as WebGLRenderingContext;

      HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
        if (contextId === 'webgl2') return mockGl;
        return null;
      });
      _resetWebGLSupportedForTesting();

      expect(canMountWebGLCanvas()).toBe(true);
      expect(getRegisteredWebGLGpuTelemetry()).toEqual({
        gpuRenderer: 'NVIDIA GeForce RTX 4090',
        maxTextureSize: 16384,
        maxVertexAttribs: 16,
      });
      expect(loseContext).toHaveBeenCalledTimes(1);
    });

    it('maintains a single persistent <Canvas> element when scope transitions galaxy -> system -> planet in direct mode', async () => {
      HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
        if (contextId === 'webgl2' || contextId === 'webgl') {
          return {} as WebGLRenderingContext;
        }
        return null;
      });
      _resetWebGLSupportedForTesting();

      const { rerender } = render(
        <CanvasLayer
          scope="galaxy"
          centerId="sol"
        />,
      );

      const canvasGalaxy = await screen.findByTestId('mock-canvas');
      expect(canvasGalaxy).toBeDefined();

      // Transition to system scope
      rerender(
        <CanvasLayer
          scope="system"
          targetId="sol"
          centerId="sol"
        />,
      );

      const canvasSystem = await screen.findByTestId('mock-canvas');
      expect(canvasSystem).toBe(canvasGalaxy);

      // Transition to planet scope
      rerender(
        <CanvasLayer
          scope="planet"
          targetId="earth"
        />,
      );

      const canvasPlanet = await screen.findByTestId('mock-canvas');
      expect(canvasPlanet).toBe(canvasGalaxy);
    });
  });

  describe('Root Canvas Host and Slot Delegation (Decision 2 Option B)', () => {
    it('renders as a metadata slot with data-slot="true" and syncs props to useCanvasStageStore when isRootCanvasMounted is true', () => {
      act(() => {
        useCanvasStageStore.getState().setRootCanvasMounted(true);
      });

      render(
        <CanvasLayer
          scope="system"
          targetId="tau-ceti"
          centerId="tau-ceti"
          cameraDistance={40}
        />,
      );

      // In slot mode, renders canvas-layer-slot by default
      const slot = screen.getByTestId('canvas-layer-slot');
      expect(slot).toBeDefined();
      expect(slot.getAttribute('data-slot')).toBe('true');
      expect(slot.getAttribute('data-scope')).toBe('system');
      expect(slot.getAttribute('data-target-id')).toBe('tau-ceti');
      expect(slot.getAttribute('data-center-id')).toBe('tau-ceti');
      expect(slot.getAttribute('data-camera-dist')).toBe('40');

      // Syncs props to store
      const storedProps = useCanvasStageStore.getState().stageProps;
      expect(storedProps).not.toBeNull();
      expect(storedProps?.scope).toBe('system');
      expect(storedProps?.targetId).toBe('tau-ceti');
      expect(storedProps?.centerId).toBe('tau-ceti');
      expect(storedProps?.cameraDistance).toBe(40);
    });

    it('allows custom testId override on slot', () => {
      act(() => {
        useCanvasStageStore.getState().setRootCanvasMounted(true);
      });

      render(
        <CanvasLayer
          scope="galaxy"
          testId="my-custom-slot"
        />,
      );

      expect(screen.getByTestId('my-custom-slot')).toBeInTheDocument();
      expect(screen.queryByTestId('canvas-layer-slot')).toBeNull();
    });

    it('renders as a metadata slot when wrapped in RootCanvasStageContext.Provider even if isRootCanvasMounted is false', () => {
      render(
        <RootCanvasStageContext.Provider value={true}>
          <CanvasLayer scope="galaxy" centerId="sol" />
        </RootCanvasStageContext.Provider>,
      );

      const slot = screen.getByTestId('canvas-layer-slot');
      expect(slot).toBeInTheDocument();
      expect(slot.getAttribute('data-slot')).toBe('true');
      expect(screen.queryByTestId('mock-canvas')).toBeNull();
    });

    it('bridges outer SpatialEntityStoreContext and forwards onInspect and onSelect to PlanetarySceneContent in direct mode', async () => {
      HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
        if (contextId === 'webgl2' || contextId === 'webgl') {
          return {} as WebGLRenderingContext;
        }
        return null;
      });
      _resetWebGLSupportedForTesting();

      const testStore = createSpatialEntityStore();
      const onInspect = vi.fn();
      const onSelect = vi.fn();

      render(
        <SpatialEntityStoreContext.Provider value={testStore}>
          <CanvasLayer
            scope="planet"
            targetId="earth"
            onInspect={onInspect}
            onSelect={onSelect}
          />
        </SpatialEntityStoreContext.Provider>,
      );

      const planetScene = await screen.findByTestId('mock-planetary-scene');
      expect(planetScene.getAttribute('data-has-inspect')).toBe('true');
      expect(planetScene.getAttribute('data-has-select')).toBe('true');
      expect(planetScene.getAttribute('data-has-bridged-store')).toBe('true');
    });

    it('uses frameloop="demand" in standalone direct mode', async () => {
      HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
        if (contextId === 'webgl2' || contextId === 'webgl') {
          return {} as WebGLRenderingContext;
        }
        return null;
      });
      _resetWebGLSupportedForTesting();

      render(<CanvasLayer scope="galaxy" centerId="sol" />);

      const canvas = await screen.findByTestId('mock-canvas');
      expect(canvas.getAttribute('data-frameloop')).toBe('demand');
      expect(await screen.findByTestId('mock-galactic-scene')).toBeInTheDocument();
    });

    it('gates frameloop to "never" and unmounts spatial scene when isRootHost has activeSlotCount === 0, then mounts on activeSlotCount > 0', async () => {
      HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
        if (contextId === 'webgl2' || contextId === 'webgl') {
          return {} as WebGLRenderingContext;
        }
        return null;
      });
      _resetWebGLSupportedForTesting();

      render(<CanvasLayer isRootHost scope="galaxy" centerId="sol" />);

      const canvas = await screen.findByTestId('mock-canvas');
      expect(canvas.getAttribute('data-frameloop')).toBe('never');
      expect(screen.getByTestId('mock-theme-token-bridge')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-galactic-scene')).toBeNull();

      // Activate a slot and set stageProps
      act(() => {
        useCanvasStageStore.getState().mountSlot();
        useCanvasStageStore.getState().setStageProps({ scope: 'galaxy', centerId: 'sol' });
      });

      expect(screen.getByTestId('mock-canvas')).toBe(canvas);
      expect(canvas.getAttribute('data-frameloop')).toBe('demand');
      expect(await screen.findByTestId('mock-galactic-scene')).toBeInTheDocument();

      // Unmount slot (e.g. navigating to /search or /guide)
      act(() => {
        useCanvasStageStore.getState().unmountSlot();
      });

      expect(screen.getByTestId('mock-canvas')).toBe(canvas);
      expect(canvas.getAttribute('data-frameloop')).toBe('never');
      expect(screen.getByTestId('mock-theme-token-bridge')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-galactic-scene')).toBeNull();
    });
  });
});
