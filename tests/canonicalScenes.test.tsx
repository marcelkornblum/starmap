// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import * as THREE from 'three';
import { GalaxyScene, SystemScene, PlanetScene } from '../src/components/canvas/scenes';
import type { SpatialEntityDefinition } from '../src/components/canvas/entity/SpatialEntityStore';
import type { StarDossierData } from '../src/components/canvas/scenes/SystemScene';

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useFrame: vi.fn(),
    useThree: () => ({
      camera: new THREE.PerspectiveCamera(45, 1, 0.1, 1000),
      gl: { setClearColor: vi.fn() },
      scene: new THREE.Scene(),
      size: { width: 1920, height: 1080 },
    }),
  };
});

const mockAdditionalEntities: readonly SpatialEntityDefinition[] = [
  {
    id: 'sol',
    name: 'Sol',
    position: [0, 0, 0],
    classification: 'star',
    spectralType: 'G2V',
  },
  {
    id: 'alpha-centauri',
    name: 'Alpha Centauri',
    position: [-1.34, -0.2, 0.1],
    classification: 'star',
    spectralType: 'G2V',
  },
];

const mockSolSystem: StarDossierData = {
  id: 'sol',
  name: 'Sol',
  spectralType: 'G2V',
  planets: [
    {
      id: 'earth',
      name: 'Earth',
      letter: 'b',
      composition: 'terrestrial',
      orbit: {
        semiMajorAxis: 1.0,
        eccentricity: 0.017,
        inclination: 0,
        ascendingNode: 0,
        argumentOfPeriapsis: 0,
        meanAnomaly: 0,
        periodDays: 365.25,
      },
    },
    {
      id: 'jupiter',
      name: 'Jupiter',
      letter: 'c',
      composition: 'gas-giant',
      orbit: {
        semiMajorAxis: 5.2,
        eccentricity: 0.048,
        inclination: 1.3,
        ascendingNode: 100,
        argumentOfPeriapsis: 273,
        meanAnomaly: 45,
        periodDays: 4332.6,
      },
    },
  ],
};

describe('Canonical Production Scenes (Phase 4)', () => {
  it('renders GalaxyScene with candidate systems and Galactic instrument frame', () => {
    const { container } = render(
      <GalaxyScene additionalEntities={mockAdditionalEntities} />,
    );
    expect(container.querySelector('[name="spatial-viewport"]')).toBeTruthy();
    expect(container.querySelector('[name="cartographic-grid"]')).toBeTruthy();
    // Sol and Alpha Centauri entities
    expect(container.querySelector('[name="celestial-entity-sol"]')).toBeTruthy();
    expect(container.querySelector('[name="celestial-entity-alpha-centauri"]')).toBeTruthy();
  });

  it('renders SystemScene with central star and orbiting planets with Keplerian paths', () => {
    const { container } = render(
      <SystemScene systemId="sol" system={mockSolSystem} />,
    );
    expect(container.querySelector('[name="spatial-viewport"]')).toBeTruthy();
    expect(container.querySelector('[name="cartographic-grid"]')).toBeTruthy();
    // Central star
    expect(container.querySelector('[name="celestial-entity-sol"]')).toBeTruthy();
    // Orbiting planets
    expect(container.querySelector('[name="celestial-entity-earth"]')).toBeTruthy();
    expect(container.querySelector('[name="celestial-entity-jupiter"]')).toBeTruthy();
    // Orbit paths
    expect(container.querySelector('[name="orbital-ring-earth"]')).toBeTruthy();
    expect(container.querySelector('[name="orbital-ring-jupiter"]')).toBeTruthy();
  });

  it('renders PlanetScene with Planetary instrument frame, PlanetBody, and natural satellites', () => {
    const { container } = render(
      <PlanetScene
        planetId="earth"
        planetName="Earth"
        classification="terrestrial"
      />,
    );
    expect(container.querySelector('[name="spatial-viewport"]')).toBeTruthy();
    expect(container.querySelector('[name="cartographic-grid"]')).toBeTruthy();
    expect(container.querySelector('[name="planet-body-Earth"]')).toBeTruthy();
    // Central planet entity (for seamless node takeover)
    expect(container.querySelector('[name="celestial-entity-earth"]')).toBeTruthy();
    // Natural satellite (Luna)
    expect(container.querySelector('[name="celestial-entity-moon"]')).toBeTruthy();
    expect(container.querySelector('[name="orbital-ring-moon"]')).toBeTruthy();
  });
});
