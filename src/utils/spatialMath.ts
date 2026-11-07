import type {
  InteractionState,
  InteractionTier,
  JourneyChordLeg,
  JourneyChordLegGeometryData,
  JourneyChordRenderData,
  JourneyChordWaypoint,
  Vec3Tuple,
} from '../types/spatial';

export type {
  InteractionState,
  InteractionTier,
  JourneyChordLeg,
  JourneyChordLegGeometryData,
  JourneyChordRenderData,
  JourneyChordWaypoint,
  Vec3Tuple,
};

export const QUADRANTS = [
  { qx: 1, qy: 1 },
  { qx: -1, qy: 1 },
  { qx: -1, qy: -1 },
  { qx: 1, qy: -1 },
] as const;

/**
 * Calculates current focal aperture radius based on camera distance and reference metrics.
 */
export function computeApertureRadius(
  camDistance: number,
  baseRadius: number,
  referenceDistance: number,
  screenConstant = true,
  minRadius = 0,
): number {
  if (!screenConstant) {
    return baseRadius;
  }
  const effectiveRefDist = referenceDistance > 0 ? referenceDistance : 3.49 * baseRadius;
  const clampedCamDist = Math.max(camDistance, minRadius);
  return baseRadius * (clampedCamDist / effectiveRefDist);
}

/**
 * Returns true if a position is within the aperture radius of origin.
 */
export function isInsideAperture(
  pos: Vec3Tuple,
  origin: Vec3Tuple,
  radius: number,
): boolean {
  const dx = pos[0] - origin[0];
  const dy = pos[1] - origin[1];
  const dz = pos[2] - origin[2];
  return dx * dx + dy * dy + dz * dz <= radius * radius;
}

/**
 * Calculates continuous alpha fade across the feathered aperture perimeter buffer.
 */
export function computePerimeterFade(
  dist: number,
  radius: number,
  featherThreshold = 0.8,
): number {
  if (radius <= 0 || dist >= radius) return 0;
  const innerR = radius * featherThreshold;
  if (dist <= innerR) return 1.0;
  const t = (radius - dist) / (radius - innerR);
  return t * t * (3 - 2 * t);
}

/**
 * Derives interaction tier for any given entity based on hover/selection/focus/aperture state.
 */
export function deriveEntityTier(id: string, state: InteractionState): InteractionTier {
  const isInFocusedSet = state.focusedIds
    ? state.focusedIds instanceof Set
      ? state.focusedIds.has(id)
      : state.focusedIds.includes(id)
    : false;
  if (id === state.focusedId || isInFocusedSet) {
    return 'focused';
  }
  const isInSelectedSet = state.selectedIds
    ? state.selectedIds instanceof Set
      ? state.selectedIds.has(id)
      : state.selectedIds.includes(id)
    : false;
  if (id === state.selectedId || id === state.hoveredId || isInSelectedSet) {
    return 'selected';
  }
  const isInAperture = state.apertureIds instanceof Set
    ? state.apertureIds.has(id)
    : state.apertureIds.includes(id);

  if (isInAperture) {
    return 'active';
  }
  return 'passive';
}

/**
 * Stalks render strictly for 'selected' and 'focused' tiers.
 */
export function isStalkVisible(tier: InteractionTier): boolean {
  return tier === 'selected' || tier === 'focused';
}

/**
 * Datum footprints exist if and only if the stalk exists.
 */
export function isFootprintVisible(tier: InteractionTier): boolean {
  return isStalkVisible(tier);
}

/**
 * A selected or focused entity forces its orbit to render regardless of layer toggle.
 */
export function isOrbitForceRendered(tier: InteractionTier): boolean {
  return tier === 'selected' || tier === 'focused';
}

/**
 * Builds deterministic 3D render data for a sequence of route legs.
 */
export function buildJourneyChordRenderData(
  legs: readonly JourneyChordLeg[],
): JourneyChordRenderData {
  if (!legs || legs.length === 0) {
    return {
      legs: [],
      waypoints: [],
      totalEuclideanLength: 0,
    };
  }

  const geometryLegs: JourneyChordLegGeometryData[] = [];
  const waypointsMap = new Map<string, JourneyChordWaypoint>();
  let totalLength = 0;

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const [x1, y1, z1] = leg.fromPosition;
    const [x2, y2, z2] = leg.toPosition;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const euclideanLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
    totalLength += euclideanLength;

    const midpoint: readonly [number, number, number] = [
      (x1 + x2) / 2,
      (y1 + y2) / 2,
      (z1 + z2) / 2,
    ];

    const elevationProjectionSegments =
      Math.abs(dz) > 1e-3
        ? [x1, y1, z1, x2, y2, z1, x2, y2, z1, x2, y2, z2]
        : undefined;

    geometryLegs.push({
      id: leg.id,
      stepIndex: leg.stepIndex ?? i,
      fromId: leg.fromId,
      toId: leg.toId,
      positions: [x1, y1, z1, x2, y2, z2],
      midpoint,
      euclideanLength,
      deltaZ: dz,
      elevationProjectionSegments,
      distanceLabel: leg.distanceLabel,
      secondaryLabel: leg.secondaryLabel,
      lineStyle: leg.lineStyle ?? 'solid',
    });

    if (i === 0 && !waypointsMap.has(leg.fromId)) {
      waypointsMap.set(leg.fromId, {
        id: leg.fromId,
        name: leg.fromName,
        position: leg.fromPosition,
        role: 'origin',
        stepIndex: 0,
      });
    }

    const isFinalDestination = i === legs.length - 1;
    const role: 'waypoint' | 'destination' = isFinalDestination
      ? 'destination'
      : 'waypoint';

    const existing = waypointsMap.get(leg.toId);
    if (!existing) {
      waypointsMap.set(leg.toId, {
        id: leg.toId,
        name: leg.toName,
        position: leg.toPosition,
        role,
        stepIndex: i + 1,
      });
    } else if (isFinalDestination) {
      waypointsMap.set(leg.toId, {
        ...existing,
        role: 'destination',
      });
    }
  }

  return {
    legs: geometryLegs,
    waypoints: Array.from(waypointsMap.values()),
    totalEuclideanLength: totalLength,
  };
}
