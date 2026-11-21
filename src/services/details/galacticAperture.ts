import { GALACTIC_FRAME } from '../../config/referenceFrames';
import { DEFAULT_ORIGIN_TARGETS } from '../../config/referenceTargets';
import { getCachedReferenceBaselines } from '../../data/referenceBaselinesRepository';
import {
  computeApertureRadius,
  isInsideAperture,
} from '../../utils/spatialMath';
import {
  PARSEC_TO_LY,
  computeEuclideanDistance3D,
} from '../../utils/transitDynamics';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import {
  findFocusedEntryInCorpus,
  resolveResultDisplayTitle,
} from '../search/searchCorpusHelpers';
import { formatSlugFallbackTitle } from '../../utils/starNaming';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import { toCoordinatesTuple } from './detailsHazards';
import { getApertureActiveCutoffForViewportWidth } from '../deviceTierService';
import { getOrBuildCorpusStarSystems } from './corpusStarSystems';
import type {
  GalacticInstrumentApertureResult,
  ResolveGalacticInstrumentApertureInput,
} from './detailsNavigationTypes';

export function resolveGalacticInstrumentAperture(
  input: ResolveGalacticInstrumentApertureInput,
): GalacticInstrumentApertureResult {
  const {
    cameraState,
    corpus = [],
    focusedEntity,
    centerEntity,
    urlSystemSlug,
    liveApertureCenterPc,
    liveApertureRadiusPc,
  } = input;

  let centerId = DEFAULT_ORIGIN_TARGETS.interstellarOriginId;
  let centerName =
    getCachedReferenceBaselines()?.targets.sol.name ??
    formatSlugFallbackTitle(DEFAULT_ORIGIN_TARGETS.interstellarOriginId);
  let centerCoordinatesPc: readonly [number, number, number] = DEFAULT_ORIGIN_TARGETS.galacticOriginCoordinates;

  if (liveApertureCenterPc) {
    centerCoordinatesPc = liveApertureCenterPc;
    if (cameraState?.center) {
      centerId = toUrlSlug(cameraState.center);
      centerName = cameraState.center;
    } else if (focusedEntity) {
      centerId = toUrlSlug(focusedEntity.id) || focusedEntity.id;
      centerName = focusedEntity.name;
    } else if (urlSystemSlug) {
      centerId = toUrlSlug(urlSystemSlug) || urlSystemSlug;
      centerName = formatSlugFallbackTitle(urlSystemSlug);
    }
  } else if (
    cameraState?.x !== undefined &&
    cameraState?.y !== undefined &&
    cameraState?.z !== undefined
  ) {
    centerCoordinatesPc = [cameraState.x, cameraState.y, cameraState.z];
    centerId = cameraState.center ? toUrlSlug(cameraState.center) : 'free';
    centerName = cameraState.center ?? 'Free Origin';
  } else if (cameraState?.center) {
    if (centerEntity) {
      centerId = toUrlSlug(centerEntity.id) || centerEntity.id;
      centerName = centerEntity.name;
      centerCoordinatesPc = toCoordinatesTuple(centerEntity.position);
    } else {
      const matched = findFocusedEntryInCorpus(cameraState.center, corpus);
      if (matched) {
        centerId = toUrlSlug(matched.s ?? matched.i);
        centerName = resolveResultDisplayTitle(matched);
        centerCoordinatesPc = matched.p
          ? [matched.p[0], matched.p[1], matched.p[2]]
          : [0, 0, 0];
      } else {
        centerId = toUrlSlug(cameraState.center) || DEFAULT_ORIGIN_TARGETS.interstellarOriginId;
        centerName = formatSlugFallbackTitle(cameraState.center);
        centerCoordinatesPc = [0, 0, 0];
      }
    }
  } else if (urlSystemSlug || focusedEntity) {
    const targetKey = urlSystemSlug ?? focusedEntity?.id ?? DEFAULT_ORIGIN_TARGETS.interstellarOriginId;
    const matched = findFocusedEntryInCorpus(targetKey, corpus);
    if (matched) {
      centerId = toUrlSlug(matched.s ?? matched.i);
      centerName = resolveResultDisplayTitle(matched);
      centerCoordinatesPc = matched.p
        ? [matched.p[0], matched.p[1], matched.p[2]]
        : [0, 0, 0];
    } else if (focusedEntity) {
      centerId = toUrlSlug(focusedEntity.id) || focusedEntity.id;
      centerName = focusedEntity.name;
      centerCoordinatesPc = toCoordinatesTuple(focusedEntity.position);
    } else {
      centerId = toUrlSlug(urlSystemSlug ?? DEFAULT_ORIGIN_TARGETS.interstellarOriginId) || DEFAULT_ORIGIN_TARGETS.interstellarOriginId;
      centerName = formatSlugFallbackTitle(centerId);
      centerCoordinatesPc = [0, 0, 0];
    }
  }

  let rawAperturePc: number;
  if (
    liveApertureRadiusPc !== undefined &&
    liveApertureRadiusPc !== null &&
    Number.isFinite(liveApertureRadiusPc) &&
    liveApertureRadiusPc > 0
  ) {
    rawAperturePc = liveApertureRadiusPc;
  } else {
    const refDist =
      GALACTIC_FRAME.radius * GALACTIC_FRAME.referenceDistanceMultiplier;
    const baseDist =
      cameraState?.dist !== undefined &&
      Number.isFinite(cameraState.dist) &&
      cameraState.dist > 0
        ? cameraState.dist
        : refDist;
    const zoom =
      cameraState?.zoom !== undefined &&
      Number.isFinite(cameraState.zoom) &&
      cameraState.zoom > 0
        ? cameraState.zoom
        : 1;
    const effectiveDist = baseDist / zoom;
    rawAperturePc = computeApertureRadius(
      effectiveDist,
      GALACTIC_FRAME.radius,
      refDist,
      GALACTIC_FRAME.screenConstant,
      3.5,
    );
  }

  const apertureRadiusPc = Math.round(rawAperturePc * 100) / 100;
  const apertureRadiusLy =
    Math.round(rawAperturePc * PARSEC_TO_LY * 100) / 100;

  const apertureIds = new Set<string>();
  const { systemsById, stars, grid, cellSizePc } = getOrBuildCorpusStarSystems(corpus);

  const effectiveMaxActive =
    input.maxActiveEntities ?? getApertureActiveCutoffForViewportWidth(input.viewportWidthPx);

  const inApertureCandidates: Array<{
    sysSlug: string;
    entry: CompactSearchEntry;
    distance: number;
  }> = [];

  const [cx, cy, cz] = centerCoordinatesPc;
  const useGrid =
    Number.isFinite(rawAperturePc) &&
    rawAperturePc > 0 &&
    (Math.ceil((rawAperturePc * 2) / cellSizePc) + 1) ** 3 < stars.length / 4;

  if (useGrid) {
    const minX = Math.floor((cx - rawAperturePc) / cellSizePc);
    const maxX = Math.floor((cx + rawAperturePc) / cellSizePc);
    const minY = Math.floor((cy - rawAperturePc) / cellSizePc);
    const maxY = Math.floor((cy + rawAperturePc) / cellSizePc);
    const minZ = Math.floor((cz - rawAperturePc) / cellSizePc);
    const maxZ = Math.floor((cz + rawAperturePc) / cellSizePc);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const cell = grid.get(`${x},${y},${z}`);
          if (!cell) continue;
          for (const star of cell) {
            const pos = star.pos;
            if (
              Math.abs(pos[0] - cx) <= rawAperturePc &&
              Math.abs(pos[1] - cy) <= rawAperturePc &&
              Math.abs(pos[2] - cz) <= rawAperturePc &&
              isInsideAperture(pos, centerCoordinatesPc, rawAperturePc)
            ) {
              const distance = computeEuclideanDistance3D(centerCoordinatesPc, pos).distance;
              inApertureCandidates.push({
                sysSlug: star.sysSlug,
                entry: star.entry,
                distance,
              });
            }
          }
        }
      }
    }
  } else {
    for (const star of stars) {
      const pos = star.pos;
      if (
        Math.abs(pos[0] - cx) <= rawAperturePc &&
        Math.abs(pos[1] - cy) <= rawAperturePc &&
        Math.abs(pos[2] - cz) <= rawAperturePc &&
        isInsideAperture(pos, centerCoordinatesPc, rawAperturePc)
      ) {
        const distance = computeEuclideanDistance3D(centerCoordinatesPc, pos).distance;
        inApertureCandidates.push({
          sysSlug: star.sysSlug,
          entry: star.entry,
          distance,
        });
      }
    }
  }

  inApertureCandidates.sort((a, b) => {
    if (Math.abs(a.distance - b.distance) > 1e-5) {
      return a.distance - b.distance;
    }
    return a.sysSlug < b.sysSlug ? -1 : a.sysSlug > b.sysSlug ? 1 : 0;
  });

  if (inApertureCandidates.length <= effectiveMaxActive) {
    for (let i = 0; i < inApertureCandidates.length; i++) {
      const candidate = inApertureCandidates[i];
      if (!candidate) continue;
      apertureIds.add(candidate.sysSlug);
      apertureIds.add(candidate.entry.i);
      if (candidate.entry.s) {
        apertureIds.add(candidate.entry.s);
      }
    }
  }

  const ceilingApertureRadiusPc =
    inApertureCandidates.length >= effectiveMaxActive && effectiveMaxActive > 0
      ? inApertureCandidates[effectiveMaxActive - 1]?.distance ?? null
      : null;

  return {
    centerId,
    centerName,
    centerCoordinatesPc,
    rawAperturePc,
    apertureRadiusPc,
    apertureRadiusLy,
    apertureIds,
    ceilingApertureRadiusPc,
    systemsById,
  };
}
