// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import {
  CanvasLayer,
  RootCanvasHost,
  canMountWebGLCanvas,
  _resetWebGLSupportedForTesting,
} from './CanvasLayer';
import { useCanvasStageStore } from '../../../stores/useCanvasStageStore';

describe('CanvasLayer Domain Component', () => {
  beforeEach(() => {
    act(() => {
      useCanvasStageStore.getState().resetCanvasStageStore();
    });
    _resetWebGLSupportedForTesting();
  });

  afterEach(() => {
    _resetWebGLSupportedForTesting();
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
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
        if (contextId === 'webgl2' || contextId === 'webgl') {
          return {} as WebGLRenderingContext;
        }
        return null;
      });

      expect(canMountWebGLCanvas()).toBe(true);

      // Restore
      HTMLCanvasElement.prototype.getContext = originalGetContext;
      _resetWebGLSupportedForTesting();
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
      expect(stageProps?.onInspect).toBe(handleInspect);
      expect(stageProps?.onSelect).toBe(handleSelect);

      // Verify callbacks route correctly
      stageProps?.onInspect?.('alpha-centauri');
      expect(handleInspect).toHaveBeenCalledTimes(1);
      expect(handleInspect).toHaveBeenCalledWith('alpha-centauri');

      stageProps?.onSelect?.('sol');
      expect(handleSelect).toHaveBeenCalledTimes(1);
      expect(handleSelect).toHaveBeenCalledWith('sol');
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

      expect(screen.getByTestId('my-custom-slot')).toBeDefined();
      expect(screen.queryByTestId('canvas-layer-slot')).toBeNull();
    });

    it('<RootCanvasHost /> mounts root persistent canvas and syncs isRootCanvasMounted lifecycle and camera telemetry', () => {
      expect(useCanvasStageStore.getState().isRootCanvasMounted).toBe(false);

      const { unmount } = render(<RootCanvasHost />);

      expect(useCanvasStageStore.getState().isRootCanvasMounted).toBe(true);
      const host = screen.getByTestId('root-canvas-host');
      expect(host).toBeDefined();

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
  });
});
