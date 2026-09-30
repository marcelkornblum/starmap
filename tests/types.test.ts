import { describe, it, expect } from 'vitest'
import type { StarmapNode } from '../src/types/astro'
import starsFixture from './fixtures/stars.fixture.json'

describe('StarmapNode Type & Fixtures', () => {
  it('loads stars.fixture.json conforming to StarmapNode structure', () => {
    const stars: StarmapNode[] = starsFixture

    expect(stars.length).toBeGreaterThanOrEqual(5)

    for (const star of stars) {
      expect(typeof star.id).toBe('number')
      expect(typeof star.name).toBe('string')
      expect(typeof star.ra).toBe('number')
      expect(typeof star.dec).toBe('number')
      expect(typeof star.dist).toBe('number')
      expect(typeof star.x).toBe('number')
      expect(typeof star.y).toBe('number')
      expect(typeof star.z).toBe('number')
      expect(typeof star.mag).toBe('number')
      expect(typeof star.absmag).toBe('number')
    }
  })

  it('contains Sol at the origin', () => {
    const sol = (starsFixture as StarmapNode[]).find((s) => s.name === 'Sol')
    expect(sol).toBeDefined()
    expect(sol?.dist).toBe(0)
    expect(sol?.x).toBe(0)
    expect(sol?.y).toBe(0)
    expect(sol?.z).toBe(0)
  })

  it('contains Sirius with expected celestial properties', () => {
    const sirius = (starsFixture as StarmapNode[]).find((s) => s.name === 'Sirius')
    expect(sirius).toBeDefined()
    expect(sirius?.hip).toBe(32349)
    expect(sirius?.con).toBe('CMa')
    expect(sirius?.dist).toBeCloseTo(2.6371, 3)
  })
})
