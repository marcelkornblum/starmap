import { describe, it, expect } from 'vitest';
import {
  buildOrbitGeometries,
  buildOrbitPathLineGeometry,
  buildPeriapsisTickGeometry,
  buildDirectionChevronGeometry,
} from './orbitPathGeometry';

describe('orbitPathGeometry', () => {
  it('builds orbit path LineGeometry for circular orbit', () => {
    const geom = buildOrbitPathLineGeometry(10, 0, 0, 256, 0, 0);
    expect(geom).toBeDefined();
    expect(geom.attributes.instanceStart.count).toBe(256);
    geom.dispose();
  });

  it('builds periapsis tick geometry when enabled', () => {
    const tick = buildPeriapsisTickGeometry(10, 0.2, 0, 0, 0);
    expect(tick).not.toBeNull();
    expect(tick?.attributes.position.count).toBe(2);
    tick?.dispose();
  });

  it('builds direction chevron geometry and tangent vectors', () => {
    const dir = buildDirectionChevronGeometry(10, 0.2, 0, 0, 0);
    expect(dir.geometry).not.toBeNull();
    expect(dir.arrowPosition).toBeDefined();
    expect(dir.arrowTangent).toBeDefined();
    expect(dir.geometry?.attributes.position.count).toBe(6); // 2 triangles = 6 vertices
    dir.geometry?.dispose();
  });

  it('buildOrbitGeometries combines all geometries and handles option toggles', () => {
    const full = buildOrbitGeometries({
      semiMajorAxis: 5,
      eccentricity: 0.1,
      inclination: 15,
      ascendingNode: 30,
      argumentOfPeriapsis: 45,
      segments: 256,
      showPeriapsisTick: true,
      showDirectionIndicator: true,
    });

    expect(full.orbitGeometry).toBeDefined();
    expect(full.tickGeometry).not.toBeNull();
    expect(full.directionGeometry).not.toBeNull();
    expect(full.arrowPosition.length).toBe(3);
    expect(full.arrowTangent.length).toBe(3);

    full.orbitGeometry.dispose();
    full.tickGeometry?.dispose();
    full.directionGeometry?.dispose();

    const noExtras = buildOrbitGeometries({
      semiMajorAxis: 5,
      showPeriapsisTick: false,
      showDirectionIndicator: false,
    });

    expect(noExtras.tickGeometry).toBeNull();
    expect(noExtras.directionGeometry).toBeNull();
    noExtras.orbitGeometry.dispose();
  });

  it('honors requested segment counts below 256 instead of forcing 256 segments', () => {
    const res = buildOrbitGeometries({
      semiMajorAxis: 5,
      segments: 96,
      showPeriapsisTick: false,
      showDirectionIndicator: false,
    });
    expect(res.orbitGeometry.attributes.instanceStart.count).toBe(96);
    res.orbitGeometry.dispose();
  });

  it('clamps invalid eccentricity and handles non-positive semiMajorAxis', () => {
    const clamped = buildOrbitGeometries({
      semiMajorAxis: -5,
      eccentricity: 1.5,
    });
    expect(clamped.orbitGeometry).toBeDefined();
    clamped.orbitGeometry.dispose();
    clamped.tickGeometry?.dispose();
    clamped.directionGeometry?.dispose();
  });
});
