import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGalacticCeilingDistance } from './useGalacticCeilingDistance';
import {
  registerWebGLGpuTelemetry,
  resetDeviceTierRuntimeState,
} from '../../../services/deviceTierService';
import { useCameraStore } from '../../../stores/useCameraStore';

describe('useGalacticCeilingDistance hook', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetDeviceTierRuntimeState();
    act(() => {
      useCameraStore.getState().reset();
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
});
