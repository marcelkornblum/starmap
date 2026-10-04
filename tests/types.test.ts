import { describe, it, expect } from 'vitest';
import type { StarmapNode, SystemManifest, DetailedPlanetRecord } from '../src/types/astro';
import starsFixture from './fixtures/stars.fixture.json';
import systemFixture from './fixtures/system.fixture.json';
import planetFixture from './fixtures/planet.fixture.json';

describe('StarmapNode Type & Fixtures', () => {
  it('loads stars.fixture.json conforming to StarmapNode structure', () => {
    const stars: StarmapNode[] = starsFixture;

    expect(stars.length).toBeGreaterThanOrEqual(5);

    for (const star of stars) {
      expect(typeof star.id).toBe('number');
      expect(typeof star.name).toBe('string');
      expect(typeof star.ra).toBe('number');
      expect(typeof star.dec).toBe('number');
      expect(typeof star.dist).toBe('number');
      expect(typeof star.x).toBe('number');
      expect(typeof star.y).toBe('number');
      expect(typeof star.z).toBe('number');
      expect(typeof star.mag).toBe('number');
      expect(typeof star.absmag).toBe('number');
    }
  });

  it('contains Sol at the origin', () => {
    const sol = (starsFixture as StarmapNode[]).find((s) => s.name === 'Sol');
    expect(sol).toBeDefined();
    expect(sol?.dist).toBe(0);
    expect(sol?.x).toBe(0);
    expect(sol?.y).toBe(0);
    expect(sol?.z).toBe(0);
  });

  it('contains Sirius with expected celestial properties', () => {
    const sirius = (starsFixture as StarmapNode[]).find((s) => s.name === 'Sirius');
    expect(sirius).toBeDefined();
    expect(sirius?.hip).toBe(32349);
    expect(sirius?.con).toBe('CMa');
    expect(sirius?.dist).toBeCloseTo(2.6371, 3);
  });
});

describe('SystemManifest Type & Fixtures', () => {
  it('loads system.fixture.json conforming to SystemManifest structure', () => {
    const systems: SystemManifest[] = systemFixture;
    expect(systems.length).toBe(2);

    for (const system of systems) {
      expect(typeof system.id).toBe('string');
      expect(typeof system.name).toBe('string');
      expect(typeof system.x).toBe('number');
      expect(typeof system.y).toBe('number');
      expect(typeof system.z).toBe('number');
      expect(typeof system.dist).toBe('number');
      expect(system.stars.length).toBeGreaterThan(0);
      expect(system.planets.length).toBeGreaterThan(0);
    }
  });

  it('contains full rich Sol system with 8 planets', () => {
    const sol = (systemFixture as SystemManifest[]).find((s) => s.id === 'sol');
    expect(sol).toBeDefined();
    expect(sol?.dist).toBe(0);
    expect(sol?.stars[0].spectralType).toBe('G2V');
    expect(sol?.planets.length).toBe(8);

    const earth = sol?.planets.find((p) => p.name === 'Earth');
    expect(earth).toBeDefined();
    expect(earth?.orbit?.semiMajorAxis).toBe(1.0);
    expect(earth?.orbit?.eccentricity).toBeCloseTo(0.0167, 4);
    expect(earth?.esi).toBe(1.0);
  });

  it('contains observationally constrained Tau Ceti system with 4 confirmed exoplanets', () => {
    const tauCeti = (systemFixture as SystemManifest[]).find((s) => s.id === 'tau-ceti');
    expect(tauCeti).toBeDefined();
    expect(tauCeti?.dist).toBeCloseTo(3.65, 2);
    expect(tauCeti?.stars[0].spectralType).toBe('G8.5V');
    expect(tauCeti?.planets.length).toBe(4);

    const tauCetiE = tauCeti?.planets.find((p) => p.name === 'Tau Ceti e');
    expect(tauCetiE).toBeDefined();
    expect(tauCetiE?.letter).toBe('e');
    expect(tauCetiE?.massMearth).toBeCloseTo(3.93, 2);
    expect(tauCetiE?.orbit?.semiMajorAxis).toBeCloseTo(0.538, 3);
  });
});

describe('DetailedPlanetRecord Type & Fixtures', () => {
  it('loads planet.fixture.json conforming to DetailedPlanetRecord structure', () => {
    const planets: DetailedPlanetRecord[] = planetFixture as DetailedPlanetRecord[];
    expect(planets.length).toBe(2);

    const earth = planets.find((p) => p.id === 'earth');
    expect(earth).toBeDefined();
    expect(earth?.classification).toBe('Terrestrial');
    expect(earth?.hazardStatus).toBe('nominal');
    expect(earth?.surfaceGravityG).toBe(1.0);
    expect(earth?.atmosphere).toContain('N₂');
    expect(earth?.moons?.length).toBe(1);

    const tauCetiE = planets.find((p) => p.id === 'tau-ceti-e');
    expect(tauCetiE).toBeDefined();
    expect(tauCetiE?.classification).toBe('Super-Earth');
    expect(tauCetiE?.hazardStatus).toBe('caution');
    expect(tauCetiE?.atmosphere).toBeNull();
    expect(tauCetiE?.axialTiltDeg).toBeNull();
    expect(tauCetiE?.uncertainties?.massMearth).toBe(0.8);
    expect(tauCetiE?.uncertainties?.radiusRearth).toBe(0.4);
  });
});

