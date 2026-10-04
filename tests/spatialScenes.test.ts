import { describe, it, expect, beforeEach, vi } from 'vitest';
import React, { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';

import {
  GalacticViewScene,
  SystemViewScene,
  PlanetaryViewScene,
  InteractiveNavigator,
  FullUIStylingScene,
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
      expect(html).toContain('name="celestial-node-alpha-centauri"');
      expect(html).toContain('name="celestial-node-tau-ceti"');
      expect(html).not.toContain('Candidate Systems');
      expect(html).not.toContain('Galactic Compass');
    });

    it('renders focused star label when initialSelectedId is provided', () => {
      const html = renderToString(createElement(GalacticViewScene, { initialSelectedId: 'sol' }));
      expect(html).toContain('name="celestial-node-sol"');
      expect(html).toContain('Sol');
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
      expect(html).not.toContain('Candidate Systems');
      expect(html).not.toContain('Inspect Sol System →');
    });
  });

  describe('FullUIStylingScene', () => {
    it('renders all 8 surface tiers and nested inset simultaneously in SSR', () => {
      const html = renderToString(createElement(FullUIStylingScene));

      // Root scene container
      expect(html).toContain('data-testid="full-ui-styling-scene"');

      // Tier 0: Canvas floor
      expect(html).toContain('data-testid="surface-tier-0-canvas"');
      expect(html).toContain('data-testid="mock-canvas"');

      // Tier 1: HUD
      expect(html).toContain('data-testid="surface-tier-1-hud"');
      expect(html).toContain('✦ STARMAP // HUD');
      expect(html).toContain('SENSORS ONLINE');
      expect(html).toContain('RA: 18h 36m 56s');

      // Tier 2: Dock
      expect(html).toContain('data-testid="surface-tier-2-dock"');
      expect(html).toContain('data-position="left"');

      // Tier 3: Panel
      expect(html).toContain('data-testid="surface-tier-3-panel"');
      expect(html).toContain('Galactic Survey Dossier');
      expect(html).toContain('1,280');
      expect(html).toContain('8.12');

      // Nested Inset: Well inside Panel with OrbitTable
      expect(html).toContain('data-testid="surface-tier-nested-inset"');
      expect(html).toContain('Nearby Astrometric Candidates');
      expect(html).toContain('Mercury');
      expect(html).toContain('Jupiter');

      // Tier 4: Drawer
      expect(html).toContain('data-testid="surface-tier-4-drawer"');
      expect(html).toContain('Spectroscopic Filter Matrix');
      expect(html).toContain('data-position="right"');

      // Tier 5: Popover
      expect(html).toContain('data-testid="surface-tier-5-popover"');
      expect(html).toContain('Target Lock: Sol Barycentre');
      expect(html).toContain('Sol Anchor Point');

      // Tier 6: Modal
      expect(html).toContain('data-testid="surface-tier-6-modal"');
      expect(html).toContain('Astrodynamics Command Query');

      // Tier 7: Toast
      expect(html).toContain('data-testid="surface-tier-7-toast"');
      expect(html).toContain('Telemetry Alert: Gravitational Perturbation');
    });
  });
});
