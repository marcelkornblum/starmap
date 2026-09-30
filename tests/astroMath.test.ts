import { describe, it, expect } from 'vitest';
import {
  equatorialToCartesian,
  rotateToOrbitalPlane,
  parseKinematicVector,
  formatSectorId,
  getSectorBounds,
  DEFAULT_SECTOR_SIZE_PC,
  PARSECS_PER_YEAR_TO_KMS,
  DEG_TO_RADIANS,
  EARTH_OBLIQUITY_DEG,
  EARTH_OBLIQUITY_RAD,
} from '../src/utils/astroMath';
import type { StarmapNode } from '../src/types/astro';
import starsFixture from './fixtures/stars.fixture.json';

describe('equatorialToCartesian', () => {
  it('converts origin (Sol, distance 0) to [0, 0, 0]', () => {
    const coords = equatorialToCartesian(0, 0, 0);
    expect(coords[0]).toBe(0);
    expect(coords[1]).toBe(0);
    expect(coords[2]).toBe(0);
  });

  it('converts cardinal celestial coordinates correctly', () => {
    // RA 0h (0 deg), Dec 0 deg, Dist 10 pc -> [+10, 0, 0]
    const p1 = equatorialToCartesian(0, 0, 10);
    expect(p1[0]).toBeCloseTo(10, 5);
    expect(p1[1]).toBeCloseTo(0, 5);
    expect(p1[2]).toBeCloseTo(0, 5);

    // RA 6h (90 deg), Dec 0 deg, Dist 10 pc -> [0, +10, 0]
    const p2 = equatorialToCartesian(6, 0, 10);
    expect(p2[0]).toBeCloseTo(0, 5);
    expect(p2[1]).toBeCloseTo(10, 5);
    expect(p2[2]).toBeCloseTo(0, 5);

    // RA 12h (180 deg), Dec 0 deg, Dist 10 pc -> [-10, 0, 0]
    const p3 = equatorialToCartesian(12, 0, 10);
    expect(p3[0]).toBeCloseTo(-10, 5);
    expect(p3[1]).toBeCloseTo(0, 5);
    expect(p3[2]).toBeCloseTo(0, 5);

    // RA 18h (270 deg), Dec 0 deg, Dist 10 pc -> [0, -10, 0]
    const p4 = equatorialToCartesian(18, 0, 10);
    expect(p4[0]).toBeCloseTo(0, 5);
    expect(p4[1]).toBeCloseTo(-10, 5);
    expect(p4[2]).toBeCloseTo(0, 5);

    // North celestial pole: Dec +90 deg -> [0, 0, +10]
    const northPole = equatorialToCartesian(0, 90, 10);
    expect(northPole[0]).toBeCloseTo(0, 5);
    expect(northPole[1]).toBeCloseTo(0, 5);
    expect(northPole[2]).toBeCloseTo(10, 5);

    // South celestial pole: Dec -90 deg -> [0, 0, -10]
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

      // Compare calculated XYZ against HYG CSV catalog XYZ coordinates
      expect(x).toBeCloseTo(star.x, 3);
      expect(y).toBeCloseTo(star.y, 3);
      expect(z).toBeCloseTo(star.z, 3);
    }
  });

  it('supports writing directly into an existing buffer or array (zero-allocation)', () => {
    const buffer = new Float32Array(6);
    // Star 1 at offset 0
    equatorialToCartesian(0, 0, 10, buffer, 0);
    expect(buffer[0]).toBeCloseTo(10, 5);
    expect(buffer[1]).toBeCloseTo(0, 5);
    expect(buffer[2]).toBeCloseTo(0, 5);

    // Star 2 at offset 3
    equatorialToCartesian(6, 0, 5, buffer, 3);
    expect(buffer[3]).toBeCloseTo(0, 5);
    expect(buffer[4]).toBeCloseTo(5, 5);
    expect(buffer[5]).toBeCloseTo(0, 5);
  });

  it('throws RangeError when target buffer offset is invalid or overflows', () => {
    const buffer = new Float32Array(3);
    expect(() => equatorialToCartesian(0, 0, 10, buffer, -1)).toThrow(RangeError);
    expect(() => equatorialToCartesian(0, 0, 10, buffer, 1)).toThrow(RangeError);
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

    expect(returned).toBe(buffer); // Must mutate in-place and return same reference
    expect(buffer[0]).toBeCloseTo(10, 5);
    expect(buffer[1]).toBeCloseTo(20, 5);
    expect(buffer[2]).toBeCloseTo(30, 5);
    expect(buffer[3]).toBeCloseTo(-5, 5);
    expect(buffer[4]).toBeCloseTo(12, 5);
    expect(buffer[5]).toBeCloseTo(42, 5);
  });

  it("tilts coordinates by 23.5 degrees (Earth's ecliptic test)", () => {
    // Star on Z-axis (North celestial pole): [0, 0, 100]
    // Line of nodes Omega = 0 (tilt axis is X-axis)
    const tiltDeg = 23.5;
    const tiltRad = tiltDeg * DEG_TO_RADIANS;
    const buffer = new Float32Array([0, 0, 100]);

    rotateToOrbitalPlane(buffer, tiltRad, 0);

    // X should remain 0 (on rotation axis)
    expect(buffer[0]).toBeCloseTo(0, 4);
    // Y tilted by sin(23.5 deg) * 100
    expect(buffer[1]).toBeCloseTo(100 * Math.sin(tiltRad), 4);
    // Z tilted by cos(23.5 deg) * 100
    expect(buffer[2]).toBeCloseTo(100 * Math.cos(tiltRad), 4);

    // Radial distance must remain strictly preserved
    const dist = Math.sqrt(buffer[0] ** 2 + buffer[1] ** 2 + buffer[2] ** 2);
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
    // Star initially at [100, 0, 0]
    // Ascending node at 90 degrees (tilt axis is Y-axis)
    // Tilting by 90 degrees around Y-axis brings X onto -Z or +Z
    const buffer = new Float32Array([100, 0, 0]);
    rotateToOrbitalPlane(buffer, 90, 90, { degrees: true });

    const dist = Math.sqrt(buffer[0] ** 2 + buffer[1] ** 2 + buffer[2] ** 2);
    expect(dist).toBeCloseTo(100, 4);
  });

  it('preserves distances for bulk fixture stars during rotation', () => {
    const stars = starsFixture as StarmapNode[];
    const buffer = new Float32Array(stars.length * 3);

    // Populate buffer with fixture XYZ coordinates
    for (let i = 0; i < stars.length; i++) {
      buffer[i * 3] = stars[i].x;
      buffer[i * 3 + 1] = stars[i].y;
      buffer[i * 3 + 2] = stars[i].z;
    }

    // Rotate all stars by 45 degrees inclination, 30 degrees node
    rotateToOrbitalPlane(buffer, 45, 30, { degrees: true });

    for (let i = 0; i < stars.length; i++) {
      const origDist = Math.sqrt(stars[i].x ** 2 + stars[i].y ** 2 + stars[i].z ** 2);
      const rotatedDist = Math.sqrt(
        buffer[i * 3] ** 2 + buffer[i * 3 + 1] ** 2 + buffer[i * 3 + 2] ** 2,
      );
      expect(rotatedDist).toBeCloseTo(origDist, 3);
    }
  });

  it('performs bulk transformation efficiently without errors on empty or odd-length buffers', () => {
    const emptyBuffer = new Float32Array(0);
    expect(rotateToOrbitalPlane(emptyBuffer, 10, 10)).toBe(emptyBuffer);
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
    // Sirius in HYG: vx = -0.00000414, vy = 0.00002073, vz = -0.00001090 pc/yr, rv = -7.6 km/s
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
    // Sirius relative space velocity is ~23.3 km/s
    expect(vec?.speed).toBeCloseTo(23.25, 1);
    expect(vec?.radialVelocity).toBe(-7.6);
    expect(vec?.pmra).toBe(-546.01);
    expect(vec?.pmdec).toBe(-1223.07);
  });
});

describe('Spatial Sector Partitioning (formatSectorId & getSectorBounds)', () => {
  it('formats coordinates into standardized 3D sector IDs', () => {
    expect(formatSectorId(0, 0, 0)).toBe('sector_+000_+000_+000');
    expect(formatSectorId(12.5, -34.8, 48.2)).toBe('sector_+000_-050_+025');
    expect(formatSectorId(25, -25, 75)).toBe('sector_+025_-025_+075');
    expect(formatSectorId(-0.1, -0.1, -0.1)).toBe('sector_-025_-025_-025');
  });

  it('correctly resolves bounding boxes from sector IDs', () => {
    const bounds = getSectorBounds('sector_+025_-050_+000', DEFAULT_SECTOR_SIZE_PC);
    expect(bounds).not.toBeNull();
    expect(bounds?.min).toEqual({ x: 25, y: -50, z: 0 });
    expect(bounds?.max).toEqual({ x: 50, y: -25, z: 25 });
  });

  it('returns null for invalid sector ID strings', () => {
    expect(getSectorBounds('invalid_sector_name')).toBeNull();
    expect(getSectorBounds('sector_+12_-34_+56')).toBeNull();
  });
});
