import { describe, it, expect } from 'vitest'
import { equatorialToCartesian } from '../src/utils/astroMath'
import type { StarmapNode } from '../src/types/astro'
import starsFixture from './fixtures/stars.fixture.json'

describe('equatorialToCartesian', () => {
  it('converts origin (Sol, distance 0) to [0, 0, 0]', () => {
    const coords = equatorialToCartesian(0, 0, 0)
    expect(coords[0]).toBe(0)
    expect(coords[1]).toBe(0)
    expect(coords[2]).toBe(0)
  })

  it('converts cardinal celestial coordinates correctly', () => {
    // RA 0h (0 deg), Dec 0 deg, Dist 10 pc -> [+10, 0, 0]
    const p1 = equatorialToCartesian(0, 0, 10)
    expect(p1[0]).toBeCloseTo(10, 5)
    expect(p1[1]).toBeCloseTo(0, 5)
    expect(p1[2]).toBeCloseTo(0, 5)

    // RA 6h (90 deg), Dec 0 deg, Dist 10 pc -> [0, +10, 0]
    const p2 = equatorialToCartesian(6, 0, 10)
    expect(p2[0]).toBeCloseTo(0, 5)
    expect(p2[1]).toBeCloseTo(10, 5)
    expect(p2[2]).toBeCloseTo(0, 5)

    // RA 12h (180 deg), Dec 0 deg, Dist 10 pc -> [-10, 0, 0]
    const p3 = equatorialToCartesian(12, 0, 10)
    expect(p3[0]).toBeCloseTo(-10, 5)
    expect(p3[1]).toBeCloseTo(0, 5)
    expect(p3[2]).toBeCloseTo(0, 5)

    // RA 18h (270 deg), Dec 0 deg, Dist 10 pc -> [0, -10, 0]
    const p4 = equatorialToCartesian(18, 0, 10)
    expect(p4[0]).toBeCloseTo(0, 5)
    expect(p4[1]).toBeCloseTo(-10, 5)
    expect(p4[2]).toBeCloseTo(0, 5)

    // North celestial pole: Dec +90 deg -> [0, 0, +10]
    const northPole = equatorialToCartesian(0, 90, 10)
    expect(northPole[0]).toBeCloseTo(0, 5)
    expect(northPole[1]).toBeCloseTo(0, 5)
    expect(northPole[2]).toBeCloseTo(10, 5)

    // South celestial pole: Dec -90 deg -> [0, 0, -10]
    const southPole = equatorialToCartesian(0, -90, 10)
    expect(southPole[0]).toBeCloseTo(0, 5)
    expect(southPole[1]).toBeCloseTo(0, 5)
    expect(southPole[2]).toBeCloseTo(-10, 5)
  })

  it('accurately matches known stars in control group fixture', () => {
    const stars = starsFixture as StarmapNode[]

    for (const star of stars) {
      if (star.dist === 0) continue
      const [x, y, z] = equatorialToCartesian(star.ra, star.dec, star.dist)

      // Compare calculated XYZ against HYG CSV catalog XYZ coordinates
      // HYG uses the exact same equatorial coordinate formula
      expect(x).toBeCloseTo(star.x, 3)
      expect(y).toBeCloseTo(star.y, 3)
      expect(z).toBeCloseTo(star.z, 3)
    }
  })

  it('supports writing directly into an existing buffer or array (zero-allocation)', () => {
    const buffer = new Float32Array(6)
    // Star 1 at offset 0
    equatorialToCartesian(0, 0, 10, buffer, 0)
    expect(buffer[0]).toBeCloseTo(10, 5)
    expect(buffer[1]).toBeCloseTo(0, 5)
    expect(buffer[2]).toBeCloseTo(0, 5)

    // Star 2 at offset 3
    equatorialToCartesian(6, 0, 5, buffer, 3)
    expect(buffer[3]).toBeCloseTo(0, 5)
    expect(buffer[4]).toBeCloseTo(5, 5)
    expect(buffer[5]).toBeCloseTo(0, 5)
  })
})
