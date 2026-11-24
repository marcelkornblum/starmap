import type {
  FocusedPreviewSummary,
  PreviewOrbitElement,
} from '../../../services/details/detailsNavigationTypes';
import type { CelestialSymbolType } from '../../../types/astro';
import { RADIANS_TO_DEG } from '../../../utils/astroCoordinates';
import {
  buildCameraBasis,
  buildProjectedRing,
  projectOrbitalPoint3D,
  projectPoint3D,
  type CameraBasis,
  type ProjectedPoint,
} from '../../../utils/orientationProjectionMath';
import { resolveTargetReferencePlane } from '../../../utils/referenceFrameOrientation';

export const SVG_WIDTH = 260;
export const SVG_HEIGHT = 156;
export const SVG_CX = 130;
export const SVG_CY = 80;
export const DISC_SCALE = 62;

/**
 * Fixed outer isometric basis looking largely along the X-axis line of nodes
 * so relative inclination between the horizontal outer plane and tilted target plane is clear.
 */
export const OUTER_PREVIEW_BASIS: CameraBasis = buildCameraBasis(
  [-22, -14, 11],
  [0, 0, 0],
  [0, 0, 1],
);

const CONCENTRIC_RING_RADII = [0.35, 0.68] as const;
const GOLDEN_ANGLE_RAD = 2.39996323;

export interface ResolvedPreviewPlane {
  readonly parentLabel: string;
  readonly targetLabel: string;
  readonly tiltDeg: number;
  readonly nodeDeg: number;
}

export interface ProjectedPreviewBody {
  readonly id: string;
  readonly name: string;
  readonly kind: PreviewOrbitElement['kind'];
  readonly symbolType: CelestialSymbolType;
  readonly inHabitableZone: boolean;
  readonly point: ProjectedPoint;
}

function resolveFallbackSymbolType(kind: PreviewOrbitElement['kind']): CelestialSymbolType {
  switch (kind) {
    case 'star':
      return 'star';
    case 'planet':
      return 'terrestrial';
    case 'dwarf-planet':
      return 'dwarf-planet';
    case 'moon':
      return 'moon';
    case 'belt':
      return 'belt';
    case 'spacecraft':
      return 'spacecraft';
    case 'minor-body':
      return 'asteroid';
  }
}

export function resolvePrimarySymbolType(preview: FocusedPreviewSummary): CelestialSymbolType {
  if (preview.reticleType) {
    return preview.reticleType;
  }
  if (preview.previewMode === 'planetary-system') {
    return 'terrestrial';
  }
  return 'star';
}

export function resolvePreviewPlane(preview: FocusedPreviewSummary): ResolvedPreviewPlane {
  if (preview.previewMode === 'system-orbits') {
    if (preview.primaryInclinationDeg === 0) {
      return {
        parentLabel: 'Galactic Plane',
        targetLabel: 'System Plane',
        tiltDeg: 0,
        nodeDeg: 0,
      };
    }
    const descriptor = resolveTargetReferencePlane(
      'galaxy',
      'system',
      preview.primaryInclinationDeg !== undefined
        ? { inclinationDeg: preview.primaryInclinationDeg }
        : undefined,
    );
    return {
      parentLabel: 'Galactic Plane',
      targetLabel: 'System Plane',
      tiltDeg: descriptor.inclinationRad * RADIANS_TO_DEG,
      nodeDeg: descriptor.ascendingNodeRad * RADIANS_TO_DEG,
    };
  }

  if (preview.previewMode === 'planetary-system') {
    if (
      typeof preview.primaryInclinationDeg === 'number' &&
      Number.isFinite(preview.primaryInclinationDeg)
    ) {
      return {
        parentLabel: 'System Plane',
        targetLabel: 'Equatorial Plane',
        tiltDeg: preview.primaryInclinationDeg,
        nodeDeg: 0,
      };
    }
    const descriptor = resolveTargetReferencePlane('system', 'planet', undefined);
    return {
      parentLabel: 'System Plane',
      targetLabel: 'Equatorial Plane',
      tiltDeg: descriptor.inclinationRad * RADIANS_TO_DEG,
      nodeDeg: descriptor.ascendingNodeRad * RADIANS_TO_DEG,
    };
  }

  return {
    parentLabel: 'Reference Plane',
    targetLabel: 'Orbital Plane',
    tiltDeg: preview.primaryInclinationDeg ?? 0,
    nodeDeg: 0,
  };
}

function computeBodyNormRadii(elements: readonly PreviewOrbitElement[]): readonly number[] {
  if (elements.length === 0) return [];
  const validAxes = elements
    .map((el) => el.semiMajorAxisAu)
    .filter((a): a is number => typeof a === 'number' && Number.isFinite(a) && a > 0);

  if (validAxes.length >= 2) {
    const minLog = Math.log10(Math.min(...validAxes));
    const maxLog = Math.log10(Math.max(...validAxes));
    const span = maxLog - minLog;
    if (span > 1e-4) {
      return elements.map((el, idx) => {
        if (typeof el.semiMajorAxisAu === 'number' && el.semiMajorAxisAu > 0) {
          const t = (Math.log10(el.semiMajorAxisAu) - minLog) / span;
          return 0.26 + Math.max(0, Math.min(1, t)) * 0.64;
        }
        return 0.26 + (idx / Math.max(1, elements.length - 1)) * 0.64;
      });
    }
  }

  if (elements.length === 1) return [0.58];
  return elements.map((_, idx) => 0.26 + (idx / (elements.length - 1)) * 0.64);
}

export function buildPreviewProjection(
  preview: FocusedPreviewSummary,
  basis: CameraBasis = OUTER_PREVIEW_BASIS,
) {
  const plane = resolvePreviewPlane(preview);
  const primarySymbolType = resolvePrimarySymbolType(preview);

  const parentRing = buildProjectedRing({
    radius: 1.0,
    inclinationDeg: 0,
    ascendingNodeDeg: 0,
    basis,
    cx: SVG_CX,
    cy: SVG_CY,
    scale: DISC_SCALE,
    segments: 64,
  });
  const targetRing = buildProjectedRing({
    radius: 0.96,
    inclinationDeg: plane.tiltDeg,
    ascendingNodeDeg: plane.nodeDeg,
    basis,
    cx: SVG_CX,
    cy: SVG_CY,
    scale: DISC_SCALE,
    segments: 64,
  });

  const concentricRings = CONCENTRIC_RING_RADII.map((radius) =>
    buildProjectedRing({
      radius,
      inclinationDeg: plane.tiltDeg,
      ascendingNodeDeg: plane.nodeDeg,
      basis,
      cx: SVG_CX,
      cy: SVG_CY,
      scale: DISC_SCALE,
      segments: 56,
    }),
  );

  const origin = projectPoint3D([0, 0, 0], basis, SVG_CX, SVG_CY, DISC_SCALE);

  const radii = computeBodyNormRadii(preview.orbitElements);
  const bodies: ProjectedPreviewBody[] = preview.orbitElements
    .map((el, idx) => {
      const radius = radii[idx] ?? 0.55;
      const theta = idx * GOLDEN_ANGLE_RAD + 0.55;
      const point = projectOrbitalPoint3D({
        radius,
        inclinationDeg: plane.tiltDeg,
        ascendingNodeDeg: plane.nodeDeg,
        eccentricAnomalyRad: theta,
        basis,
        cx: SVG_CX,
        cy: SVG_CY,
        scale: DISC_SCALE,
      });
      return {
        id: el.id,
        name: el.name,
        kind: el.kind,
        symbolType: el.symbolType ?? resolveFallbackSymbolType(el.kind),
        inHabitableZone: el.inHabitableZone,
        point,
      };
    })
    .sort((a, b) => a.point.depth - b.point.depth);

  return {
    plane,
    primarySymbolType,
    parentRing,
    targetRing,
    concentricRings,
    origin,
    bodies,
  };
}
