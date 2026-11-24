import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGalacticCeilingDistance } from './useGalacticCeilingDistance';
import {
  computeCeilingMaxCameraDistancePc,
  getDeviceTierBudget,
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

  it('returns hardware-budget ceiling distance and setter without dense-volume choke', () => {
    vi.stubGlobal('navigator', { hardwareConcurrency: 8, deviceMemory: 16 });
    const { result } = renderHook(() => useGalacticCeilingDistance());
    const [maxDistance, setCeilingRadius] = result.current;

    expect(Number.isFinite(maxDistance)).toBe(true);
    expect(maxDistance).toBe(computeCeilingMaxCameraDistancePc(getDeviceTierBudget()));
    expect(maxDistance).toBeGreaterThan(100);

    act(() => {
      setCeilingRadius(50);
    });

    const [updatedDistance] = result.current;
    expect(updatedDistance).toBe(
      computeCeilingMaxCameraDistancePc(getDeviceTierBudget(), { ceilingApertureRadiusPc: 50 }),
    );
  });

  it('updates reactively when device tier changes via registerWebGLGpuTelemetry', () => {
    vi.stubGlobal('navigator', { hardwareConcurrency: 6, deviceMemory: 8 });
    const { result } = renderHook(() => useGalacticCeilingDistance());
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

  it('does not re-render or clamp when camera pans across the catalog', () => {
    vi.stubGlobal('navigator', { hardwareConcurrency: 8, deviceMemory: 16 });
    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount++;
      return useGalacticCeilingDistance();
    });

    const [initialCeiling] = result.current;
    const initialRenders = renderCount;

    act(() => {
      useCameraStore.getState().setCameraTransform([10, 0, 20], [10, 0, 0]);
      useCameraStore.getState().setCameraTransform([95, 0, 20], [95, 0, 0]);
    });

    expect(renderCount).toBe(initialRenders);
    expect(result.current[0]).toBe(initialCeiling);
  });
});
