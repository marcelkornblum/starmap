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
    it('renders cleanly in SSR with candidate manifest and star dossier', () => {
      const html = renderToString(createElement(GalacticViewScene));
      expect(html).toContain('Candidate Systems');
      expect(html).toContain('Sol');
      expect(html).toContain('Alpha Centauri');
      expect(html).toContain('Tau Ceti');
      expect(html).toContain('Galactic Compass');
    });

    it('renders with custom onInspectSystem callback', () => {
      const onInspect = vi.fn();
      const html = renderToString(createElement(GalacticViewScene, { onInspectSystem: onInspect }));
      expect(html).toContain('Inspect Sol System →');
    });
  });

  describe('SystemViewScene', () => {
    it('renders cleanly in SSR with Keplerian orbit table and controls', () => {
      const html = renderToString(createElement(SystemViewScene));
      expect(html).toContain('Sol System');
      expect(html).toContain('Mercury');
      expect(html).toContain('Earth');
      expect(html).toContain('Jupiter');
      expect(html).toContain('Saturn');
      expect(html).toContain('Semi-Major Axis');
    });

    it('handles systemId override for Tau Ceti', () => {
      const html = renderToString(createElement(SystemViewScene, { systemId: 'tau-ceti' }));
      expect(html).toContain('Tau Ceti System');
    });
  });

  describe('PlanetaryViewScene', () => {
    it('renders cleanly in SSR with natural satellites manifest and telemetry', () => {
      const html = renderToString(createElement(PlanetaryViewScene));
      expect(html).toContain('Earth');
      expect(html).toContain('Natural Satellites');
      expect(html).toContain('Moon (Luna)');
      expect(html).toContain('Surface Gravity');
      expect(html).toContain('Atmospheric Composition');
      expect(html).toContain('Planetary Orientation');
    });
  });

  describe('InteractiveNavigator', () => {
    it('renders initial galactic tier cleanly', () => {
      const html = renderToString(createElement(InteractiveNavigator));
      expect(html).toContain('Candidate Systems');
      expect(html).toContain('Local Volume (100 pc)');
      expect(html).toContain('Inspect Sol System →');
    });
  });
});
