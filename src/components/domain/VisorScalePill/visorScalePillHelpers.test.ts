import { describe, it, expect } from 'vitest';
import type { MinimapOrientationSummary } from '../../../services/details/detailsNavigationTypes';
import {
  STANDARD_CAMERA_DISTANCES,
  getStandardInitialCamera,
} from '../../canvas/cartography/cartographyCamera';
import {
  INITIAL_CAMERA_STATE,
  type CameraProjectionMode,
} from '../../../stores/useCameraStore';
import {
  buildCameraBasis,
  resolveEffectiveCameraOrientation,
  type Vec3Tuple,
} from '../../../utils/orientationProjectionMath';
import {
  formatCompactTargetCoords,
  resolveEffectiveTargetCoords,
  resolveVisorPillAriaLabel,
  resolveVisorPillNextAction,
} from './visorScalePillHelpers';

const baseGalaxyOrientation: MinimapOrientationSummary = {
  scope: 'galaxy',
  anchorId: 'sol',
  anchorName: 'Sol',
  systemId: 'sol',
  systemName: 'Sol',
  coordinatesPc: [0, 0, 0],
  distanceFromOriginPc: 0,
  focusedMarker: null,
  selectedMarkers: [],
  markers: [],
};

const baseSystemOrientation: MinimapOrientationSummary = {
  scope: 'system',
  anchorId: 'sol',
  anchorName: 'Sol',
  systemId: 'sol',
  systemName: 'Sol',
  focusedMarker: null,
  selectedMarkers: [],
  markers: [],
};

const basePlanetOrientation: MinimapOrientationSummary = {
  scope: 'planet',
  anchorId: 'earth',
  anchorName: 'Earth',
  systemId: 'sol',
  systemName: 'Sol',
  focusedMarker: null,
  selectedMarkers: [],
  markers: [],
};

function makeLivePose(
  distance: number,
  target: Vec3Tuple = [0, 0, 0],
  options?: {
    position?: Vec3Tuple;
    up?: Vec3Tuple;
    zoom?: number;
  },
) {
  const canonical = getStandardInitialCamera(distance, [target[0], target[1], target[2]], 45);
  const position = options?.position ?? canonical.position;
  const up = options?.up ?? canonical.up;
  const focalDistance = Math.hypot(
    position[0] - target[0],
    position[1] - target[1],
    position[2] - target[2],
  );
  return {
    position,
    target,
    up,
    focalDistance,
    zoom: options?.zoom ?? 1,
  };
}

function evaluateAction(
  orientation: MinimapOrientationSummary,
  livePose: ReturnType<typeof makeLivePose>,
  isLocked = false,
  mode: CameraProjectionMode = 'perspective',
  inFlightStep?: 'reorient' | 'reset-zoom' | 'reset-position' | null,
) {
  const effectiveCamera = resolveEffectiveCameraOrientation(orientation, livePose);
  if (!effectiveCamera) {
    throw new Error('Expected non-null effectiveCamera');
  }
  return resolveVisorPillNextAction({
    orientation,
    effectiveCamera,
    livePose,
    isLocked,
    mode,
    inFlightStep,
  });
}

describe('visorScalePillHelpers', () => {
  describe('formatCompactTargetCoords', () => {
    it('formats origin and near-zero values as 0 without -0 or .0', () => {
      expect(formatCompactTargetCoords([0, 0, 0])).toBe('0,0,0');
      expect(formatCompactTargetCoords([-0, 0.04, -0.049])).toBe('0,0,0');
    });

    it('formats integer and fractional values compactly for mobile pill width', () => {
      expect(formatCompactTargetCoords([1, -2, 3])).toBe('1,-2,3');
      expect(formatCompactTargetCoords([1.24, -0.94, 10.04])).toBe('1.2,-0.9,10');
      expect(formatCompactTargetCoords([-0.9, 2.4, -2.9])).toBe('-0.9,2.4,-2.9');
    });

    it('rounds values >= 100 to whole integers', () => {
      expect(formatCompactTargetCoords([100.4, -142.6, 99.94])).toBe('100,-143,99.9');
    });
  });

  describe('resolveEffectiveTargetCoords', () => {
    it('returns livePose.target when livePose is no longer the untouched initial store pose', () => {
      const livePose = makeLivePose(28, [3.2, -1.4, 0.5]);
      expect(resolveEffectiveTargetCoords(baseGalaxyOrientation, livePose)).toEqual([3.2, -1.4, 0.5]);
    });

    it('uses orientation.coordinatesPc on galaxy fallback and [0,0,0] on system/planet fallback', () => {
      const untouched = {
        position: INITIAL_CAMERA_STATE.position,
        target: INITIAL_CAMERA_STATE.target,
        up: INITIAL_CAMERA_STATE.up,
      };
      expect(
        resolveEffectiveTargetCoords(
          { ...baseGalaxyOrientation, coordinatesPc: [-0.9, 2.4, -2.9] },
          untouched,
        ),
      ).toEqual([-0.9, 2.4, -2.9]);
      expect(resolveEffectiveTargetCoords(baseSystemOrientation, untouched)).toEqual([0, 0, 0]);
      expect(resolveEffectiveTargetCoords(basePlanetOrientation, untouched)).toEqual([0, 0, 0]);
    });
  });

  describe('resolveVisorPillNextAction', () => {
    it('returns all-ready on untouched initial fallback when URL camera params are omitted and origin is [0,0,0]', () => {
      const untouched = {
        ...INITIAL_CAMERA_STATE,
      };
      expect(evaluateAction(baseGalaxyOrientation, untouched)).toBe('all-ready');
      expect(evaluateAction(baseSystemOrientation, untouched)).toBe('all-ready');
      expect(evaluateAction(basePlanetOrientation, untouched)).toBe('all-ready');
    });

    it('returns reorient when orthographic lock or mode is active', () => {
      const canonicalLive = makeLivePose(STANDARD_CAMERA_DISTANCES.galactic, [0, 0, 0]);
      expect(evaluateAction(baseGalaxyOrientation, canonicalLive, true, 'orthographic')).toBe(
        'reorient',
      );
      expect(evaluateAction(baseGalaxyOrientation, canonicalLive, false, 'orthographic')).toBe(
        'reorient',
      );
    });

    it('returns reorient when azimuth, elevation, or up-vector deviates beyond tolerance', () => {
      // Elevation off by > 1.5 deg (e.g. 45 deg)
      const highEl = makeLivePose(28, [0, 0, 0], { position: [0, -20, 20] });
      expect(evaluateAction(baseGalaxyOrientation, highEl)).toBe('reorient');

      // Rolled upside down (up = [0, 0, -1])
      const rolled = makeLivePose(28, [0, 0, 0], { up: [0, 0, -1] });
      expect(evaluateAction(baseGalaxyOrientation, rolled)).toBe('reorient');

      // Azimuth off by > 2 deg while elevation is 32 deg
      const theta = (32 * Math.PI) / 180;
      const phi = (20 * Math.PI) / 180;
      const azOffPos: Vec3Tuple = [
        -28 * Math.cos(theta) * Math.cos(phi),
        -28 * Math.cos(theta) * Math.sin(phi),
        28 * Math.sin(theta),
      ];
      const azOff = makeLivePose(28, [0, 0, 0], { position: azOffPos });
      expect(evaluateAction(baseGalaxyOrientation, azOff)).toBe('reorient');
    });

    it('returns reset-zoom when orientation is canonical but distance or zoom deviates', () => {
      const zoomedOut = makeLivePose(60, [0, 0, 0]);
      expect(evaluateAction(baseGalaxyOrientation, zoomedOut)).toBe('reset-zoom');

      const zoomChanged = makeLivePose(STANDARD_CAMERA_DISTANCES.galactic, [0, 0, 0], {
        zoom: 1.5,
      });
      expect(evaluateAction(baseGalaxyOrientation, zoomChanged)).toBe('reset-zoom');

      // System and planet standard distances
      expect(
        evaluateAction(baseSystemOrientation, makeLivePose(STANDARD_CAMERA_DISTANCES.system)),
      ).toBe('all-ready');
      expect(evaluateAction(baseSystemOrientation, makeLivePose(45))).toBe('reset-zoom');

      expect(
        evaluateAction(basePlanetOrientation, makeLivePose(STANDARD_CAMERA_DISTANCES.planetary)),
      ).toBe('all-ready');
      expect(evaluateAction(basePlanetOrientation, makeLivePose(60))).toBe('reset-zoom');
    });

    it('returns reset-position when orientation and zoom are canonical but target is panned off origin', () => {
      const panned = makeLivePose(STANDARD_CAMERA_DISTANCES.galactic, [-0.9, 2.4, -2.9]);
      const basis = buildCameraBasis(panned.position, panned.target, panned.up);
      expect(basis.elevationDeg).toBeCloseTo(32, 3);
      expect(basis.azimuthDeg).toBeCloseTo(14, 3);
      expect(evaluateAction(baseGalaxyOrientation, panned)).toBe('reset-position');
    });

    it('returns all-ready when orientation, zoom, and target all match canonical defaults within tolerances', () => {
      const canonical = makeLivePose(STANDARD_CAMERA_DISTANCES.galactic, [0.01, -0.01, 0]);
      expect(evaluateAction(baseGalaxyOrientation, canonical)).toBe('all-ready');
    });

    it('advances through reorient -> reset-zoom -> reset-position -> all-ready when inFlightStep is provided', () => {
      const offEverything = makeLivePose(60, [5, -2, 1], { position: [5, -2, 61], up: [0, 1, 0] });
      expect(evaluateAction(baseGalaxyOrientation, offEverything)).toBe('reorient');
      expect(evaluateAction(baseGalaxyOrientation, offEverything, false, 'perspective', 'reorient')).toBe(
        'reset-zoom',
      );
      expect(evaluateAction(baseGalaxyOrientation, offEverything, false, 'perspective', 'reset-zoom')).toBe(
        'reset-position',
      );
      expect(
        evaluateAction(baseGalaxyOrientation, offEverything, false, 'perspective', 'reset-position'),
      ).toBe('all-ready');

      // When zoom & position are already canonical, inFlightStep: 'reorient' skips straight to 'all-ready'
      const onlyOffOrientation = makeLivePose(STANDARD_CAMERA_DISTANCES.galactic, [0, 0, 0], {
        position: [0, -STANDARD_CAMERA_DISTANCES.galactic, 0],
        up: [0, 0, 1],
      });
      expect(
        evaluateAction(baseGalaxyOrientation, onlyOffOrientation, false, 'perspective', 'reorient'),
      ).toBe('all-ready');
    });
  });

  describe('resolveVisorPillAriaLabel', () => {
    it('returns distinct descriptive aria labels for all 4 states', () => {
      expect(resolveVisorPillAriaLabel('reorient')).toBe('Reset camera orientation to North');
      expect(resolveVisorPillAriaLabel('reset-zoom')).toBe('Reset camera zoom');
      expect(resolveVisorPillAriaLabel('reset-position')).toBe('Reset camera position to origin');
      expect(resolveVisorPillAriaLabel('all-ready')).toBe(
        'Camera at default orientation, zoom, and position',
      );
    });
  });
});
