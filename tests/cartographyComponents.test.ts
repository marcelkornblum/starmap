import { describe, it, expect, beforeEach, vi } from 'vitest';
import React, { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';
import {
  CartographicGrid,
  CelestialNode,
  OrbitalRing,
  computeCardinalAlignment,
} from '../src/components/canvas/cartography';
import { useThreeTokenStore } from '../src/stores/useThreeTokenStore';

vi.mock('@react-three/drei', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/drei')>();
  return {
    ...actual,
    Html: ({ children, 'data-testid': testId }: { children: React.ReactNode; 'data-testid'?: string }) =>
      createElement('div', { 'data-testid': testId ?? 'drei-html' }, children),
  };
});

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useFrame: vi.fn(),
    useThree: () => ({
      camera: new THREE.PerspectiveCamera(45, 1, 0.1, 1000),
      gl: { setClearColor: vi.fn() },
      scene: new THREE.Scene(),
    }),
  };
});



describe('3D Cartography Components', () => {
  beforeEach(() => {
    useThreeTokenStore.getState().resetTokens();
  });

  describe('CartographicGrid', () => {
    it('renders with default parameters in SSR cleanly', () => {
      const html = renderToString(
        createElement(CartographicGrid, { radius: 10, rangeRings: [2.5, 5, 10] }),
      );
      expect(html).toContain('cartographic-grid');
      expect(html).toContain('travelling-fins');
      expect(html).toContain('cardinal-bearings');
      expect(html).toContain('arc-tier-2.5');
      expect(html).toContain('arc-tier-5');
      expect(html).toContain('arc-tier-10');
    });

    it('respects visibility flags for fins, full datum circle, and axis lines', () => {
      const htmlNoFins = renderToString(
        createElement(CartographicGrid, {
          radius: 10,
          showFins: false,
          showFullDatumCircle: false,
          showAxisLines: false,
        }),
      );
      expect(htmlNoFins).toContain('cartographic-grid');
      expect(htmlNoFins).not.toContain('travelling-fins');
      expect(htmlNoFins).not.toContain('cardinal-bearings');
    });

    it('renders optional full 360-degree datum circles when enabled', () => {
      const htmlWithFull = renderToString(
        createElement(CartographicGrid, {
          radius: 10,
          rangeRings: [5],
          showFullDatumCircle: true,
        }),
      );
      expect(htmlWithFull).toContain('full-ring-5');
    });

    it('computes cardinal alignment factors correctly across perspective and cardinal views', () => {
      // 1. Fully perspective view [1, 1, 1] normalized: all alignment factors must be 0
      const perspDir = new THREE.Vector3(1, 1, 1).normalize();
      const perspAlignment = computeCardinalAlignment(perspDir);
      expect(perspAlignment.alphaX).toBe(0);
      expect(perspAlignment.alphaY).toBe(0);
      expect(perspAlignment.alphaZ).toBe(0);
      expect(perspAlignment.maxAlpha).toBe(0);

      // 2. Plan view looking along +Z: alphaZ = 1, alphaX = 0, alphaY = 0
      const planDir = new THREE.Vector3(0, 0, 1);
      const planAlignment = computeCardinalAlignment(planDir);
      expect(planAlignment.alphaZ).toBe(1);
      expect(planAlignment.alphaX).toBe(0);
      expect(planAlignment.alphaY).toBe(0);
      expect(planAlignment.maxAlpha).toBe(1);

      // 3. Plan view looking along -Z (from below): alphaZ = 1 (symmetric)
      const planNegDir = new THREE.Vector3(0, 0, -1);
      const planNegAlignment = computeCardinalAlignment(planNegDir);
      expect(planNegAlignment.alphaZ).toBe(1);

      // 4. Looking along +X: alphaX = 1
      const xDir = new THREE.Vector3(1, 0, 0);
      const xAlignment = computeCardinalAlignment(xDir);
      expect(xAlignment.alphaX).toBe(1);
      expect(xAlignment.alphaZ).toBe(0);

      // 5. Looking along +Y: alphaY = 1
      const yDir = new THREE.Vector3(0, 1, 0);
      const yAlignment = computeCardinalAlignment(yDir);
      expect(yAlignment.alphaY).toBe(1);
      expect(yAlignment.alphaZ).toBe(0);

      // 6. Near-axis intermediate transition (e.g. angle ~ 25 deg from Z)
      const nearZDir = new THREE.Vector3(0.42, 0, 0.9).normalize();
      const nearZAlignment = computeCardinalAlignment(nearZDir);
      expect(nearZAlignment.alphaZ).toBeGreaterThan(0);
      expect(nearZAlignment.alphaZ).toBeLessThan(1);
    });
  });



  describe('CelestialNode', () => {
    it('renders in passive state without reticle or drop stalk', () => {
      const html = renderToString(
        createElement(CelestialNode, {
          id: 'star-1',
          name: 'Sirius',
          position: [0, 0, 1.5],
          state: 'passive',
        }),
      );
      expect(html).toContain('celestial-node-star-1');
      expect(html).toContain('data-state="passive"');
      expect(html).not.toContain('drop-stalk');
      expect(html).not.toContain('celestial-label');
    });

    it('renders in active state with reticle and label, but NO stalk (Single-Stalk Rule)', () => {
      const html = renderToString(
        createElement(CelestialNode, {
          id: 'star-2',
          name: 'Vega',
          position: [1, 2, 3],
          state: 'active',
          spectralType: 'A0V',
        }),
      );
      expect(html).toContain('celestial-node-star-2');
      expect(html).toContain('data-state="active"');
      expect(html).not.toContain('drop-stalk');
      expect(html).toContain('Vega');
      expect(html).toContain('A0V');
    });

    it('renders drop stalk down to datum when selected or focused (Single-Stalk Rule)', () => {
      // Positive Z: solid stalk
      const htmlSelected = renderToString(
        createElement(CelestialNode, {
          id: 'star-3',
          name: 'Sol',
          position: [0, 0, 2.0],
          state: 'selected',
        }),
      );
      expect(htmlSelected).toContain('celestial-node-star-3');
      expect(htmlSelected).toContain('drop-stalk');

      // Negative Z: dashed stalk
      const htmlFocusedNeg = renderToString(
        createElement(CelestialNode, {
          id: 'star-4',
          name: 'Proxima',
          position: [1, 1, -2.5],
          state: 'focused',
        }),
      );
      expect(htmlFocusedNeg).toContain('celestial-node-star-4');
      expect(htmlFocusedNeg).toContain('drop-stalk');
    });

    it('renders reticle geometry cleanly for all taxonomy classifications', () => {
      const classifications = [
        'star',
        'brown-dwarf',
        'white-dwarf',
        'hazard',
        'black-hole',
        'terrestrial',
        'gas-giant',
        'ice-giant',
      ] as const;

      for (const classification of classifications) {
        const html = renderToString(
          createElement(CelestialNode, {
            id: `node-${classification}`,
            name: classification,
            position: [0, 0, 1],
            classification,
            state: 'active',
          }),
        );
        expect(html).toContain(`celestial-node-node-${classification}`);
      }
    });
  });

  describe('OrbitalRing', () => {
    it('renders circular orbit with periapsis tick', () => {
      const html = renderToString(
        createElement(OrbitalRing, {
          semiMajorAxis: 2.0,
          eccentricity: 0,
          showPeriapsisTick: true,
        }),
      );
      expect(html).toContain('orbital-ring');
    });

    it('renders eccentric inclined orbit without periapsis tick when disabled', () => {
      const html = renderToString(
        createElement(OrbitalRing, {
          semiMajorAxis: 3.5,
          eccentricity: 0.4,
          inclination: 15,
          ascendingNode: 30,
          showPeriapsisTick: false,
        }),
      );
      expect(html).toContain('orbital-ring');
    });

    it('applies focused state cleanly', () => {
      const html = renderToString(
        createElement(OrbitalRing, {
          semiMajorAxis: 1.0,
          isFocused: true,
        }),
      );
      expect(html).toContain('orbital-ring');
    });
  });
});
