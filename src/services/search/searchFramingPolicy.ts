import { SOL_REFERENCE_TARGET } from '../../config/referenceTargets';
import type { SearchCategoryKey } from '../../types/search';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import type { SpatialScale } from '../../utils/referenceFrameOrientation';
import {
  computeBoundingSphereFraming,
  type SearchFramingBoundsOptions,
} from '../../utils/searchFraming';

const CO_LOCATED_EPSILON_PC = 1e-4;

export interface SearchFramingPolicyOptions extends SearchFramingBoundsOptions {
  readonly currentScope?: SpatialScale;
}

export type SearchFramingAction =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'enter-scale';
      readonly targetScope: 'system' | 'planet';
      readonly targetId: string;
      readonly href: string;
    }
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
  readonly systemId?: string;
  readonly parentBodyId?: string;
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

function resolveHierarchicalScaleAction(
  spatialMatches: readonly SearchFramingItem[],
  currentScope?: SpatialScale,
): SearchFramingAction | null {
  const firstSpatialMatch = spatialMatches[0];
  if (!firstSpatialMatch) {
    return null;
  }

  const allSolarSystem = spatialMatches.every((item) => item.isSolarSystem === true);
  const parentPlanetSlugs = spatialMatches.map((item) =>
    item.parentBodyId ? toUrlSlug(item.parentBodyId) : '',
  );
  const firstParentPlanet = parentPlanetSlugs[0];
  const sharesPlanet =
    Boolean(firstParentPlanet) &&
    parentPlanetSlugs.every((slug) => slug === firstParentPlanet);

  if (
    sharesPlanet &&
    firstParentPlanet &&
    (allSolarSystem || currentScope === 'system' || currentScope === 'planet')
  ) {
    if (spatialMatches.length === 1) {
      return {
        kind: 'enter-scale',
        targetScope: 'planet',
        targetId: firstSpatialMatch.id,
        href: firstSpatialMatch.href,
      };
    }
    return {
      kind: 'enter-scale',
      targetScope: 'planet',
      targetId: firstParentPlanet,
      href: `/planet/${encodeURIComponent(firstParentPlanet)}`,
    };
  }

  const allNonStarBodies = spatialMatches.every(
    (item) => item.entityKind !== 'star-system',
  );
  const defaultSolSlug = toUrlSlug(SOL_REFERENCE_TARGET.id);
  const systemSlugs = spatialMatches.map((item) => {
    if (item.systemId) {
      return toUrlSlug(item.systemId);
    }
    return item.isSolarSystem === true ? defaultSolSlug : '';
  });
  const firstSystemSlug = systemSlugs[0];
  const sharesSystem =
    Boolean(firstSystemSlug) &&
    systemSlugs.every((slug) => slug === firstSystemSlug);

  if (
    allNonStarBodies &&
    sharesSystem &&
    firstSystemSlug &&
    (allSolarSystem || currentScope === 'planet')
  ) {
    if (spatialMatches.length === 1) {
      const targetScope: 'system' | 'planet' =
        firstSpatialMatch.href.startsWith('/planet/') ||
        firstSpatialMatch.entityKind === 'moon'
          ? 'planet'
          : 'system';
      return {
        kind: 'enter-scale',
        targetScope,
        targetId: firstSpatialMatch.id,
        href: firstSpatialMatch.href,
      };
    }
    return {
      kind: 'enter-scale',
      targetScope: 'system',
      targetId: firstSystemSlug,
      href: `/system/${encodeURIComponent(firstSystemSlug)}`,
    };
  }

  return null;
}

/**
 * Resolves the settled-typing camera/navigation framing action for an untruncated search
 * match list, using Lowest-Common-Container scale resolution or galactic bounding sphere (`FS-003`).
 */
export function resolveSearchFramingAction(
  fullMatches: readonly SearchFramingItem[],
  options?: SearchFramingPolicyOptions,
): SearchFramingAction {
  const spatialMatches = fullMatches.filter((item) => item.category !== 'layers');
  const hierarchicalAction = resolveHierarchicalScaleAction(
    spatialMatches,
    options?.currentScope,
  );
  if (hierarchicalAction) {
    return hierarchicalAction;
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
