import { GALACTIC_FRAME, PLANETARY_FRAME, SYSTEM_FRAME } from '../../../config/referenceFrames';
import type { MinimapOrientationSummary, MinimapScope } from '../../../services/details/detailsNavigationTypes';
import { DEG_TO_RADIANS } from '../../../utils/astroCoordinates';
import {
  CANONICAL_ISOMETRIC_POSE,
  projectPoint3D,
  type CameraBasis,
  type ProjectedPoint,
  type Vec3Tuple,
} from '../../../utils/orientationProjectionMath';

export const SVG_WIDTH = 196;
export const SVG_HEIGHT = 128;
export const SVG_CX = 98;
export const SVG_CY = 66;
export const DISC_SCALE = 56;
export const ZOOM_TRACK_WIDTH = 120;

const CORE_ARC_RADIUS = 3.8;
const INNER_ARC_RADIUS = 2.82;
const OUTER_ARC_RADIUS = 4.78;
const SECTOR_HALF_SPAN_DEG = 16.5;

export const FRAME_BY_SCOPE = {
  galaxy: GALACTIC_FRAME,
  system: SYSTEM_FRAME,
  planet: PLANETARY_FRAME,
} as const;

export function isInitialUntouchedPose(pos: Vec3Tuple, target: Vec3Tuple, up: Vec3Tuple): boolean {
  return (
    pos[0] === 0 && pos[1] === 0 && pos[2] === 10 &&
    target[0] === 0 && target[1] === 0 && target[2] === 0 &&
    up[0] === 0 && up[1] === 1 && up[2] === 0
  );
}

export function resolveSphericalFallbackPose(
  orientation: MinimapOrientationSummary,
): { position: Vec3Tuple; target: Vec3Tuple; up: Vec3Tuple; distance: number } {
  const dist =
    typeof orientation.cameraDistance === 'number' &&
    Number.isFinite(orientation.cameraDistance) &&
    orientation.cameraDistance > 0
      ? orientation.cameraDistance
      : 20;

  if (orientation.cameraAzimuthDeg === undefined && orientation.cameraElevationDeg === undefined) {
    return {
      position: [0, -30, 18],
      target: CANONICAL_ISOMETRIC_POSE.target,
      up: CANONICAL_ISOMETRIC_POSE.up,
      distance: dist,
    };
  }

  const azRad = (orientation.cameraAzimuthDeg ?? 45) * DEG_TO_RADIANS;
  const elRad = (orientation.cameraElevationDeg ?? 30) * DEG_TO_RADIANS;
  const cosEl = Math.cos(elRad);
  return {
    position: [-dist * cosEl * Math.cos(azRad), -dist * cosEl * Math.sin(azRad), dist * Math.sin(elRad)],
    target: [0, 0, 0],
    up: [0, 0, 1],
    distance: dist,
  };
}

function getCumulativeScopeTiltDeg(orientation: MinimapOrientationSummary): number {
  if (orientation.scope === 'galaxy') return 0;
  const systemTiltDeg =
    typeof orientation.planeInclinationDeg === 'number' &&
    Number.isFinite(orientation.planeInclinationDeg)
      ? orientation.planeInclinationDeg
      : 0;
  if (orientation.scope === 'system') return systemTiltDeg;
  const axialTiltDeg =
    typeof orientation.axialTiltDeg === 'number' &&
    Number.isFinite(orientation.axialTiltDeg)
      ? orientation.axialTiltDeg
      : 0;
  return systemTiltDeg + axialTiltDeg;
}

function rotateAroundAxes(
  x: number,
  y: number,
  z: number,
  inclinationDeg: number,
  ascendingNodeDeg: number,
): Vec3Tuple {
  if (Math.abs(inclinationDeg) < 1e-5) return [x, y, z];
  const inc = inclinationDeg * DEG_TO_RADIANS;
  const node = ascendingNodeDeg * DEG_TO_RADIANS;
  const cosI = Math.cos(inc);
  const sinI = Math.sin(inc);
  const cosN = Math.cos(node);
  const sinN = Math.sin(node);
  const y1 = y * cosI - z * sinI;
  const z1 = y * sinI + z * cosI;
  return [x * cosN - y1 * sinN, x * sinN + y1 * cosN, z1];
}

function buildArrowheadPolygon(tip: ProjectedPoint, tail: ProjectedPoint, size = 4.0): string {
  const dx = tip.x - tail.x;
  const dy = tip.y - tail.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-3) return '';
  const ux = dx / len;
  const uy = dy / len;
  const bx = tip.x - ux * size;
  const by = tip.y - uy * size;
  const w = size * 0.56;
  return `${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${(bx - uy * w).toFixed(1)},${(by + ux * w).toFixed(1)} ${(bx + uy * w).toFixed(1)},${(by - ux * w).toFixed(1)}`;
}

function pointsToSvgPath(pts: readonly ProjectedPoint[]): string {
  return pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

export function buildMinimapProjection(
  orientation: MinimapOrientationSummary,
  liveBasis: CameraBasis,
  distance: number,
) {
  const galacticTiltDeg = -getCumulativeScopeTiltDeg(orientation);
  const galacticNodeDeg = SYSTEM_FRAME.planeAscendingNodeDeg ?? 0;

  const projectLocalGalactic = (gx: number, gy: number, gz: number) =>
    projectPoint3D(
      rotateAroundAxes(gx, gy, gz, galacticTiltDeg, galacticNodeDeg),
      liveBasis,
      SVG_CX,
      SVG_CY,
      DISC_SCALE,
    );

  const coordsPc = orientation.coordinatesPc ?? [0, 0, 0];
  const planeZ = Math.max(-0.4, Math.min(0.4, -coordsPc[2] / 250));

  const projectPolarFromCore = (r: number, thetaRad: number, z = planeZ) =>
    projectLocalGalactic(CORE_ARC_RADIUS + r * Math.cos(thetaRad), r * Math.sin(thetaRad), z);

  const thetaMin = (180 - SECTOR_HALF_SPAN_DEG) * DEG_TO_RADIANS;
  const thetaMax = (180 + SECTOR_HALF_SPAN_DEG) * DEG_TO_RADIANS;
  const arcSteps = 20;

  const sampleArc = (r: number) => {
    const pts: ProjectedPoint[] = [];
    for (let i = 0; i <= arcSteps; i++) {
      pts.push(projectPolarFromCore(r, thetaMin + ((thetaMax - thetaMin) * i) / arcSteps));
    }
    return pts;
  };

  const innerArcPts = sampleArc(INNER_ARC_RADIUS);
  const midInnerArcPts = sampleArc((INNER_ARC_RADIUS + CORE_ARC_RADIUS) * 0.5);
  const midArcPts = sampleArc(CORE_ARC_RADIUS);
  const midOuterArcPts = sampleArc((CORE_ARC_RADIUS + OUTER_ARC_RADIUS) * 0.5);
  const outerArcPts = sampleArc(OUTER_ARC_RADIUS);

  const sectorPolygon = [...innerArcPts, ...[...outerArcPts].reverse()]
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  const radialAngles = [
    (180 - SECTOR_HALF_SPAN_DEG * 0.55) * DEG_TO_RADIANS,
    Math.PI,
    (180 + SECTOR_HALF_SPAN_DEG * 0.55) * DEG_TO_RADIANS,
  ];
  const sparseRadials = radialAngles.map((theta) => ({
    outPt: projectPolarFromCore(OUTER_ARC_RADIUS, theta),
    inPt: projectPolarFromCore(INNER_ARC_RADIUS, theta),
  }));

  // CORE bearing arrow from our position toward Galactic Core (+X)
  const coreVecStart = projectPolarFromCore(CORE_ARC_RADIUS - 0.14, Math.PI);
  const coreVecTip = projectPolarFromCore(INNER_ARC_RADIUS - 0.18, Math.PI);
  const coreLabelPos = projectPolarFromCore(INNER_ARC_RADIUS - 0.42, Math.PI);

  // ORB curved rotation vector along Solar Circle arc (+Y)
  const orbPts: ProjectedPoint[] = [];
  const orbStart = 177.5 * DEG_TO_RADIANS;
  const orbEnd = 165 * DEG_TO_RADIANS;
  for (let i = 0; i <= 8; i++) {
    orbPts.push(projectPolarFromCore(CORE_ARC_RADIUS, orbStart + ((orbEnd - orbStart) * i) / 8));
  }
  const orbTip = orbPts[orbPts.length - 1] ?? coreVecStart;
  const orbPrev = orbPts[orbPts.length - 2] ?? coreVecStart;
  const orbLabelPos = projectPolarFromCore(CORE_ARC_RADIUS, 161.5 * DEG_TO_RADIANS);

  // Framed current position + perpendicular North (+Z) stalk normal to the Galactic Plane
  const observerPos = projectLocalGalactic(0, 0, 0);
  const observerPlaneFootprint = projectLocalGalactic(0, 0, planeZ);
  const northStalkTip = projectLocalGalactic(0, 0, planeZ + 0.56);
  const northLabelPos = projectLocalGalactic(0, 0, planeZ + 0.72);

  // Zoom-coupled local footprint ring
  const zoomRatio = computeZoomNormalized(orientation.scope, distance);
  const localRingRadius = 0.16 + (1 - zoomRatio) * 0.44;
  const localRingPts: string[] = [];
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const p = projectLocalGalactic(localRingRadius * Math.cos(a), localRingRadius * Math.sin(a), 0);
    localRingPts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }

  return {
    sectorPolygon,
    midInnerArcPath: pointsToSvgPath(midInnerArcPts),
    midArcPath: pointsToSvgPath(midArcPts),
    midOuterArcPath: pointsToSvgPath(midOuterArcPts),
    sparseRadials,
    coreVecStart,
    coreVecTip,
    coreVecArrow: buildArrowheadPolygon(coreVecTip, coreVecStart, 4.0),
    coreLabelPos,
    orbArcPath: pointsToSvgPath(orbPts),
    orbArrow: buildArrowheadPolygon(orbTip, orbPrev, 4.0),
    orbLabelPos,
    observerPos,
    observerPlaneFootprint,
    hasPlaneZOffset: Math.abs(planeZ) > 0.03,
    northStalkTip,
    northLabelPos,
    localViewportPolygon: localRingPts.join(' '),
  };
}

function computeZoomNormalized(scope: MinimapScope, distance: number): number {
  const { minDistance, maxDistance } = FRAME_BY_SCOPE[scope].camera;
  const minLog = Math.log10(Math.max(0.1, minDistance));
  const maxLog = Math.log10(Math.max(minDistance + 1, maxDistance));
  const clampedDist = Math.max(minDistance, Math.min(maxDistance, distance));
  const t = (maxLog - Math.log10(clampedDist)) / Math.max(1e-4, maxLog - minLog);
  return Math.max(0.05, Math.min(1, t));
}

export function computeZoomBarFillWidth(scope: MinimapScope, distance: number): number {
  return Number((computeZoomNormalized(scope, distance) * ZOOM_TRACK_WIDTH).toFixed(1));
}

export function formatDistanceValue(distance: number): string {
  if (!Number.isFinite(distance) || distance <= 0) return '—';
  if (distance >= 100) return distance.toFixed(0);
  if (distance >= 10) return distance.toFixed(1);
  return distance.toFixed(2);
}
