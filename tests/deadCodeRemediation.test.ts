import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';
import {
  CANDIDATE_SYSTEMS,
  SOL_PLANETS,
  LUNAR_ORBIT,
} from '../src/data';
import {
  computeCardinalAlignment as mathCardinal,
  computeTransitionWeights as mathTrans,
} from '../src/components/poc/canvas/math/cardinal';
import {
  computeZoomAdaptiveRings as mathRings,
} from '../src/components/poc/canvas/math/rings';
import {
  calculateBearingProximityFade as mathFade,
} from '../src/components/poc/canvas/math/bearings';
import {
  computeCardinalAlignment as cartoCardinal,
  computeTransitionWeights as cartoTrans,
  computeZoomAdaptiveRings as cartoRings,
  calculateBearingProximityFade as cartoFade,
} from '../src/components/poc/canvas/cartography/cartographyMath';
import { DropStalk } from '../src/components/poc/canvas/entity/DropStalk';
import { ScreenEdgeCue } from '../src/components/poc/canvas/instrument/ScreenEdgeCue';
import { SpatialFrameProvider, GALACTIC_FRAME } from '../src/components/poc/canvas/instrument';

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

describe('Phase 4b Task 9: Dead Code & Data Separation Remediation', () => {
  describe('Astronomical Fixtures in src/data', () => {
    it('exports CANDIDATE_SYSTEMS with Sol, Alpha Centauri, and valid celestial bodies', () => {
      expect(CANDIDATE_SYSTEMS.length).toBeGreaterThanOrEqual(8);
      const sol = CANDIDATE_SYSTEMS.find((s) => s.id === 'sol');
      expect(sol).toBeDefined();
      expect(sol?.position).toEqual([0, 0, 0]);
      expect(sol?.planetsCount).toBe(8);
      expect(sol?.classification).toBe('star');

      const alphaCen = CANDIDATE_SYSTEMS.find((s) => s.id === 'alpha-centauri');
      expect(alphaCen).toBeDefined();
      expect(alphaCen?.multiplicity).toBe(3);
    });

    it('exports SOL_PLANETS with terrestrial and gas-giant planets in orbital order', () => {
      expect(SOL_PLANETS.length).toBe(6);
      const [mercury, , earth, , jupiter] = SOL_PLANETS;
      expect(mercury.id).toBe('mercury');
      expect(mercury.a).toBeCloseTo(0.3871, 3);
      expect(earth.id).toBe('earth');
      expect(earth.a).toBeCloseTo(1.0, 3);
      expect(jupiter.id).toBe('jupiter');
      expect(jupiter.a).toBeCloseTo(5.2044, 3);
    });

    it('exports LUNAR_ORBIT with Earth-radii semi-major axis', () => {
      expect(LUNAR_ORBIT.a).toBeCloseTo(60.336, 3);
      expect(LUNAR_ORBIT.e).toBeCloseTo(0.0549, 4);
    });
  });

  describe('Deduplicated Spatial Mathematics Parity', () => {
    it('re-exports computeCardinalAlignment with identical output to math/cardinal', () => {
      const v = new THREE.Vector3(0.96, 0.1, 0.05).normalize();
      const mathResult = mathCardinal(v);
      const cartoResult = cartoCardinal(v);
      expect(cartoResult).toEqual(mathResult);
    });

    it('re-exports computeTransitionWeights with identical output to math/cardinal', () => {
      const v = new THREE.Vector3(0.2, 0.8, 0.1).normalize();
      const mathResult = mathTrans(v, 0.35, 0.5);
      const cartoResult = cartoTrans(v, 0.35, 0.5);
      expect(cartoResult).toEqual(mathResult);
    });

    it('re-exports computeZoomAdaptiveRings with identical output to math/rings', () => {
      const rAperture = 15;
      const mathResult = mathRings(rAperture, 6);
      const cartoResult = cartoRings(rAperture, 6);
      expect(cartoResult).toEqual(mathResult);
    });

    it('re-exports calculateBearingProximityFade with identical output to math/bearings', () => {
      const cam = new THREE.Vector3(50, 10, 5);
      const origin = new THREE.Vector3(0, 0, 0);
      const mathResult = mathFade(cam, origin, 'core', 1200, 2000, 20);
      const cartoResult = cartoFade(cam, origin, 'core', 1200, 2000, 20);
      expect(cartoResult).toBe(mathResult);
    });
  });

  describe('Component Cleanliness', () => {
    it('renders DropStalk in SSR without error using CartoHairlineMaterial', () => {
      const html = renderToString(
        createElement(
          SpatialFrameProvider,
          { frame: GALACTIC_FRAME },
          createElement(DropStalk, {
            id: 'test-node',
            position: [5, 5, 3],
            state: 'selected',
            classification: 'star',
          }),
        ),
      );
      expect(html).toContain('name="drop-stalk-test-node"');
      expect(html).toContain('name="stalk-line"');
      expect(html).toContain('name="stalk-footprint"');
    });

    it('renders ScreenEdgeCue with co-located ScreenEdgeCue.module.css styles', () => {
      const bearing = {
        id: 'core',
        name: 'Galactic Core',
        angle: 0,
        showEdgeCue: true,
        cueLabel: 'CORE 000°',
      };
      const html = renderToString(
        createElement(
          SpatialFrameProvider,
          { frame: GALACTIC_FRAME },
          createElement(ScreenEdgeCue, { bearing }),
        ),
      );
      expect(html).toContain('data-testid="bearing-indicator-core"');
      expect(html).toContain('CORE 000°');
    });
  });
});
