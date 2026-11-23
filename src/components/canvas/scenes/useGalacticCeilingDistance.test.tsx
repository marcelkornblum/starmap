import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGalacticCeilingDistance } from './useGalacticCeilingDistance';
import {
  registerWebGLGpuTelemetry,
  resetDeviceTierRuntimeState,
} from '../../../services/deviceTierService';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useUIStore } from '../../../stores/useUIStore';
import {
  clearPendingCrossScaleArrival,
  setPendingCrossScaleArrival,
} from '../instrument/crossScaleArrivalState';

describe('useGalacticCeilingDistance hook', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetDeviceTierRuntimeState();
    clearPendingCrossScaleArrival();
    act(() => {
      useCameraStore.getState().reset();
      useUIStore.getState().resetUI();
    });
  });

  it('returns a finite maxSafeDistance and setter', () => {
    const { result } = renderHook(() => useGalacticCeilingDistance());
    const [maxDistance, setCeilingRadius] = result.current;

    expect(Number.isFinite(maxDistance)).toBe(true);
    expect(maxDistance).toBeGreaterThan(0);

    act(() => {
      setCeilingRadius(50);
    });

    const [updatedDistance] = result.current;
    expect(Number.isFinite(updatedDistance)).toBe(true);
  });

  it('updates reactively when device tier changes via registerWebGLGpuTelemetry', () => {
    vi.stubGlobal('navigator', { hardwareConcurrency: 6, deviceMemory: 8 });
    const { result } = renderHook(() => useGalacticCeilingDistance({ minDistancePc: 2.5 }));
    const [tier2Dist] = result.current;

    act(() => {
      registerWebGLGpuTelemetry({
        gpuRenderer: 'NVIDIA GeForce RTX 4090',
        maxTextureSize: 16384,
        maxVertexAttribs: 16,
      });
    });

    const [tier3Dist] = result.current;
    expect(tier3Dist).toBeGreaterThan(tier2Dist);

    act(() => {
      registerWebGLGpuTelemetry({ gpuRenderer: 'SwiftShader' });
    });

    const [tier1Dist] = result.current;
    expect(tier1Dist).toBeLessThan(tier2Dist);
  });

  it('recomputes when camera target distance from Sol changes by >= 0.5 pc and avoids re-render below quantisation threshold', () => {
    vi.stubGlobal('navigator', { hardwareConcurrency: 8, deviceMemory: 16 });
    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount++;
      return useGalacticCeilingDistance({ viewportAspect: 16 / 9, minDistancePc: 2.5 });
    });

    const [distAtSol] = result.current;
    const initialRenders = renderCount;

    // Small pan within 0.5 pc quantisation bucket around 10 pc
    act(() => {
      useCameraStore.getState().setCameraTransform([10, 0, 20], [10.0, 0, 0]);
    });
    const rendersAt10 = renderCount;
    expect(rendersAt10).toBeGreaterThan(initialRenders);

    act(() => {
      useCameraStore.getState().setCameraTransform([10.1, 0, 20], [10.1, 0, 0]);
    });
    expect(renderCount).toBe(rendersAt10);

    // Move near dense catalog boundary (>= 92 pc) -> bypasses dense edge clamp
    act(() => {
      useCameraStore.getState().setCameraTransform([95, 0, 20], [95, 0, 0]);
    });
    const [distAtBoundary] = result.current;
    expect(distAtBoundary).toBeGreaterThan(distAtSol);
  });

  it('ignores AU/km useCameraStore.target during cross-scale transition or pending arrival and falls back to savedGalaxyCamera.target or targetCoords', () => {
    vi.stubGlobal('navigator', { hardwareConcurrency: 8, deviceMemory: 16 });
    const { result, rerender } = renderHook(
      ({ targetCoords }: { targetCoords?: readonly [number, number, number] }) =>
        useGalacticCeilingDistance({
          viewportAspect: 16 / 9,
          minDistancePc: 2.5,
          targetCoords,
        }),
      { initialProps: { targetCoords: [0, 0, 0] as readonly [number, number, number] } },
    );
    const [solCeiling] = result.current;

    // Simulate System/Planet AU/km target polluting useCameraStore.target while transitioning back to Galaxy
    act(() => {
      useUIStore.getState().setCameraTransitioning(true);
      useCameraStore.getState().setCameraTransform([250, 0, 50], [250, 0, 0]);
    });
    expect(result.current[0]).toBe(solCeiling);

    // Saved galaxy target overrides targetCoords while transitioning
    act(() => {
      useCameraStore.getState().setSavedGalaxyCamera({
        position: [95, -20, 20],
        target: [95, 0, 0],
        up: [0, 0, 1],
        zoom: 1,
        focalDistance: 28,
        centerKey: 'distant-star',
      });
    });
    const [distantSavedCeiling] = result.current;
    expect(distantSavedCeiling).toBeGreaterThan(solCeiling);

    // Pending cross-scale arrival without isCameraTransitioning also guards against live AU/km target
    act(() => {
      useCameraStore.getState().setSavedGalaxyCamera(null);
      useUIStore.getState().setCameraTransitioning(false);
      setPendingCrossScaleArrival({
        direction: 'out',
        targetScope: 'galaxy',
        durationSec: 0.9,
      });
    });
    rerender({ targetCoords: [0, 0, 0] });
    expect(result.current[0]).toBe(solCeiling);

    // Once pending arrival clears and not transitioning, live target is used again
    act(() => {
      clearPendingCrossScaleArrival();
    });
    rerender({ targetCoords: [0, 0, 0] });
    expect(result.current[0]).toBeGreaterThan(solCeiling);
  });
});
