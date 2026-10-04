import { describe, it, expect, beforeEach, vi } from 'vitest';
import React, { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';

import {
  GalacticViewScene,
  SystemViewScene,
  PlanetaryViewScene,
  InteractiveNavigator,
} from '../src/components/canvas/scenes/SpatialScenes.stories';
import { useThreeTokenStore } from '../src/stores/useThreeTokenStore';

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

describe('SpatialScenes Storybook Suite', () => {
  beforeEach(() => {
    useThreeTokenStore.getState().resetTokens();
  });

  describe('GalacticViewScene', () => {
    it('renders cleanly in SSR with 3D cartography elements and stellar population', () => {
      const html = renderToString(createElement(GalacticViewScene));
      expect(html).toContain('data-testid="mock-canvas"');
      expect(html).toContain('name="cartographic-grid"');
      expect(html).toContain('name="celestial-node-sol"');
      expect(html).toContain('Sol');
      expect(html).toContain('name="celestial-node-alpha-centauri"');
      expect(html).toContain('name="celestial-node-tau-ceti"');
      expect(html).not.toContain('Candidate Systems');
      expect(html).not.toContain('Galactic Compass');
    });

    it('renders with custom onInspectSystem callback', () => {
      const onInspect = vi.fn();
      const html = renderToString(createElement(GalacticViewScene, { onInspectSystem: onInspect }));
      expect(html).toContain('data-testid="mock-canvas"');
      expect(html).toContain('name="cartographic-grid"');
    });
  });

  describe('SystemViewScene', () => {
    it('renders cleanly in SSR with host star, Keplerian orbits, and planetary nodes', () => {
      const html = renderToString(createElement(SystemViewScene));
      expect(html).toContain('data-testid="mock-canvas"');
      expect(html).toContain('name="cartographic-grid"');
      expect(html).toContain('name="celestial-node-sol"');
      expect(html).toContain('Sol');
      expect(html).toContain('name="celestial-node-mercury"');
      expect(html).toContain('name="celestial-node-earth"');
      expect(html).toContain('Earth');
      expect(html).toContain('name="celestial-node-jupiter"');
      expect(html).toContain('name="celestial-node-saturn"');
      expect(html).toContain('name="orbit-path"');
      expect(html).not.toContain('Semi-Major Axis');
    });

    it('handles systemId override for Tau Ceti', () => {
      const html = renderToString(createElement(SystemViewScene, { systemId: 'tau-ceti' }));
      expect(html).toContain('name="celestial-node-tau-ceti"');
      expect(html).toContain('Tau Ceti');
    });
  });

  describe('PlanetaryViewScene', () => {
    it('renders cleanly in SSR with central planet, lunar orbit, and satellite node', () => {
      const html = renderToString(createElement(PlanetaryViewScene));
      expect(html).toContain('data-testid="mock-canvas"');
      expect(html).toContain('name="cartographic-grid"');
      expect(html).toContain('name="celestial-node-planet-center-node"');
      expect(html).toContain('Earth');
      expect(html).toContain('name="celestial-node-moon"');
      expect(html).toContain('name="orbit-path"');
      expect(html).not.toContain('Natural Satellites');
      expect(html).not.toContain('Surface Gravity');
      expect(html).not.toContain('Atmospheric Composition');
      expect(html).not.toContain('Planetary Orientation');
    });
  });

  describe('InteractiveNavigator', () => {
    it('renders initial galactic tier cleanly without 2D UI overlays', () => {
      const html = renderToString(createElement(InteractiveNavigator));
      expect(html).toContain('data-testid="mock-canvas"');
      expect(html).toContain('name="cartographic-grid"');
      expect(html).toContain('name="celestial-node-sol"');
      expect(html).toContain('Sol');
      expect(html).not.toContain('Candidate Systems');
      expect(html).not.toContain('Inspect Sol System →');
    });
  });
});
