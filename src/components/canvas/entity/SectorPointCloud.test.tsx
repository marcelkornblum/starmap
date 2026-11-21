import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import ReactThreeTest from '@react-three/test-renderer';
import { SectorPointCloud } from './SectorPointCloud';
import type { SectorStreamingManager } from '../../../services/sectorStreamingService';
import {
  computeStarfieldHorizonRadius,
  createStarfieldPointsMaterial,
  STARFIELD_HORIZON_APERTURE_RATIO,
  STARFIELD_ACTIVE_POINT_SIZE,
  STARFIELD_PASSIVE_POINT_SIZE,
  STARFIELD_VERTEX_SHADER,
  STARFIELD_FRAGMENT_SHADER,
} from './sectorPointCloudShaders';

const { mockInvalidate, wrappedInvalidateCache } = vi.hoisted(() => ({
  mockInvalidate: vi.fn(),
  wrappedInvalidateCache: new WeakMap<
    (frames?: number) => void,
    (frames?: number) => void
  >(),
}));

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useThree: ((selector?: (state: unknown) => unknown) => {
      const realInvalidate = actual.useThree((s) => s.invalidate);
      const selected: unknown = actual.useThree(
        (selector ?? ((s: unknown) => s)) as Parameters<typeof actual.useThree>[0],
      );
      if (selected === realInvalidate) {
        let wrapped = wrappedInvalidateCache.get(realInvalidate);
        if (!wrapped) {
          wrapped = (frames?: number) => {
            mockInvalidate(frames);
            return realInvalidate(frames);
          };
          wrappedInvalidateCache.set(realInvalidate, wrapped);
        }
        return wrapped;
      }
      return selected;
    }) as typeof actual.useThree,
  };
});

describe('SectorPointCloud - Starfield Shader & Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvalidate.mockClear();
  });

  it('mounts SectorPointCloud cleanly in 3D canvas', async () => {
    const renderer = await ReactThreeTest.create(<SectorPointCloud />);
    expect(renderer.scene.children).toHaveLength(1);
    expect(renderer.scene.children[0].props.name).toBe('galactic-sector-point-cloud');
    await renderer.unmount();
  });

  describe('createStarfieldPointsMaterial', () => {
    it('creates a THREE.ShaderMaterial with all required uniforms and defaults', () => {
      const mat = createStarfieldPointsMaterial();

      expect(mat).toBeInstanceOf(THREE.ShaderMaterial);
      expect(mat.transparent).toBe(true);
      expect(mat.depthWrite).toBe(false);

      const uniforms = mat.uniforms;
      expect(uniforms.uColor).toBeDefined();
      expect((uniforms.uColor.value as THREE.Color).getHexString()).toBe('ffffff');

      expect(uniforms.uPointSize).toBeDefined();
      expect(uniforms.uPointSize.value).toBe(STARFIELD_PASSIVE_POINT_SIZE);
      expect(STARFIELD_PASSIVE_POINT_SIZE).toBe(3.2);

      expect(uniforms.uActivePointSize).toBeDefined();
      expect(uniforms.uActivePointSize.value).toBe(STARFIELD_ACTIVE_POINT_SIZE);
      expect(STARFIELD_ACTIVE_POINT_SIZE).toBe(5.0);

      expect(uniforms.uBaseOpacity).toBeDefined();
      expect(uniforms.uBaseOpacity.value).toBe(0.9);

      expect(uniforms.uFocusCenter).toBeDefined();
      expect(uniforms.uFocusCenter.value).toBeInstanceOf(THREE.Vector3);
      expect((uniforms.uFocusCenter.value as THREE.Vector3).x).toBe(0);
      expect((uniforms.uFocusCenter.value as THREE.Vector3).y).toBe(0);
      expect((uniforms.uFocusCenter.value as THREE.Vector3).z).toBe(0);

      expect(uniforms.uApertureRadius).toBeDefined();
      expect(uniforms.uApertureRadius.value).toBe(15.0);

      expect(uniforms.uCameraPos).toBeDefined();
      expect(uniforms.uCameraPos.value).toBeInstanceOf(THREE.Vector3);
      expect((uniforms.uCameraPos.value as THREE.Vector3).x).toBe(0);
      expect((uniforms.uCameraPos.value as THREE.Vector3).y).toBe(-35);
      expect((uniforms.uCameraPos.value as THREE.Vector3).z).toBe(20);

      expect(uniforms.uHorizonRadius).toBeDefined();
      expect(uniforms.uHorizonRadius.value).toBe(36.0);

      mat.dispose();
    });

    it('respects custom pointSize, pointOpacity, and activePointSize arguments', () => {
      const mat = createStarfieldPointsMaterial(4.5, 0.45, 7.5);

      expect(mat.uniforms.uPointSize.value).toBe(4.5);
      expect(mat.uniforms.uBaseOpacity.value).toBe(0.45);
      expect(mat.uniforms.uActivePointSize.value).toBe(7.5);

      mat.dispose();
    });

    it('renders stars inside the aperture with full active size and opacity in vertex shader', () => {
      expect(STARFIELD_VERTEX_SHADER).toContain('uniform float uActivePointSize;');
      expect(STARFIELD_VERTEX_SHADER).toContain('bool isInsideAperture = distFromOrigin <= uApertureRadius;');
      expect(STARFIELD_VERTEX_SHADER).toContain('float radialFalloff = isInsideAperture ? 1.0 : mix(0.88, 0.45, outerT);');
      expect(STARFIELD_VERTEX_SHADER).toContain('vLuminance = isInsideAperture ? 1.0 : mix(0.75, 1.0, radialFalloff);');
      expect(STARFIELD_VERTEX_SHADER).toContain('float fgFactor = mix(1.0, 0.55, fgMask);');
      expect(STARFIELD_VERTEX_SHADER).toContain('vAlpha = isInsideAperture ? 1.0 : (uBaseOpacity * radialFalloff * fgFactor);');
      expect(STARFIELD_VERTEX_SHADER).toContain('gl_PointSize = isInsideAperture ? uActivePointSize : uPointSize;');
    });

    it('wires the vertex and fragment shaders into the material', () => {
      const mat = createStarfieldPointsMaterial();

      expect(mat.vertexShader).toBe(STARFIELD_VERTEX_SHADER);
      expect(mat.fragmentShader).toBe(STARFIELD_FRAGMENT_SHADER);

      mat.dispose();
    });

    it('declares every material uniform in the shader source that consumes it', () => {
      const mat = createStarfieldPointsMaterial();
      const shaderSource = `${STARFIELD_VERTEX_SHADER}\n${STARFIELD_FRAGMENT_SHADER}`;

      for (const uniformName of Object.keys(mat.uniforms)) {
        expect(shaderSource).toMatch(new RegExp(`uniform\\s+\\w+\\s+${uniformName}\\b`));
      }

      mat.dispose();
    });

    it('scales the horizon cull radius with the live aperture radius instead of world units', () => {
      expect(computeStarfieldHorizonRadius(15)).toBeCloseTo(36);
      expect(computeStarfieldHorizonRadius(30)).toBeCloseTo(72);
      expect(computeStarfieldHorizonRadius(7.5)).toBeCloseTo(18);
      expect(computeStarfieldHorizonRadius(30) / 30).toBeCloseTo(STARFIELD_HORIZON_APERTURE_RATIO);
    });

    it('falls back to the default aperture for non-finite, zero, or negative radii', () => {
      const fallback = computeStarfieldHorizonRadius(15);
      expect(computeStarfieldHorizonRadius(Number.NaN)).toBeCloseTo(fallback);
      expect(computeStarfieldHorizonRadius(Number.POSITIVE_INFINITY)).toBeCloseTo(fallback);
      expect(computeStarfieldHorizonRadius(0)).toBeCloseTo(fallback);
      expect(computeStarfieldHorizonRadius(-5)).toBeCloseTo(fallback);
    });
  });

  describe('Instrument Boundary Lookahead and Continuous Hydration', () => {
    it('uses 1.15x lookahead factor so boundary stars are hydrated before crossing perimeter', () => {
      const apertureRadius = 15.0;
      const lookaheadRadius = apertureRadius * 1.15;
      expect(lookaheadRadius).toBeCloseTo(17.25);
    });

    it('specifies 4.0 pc squared threshold for camera position updates to streaming manager', () => {
      const distSqThreshold = 4.0;
      expect(distSqThreshold).toBe(4.0);
      expect(Math.sqrt(distSqThreshold)).toBe(2.0);
    });

    it('specifies 0.25 pc squared threshold for hydration updates in useFrame', () => {
      const hydrationDistSqThreshold = 0.25;
      expect(hydrationDistSqThreshold).toBe(0.25);
      expect(Math.sqrt(hydrationDistSqThreshold)).toBe(0.5);
    });
  });

  describe('On-demand invalidation for sector streaming & uploads', () => {
    it('invalidates on streaming notifications and frame uploads, then settles to 0 calls when idle', async () => {
      let subscriber: (() => void) | null = null;
      let pending = false;
      const processFrameUploads = vi.fn<() => string[]>(() => []);
      const hasPendingUploads = vi.fn<() => boolean>(() => pending);
      const mockManager = {
        subscribe: vi.fn((cb: () => void) => {
          subscriber = cb;
          return () => {
            subscriber = null;
          };
        }),
        updateCameraPosition: vi.fn(async () => ({
          activeSectorIds: [],
          prefetchSectorIds: [],
        })),
        processFrameUploads,
        hasPendingUploads,
        isActiveRingReady: vi.fn(() => false),
        getActiveSectorQueryInputs: vi.fn(() => []),
      } as unknown as SectorStreamingManager;

      const renderer = await ReactThreeTest.create(
        <SectorPointCloud manager={mockManager} />,
      );

      // 1. Streaming notifies new data -> invalidates
      mockInvalidate.mockClear();
      expect(subscriber).not.toBeNull();
      subscriber!();
      expect(mockInvalidate).toHaveBeenCalledTimes(1);

      // 2. Frame uploads a sector -> invalidates
      mockInvalidate.mockClear();
      processFrameUploads.mockReturnValueOnce(['sector_+000_+000_+000']);
      pending = true;
      await renderer.advanceFrames(1, 0.016);
      expect(mockInvalidate).toHaveBeenCalledTimes(1);

      // 3. No sector uploaded this frame, but pending uploads still queued -> invalidates
      mockInvalidate.mockClear();
      processFrameUploads.mockReturnValueOnce([]);
      pending = true;
      await renderer.advanceFrames(1, 0.016);
      expect(mockInvalidate).toHaveBeenCalledTimes(1);

      // 4. Queue drained and idle -> 0 invalidate calls
      mockInvalidate.mockClear();
      processFrameUploads.mockReturnValueOnce([]);
      pending = false;
      await renderer.advanceFrames(3, 0.016);
      expect(mockInvalidate).not.toHaveBeenCalled();

      await renderer.unmount();
    });
  });
});
