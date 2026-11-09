// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React, { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import * as THREE from 'three';

import {
  GalacticViewScene,
  SystemViewScene,
  PlanetaryViewScene,
  InteractiveNavigator,
} from '../src/components/canvas/scenes/SpatialScenes';
import {
  GalaxyScene,
  GALAXY_SCENE_MAX_STREAMED_ENTITIES,
} from '../src/components/canvas/scenes/GalaxyScene';
import { useThreeTokenStore } from '../src/stores/useThreeTokenStore';
import type { SpatialEntityDefinition } from '../src/components/canvas/entity/SpatialEntityStore';
import type { StarDossierData } from '../src/components/canvas/scenes/SystemScene';

vi.mock('@react-three/drei', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/drei')>();
  return {
    ...actual,
    Html: ({ children, 'data-testid': testId }: { children: React.ReactNode; 'data-testid'?: string }) =>
      createElement('div', { 'data-testid': testId ?? 'drei-html' }, children),
    OrbitControls: () => createElement('div', { 'data-testid': 'orbit-controls' }),
    Sphere: ({ children }: { children?: React.ReactNode }) =>
      createElement('mesh', null, children),
  };
});

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    Canvas: ({ children }: { children?: React.ReactNode }) =>
      createElement('div', { 'data-testid': 'mock-canvas' }, children),
    useFrame: vi.fn(),
    useThree: () => ({
      camera: new THREE.PerspectiveCamera(45, 1, 0.1, 1000),
      gl: { setClearColor: vi.fn() },
      scene: new THREE.Scene(),
      controls: { target: new THREE.Vector3(), update: vi.fn() },
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
  {
    id: 'tau-ceti',
    name: 'Tau Ceti',
    position: [3.16, 1.54, -1.0],
    classification: 'star',
    spectralType: 'G8V',
  },
];

const mockSolSystem: StarDossierData = {
  id: 'sol',
  name: 'Sol',
  spectralType: 'G2V',
  planets: [
    {
      id: 'mercury',
      name: 'Mercury',
      letter: 'b',
      composition: 'terrestrial',
      orbit: { semiMajorAxis: 0.39, eccentricity: 0.205, inclination: 7, ascendingNode: 48, argumentOfPeriapsis: 29, meanAnomaly: 0, periodDays: 88 },
    },
    {
      id: 'earth',
      name: 'Earth',
      letter: 'c',
      composition: 'terrestrial',
      orbit: { semiMajorAxis: 1.0, eccentricity: 0.017, inclination: 0, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 365.25 },
      satellites: [
        {
          id: 'moon',
          name: 'Luna',
          parentId: 'earth',
          composition: 'terrestrial',
          orbit: {
            semiMajorAxis: 60.34,
            eccentricity: 0.0549,
            inclination: 5.14,
            ascendingNode: 125.08,
            argumentOfPeriapsis: 318.15,
            meanAnomaly: 135.0,
            periodDays: 27.32,
          },
        },
      ],
    },
    {
      id: 'jupiter',
      name: 'Jupiter',
      letter: 'd',
      composition: 'gas-giant',
      orbit: { semiMajorAxis: 5.2, eccentricity: 0.048, inclination: 1.3, ascendingNode: 100, argumentOfPeriapsis: 273, meanAnomaly: 45, periodDays: 4332.6 },
    },
    {
      id: 'saturn',
      name: 'Saturn',
      letter: 'e',
      composition: 'gas-giant',
      orbit: { semiMajorAxis: 9.58, eccentricity: 0.056, inclination: 2.5, ascendingNode: 113, argumentOfPeriapsis: 339, meanAnomaly: 90, periodDays: 10759 },
    },
  ],
};

const mockTauCetiSystem: StarDossierData = {
  id: 'tau-ceti',
  name: 'Tau Ceti',
  spectralType: 'G8V',
};

describe('SpatialScenes Storybook Suite', () => {
  beforeEach(() => {
    useThreeTokenStore.getState().resetTokens();
  });

  describe('GalacticViewScene', () => {
    it('renders cleanly in DOM with 3D cartography elements and stellar population', () => {
      const { container } = render(
        <GalacticViewScene additionalEntities={mockAdditionalEntities} />,
      );
      expect(screen.getByTestId('mock-canvas')).toBeTruthy();
      expect(container.querySelector('[name="cartographic-grid"]')).toBeTruthy();
      expect(container.querySelector('[name="celestial-entity-sol"]')).toBeTruthy();
      expect(container.querySelector('[name="celestial-entity-alpha-centauri"]')).toBeTruthy();
      expect(container.querySelector('[name="celestial-entity-tau-ceti"]')).toBeTruthy();
      expect(container.textContent).not.toContain('Candidate Systems');
      expect(container.textContent).not.toContain('Galactic Compass');
    });

    it('renders focused star label when initialSelectedId is provided', () => {
      const { container } = render(
        <GalacticViewScene initialSelectedId="sol" additionalEntities={mockAdditionalEntities} />,
      );
      expect(container.querySelector('[name="celestial-entity-sol"]')).toBeTruthy();
      expect(document.body.textContent).toContain('Sol');
    });

    it('renders with custom onInspectSystem callback', () => {
      const onInspect = vi.fn();
      const { container } = render(
        <GalacticViewScene onInspectSystem={onInspect} />,
      );
      expect(screen.getByTestId('mock-canvas')).toBeTruthy();
      expect(container.querySelector('[name="cartographic-grid"]')).toBeTruthy();
    });

    it('accepts centerCoordinates array and object for camera positioning', () => {
      const { unmount } = render(
        <GalacticViewScene centerCoordinates={[-1.4, -3.2, 0.4]} />,
      );
      expect(screen.getByTestId('mock-canvas')).toBeTruthy();
      unmount();

      render(
        <GalacticViewScene centerCoordinates={{ x: -1.4, y: -3.2, z: 0.4 }} />,
      );
      expect(screen.getByTestId('mock-canvas')).toBeTruthy();
    });

    it('exports 1.5x expanded GALAXY_SCENE_MAX_STREAMED_ENTITIES = 1200', () => {
      expect(GALAXY_SCENE_MAX_STREAMED_ENTITIES).toBe(1200);
      const { container } = render(
        <GalaxyScene additionalEntities={mockAdditionalEntities} />,
      );
      expect(container.querySelector('[name="galactic-sector-point-cloud"]')).toBeTruthy();
      expect(container.querySelector('[name="celestial-entity-sol"]')).toBeTruthy();
    });
  });

  describe('SystemViewScene', () => {
    it('renders cleanly in DOM with host star, Keplerian orbits, and planetary nodes', () => {
      const { container } = render(
        <SystemViewScene system={mockSolSystem} />,
      );
      expect(screen.getByTestId('mock-canvas')).toBeTruthy();
      expect(container.querySelector('[name="cartographic-grid"]')).toBeTruthy();
      expect(container.querySelector('[name="celestial-entity-sol"]')).toBeTruthy();
      expect(document.body.textContent).toContain('Sol');
      expect(container.querySelector('[name="celestial-entity-mercury"]')).toBeTruthy();
      expect(container.querySelector('[name="celestial-entity-earth"]')).toBeTruthy();
      expect(document.body.textContent).toContain('Earth');
      expect(container.querySelector('[name="celestial-entity-jupiter"]')).toBeTruthy();
      expect(container.querySelector('[name="celestial-entity-saturn"]')).toBeTruthy();
      expect(container.querySelector('[name="orbital-ring-earth"]')).toBeTruthy();
      expect(container.textContent).not.toContain('Semi-Major Axis');
    });

    it('handles systemId override for Tau Ceti', () => {
      const { container } = render(
        <SystemViewScene system={mockTauCetiSystem} />,
      );
      expect(container.querySelector('[name="celestial-entity-tau-ceti"]')).toBeTruthy();
      expect(document.body.textContent).toContain('Tau Ceti');
    });
  });

  describe('PlanetaryViewScene', () => {
    it('renders cleanly in DOM with central planet, lunar orbit, and satellite node', () => {
      const { container } = render(
        <PlanetaryViewScene planet={mockSolSystem.planets?.[1]} />,
      );
      expect(screen.getByTestId('mock-canvas')).toBeTruthy();
      expect(container.querySelector('[name="cartographic-grid"]')).toBeTruthy();
      expect(container.querySelector('[name="celestial-entity-earth"]')).toBeTruthy();
      expect(document.body.textContent).toContain('Earth');
      expect(container.querySelector('[name="celestial-entity-moon"]')).toBeTruthy();
      expect(container.querySelector('[name="orbital-ring-moon"]')).toBeTruthy();
      expect(container.textContent).not.toContain('Natural Satellites');
      expect(container.textContent).not.toContain('Surface Gravity');
      expect(container.textContent).not.toContain('Atmospheric Composition');
      expect(container.textContent).not.toContain('Planetary Orientation');
    });
  });

  describe('InteractiveNavigator', () => {
    it('renders initial galactic tier cleanly without 2D UI overlays', () => {
      const { container } = render(
        <InteractiveNavigator additionalEntities={mockAdditionalEntities} />,
      );
      expect(screen.getByTestId('mock-canvas')).toBeTruthy();
      expect(container.querySelector('[name="cartographic-grid"]')).toBeTruthy();
      expect(container.querySelector('[name="celestial-entity-sol"]')).toBeTruthy();
      expect(container.textContent).not.toContain('Candidate Systems');
      expect(container.textContent).not.toContain('Inspect Sol System →');
    });
  });
});
