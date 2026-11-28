import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  DATUM_FILL_VERTEX_SHADER,
  DATUM_FILL_FRAGMENT_SHADER,
  buildPlanarBaseGeometries,
  buildPlanarGridGeometry,
  updateOrbitalDashedLine,
  assignExplicitFootprintFade,
  updateExplicitFootprintChild,
} from './planarGridGeometry';

describe('planarGridGeometry', () => {
  it('exports valid shader strings', () => {
    expect(DATUM_FILL_VERTEX_SHADER).toContain('gl_Position');
    expect(DATUM_FILL_FRAGMENT_SHADER).toContain('gl_FragColor');
    expect(DATUM_FILL_FRAGMENT_SHADER).toContain('uInnerRadius');
  });

  it('derives rimTint from uColor in DATUM_FILL_FRAGMENT_SHADER without mixing toward white', () => {
    expect(DATUM_FILL_FRAGMENT_SHADER).toContain('vec3 rimTint = clamp(uColor * 1.35 + vec3(0.02, 0.10, 0.07), 0.0, 1.0);');
    expect(DATUM_FILL_FRAGMENT_SHADER).toContain('mix(uColor, rimTint, rimGlow * 0.65)');
    expect(DATUM_FILL_FRAGMENT_SHADER).not.toContain('mix(uColor, vec3(1.0)');
  });

  it('builds boundary, fill, and core bearing base geometries', () => {
    const { boundaryGeom, fillCircleGeom, bearingCoreGeom } = buildPlanarBaseGeometries();
    expect(boundaryGeom).toBeInstanceOf(THREE.BufferGeometry);
    expect(fillCircleGeom).toBeInstanceOf(THREE.BufferGeometry);
    expect(bearingCoreGeom).toBeInstanceOf(THREE.BufferGeometry);

    boundaryGeom.dispose();
    fillCircleGeom.dispose();
    bearingCoreGeom.dispose();
  });

  it('builds planar grid circular geometry', () => {
    const gridGeom = buildPlanarGridGeometry(10, 2.5, 2000);
    expect(gridGeom).toBeInstanceOf(THREE.BufferGeometry);
    gridGeom.dispose();
  });

  it('updates curved dashed orbital line buffer and draw range', () => {
    const buffer = new Float32Array(3000);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(buffer, 3));

    updateOrbitalDashedLine(buffer, geom, 10, 2000, 1.0);
    expect(geom.drawRange.count).toBeGreaterThan(0);
    geom.dispose();
  });

  it('updates explicit footprint child opacity with fadePlanar', () => {
    const mat = new THREE.LineBasicMaterial({ opacity: 0.8 });
    const line = new THREE.LineSegments(new THREE.BufferGeometry(), mat);

    assignExplicitFootprintFade(0.5);
    updateExplicitFootprintChild(line);
    expect(mat.opacity).toBeCloseTo(0.4);
    expect(line.userData.baseOpacity).toBe(0.8);
  });
});
