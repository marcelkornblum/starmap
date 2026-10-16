import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  CARTO_LINE_CONSTANTS,
  CartoLineMaterial,
  CartoHairlineMaterial,
  createCartoLineGeometry,
  createCartoLineSegmentsGeometry,
  createCartoLineMesh,
  createCartoLineSegmentsMesh,
} from '../src/components/poc/canvas/materials/CartoLineMaterial';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';

describe('CartoLineMaterial & CartoHairlineMaterial', () => {
  describe('CARTO_LINE_CONSTANTS', () => {
    it('defines standard cartographic screen-space line dimensions', () => {
      expect(CARTO_LINE_CONSTANTS.dashSize).toBe(14.0);
      expect(CARTO_LINE_CONSTANTS.gapSize).toBe(8.0);
      expect(CARTO_LINE_CONSTANTS.dotSize).toBe(2.0);
      expect(CARTO_LINE_CONSTANTS.dotGap).toBe(4.0);
      expect(CARTO_LINE_CONSTANTS.hairlineWidth).toBe(1.0);
    });
  });

  describe('CartoLineMaterial (Wide Lines via LineMaterial)', () => {
    it('creates a wide line material with default parameters', () => {
      const mat = new CartoLineMaterial();
      expect(mat.isLineMaterial).toBe(true);
      expect(mat.transparent).toBe(true);
      expect(mat.linewidth).toBe(1.0);
      expect(mat.dashed).toBe(true);
      expect(mat.uniforms.gapSize.value).toBe(0.0); // Solid by default
    });

    it('initialises dashed and dotted patterns correctly', () => {
      const dashedMat = new CartoLineMaterial({ lineStyle: 'dashed' });
      expect(dashedMat.uniforms.dashSize.value).toBe(CARTO_LINE_CONSTANTS.dashSize);
      expect(dashedMat.uniforms.gapSize.value).toBe(CARTO_LINE_CONSTANTS.gapSize);

      const dottedMat = new CartoLineMaterial({ lineStyle: 'dotted' });
      expect(dottedMat.uniforms.dashSize.value).toBe(CARTO_LINE_CONSTANTS.dotSize);
      expect(dottedMat.uniforms.gapSize.value).toBe(CARTO_LINE_CONSTANTS.dotGap);
    });

    it('initialises arbitrary line width in screen pixels', () => {
      const mat = new CartoLineMaterial({ lineWidth: 3.5 });
      expect(mat.linewidth).toBe(3.5);
      expect(mat.uniforms.linewidth.value).toBe(3.5);
    });

    it('mutates color in-place with THREE.Color, string, and number', () => {
      const mat = new CartoLineMaterial();
      mat.setColor(new THREE.Color(1, 0, 0));
      expect(mat.color.r).toBeCloseTo(1);
      expect(mat.color.g).toBeCloseTo(0);

      mat.setColor('#00ff00');
      expect(mat.color.g).toBeCloseTo(1);

      mat.setColor(0x0000ff);
      expect(mat.color.b).toBeCloseTo(1);
    });

    it('mutates opacity in-place', () => {
      const mat = new CartoLineMaterial();
      mat.setOpacity(0.42);
      expect(mat.opacity).toBe(0.42);
      expect(mat.uniforms.opacity.value).toBe(0.42);
    });

    it('mutates line width in-place', () => {
      const mat = new CartoLineMaterial();
      mat.setLineWidth(4.0);
      expect(mat.linewidth).toBe(4.0);
      expect(mat.uniforms.linewidth.value).toBe(4.0);
    });

    it('mutates style and pattern without shader recompilation', () => {
      const mat = new CartoLineMaterial({ lineStyle: 'solid' });
      expect(mat.uniforms.gapSize.value).toBe(0.0);

      mat.setStyle('dashed');
      expect(mat.lineStyle).toBe('dashed');
      expect(mat.uniforms.dashSize.value).toBe(CARTO_LINE_CONSTANTS.dashSize);
      expect(mat.uniforms.gapSize.value).toBe(CARTO_LINE_CONSTANTS.gapSize);

      mat.setStyle('dotted');
      expect(mat.lineStyle).toBe('dotted');
      expect(mat.uniforms.dashSize.value).toBe(CARTO_LINE_CONSTANTS.dotSize);
      expect(mat.uniforms.gapSize.value).toBe(CARTO_LINE_CONSTANTS.dotGap);

      mat.setPattern(14.0, 7.0); // Omit dashOffset (default 0)
      expect(mat.uniforms.dashSize.value).toBe(14.0);
      expect(mat.uniforms.gapSize.value).toBe(7.0);
      expect(mat.uniforms.dashOffset.value).toBe(0);

      mat.setPattern(12.0, 6.0, 1.0);
      expect(mat.uniforms.dashSize.value).toBe(12.0);
      expect(mat.uniforms.gapSize.value).toBe(6.0);
      expect(mat.uniforms.dashOffset.value).toBe(1.0);

      mat.setStyle('solid');
      expect(mat.lineStyle).toBe('solid');
      expect(mat.uniforms.gapSize.value).toBe(0.0);
    });

    it('updates resolution and scale for perspective and orthographic cameras', () => {
      const mat = new CartoLineMaterial();
      const perspCamera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
      perspCamera.updateProjectionMatrix();

      mat.updateResolution(perspCamera, 1080);
      expect(mat.uniforms.resolution.value.y).toBe(1080);

      mat.updateResolution(perspCamera, 1920, 1080);
      expect(mat.uniforms.resolution.value.x).toBe(1920);
      expect(mat.uniforms.resolution.value.y).toBe(1080);
      const expectedScale = perspCamera.projectionMatrix.elements[5] * 540;
      expect(mat.uniforms.uResolutionScale.value).toBeCloseTo(expectedScale);

      const orthoCamera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
      orthoCamera.updateProjectionMatrix();
      mat.updateResolution(orthoCamera, 800, 600);
      expect(mat.uniforms.resolution.value.x).toBe(800);
      expect(mat.uniforms.resolution.value.y).toBe(600);
      expect(mat.uniforms.uResolutionScale.value).toBeCloseTo(orthoCamera.projectionMatrix.elements[5] * 300);
    });
  });

  describe('CartoHairlineMaterial (Standard THREE.Line / LineSegments)', () => {
    it('creates a hairline shader material', () => {
      const mat = new CartoHairlineMaterial({ color: '#ff0000', opacity: 0.8 });
      expect(mat.isShaderMaterial).toBe(true);
      expect(mat.transparent).toBe(true);
      expect(mat.uniforms.uOpacity.value).toBe(0.8);
      expect(mat.uniforms.uGapSize.value).toBe(0.0); // Solid
    });

    it('initialises dashed and dotted patterns', () => {
      const dashed = new CartoHairlineMaterial({ lineStyle: 'dashed' });
      expect(dashed.uniforms.uDashSize.value).toBe(CARTO_LINE_CONSTANTS.dashSize);
      expect(dashed.uniforms.uGapSize.value).toBe(CARTO_LINE_CONSTANTS.gapSize);

      const dotted = new CartoHairlineMaterial({ lineStyle: 'dotted' });
      expect(dotted.uniforms.uDashSize.value).toBe(CARTO_LINE_CONSTANTS.dotSize);
      expect(dotted.uniforms.uGapSize.value).toBe(CARTO_LINE_CONSTANTS.dotGap);
    });

    it('mutates color, opacity, style, and pattern in-place', () => {
      const mat = new CartoHairlineMaterial();
      mat.setColor(new THREE.Color(1, 0, 0));
      expect(mat.uniforms.uColor.value.r).toBeCloseTo(1);

      mat.setColor('#00ff00');
      expect(mat.uniforms.uColor.value.g).toBeCloseTo(1);

      mat.setColor(0x0000ff);
      expect(mat.uniforms.uColor.value.b).toBeCloseTo(1);

      mat.setOpacity(0.5);
      expect(mat.uniforms.uOpacity.value).toBe(0.5);

      mat.setLineWidth(2.0); // No-op on hairline, should not throw

      mat.setStyle('dashed');
      expect(mat.lineStyle).toBe('dashed');
      expect(mat.uniforms.uDashSize.value).toBe(CARTO_LINE_CONSTANTS.dashSize);
      expect(mat.uniforms.uGapSize.value).toBe(CARTO_LINE_CONSTANTS.gapSize);

      mat.setStyle('dotted');
      expect(mat.lineStyle).toBe('dotted');
      expect(mat.uniforms.uDashSize.value).toBe(CARTO_LINE_CONSTANTS.dotSize);
      expect(mat.uniforms.uGapSize.value).toBe(CARTO_LINE_CONSTANTS.dotGap);

      mat.setStyle('solid');
      expect(mat.lineStyle).toBe('solid');
      expect(mat.uniforms.uGapSize.value).toBe(0.0);

      mat.setPattern(16, 8); // Omit dashOffset (default 0)
      expect(mat.uniforms.uDashSize.value).toBe(16);
      expect(mat.uniforms.uGapSize.value).toBe(8);
      expect(mat.uniforms.uDashOffset.value).toBe(0);

      mat.setPattern(16, 8, 2);
      expect(mat.uniforms.uDashOffset.value).toBe(2);
    });

    it('updates resolution for cameras', () => {
      const mat = new CartoHairlineMaterial();
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      camera.updateProjectionMatrix();

      mat.updateResolution(camera, 500);
      expect(mat.uniforms.uResolutionScale.value).toBeCloseTo(camera.projectionMatrix.elements[5] * 250);

      mat.updateResolution(camera, 1000, 500);
      expect(mat.uniforms.uResolutionScale.value).toBeCloseTo(camera.projectionMatrix.elements[5] * 250);
    });
  });

  describe('Geometry and Mesh Helpers', () => {
    it('creates LineGeometry from Vector3 array or numbers', () => {
      const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 2, 3)];
      const geom1 = createCartoLineGeometry(points);
      expect(geom1).toBeDefined();

      const geom2 = createCartoLineGeometry([0, 0, 0, 1, 2, 3]);
      expect(geom2).toBeDefined();
    });

    it('creates LineSegmentsGeometry from Vector3 array or numbers', () => {
      const segments = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(2, 0, 0),
        new THREE.Vector3(3, 0, 0),
      ];
      const geom1 = createCartoLineSegmentsGeometry(segments);
      expect(geom1).toBeDefined();

      const geom2 = createCartoLineSegmentsGeometry([0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0]);
      expect(geom2).toBeDefined();
    });

    it('creates Line2 mesh when lineWidth > 1 and THREE.Line when lineWidth === 1', () => {
      const wideMesh = createCartoLineMesh([0, 0, 0, 5, 5, 5], { lineWidth: 3 });
      expect(wideMesh instanceof Line2).toBe(true);

      const hairlineMesh = createCartoLineMesh([0, 0, 0, 5, 5, 5], { lineWidth: 1 });
      expect(hairlineMesh instanceof THREE.Line).toBe(true);

      const hairlineMeshFromV3 = createCartoLineMesh([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1)], { lineWidth: 1 });
      expect(hairlineMeshFromV3 instanceof THREE.Line).toBe(true);
    });

    it('creates LineSegments2 when lineWidth > 1 and THREE.LineSegments when lineWidth === 1', () => {
      const wideSegments = createCartoLineSegmentsMesh([0, 0, 0, 1, 1, 1], { lineWidth: 2 });
      expect(wideSegments instanceof LineSegments2).toBe(true);

      const hairlineSegments = createCartoLineSegmentsMesh([0, 0, 0, 1, 1, 1], { lineWidth: 1 });
      expect(hairlineSegments instanceof THREE.LineSegments).toBe(true);

      const hairlineSegmentsFromV3 = createCartoLineSegmentsMesh([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1)], { lineWidth: 1 });
      expect(hairlineSegmentsFromV3 instanceof THREE.LineSegments).toBe(true);
    });
  });
});
