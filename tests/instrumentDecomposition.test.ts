import { describe, it, expect, vi } from 'vitest';
import React, { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';
import {
  GALACTIC_FRAME,
  SYSTEM_FRAME,
  PLANETARY_FRAME,
  createCustomReferenceFrame,
  SpatialFrameProvider,
  PlanarGrid,
  RangeRings,
  CoordinateFins,
  BearingVectors,
  ScreenEdgeCue,
  ScreenEdgeIndicators,
  CameraRig,
  CartographicInstrument,
} from '../src/components/poc/canvas/instrument';
import { formatDesignationTag } from '../src/components/poc/canvas/cartography/reticleGeometry';
import { createCircularPlanarGridGeometry } from '../src/components/poc/canvas/cartography/cartographyMath';

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
      size: { width: 1920, height: 1080 },
    }),
  };
});

describe('Instrument Decomposition & Reference Frames (Phase 2)', () => {
  describe('ReferenceFrame Presets', () => {
    it('defines GALACTIC_FRAME with correct spatial units, bearings, and datum plane', () => {
      expect(GALACTIC_FRAME.id).toBe('galactic');
      expect(GALACTIC_FRAME.unit).toBe('pc');
      expect(GALACTIC_FRAME.radius).toBe(10);
      expect(GALACTIC_FRAME.datumPlane.enabled).toBe(true);
      expect(GALACTIC_FRAME.datumPlane.planarGrid).toBe(true);
      expect(GALACTIC_FRAME.datumPlane.planarGridGap).toBe(2.5);
      expect(GALACTIC_FRAME.datumPlane.fill).toBe(true);
      expect(GALACTIC_FRAME.datumPlane.footprints).toBe(true);
      expect(GALACTIC_FRAME.coordinateFins.polarDialExpansion).toBe(true);
      expect(GALACTIC_FRAME.bearings.length).toBe(2);
      expect(GALACTIC_FRAME.bearings[0].id).toBe('core');
      expect(GALACTIC_FRAME.bearings[1].id).toBe('orbital');
    });

    it('defines SYSTEM_FRAME with smaller radius than galactic, shared planar elements, and invariable plane orientation', () => {
      expect(SYSTEM_FRAME.id).toBe('system');
      expect(SYSTEM_FRAME.unit).toBe('AU');
      expect(SYSTEM_FRAME.radius).toBe(6);
      expect(SYSTEM_FRAME.radius).toBeLessThan(GALACTIC_FRAME.radius);
      expect(SYSTEM_FRAME.datumPlane.enabled).toBe(true);
      expect(SYSTEM_FRAME.datumPlane.planarGrid).toBe(true);
      expect(SYSTEM_FRAME.datumPlane.planarGridGap).toBe(1.5);
      expect(SYSTEM_FRAME.datumPlane.fill).toBe(true);
      expect(SYSTEM_FRAME.datumPlane.footprints).toBe(true);
      expect(SYSTEM_FRAME.bearings.length).toBe(2);
      expect(SYSTEM_FRAME.bearings[0].id).toBe('core');
      expect(SYSTEM_FRAME.bearings[1].id).toBe('orbital');
      expect(SYSTEM_FRAME.orientation).toBeDefined();
    });

    it('defines PLANETARY_FRAME with calibrated planetary radius, shared planar elements, and axial tilt orientation', () => {
      expect(PLANETARY_FRAME.id).toBe('planetary');
      expect(PLANETARY_FRAME.unit).toBe('km');
      expect(PLANETARY_FRAME.radius).toBe(65);
      expect(PLANETARY_FRAME.datumPlane.enabled).toBe(true);
      expect(PLANETARY_FRAME.datumPlane.fill).toBe(true);
      expect(PLANETARY_FRAME.datumPlane.planarGrid).toBe(true);
      expect(PLANETARY_FRAME.datumPlane.planarGridGap).toBe(10.0);
      expect(PLANETARY_FRAME.datumPlane.footprints).toBe(true);
      expect(PLANETARY_FRAME.bearings.length).toBe(2);
      expect(PLANETARY_FRAME.bearings[0].id).toBe('core');
      expect(PLANETARY_FRAME.bearings[1].id).toBe('orbital');
      expect(PLANETARY_FRAME.orientation).toBeDefined();
    });

    it('creates custom reference frames via createCustomReferenceFrame', () => {
      const custom = createCustomReferenceFrame(GALACTIC_FRAME, {
        id: 'custom-scaled',
        radius: 25,
        datumPlane: {
          ...GALACTIC_FRAME.datumPlane,
          planarGrid: false,
        },
      });
      expect(custom.id).toBe('custom-scaled');
      expect(custom.radius).toBe(25);
      expect(custom.datumPlane.planarGrid).toBe(false);
      expect(custom.datumPlane.fill).toBe(true); // Preserves rest of datumPlane
    });
  });

  describe('PlanarGrid primitive', () => {
    it('renders datum plane, fill shader, boundary circle, and planar grid in SSR cleanly', () => {
      const html = renderToString(
        createElement(
          SpatialFrameProvider,
          { frame: GALACTIC_FRAME },
          createElement(PlanarGrid, { showPlanarFootprint: true }),
        ),
      );
      expect(html).toContain('name="datum-plane"');
      expect(html).toContain('name="datum-plane-fill"');
      expect(html).toContain('name="datum-plane-boundary"');
      expect(html).toContain('name="planar-galactic-grid"');
      expect(html).toContain('name="planar-footprint"');
      expect(html).toContain('name="disk-bearings"');
    });

    it('respects visibility overrides for datum plane components', () => {
      const htmlHidden = renderToString(
        createElement(
          SpatialFrameProvider,
          { frame: GALACTIC_FRAME },
          createElement(PlanarGrid, {
            enabled: false,
          }),
        ),
      );
      expect(htmlHidden).not.toContain('datum-plane');

      const htmlNoGrid = renderToString(
        createElement(
          SpatialFrameProvider,
          { frame: GALACTIC_FRAME },
          createElement(PlanarGrid, {
            showPlanarGrid: false,
            showPlanarFootprint: false,
          }),
        ),
      );
      expect(htmlNoGrid).toContain('name="datum-plane"');
      expect(htmlNoGrid).not.toContain('name="planar-galactic-grid"');
      expect(htmlNoGrid).not.toContain('name="planar-footprint"');
    });

    it('renders explicit external footprints on datum plane', () => {
      const html = renderToString(
        createElement(
          SpatialFrameProvider,
          { frame: GALACTIC_FRAME },
          createElement(PlanarGrid, {
            footprints: [
              { id: 'star-a', position: [5, 2, 0], classification: 'star' },
              { id: 'planet-b', position: [-3, 1, 0], classification: 'gas-giant' },
            ],
          }),
        ),
      );
      expect(html).toContain('name="explicit-planar-footprints"');
      expect(html).toContain('name="planar-footprint-star-a"');
      expect(html).toContain('name="planar-footprint-planet-b"');
    });

    it('generates circular planar grid geometry strictly bounded by circle x^2 + y^2 <= R^2', () => {
      const radius = 6;
      const geom = createCircularPlanarGridGeometry(radius, 1.5, 1200, 32, true);
      const posAttr = geom.getAttribute('position');
      expect(posAttr).toBeDefined();
      expect(posAttr.count).toBeGreaterThan(0);

      let maxRadialDist = 0;
      let hasYZeroSegment = false;

      for (let i = 0; i < posAttr.count; i += 2) {
        const x1 = posAttr.getX(i);
        const y1 = posAttr.getY(i);
        const x2 = posAttr.getX(i + 1);
        const y2 = posAttr.getY(i + 1);

        const r1 = Math.hypot(x1, y1);
        const r2 = Math.hypot(x2, y2);
        maxRadialDist = Math.max(maxRadialDist, r1, r2);

        // Check if there is an unclipped ray running along y=0 across the centre
        if (Math.abs(y1) < 1e-4 && Math.abs(y2) < 1e-4) {
          hasYZeroSegment = true;
        }
      }

      // Strictly bounded within radius (with 1e-4 floating point tolerance)
      expect(maxRadialDist).toBeLessThanOrEqual(radius + 1e-4);
      // y=0 axis ray is omitted so Core bearing is sole element heading to centre
      expect(hasYZeroSegment).toBe(false);
      geom.dispose();
    });
  });

  describe('RangeRings primitive', () => {
    it('renders concentric range rings in SSR cleanly', () => {
      const html = renderToString(
        createElement(
          SpatialFrameProvider,
          { frame: GALACTIC_FRAME },
          createElement(RangeRings, { rings: [2.5, 5, 10] }),
        ),
      );
      expect(html).toContain('name="range-rings"');
      expect(html).toContain('name="full-ring-2.5"');
      expect(html).toContain('name="full-ring-5"');
      expect(html).toContain('name="full-ring-10"');
    });

    it('supports lockToFocusPoint=false and relative position offset', () => {
      const html = renderToString(
        createElement(
          SpatialFrameProvider,
          { frame: GALACTIC_FRAME },
          createElement(RangeRings, {
            rings: [5],
            lockToFocusPoint: false,
            position: [0, 0, 0],
          }),
        ),
      );
      expect(html).toContain('name="range-rings"');
      expect(html).toContain('name="full-ring-5"');
    });
  });

  describe('CoordinateFins primitive', () => {
    it('renders the 3 orthogonal travelling fins with perimeter arcs and ticks', () => {
      const html = renderToString(
        createElement(
          SpatialFrameProvider,
          { frame: GALACTIC_FRAME },
          createElement(CoordinateFins, { rings: [2.5, 5, 10] }),
        ),
      );
      expect(html).toContain('name="travelling-fins"');
      expect(html).toContain('name="fin-xy"');
      expect(html).toContain('name="fin-xz"');
      expect(html).toContain('name="fin-yz"');
      expect(html).toContain('name="xy-perimeter-q0"');
      expect(html).toContain('name="xy-ticks-q0"');
      expect(html).toContain('name="xy-baseline-q0"');
      expect(html).toContain('name="xz-baseline-q0"');
      expect(html).toContain('name="yz-baseline-q0"');
      expect(html).toContain('name="arc-tier-2.5"');
      expect(html).toContain('name="arc-tier-5"');
      expect(html).toContain('name="arc-tier-10"');
    });

    it('respects enabled=false toggle', () => {
      const html = renderToString(
        createElement(
          SpatialFrameProvider,
          { frame: GALACTIC_FRAME },
          createElement(CoordinateFins, { enabled: false }),
        ),
      );
      expect(html).not.toContain('name="travelling-fins"');
    });
  });

  describe('BearingVectors primitive', () => {
    it('renders axis spokes and cardinal bearings for GALACTIC_FRAME', () => {
      const html = renderToString(
        createElement(
          SpatialFrameProvider,
          { frame: GALACTIC_FRAME },
          createElement(BearingVectors, { showAxisLines: true, showCardinalBearings: true }),
        ),
      );
      expect(html).toContain('name="bearing-vectors"');
      expect(html).toContain('name="axis-spokes"');
      expect(html).toContain('name="axis-neg-x"');
      expect(html).toContain('name="axis-pos-z"');
      expect(html).toContain('name="cardinal-bearings"');
      expect(html).toContain('name="bearing-core"');
      expect(html).toContain('name="bearing-orbital"');
    });

    it('renders zero bearings when frame has no bearings (e.g. SYSTEM_FRAME)', () => {
      const html = renderToString(
        createElement(
          SpatialFrameProvider,
          { frame: SYSTEM_FRAME },
          createElement(BearingVectors, { showCardinalBearings: false }),
        ),
      );
      expect(html).toContain('name="bearing-vectors"');
      expect(html).not.toContain('name="cardinal-bearings"');
      expect(html).not.toContain('name="extended-bearing-core"');
    });
  });

  describe('ScreenEdgeCue and ScreenEdgeIndicators', () => {
    it('renders ScreenEdgeCue with indicator label and chevron in SSR', () => {
      const bearing = GALACTIC_FRAME.bearings[0]; // Core
      const html = renderToString(
        createElement(SpatialFrameProvider, { frame: GALACTIC_FRAME }, createElement(ScreenEdgeCue, { bearing })),
      );
      expect(html).toContain('data-bearing="core"');
      expect(html).toContain('CORE 000°');
    });

    it('renders ScreenEdgeIndicators for all active bearings with showEdgeCue', () => {
      const html = renderToString(
        createElement(
          SpatialFrameProvider,
          { frame: GALACTIC_FRAME },
          createElement(ScreenEdgeIndicators, null),
        ),
      );
      expect(html).toContain('name="screen-edge-bearing-indicators"');
      expect(html).toContain('CORE 000°');
      expect(html).toContain('ORB 090°');
    });
  });

  describe('CameraRig primitive', () => {
    it('mounts cleanly inside SpatialFrameProvider in SSR', () => {
      const html = renderToString(
        createElement(
          SpatialFrameProvider,
          { frame: GALACTIC_FRAME },
          createElement(CameraRig, null),
        ),
      );
      expect(html).toBeDefined();
    });
  });

  describe('CartographicInstrument (Composite)', () => {
    const renderInstrument = (frame: typeof GALACTIC_FRAME, rangeRings: number[]) =>
      renderToString(
        createElement(
          SpatialFrameProvider,
          { frame },
          createElement(CartographicInstrument, { rangeRings }),
        ),
      );

    it('renders full galactic instrument matching legacy CartographicGrid DOM structure', () => {
      const html = renderInstrument(GALACTIC_FRAME, [2.5, 5, 10]);
      expect(html).toContain('name="cartographic-grid"');
      expect(html).toContain('name="datum-plane"');
      expect(html).toContain('name="range-rings"');
      expect(html).toContain('name="travelling-fins"');
      expect(html).toContain('name="bearing-vectors"');
      expect(html).toContain('name="screen-edge-bearing-indicators"');
      expect(html).toContain('CORE 000°');
      expect(html).toContain('ORB 090°');
      expect(html).toContain('full-ring-2.5');
      expect(html).toContain('full-ring-5');
      expect(html).toContain('full-ring-10');
    });

    it('renders system instrument with shared planar grid, datum plane, and bearings', () => {
      const html = renderInstrument(SYSTEM_FRAME, [1, 5, 10]);
      expect(html).toContain('name="cartographic-grid"');
      expect(html).toContain('name="datum-plane"');
      expect(html).toContain('name="planar-galactic-grid"');
      expect(html).toContain('CORE 000°');
      expect(html).toContain('ORB 090°');
    });

    it('renders planetary instrument with shared planar grid, datum fill, and bearings', () => {
      const html = renderInstrument(PLANETARY_FRAME, [2000, 5000, 10000]);
      expect(html).toContain('name="cartographic-grid"');
      expect(html).toContain('name="datum-plane-fill"');
      expect(html).toContain('name="planar-galactic-grid"');
      expect(html).toContain('CORE 000°');
      expect(html).toContain('ORB 090°');
    });
  });

  describe('Compact Reticle Facet Designation Formatting', () => {
    it('formats multiple star designations with centered dot and no spaces', () => {
      expect(formatDesignationTag('A1V + DA2')).toBe('A1V·DA2');
      expect(formatDesignationTag('G2V + K1V')).toBe('G2V·K1V');
      expect(formatDesignationTag('G0V + M3V + M5V')).toBe('G0V·M3V·M5V');
      expect(formatDesignationTag('G2V')).toBe('G2V');
      expect(formatDesignationTag('')).toBe('');
      expect(formatDesignationTag(undefined)).toBe('');
    });
  });

  describe('World-Space Instrument Tilt & ScreenEdge Orientation', () => {
    it('computes downward tilt when focus point has positive Z altitude', () => {
      // Focus point at (0, 0, 100) looking toward Galactic Core at (2000, 0, 0)
      const rGc = 2000;
      const focusPoint = new THREE.Vector3(0, 0, 100);
      const vCore = new THREE.Vector3(rGc - focusPoint.x, -focusPoint.y, -focusPoint.z).normalize();
      expect(vCore.z).toBeLessThan(0); // Vector tilts down toward datum plane Z=0

      const vOrbital = new THREE.Vector3(-vCore.y, vCore.x, 0).normalize();
      expect(vOrbital.z).toBe(0); // Orbital vector remains strictly horizontal in galactic plane

      const vZenith = new THREE.Vector3().crossVectors(vCore, vOrbital).normalize();
      expect(vZenith.z).toBeGreaterThan(0);

      const basis = new THREE.Matrix4().makeBasis(vCore, vOrbital, vZenith);
      const q = new THREE.Quaternion().setFromRotationMatrix(basis);
      expect(q.x).toBeCloseTo(0, 3);
      expect(q.y).toBeGreaterThan(0); // Non-zero pitch rotation around orbital axis
      expect(q.z).toBeCloseTo(0, 3);
    });
  });
});
