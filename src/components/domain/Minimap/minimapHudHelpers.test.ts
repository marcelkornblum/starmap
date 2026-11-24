import { describe, it, expect } from 'vitest';
import type { MinimapOrientationSummary } from '../../../services/details/detailsNavigationTypes';
import { buildCameraBasis } from '../../../utils/orientationProjectionMath';
import {
  SVG_CX,
  SVG_CY,
  ZOOM_TRACK_WIDTH,
  buildMinimapProjection,
  computeZoomBarFillWidth,
  formatDistanceValue,
  isInitialUntouchedPose,
  resolveSphericalFallbackPose,
} from './minimapHudHelpers';

function makeOrientation(
  overrides: Partial<MinimapOrientationSummary> = {},
): MinimapOrientationSummary {
  return {
    scope: 'galaxy',
    anchorId: 'sol',
    anchorName: 'Sol',
    systemId: 'sol',
    systemName: 'Sol',
    coordinatesPc: [0, 0, 0],
    focusedMarker: null,
    selectedMarkers: [],
    markers: [],
    ...overrides,
  };
}

function parsePolygonVertices(polygon: string): Array<{ x: number; y: number }> {
  return polygon
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [xStr, yStr] = pair.split(',');
      return { x: Number(xStr), y: Number(yStr) };
    });
}

describe('minimapHudHelpers', () => {
  describe('isInitialUntouchedPose', () => {
    it('returns true only for the initial untouched camera store defaults', () => {
      expect(isInitialUntouchedPose([0, 0, 10], [0, 0, 0], [0, 1, 0])).toBe(true);
      expect(isInitialUntouchedPose([0, -35, 20], [0, 0, 0], [0, 0, 1])).toBe(false);
      expect(isInitialUntouchedPose([0, 0, 10], [1, 0, 0], [0, 1, 0])).toBe(false);
      expect(isInitialUntouchedPose([0, 0, 10], [0, 0, 0], [0, 0, 1])).toBe(false);
    });
  });

  describe('resolveSphericalFallbackPose', () => {
    it('falls back to canonical isometric framing and default distance when camera metadata is absent', () => {
      const pose = resolveSphericalFallbackPose(makeOrientation());
      expect(pose.position).toEqual([0, -30, 18]);
      expect(pose.target).toEqual([0, 0, 0]);
      expect(pose.up).toEqual([0, 0, 1]);
      expect(pose.distance).toBe(20);
    });

    it('computes spherical position from azimuth, elevation, and valid positive distance', () => {
      const pose = resolveSphericalFallbackPose(
        makeOrientation({
          cameraAzimuthDeg: 0,
          cameraElevationDeg: 0,
          cameraDistance: 40,
        }),
      );
      expect(pose.position[0]).toBeCloseTo(-40, 4);
      expect(pose.position[1]).toBeCloseTo(0, 4);
      expect(pose.position[2]).toBeCloseTo(0, 4);
      expect(pose.distance).toBe(40);

      const invalidDist = resolveSphericalFallbackPose(
        makeOrientation({ cameraAzimuthDeg: 90, cameraDistance: -5 }),
      );
      expect(invalidDist.distance).toBe(20);
    });
  });

  describe('buildMinimapProjection', () => {
    it('projects Galactic Frame polar sector, converging CORE radials, and CORE/ORB vectors', () => {
      const topDownBasis = buildCameraBasis([0, 0, 50], [0, 0, 0], [0, 1, 0]);
      const projection = buildMinimapProjection(makeOrientation(), topDownBasis, 40);

      const sectorPts = parsePolygonVertices(projection.sectorPolygon);
      expect(sectorPts.length).toBe(42);
      expect(sectorPts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);

      expect(projection.midInnerArcPath.startsWith('M ')).toBe(true);
      expect(projection.midArcPath.startsWith('M ')).toBe(true);
      expect(projection.midOuterArcPath.startsWith('M ')).toBe(true);

      // Sparse radials converge inward toward Galactic Core (+X)
      expect(projection.sparseRadials).toHaveLength(3);
      const [upperRadial, , lowerRadial] = projection.sparseRadials;
      expect(upperRadial.inPt.x).toBeGreaterThan(upperRadial.outPt.x);
      expect(Math.abs(upperRadial.inPt.y - lowerRadial.inPt.y)).toBeLessThan(
        Math.abs(upperRadial.outPt.y - lowerRadial.outPt.y),
      );

      // CORE arrow points inward toward +X
      expect(projection.coreVecTip.x).toBeGreaterThan(projection.coreVecStart.x);
      expect(projection.coreLabelPos.x).toBeGreaterThan(projection.coreVecTip.x);
      expect(parsePolygonVertices(projection.coreVecArrow)).toHaveLength(3);

      // ORB vector curves clockwise along the Solar Circle arc
      expect(projection.orbArcPath.startsWith('M ')).toBe(true);
      expect(parsePolygonVertices(projection.orbArrow)).toHaveLength(3);
      expect(Number.isFinite(projection.orbLabelPos.x)).toBe(true);
      expect(Number.isFinite(projection.orbLabelPos.y)).toBe(true);
    });

    it('projects perpendicular North (+Z) stalk and Z-offset stalk when coordinatesPc.z is significant', () => {
      const basis = buildCameraBasis([0, -30, 18], [0, 0, 0], [0, 0, 1]);

      const onPlane = buildMinimapProjection(
        makeOrientation({ coordinatesPc: [0, 0, 0] }),
        basis,
        35,
      );
      expect(onPlane.hasPlaneZOffset).toBe(false);
      expect(onPlane.observerPos.x).toBeCloseTo(SVG_CX, 4);
      expect(onPlane.observerPos.y).toBeCloseTo(SVG_CY, 4);
      expect(onPlane.observerPlaneFootprint.y).toBeCloseTo(onPlane.observerPos.y, 4);
      expect(onPlane.northStalkTip.y).toBeLessThan(onPlane.observerPlaneFootprint.y);
      expect(onPlane.northLabelPos.y).toBeLessThan(onPlane.northStalkTip.y);

      const abovePlane = buildMinimapProjection(
        makeOrientation({ coordinatesPc: [0, 0, 100] }),
        basis,
        35,
      );
      expect(abovePlane.hasPlaneZOffset).toBe(true);
      expect(abovePlane.observerPlaneFootprint.y).toBeGreaterThan(abovePlane.observerPos.y);

      // Extreme Z offset clamps at [-0.4, 0.4]
      const extremeZ = buildMinimapProjection(
        makeOrientation({ coordinatesPc: [0, 0, 5000] }),
        basis,
        35,
      );
      expect(extremeZ.observerPlaneFootprint.y).toBeCloseTo(abovePlane.observerPlaneFootprint.y, 4);
    });

    it('applies cumulative cross-scale Galactic tilt across galaxy, system, and planet scopes from orientation metadata', () => {
      const basis = buildCameraBasis([0, -30, 18], [0, 0, 0], [0, 0, 1]);

      const galaxy = buildMinimapProjection(makeOrientation({ scope: 'galaxy' }), basis, 35);
      const system = buildMinimapProjection(
        makeOrientation({ scope: 'system', planeInclinationDeg: 60.19 }),
        basis,
        20,
      );
      const planet = buildMinimapProjection(
        makeOrientation({
          scope: 'planet',
          planeInclinationDeg: 60.19,
          axialTiltDeg: 23.44,
        }),
        basis,
        8,
      );

      expect(system.sectorPolygon).not.toBe(galaxy.sectorPolygon);
      expect(planet.sectorPolygon).not.toBe(system.sectorPolygon);
      expect(system.northStalkTip.y).not.toBeCloseTo(galaxy.northStalkTip.y, 1);
      expect(planet.northStalkTip.y).not.toBeCloseTo(system.northStalkTip.y, 1);
    });

    it('renders 0° tilt for an unmeasured exoplanet system when planeInclinationDeg is omitted', () => {
      const basis = buildCameraBasis([0, -30, 18], [0, 0, 0], [0, 0, 1]);

      const galaxy = buildMinimapProjection(makeOrientation({ scope: 'galaxy' }), basis, 20);
      const unmeasuredExoplanetSystem = buildMinimapProjection(
        makeOrientation({
          scope: 'system',
          anchorId: 'tau-ceti',
          anchorName: 'Tau Ceti',
          systemId: 'tau-ceti',
          systemName: 'Tau Ceti',
        }),
        basis,
        20,
      );

      expect(unmeasuredExoplanetSystem.sectorPolygon).toBe(galaxy.sectorPolygon);
      expect(unmeasuredExoplanetSystem.northStalkTip.x).toBeCloseTo(galaxy.northStalkTip.x, 6);
      expect(unmeasuredExoplanetSystem.northStalkTip.y).toBeCloseTo(galaxy.northStalkTip.y, 6);
    });

    it('couples local footprint ring radius to scope zoom distance', () => {
      const topDownBasis = buildCameraBasis([0, 0, 50], [0, 0, 0], [0, 1, 0]);
      const zoomedIn = buildMinimapProjection(makeOrientation({ scope: 'galaxy' }), topDownBasis, 5);
      const zoomedOut = buildMinimapProjection(makeOrientation({ scope: 'galaxy' }), topDownBasis, 500);

      const inVerts = parsePolygonVertices(zoomedIn.localViewportPolygon);
      const outVerts = parsePolygonVertices(zoomedOut.localViewportPolygon);
      expect(inVerts).toHaveLength(32);
      expect(outVerts).toHaveLength(32);

      const maxRadiusIn = Math.max(...inVerts.map((v) => Math.hypot(v.x - SVG_CX, v.y - SVG_CY)));
      const maxRadiusOut = Math.max(...outVerts.map((v) => Math.hypot(v.x - SVG_CX, v.y - SVG_CY)));
      expect(maxRadiusIn).toBeLessThan(maxRadiusOut);
    });

    it('stays finite under +Z and -Z pole camera singularities', () => {
      const plusZ = buildCameraBasis([0, 0, 50], [0, 0, 0], [0, 0, 1]);
      const minusZ = buildCameraBasis([0, 0, -50], [0, 0, 0], [0, 0, 1]);

      for (const basis of [plusZ, minusZ]) {
        const res = buildMinimapProjection(
          makeOrientation({ scope: 'system', planeInclinationDeg: 60.19 }),
          basis,
          20,
        );
        expect(res.sectorPolygon).not.toContain('NaN');
        expect(res.localViewportPolygon).not.toContain('NaN');
        expect(Number.isFinite(res.northStalkTip.x)).toBe(true);
        expect(Number.isFinite(res.northStalkTip.y)).toBe(true);
      }
    });
  });

  describe('computeZoomBarFillWidth', () => {
    it('computes logarithmic zoom fill clamped between 5% and 100% of track width', () => {
      expect(computeZoomBarFillWidth('galaxy', 5)).toBe(ZOOM_TRACK_WIDTH);
      expect(computeZoomBarFillWidth('galaxy', 1)).toBe(ZOOM_TRACK_WIDTH);
      expect(computeZoomBarFillWidth('galaxy', 500)).toBe(Number((0.05 * ZOOM_TRACK_WIDTH).toFixed(1)));
      expect(computeZoomBarFillWidth('galaxy', 5000)).toBe(Number((0.05 * ZOOM_TRACK_WIDTH).toFixed(1)));

      const nearSys = computeZoomBarFillWidth('system', 5);
      const farSys = computeZoomBarFillWidth('system', 100);
      expect(nearSys).toBeGreaterThan(farSys);

      const nearPlanet = computeZoomBarFillWidth('planet', 3);
      const farPlanet = computeZoomBarFillWidth('planet', 200);
      expect(nearPlanet).toBeGreaterThan(farPlanet);
    });
  });

  describe('formatDistanceValue', () => {
    it('formats distances across magnitude bands and returns em-dash for invalid values', () => {
      expect(formatDistanceValue(0)).toBe('—');
      expect(formatDistanceValue(-10)).toBe('—');
      expect(formatDistanceValue(Number.NaN)).toBe('—');
      expect(formatDistanceValue(Number.POSITIVE_INFINITY)).toBe('—');
      expect(formatDistanceValue(250.4)).toBe('250');
      expect(formatDistanceValue(100)).toBe('100');
      expect(formatDistanceValue(35.24)).toBe('35.2');
      expect(formatDistanceValue(10)).toBe('10.0');
      expect(formatDistanceValue(4.567)).toBe('4.57');
    });
  });
});
