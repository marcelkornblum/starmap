import { describe, it, expect } from 'vitest';
import {
  equatorialToCartesian,
  rotateToOrbitalPlane,
  parseKinematicVector,
  PARSECS_PER_YEAR_TO_KMS,
  DEG_TO_RADIANS,
  EARTH_OBLIQUITY_DEG,
  EARTH_OBLIQUITY_RAD,
} from './astroCoordinates';
import type { StarmapNode } from '../types/astro';
import starsFixture from '../../tests/fixtures/stars.fixture.json';

describe('equatorialToCartesian', () => {
  it('converts origin (Sol, distance 0) to [0, 0, 0]', () => {
    const coords = equatorialToCartesian(0, 0, 0);
    expect(coords[0]).toBe(0);
    expect(coords[1]).toBe(0);
    expect(coords[2]).toBe(0);
  });

  it('converts cardinal celestial coordinates correctly', () => {
    const p1 = equatorialToCartesian(0, 0, 10);
    expect(p1[0]).toBeCloseTo(10, 5);
    expect(p1[1]).toBeCloseTo(0, 5);
    expect(p1[2]).toBeCloseTo(0, 5);

    const p2 = equatorialToCartesian(6, 0, 10);
    expect(p2[0]).toBeCloseTo(0, 5);
    expect(p2[1]).toBeCloseTo(10, 5);
    expect(p2[2]).toBeCloseTo(0, 5);

    const p3 = equatorialToCartesian(12, 0, 10);
    expect(p3[0]).toBeCloseTo(-10, 5);
    expect(p3[1]).toBeCloseTo(0, 5);
    expect(p3[2]).toBeCloseTo(0, 5);

    const p4 = equatorialToCartesian(18, 0, 10);
    expect(p4[0]).toBeCloseTo(0, 5);
    expect(p4[1]).toBeCloseTo(-10, 5);
    expect(p4[2]).toBeCloseTo(0, 5);

    const northPole = equatorialToCartesian(0, 90, 10);
    expect(northPole[0]).toBeCloseTo(0, 5);
    expect(northPole[1]).toBeCloseTo(0, 5);
    expect(northPole[2]).toBeCloseTo(10, 5);

    const southPole = equatorialToCartesian(0, -90, 10);
    expect(southPole[0]).toBeCloseTo(0, 5);
    expect(southPole[1]).toBeCloseTo(0, 5);
    expect(southPole[2]).toBeCloseTo(-10, 5);
  });

  it('accurately matches known stars in control group fixture', () => {
    const stars = starsFixture as StarmapNode[];

    for (const star of stars) {
      if (star.dist === 0) continue;
      const [x, y, z] = equatorialToCartesian(star.ra, star.dec, star.dist);

      expect(x).toBeCloseTo(star.x, 3);
      expect(y).toBeCloseTo(star.y, 3);
      expect(z).toBeCloseTo(star.z, 3);
    }
  });

  it('supports writing directly into an existing buffer or array (zero-allocation)', () => {
    const buffer = new Float32Array(6);
    equatorialToCartesian(0, 0, 10, buffer, 0);
    expect(buffer[0]).toBeCloseTo(10, 5);
    expect(buffer[1]).toBeCloseTo(0, 5);
    expect(buffer[2]).toBeCloseTo(0, 5);

    equatorialToCartesian(6, 0, 5, buffer, 3);
    expect(buffer[3]).toBeCloseTo(0, 5);
    expect(buffer[4]).toBeCloseTo(5, 5);
    expect(buffer[5]).toBeCloseTo(0, 5);
  });

  it('throws RangeError when target buffer offset is invalid or overflows', () => {
    const buffer = new Float32Array(3);
    expect(() => equatorialToCartesian(0, 0, 10, buffer, -1)).toThrow(RangeError);
    expect(() => equatorialToCartesian(0, 0, 10, buffer, 1)).toThrow(RangeError);
    expect(() => equatorialToCartesian(0, 0, 0, buffer, -1)).toThrow(RangeError);
    expect(() => equatorialToCartesian(0, 0, 0, buffer, 1)).toThrow(RangeError);
    expect(() => equatorialToCartesian(0, 0, 10, buffer, 1.5)).toThrow(RangeError);
  });

  it('converts origin (Sol, distance 0) into provided target buffer', () => {
    const buffer = new Float32Array([1, 2, 3]);
    const res = equatorialToCartesian(0, 0, 0, buffer, 0);
    expect(res).toBe(buffer);
    expect(buffer[0]).toBe(0);
    expect(buffer[1]).toBe(0);
    expect(buffer[2]).toBe(0);
  });

  it('exports accurate astronomical constants including Earth obliquity', () => {
    expect(EARTH_OBLIQUITY_DEG).toBeCloseTo(23.4393, 3);
    expect(EARTH_OBLIQUITY_RAD).toBeCloseTo(23.4393 * DEG_TO_RADIANS, 5);
  });
});

describe('rotateToOrbitalPlane', () => {
  it('leaves coordinates unchanged when inclination is 0 (identity rotation)', () => {
    const buffer = new Float32Array([10, 20, 30, -5, 12, 42]);
    const returned = rotateToOrbitalPlane(buffer, 0, 0);

    expect(returned).toBe(buffer);
    expect(buffer[0]).toBeCloseTo(10, 5);
    expect(buffer[1]).toBeCloseTo(20, 5);
    expect(buffer[2]).toBeCloseTo(30, 5);
    expect(buffer[3]).toBeCloseTo(-5, 5);
    expect(buffer[4]).toBeCloseTo(12, 5);
    expect(buffer[5]).toBeCloseTo(42, 5);
  });

  it("tilts coordinates by 23.5 degrees (Earth's ecliptic test)", () => {
    const tiltDeg = 23.5;
    const tiltRad = tiltDeg * DEG_TO_RADIANS;
    const buffer = new Float32Array([0, 0, 100]);

    rotateToOrbitalPlane(buffer, tiltRad, 0);

    expect(buffer[0]).toBeCloseTo(0, 4);
    expect(buffer[1]).toBeCloseTo(100 * Math.sin(tiltRad), 4);
    expect(buffer[2]).toBeCloseTo(100 * Math.cos(tiltRad), 4);

    const [bx = 0, by = 0, bz = 0] = buffer;
    const dist = Math.sqrt(bx ** 2 + by ** 2 + bz ** 2);
    expect(dist).toBeCloseTo(100, 4);
  });

  it('supports degrees option for convenience', () => {
    const buffer = new Float32Array([0, 0, 100]);
    rotateToOrbitalPlane(buffer, 23.5, 0, { degrees: true });

    const expectedRad = 23.5 * DEG_TO_RADIANS;
    expect(buffer[0]).toBeCloseTo(0, 4);
    expect(buffer[1]).toBeCloseTo(100 * Math.sin(expectedRad), 4);
    expect(buffer[2]).toBeCloseTo(100 * Math.cos(expectedRad), 4);
  });

  it('correctly rotates with non-zero ascending node', () => {
    const buffer = new Float32Array([100, 0, 0]);
    rotateToOrbitalPlane(buffer, 90, 90, { degrees: true });

    const [bx = 0, by = 0, bz = 0] = buffer;
    const dist = Math.sqrt(bx ** 2 + by ** 2 + bz ** 2);
    expect(dist).toBeCloseTo(100, 4);
  });

  it('preserves distances for bulk fixture stars during rotation', () => {
    const stars = starsFixture as StarmapNode[];
    const buffer = new Float32Array(stars.length * 3);

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      if (!star) continue;
      buffer[i * 3] = star.x;
      buffer[i * 3 + 1] = star.y;
      buffer[i * 3 + 2] = star.z;
    }

    rotateToOrbitalPlane(buffer, 45, 30, { degrees: true });

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      if (!star) continue;
      const origDist = Math.sqrt(star.x ** 2 + star.y ** 2 + star.z ** 2);
      const rx = buffer[i * 3] ?? 0;
      const ry = buffer[i * 3 + 1] ?? 0;
      const rz = buffer[i * 3 + 2] ?? 0;
      const rotatedDist = Math.sqrt(rx ** 2 + ry ** 2 + rz ** 2);
      expect(rotatedDist).toBeCloseTo(origDist, 3);
    }
  });

  it('performs bulk transformation efficiently without errors on empty or odd-length buffers', () => {
    const emptyBuffer = new Float32Array(0);
    expect(rotateToOrbitalPlane(emptyBuffer, 10, 10)).toBe(emptyBuffer);
  });

  it('handles non-finite inclination or ascendingNode safely', () => {
    const buffer = new Float32Array([10, 20, 30]);
    expect(rotateToOrbitalPlane(buffer, NaN, 0)).toBe(buffer);
    expect(rotateToOrbitalPlane(buffer, Infinity, 0)).toBe(buffer);
    expect(rotateToOrbitalPlane(buffer, 23.5, NaN, { degrees: true })).toBe(buffer);
  });
});

describe('parseKinematicVector', () => {
  it('returns undefined if Cartesian velocity components are missing or NaN', () => {
    expect(parseKinematicVector(undefined, 0, 0)).toBeUndefined();
    expect(parseKinematicVector(0, null, 0)).toBeUndefined();
    expect(parseKinematicVector(0, 0, NaN)).toBeUndefined();
  });

  it('correctly parses zero velocity for Sol', () => {
    const vec = parseKinematicVector(0, 0, 0, 0, 0, 0);
    expect(vec).toBeDefined();
    expect(vec?.vx).toBe(0);
    expect(vec?.vy).toBe(0);
    expect(vec?.vz).toBe(0);
    expect(vec?.speed).toBe(0);
    expect(vec?.radialVelocity).toBe(0);
    expect(vec?.pmra).toBe(0);
    expect(vec?.pmdec).toBe(0);
  });

  it('accurately converts pc/yr to km/s for Sirius kinematics', () => {
    const vxPcYr = -0.00000414;
    const vyPcYr = 0.00002073;
    const vzPcYr = -0.0000109;
    const rv = -7.6;
    const pmra = -546.01;
    const pmdec = -1223.07;

    const vec = parseKinematicVector(vxPcYr, vyPcYr, vzPcYr, pmra, pmdec, rv);
    expect(vec).toBeDefined();
    expect(vec?.vx).toBeCloseTo(vxPcYr * PARSECS_PER_YEAR_TO_KMS, 2);
    expect(vec?.vy).toBeCloseTo(vyPcYr * PARSECS_PER_YEAR_TO_KMS, 2);
    expect(vec?.vz).toBeCloseTo(vzPcYr * PARSECS_PER_YEAR_TO_KMS, 2);
    expect(vec?.speed).toBeCloseTo(23.25, 1);
    expect(vec?.radialVelocity).toBe(-7.6);
    expect(vec?.pmra).toBe(-546.01);
    expect(vec?.pmdec).toBe(-1223.07);
  });

  it('handles undefined, null, or NaN optional proper motion and radial velocity', () => {
    const vecOmitted = parseKinematicVector(0.00001, 0.00002, 0.00003);
    expect(vecOmitted).toBeDefined();
    expect(vecOmitted?.pmra).toBeUndefined();
    expect(vecOmitted?.pmdec).toBeUndefined();
    expect(vecOmitted?.radialVelocity).toBeUndefined();

    const vecNull = parseKinematicVector(0.00001, 0.00002, 0.00003, null, null, null);
    expect(vecNull).toBeDefined();
    expect(vecNull?.pmra).toBeUndefined();
    expect(vecNull?.pmdec).toBeUndefined();
    expect(vecNull?.radialVelocity).toBeUndefined();

    const vecNaN = parseKinematicVector(0.00001, 0.00002, 0.00003, NaN, NaN, NaN);
    expect(vecNaN).toBeDefined();
    expect(vecNaN?.pmra).toBeUndefined();
    expect(vecNaN?.pmdec).toBeUndefined();
    expect(vecNaN?.radialVelocity).toBeUndefined();
  });
});
