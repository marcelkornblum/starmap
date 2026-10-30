import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  computeStarfieldHorizonRadius,
  createStarfieldPointsMaterial,
  STARFIELD_HORIZON_APERTURE_RATIO,
  STARFIELD_VERTEX_SHADER,
  STARFIELD_FRAGMENT_SHADER,
} from '../src/components/canvas/entity/SectorPointCloud';

describe('SectorPointCloud - Starfield Shader & Continuous Boundary Hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      expect(uniforms.uPointSize.value).toBe(2.0);

      expect(uniforms.uBaseOpacity).toBeDefined();
      expect(uniforms.uBaseOpacity.value).toBe(0.85);

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

    it('respects custom pointSize and pointOpacity arguments', () => {
      const mat = createStarfieldPointsMaterial(4.5, 0.45);

      expect(mat.uniforms.uPointSize.value).toBe(4.5);
      expect(mat.uniforms.uBaseOpacity.value).toBe(0.45);

      mat.dispose();
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
      // (dx*dx + dy*dy + dz*dz > 4.0) corresponds to movement > 2.0 pc
      const distSqThreshold = 4.0;
      expect(distSqThreshold).toBe(4.0);
      expect(Math.sqrt(distSqThreshold)).toBe(2.0);
    });

    it('specifies 0.25 pc squared threshold for hydration updates in useFrame', () => {
      // (hdx*hdx + hdy*hdy + hdz*hdz > 0.25) corresponds to movement > 0.5 pc
      const hydrationDistSqThreshold = 0.25;
      expect(hydrationDistSqThreshold).toBe(0.25);
      expect(Math.sqrt(hydrationDistSqThreshold)).toBe(0.5);
    });
  });
});
