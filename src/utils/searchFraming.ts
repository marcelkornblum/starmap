import { GALACTIC_FRAME } from '../config/referenceFrames';
import { SOL_REFERENCE_TARGET } from '../config/referenceTargets';
import type { SearchCategoryKey } from '../types/search';
import type { ViewportSafeRect } from './viewportSafeRect';

export const SEARCH_FRAMING_SETTLE_MS = 800;
export const DEFAULT_SEARCH_FRAMING_PADDING = 1.35;
export const MIN_SEARCH_FRAMING_DISTANCE_PC = 8;
export const DEFAULT_SINGLE_RESULT_DISTANCE_PC = 18;

const DEFAULT_VIEWPORT_WIDTH = 1440;
const DEFAULT_VIEWPORT_HEIGHT = 900;
const CO_LOCATED_EPSILON_PC = 1e-4;
const MIN_LIMITING_SIN = 0.05;
const MIN_VISIBLE_RATIO = 0.35;

export interface SearchFramingBoundsOptions {
  readonly fovDeg?: number;
  readonly viewportWidth?: number;
  readonly viewportHeight?: number;
  readonly safeRect?: ViewportSafeRect | null;
  readonly padding?: number;
  readonly minDistance?: number;
  readonly maxDistance?: number;
}

export interface SearchFramingBounds {
  readonly target: [number, number, number];
  readonly distance: number;
  readonly radius: number;
}

export type SearchFramingAction =
  | { readonly kind: 'none' }
  | { readonly kind: 'enter-sol-system'; readonly targetId: string; readonly href: string }
  | {
      readonly kind: 'frame-galaxy';
      readonly target: [number, number, number];
      readonly distance: number;
      readonly matchCount: number;
    };

export interface SearchFramingItem {
  readonly id: string;
  readonly category: SearchCategoryKey;
  readonly entityKind: string;
  readonly href: string;
  readonly position?: readonly [number, number, number];
  readonly isSolarSystem?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  if (value <= min) return min;
  if (value >= max) return max;
  return value;
}

function isFinitePosition(
  pos: readonly [number, number, number] | undefined,
): pos is readonly [number, number, number] {
  return (
    pos !== undefined &&
    Number.isFinite(pos[0]) &&
    Number.isFinite(pos[1]) &&
    Number.isFinite(pos[2])
  );
}

function resolvePositiveOption(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Computes a galactic camera target and distance that frames a bounding sphere around
 * a set of 3D parsec coordinates, accounting for HUD safe-rect insets and FOV limits.
 */
export function computeBoundingSphereFraming(
  positions: readonly (readonly [number, number, number])[],
  options?: SearchFramingBoundsOptions,
): SearchFramingBounds | null {
  const validPositions: [number, number, number][] = [];
  for (const pos of positions) {
    if (isFinitePosition(pos)) {
      validPositions.push([pos[0], pos[1], pos[2]]);
    }
  }

  const first = validPositions[0];
  if (!first) {
    return null;
  }

  const fovDeg = resolvePositiveOption(options?.fovDeg, GALACTIC_FRAME.camera.baseFov);
  const fullW = resolvePositiveOption(options?.viewportWidth, DEFAULT_VIEWPORT_WIDTH);
  const fullH = resolvePositiveOption(options?.viewportHeight, DEFAULT_VIEWPORT_HEIGHT);
  const padding = resolvePositiveOption(options?.padding, DEFAULT_SEARCH_FRAMING_PADDING);
  const minDistance = resolvePositiveOption(options?.minDistance, MIN_SEARCH_FRAMING_DISTANCE_PC);
  const rawMaxDistance = resolvePositiveOption(
    options?.maxDistance,
    GALACTIC_FRAME.camera.maxDistance,
  );
  const maxDistance = Math.max(minDistance, rawMaxDistance);

  if (validPositions.length === 1) {
    return {
      target: [first[0], first[1], first[2]],
      distance: clamp(DEFAULT_SINGLE_RESULT_DISTANCE_PC, minDistance, maxDistance),
      radius: 0,
    };
  }

  let minX = first[0];
  let maxX = first[0];
  let minY = first[1];
  let maxY = first[1];
  let minZ = first[2];
  let maxZ = first[2];

  for (let i = 1; i < validPositions.length; i++) {
    const p = validPositions[i];
    if (!p) continue;
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
    if (p[2] < minZ) minZ = p[2];
    if (p[2] > maxZ) maxZ = p[2];
  }

  const center: [number, number, number] = [
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2,
  ];

  let radius = 0;
  for (const p of validPositions) {
    const dist = Math.hypot(p[0] - center[0], p[1] - center[1], p[2] - center[2]);
    if (dist > radius) {
      radius = dist;
    }
  }

  if (radius <= CO_LOCATED_EPSILON_PC) {
    return {
      target: center,
      distance: clamp(minDistance, minDistance, maxDistance),
      radius: 0,
    };
  }

  const safeRect = options?.safeRect;
  const hasActiveSafeRect = Boolean(
    safeRect && !safeRect.bypass && safeRect.width > 0 && safeRect.height > 0,
  );
  const visW = hasActiveSafeRect && safeRect ? safeRect.width : fullW;
  const visH = hasActiveSafeRect && safeRect ? safeRect.height : fullH;
  const visRatio = hasActiveSafeRect ? Math.min(visW / fullW, visH / fullH) : 1;

  const vHalf = (fovDeg * Math.PI) / 360;
  const hHalf = Math.atan(Math.tan(vHalf) * (visW / Math.max(visH, 1)));
  const limitingHalfFov = Math.min(vHalf, hHalf);

  const baseDistance = (radius * padding) / Math.max(Math.sin(limitingHalfFov), MIN_LIMITING_SIN);
  const rawDistance = hasActiveSafeRect
    ? baseDistance / Math.max(visRatio, MIN_VISIBLE_RATIO)
    : baseDistance;

  return {
    target: center,
    distance: clamp(rawDistance, minDistance, maxDistance),
    radius,
  };
}

/**
 * Resolves the settled-typing camera/navigation framing action for an untruncated search
 * match list, including the single-result Solar System body exception (`FS-003`).
 */
export function resolveSearchFramingAction(
  fullMatches: readonly SearchFramingItem[],
  options?: SearchFramingBoundsOptions,
): SearchFramingAction {
  const singleMatch = fullMatches.length === 1 ? fullMatches[0] : undefined;
  if (
    singleMatch &&
    singleMatch.category !== 'layers' &&
    singleMatch.isSolarSystem === true &&
    singleMatch.entityKind !== 'star-system'
  ) {
    return {
      kind: 'enter-sol-system',
      targetId: singleMatch.id,
      href: singleMatch.href,
    };
  }

  const uniquePositions: [number, number, number][] = [];

  for (const item of fullMatches) {
    if (item.category === 'layers') {
      continue;
    }

    let pos: readonly [number, number, number] | undefined;
    if (isFinitePosition(item.position)) {
      pos = item.position;
    } else if (item.isSolarSystem === true) {
      pos = SOL_REFERENCE_TARGET.coordinatesPc;
    }

    if (!pos) {
      continue;
    }

    const isDuplicate = uniquePositions.some(
      (existing) =>
        Math.hypot(pos[0] - existing[0], pos[1] - existing[1], pos[2] - existing[2]) <=
        CO_LOCATED_EPSILON_PC,
    );
    if (!isDuplicate) {
      uniquePositions.push([pos[0], pos[1], pos[2]]);
    }
  }

  const bounds = computeBoundingSphereFraming(uniquePositions, options);
  if (!bounds) {
    return { kind: 'none' };
  }

  return {
    kind: 'frame-galaxy',
    target: bounds.target,
    distance: bounds.distance,
    matchCount: uniquePositions.length,
  };
}
