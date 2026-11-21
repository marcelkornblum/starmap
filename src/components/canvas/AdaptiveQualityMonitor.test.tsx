import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { AdaptiveQualityMonitor } from './AdaptiveQualityMonitor';
import {
  getRegisteredWebGLGpuTelemetry,
  getRuntimeCutoffMultiplier,
  resetDeviceTierRuntimeState,
} from '../../services/deviceTierService';

type FrameCallback = (state: unknown, delta: number) => void;

const mockSetDpr = vi.fn();
let capturedFrameCallback: FrameCallback | null = null;
let mockGlContext: WebGLRenderingContext | null = null;

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useFrame: (cb: FrameCallback) => {
      capturedFrameCallback = cb;
    },
    useThree: (selector: (state: unknown) => unknown) =>
      selector({
        setDpr: mockSetDpr,
        gl: {
          getContext: () => mockGlContext,
        },
      }),
  };
});

describe('AdaptiveQualityMonitor', () => {
  beforeEach(() => {
    capturedFrameCallback = null;
    mockSetDpr.mockClear();
    resetDeviceTierRuntimeState();
    vi.stubGlobal('navigator', {
      deviceMemory: 8,
      hardwareConcurrency: 8,
    });
    vi.stubGlobal('devicePixelRatio', 2);

    const UNMASKED_RENDERER_WEBGL = 0x9246;
    mockGlContext = {
      MAX_TEXTURE_SIZE: 0x0d33,
      MAX_VERTEX_ATTRIBS: 0x8869,
      RENDERER: 0x1f01,
      getExtension: vi.fn((name: string) =>
        name === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL } : null,
      ),
      getParameter: vi.fn((param: number) => {
        if (param === 0x0d33) return 16384;
        if (param === 0x8869) return 16;
        if (param === UNMASKED_RENDERER_WEBGL) return 'NVIDIA GeForce RTX 4090';
        return 'WebGL';
      }),
    } as unknown as WebGLRenderingContext;
  });

  afterEach(() => {
    resetDeviceTierRuntimeState();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('registers fallback WebGL GPU telemetry on mount from gl.getContext()', () => {
    render(<AdaptiveQualityMonitor />);

    expect(getRegisteredWebGLGpuTelemetry()).toEqual({
      gpuRenderer: 'NVIDIA GeForce RTX 4090',
      maxTextureSize: 16384,
      maxVertexAttribs: 16,
    });
  });

  it('ignores demand-mode idle gaps and steps DPR then cutoffMultiplier down on sustained slow frames', () => {
    render(<AdaptiveQualityMonitor />);
    expect(capturedFrameCallback).not.toBeNull();

    // Idle gaps (> 0.25s) should be ignored
    act(() => {
      for (let i = 0; i < 20; i++) {
        capturedFrameCallback?.({}, 1.5);
      }
    });
    expect(mockSetDpr).not.toHaveBeenCalled();

    // 12 slow frames (50ms) -> step DPR down from 2 -> 1.75 -> 1.5 -> 1.25 -> 1.0
    act(() => {
      for (let step = 0; step < 4; step++) {
        for (let i = 0; i < 12; i++) {
          capturedFrameCallback?.({}, 0.05);
        }
      }
    });

    expect(mockSetDpr).toHaveBeenCalledWith(1.75);
    expect(mockSetDpr).toHaveBeenCalledWith(1.5);
    expect(mockSetDpr).toHaveBeenCalledWith(1.25);
    expect(mockSetDpr).toHaveBeenCalledWith(1);
    expect(getRuntimeCutoffMultiplier()).toBe(1);

    // At DPR 1, another 12 slow frames (50ms > 45ms) -> step cutoffMultiplier down to 0.75
    act(() => {
      for (let i = 0; i < 12; i++) {
        capturedFrameCallback?.({}, 0.05);
      }
    });

    expect(getRuntimeCutoffMultiplier()).toBe(0.75);
  });
});
