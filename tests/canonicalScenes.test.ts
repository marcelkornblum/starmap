import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';
import { GalaxyScene } from '../src/components/canvas/scenes/GalaxyScene';
import { SystemScene } from '../src/components/canvas/scenes/SystemScene';
import { PlanetScene } from '../src/components/canvas/scenes/PlanetScene';

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

describe('Canonical Production Scenes (Phase 4)', () => {
  it('renders GalaxyScene with candidate systems and Galactic instrument frame', () => {
    const html = renderToString(createElement(GalaxyScene, {}));
    expect(html).toContain('name="spatial-viewport"');
    expect(html).toContain('name="cartographic-grid"');
    // Sol and Alpha Centauri entities
    expect(html).toContain('name="celestial-entity-sol"');
    expect(html).toContain('name="celestial-entity-alpha-centauri"');
  });

  it('renders SystemScene with central star and orbiting planets with Keplerian paths', () => {
    const html = renderToString(createElement(SystemScene, { systemId: 'sol' }));
    expect(html).toContain('name="spatial-viewport"');
    expect(html).toContain('name="cartographic-grid"');
    // Central star
    expect(html).toContain('name="celestial-entity-sol"');
    // Orbiting planets
    expect(html).toContain('name="celestial-entity-earth"');
    expect(html).toContain('name="celestial-entity-jupiter"');
    // Orbit paths
    expect(html).toContain('name="orbital-ring-earth"');
    expect(html).toContain('name="orbital-ring-jupiter"');
  });

  it('renders PlanetScene with Planetary instrument frame, PlanetBody, and natural satellites', () => {
    const html = renderToString(
      createElement(PlanetScene, {
        planetId: 'earth',
        planetName: 'Earth',
        classification: 'terrestrial',
      }),
    );
    expect(html).toContain('name="spatial-viewport"');
    expect(html).toContain('name="cartographic-grid"');
    expect(html).toContain('name="planet-body-Earth"');
    expect(html).toContain('name="planet-surface"');
    // Natural satellite (Luna)
    expect(html).toContain('name="celestial-entity-moon"');
    expect(html).toContain('name="orbital-ring-moon"');
  });
});
