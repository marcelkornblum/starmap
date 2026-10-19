/**
 * DEC-033: Journey 3D Visual Chord Geometry Builder
 * Pure mathematical functions to transform journey route legs into
 * R3F rendering descriptors for 3D trajectory lines, waypoints, and elevation drops.
 */

export interface JourneyChordLeg {
  readonly id: string;
  readonly stepIndex: number;
  readonly fromId: string;
  readonly fromName: string;
  readonly toId: string;
  readonly toName: string;
  readonly fromPosition: readonly [number, number, number];
  readonly toPosition: readonly [number, number, number];
  readonly distanceLabel: string;
  readonly secondaryLabel?: string;
  readonly methodId?: string;
  readonly lineStyle?: 'solid' | 'dashed' | 'dotted';
  readonly domain?: 'interstellar' | 'intra-system';
  readonly originId?: string;
  readonly originName?: string;
  readonly originPos?: readonly [number, number, number];
  readonly targetId?: string;
  readonly targetName?: string;
  readonly targetPos?: readonly [number, number, number];
  readonly distanceLy?: number;
  readonly distanceAu?: number;
  readonly methodBadge?: string;
}

export interface JourneyChordWaypoint {
  readonly id: string;
  readonly name: string;
  readonly position: readonly [number, number, number];
  readonly role: 'origin' | 'waypoint' | 'destination';
  readonly stepIndex: number;
}

export interface JourneyChordLegGeometryData {
  readonly id: string;
  readonly stepIndex: number;
  readonly fromId: string;
  readonly toId: string;
  readonly positions: readonly [number, number, number, number, number, number];
  readonly midpoint: readonly [number, number, number];
  readonly euclideanLength: number;
  readonly deltaZ: number;
  readonly elevationProjectionSegments?: readonly number[];
  readonly distanceLabel: string;
  readonly secondaryLabel?: string;
  readonly lineStyle: 'solid' | 'dashed' | 'dotted';
}

export interface JourneyChordRenderData {
  readonly legs: readonly JourneyChordLegGeometryData[];
  readonly waypoints: readonly JourneyChordWaypoint[];
  readonly totalEuclideanLength: number;
}

/**
 * Builds deterministic 3D render data for a sequence of route legs.
 * Pure function: zero hardcoded celestial names, zero single-step limitations.
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

    // Waypoints registration
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

    if (!waypointsMap.has(leg.toId)) {
      waypointsMap.set(leg.toId, {
        id: leg.toId,
        name: leg.toName,
        position: leg.toPosition,
        role,
        stepIndex: i + 1,
      });
    } else if (isFinalDestination) {
      // If final destination was visited earlier, elevate role to destination
      const existing = waypointsMap.get(leg.toId)!;
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
