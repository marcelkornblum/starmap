import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReactThreeTest from '@react-three/test-renderer';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  GalacticViewScene,
  SystemViewScene,
  PlanetaryViewScene,
  InteractiveNavigator,
  GalacticSceneContent,
  SystemSceneContent,
  PlanetarySceneContent,
} from './SpatialScenes';
import { GALAXY_SCENE_MAX_STREAMED_ENTITIES } from './GalaxyScene';
import type { SpatialEntityDefinition } from '../entity';
import type { StarDossierData } from './SystemScene';
import { SafeHtmlPortalOutlet } from '../SafeHtml';

// Mock Canvas for React DOM wrapper tests so R3F fiber nodes are not passed to react-dom
vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    Canvas: ({ children: _children }: { children?: React.ReactNode }) => (
      <div data-testid="mock-canvas" />
    ),
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
  ],
};

describe('SpatialScenes Storybook Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  describe('View Scene DOM Wrappers (Card & Fullscreen Canvas Containers)', () => {
    it('renders GalacticViewScene with canvas wrapper and data-variant', () => {
      const { container } = render(
        <GalacticViewScene additionalEntities={mockAdditionalEntities} variant="card" />,
      );
      expect(screen.getByTestId('mock-canvas')).toBeDefined();
      expect(container.querySelector('[data-variant="card"]')).not.toBeNull();
    });

    it('renders SystemViewScene with canvas wrapper and data-variant', () => {
      const { container } = render(
        <SystemViewScene system={mockSolSystem} variant="fullscreen" />,
      );
      expect(screen.getByTestId('mock-canvas')).toBeDefined();
      expect(container.querySelector('[data-variant="fullscreen"]')).not.toBeNull();
    });

    it('renders PlanetaryViewScene with canvas wrapper', () => {
      render(<PlanetaryViewScene planetId="earth" />);
      expect(screen.getByTestId('mock-canvas')).toBeDefined();
    });

    it('accepts centerCoordinates array and object for camera positioning', () => {
      const { unmount } = render(
        <GalacticViewScene centerCoordinates={[-1.4, -3.2, 0.4]} />,
      );
      expect(screen.getByTestId('mock-canvas')).toBeDefined();
      unmount();

      render(
        <GalacticViewScene centerCoordinates={{ x: -1.4, y: -3.2, z: 0.4 }} />,
      );
      expect(screen.getByTestId('mock-canvas')).toBeDefined();
    });

    it('exports GALAXY_SCENE_MAX_STREAMED_ENTITIES = 1200', () => {
      expect(GALAXY_SCENE_MAX_STREAMED_ENTITIES).toBe(1200);
    });
  });

  describe('InteractiveNavigator', () => {
    it('renders initial scale canvas cleanly', () => {
      render(<InteractiveNavigator additionalEntities={mockAdditionalEntities} />);
      expect(screen.getByTestId('mock-canvas')).toBeDefined();
    });

    it('maintains a single persistent <Canvas> element when scale transitions via Escape key', () => {
      render(
        <InteractiveNavigator
          initialScale="planet"
          initialPlanetId="earth"
        />,
      );

      const canvasPlanet = screen.getByTestId('mock-canvas');
      expect(canvasPlanet).toBeDefined();

      // Press Escape -> scale transitions to 'system'
      fireEvent.keyDown(window, { key: 'Escape' });

      const canvasSystem = screen.getByTestId('mock-canvas');
      expect(canvasSystem).toBe(canvasPlanet);

      // Press Escape -> scale transitions to 'galaxy'
      fireEvent.keyDown(window, { key: 'Escape' });

      const canvasGalaxy = screen.getByTestId('mock-canvas');
      expect(canvasGalaxy).toBe(canvasPlanet);
    });
  });

  describe('R3F Scene Contents via ReactThreeTestRenderer', () => {
    it('renders GalacticSceneContent with cartographic grid and celestial entities', async () => {
      const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);

      const renderer = await ReactThreeTest.create(
        <GalacticSceneContent additionalEntities={mockAdditionalEntities} />,
      );

      expect(renderer.scene.findByProps({ name: 'cartographic-grid' })).toBeDefined();
      expect(renderer.scene.findByProps({ name: 'celestial-entity-sol' })).toBeDefined();
      expect(renderer.scene.findByProps({ name: 'celestial-entity-alpha-centauri' })).toBeDefined();
      expect(renderer.scene.findByProps({ name: 'celestial-entity-tau-ceti' })).toBeDefined();

      await renderer.unmount();
      unmountOutlet();
    });

    it('renders SystemSceneContent with cartographic grid and host star', async () => {
      const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);

      const renderer = await ReactThreeTest.create(
        <SystemSceneContent system={mockSolSystem} />,
      );

      expect(renderer.scene.findByProps({ name: 'cartographic-grid' })).toBeDefined();
      expect(renderer.scene.findByProps({ name: 'celestial-entity-sol' })).toBeDefined();
      expect(renderer.scene.findByProps({ name: 'celestial-entity-earth' })).toBeDefined();

      await renderer.unmount();
      unmountOutlet();
    });

    it('renders PlanetarySceneContent with cartographic grid and planet entity', async () => {
      const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);

      const renderer = await ReactThreeTest.create(
        <PlanetarySceneContent planetId="earth" />,
      );

      expect(renderer.scene.findByProps({ name: 'cartographic-grid' })).toBeDefined();
      expect(renderer.scene.findByProps({ name: 'celestial-entity-earth' })).toBeDefined();

      await renderer.unmount();
      unmountOutlet();
    });
  });
});
