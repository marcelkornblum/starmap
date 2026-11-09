import { GALACTIC_FRAME } from '../../types/spatial';
import {
  DEFAULT_ORIGIN_TARGETS,
  SOL_REFERENCE_TARGET,
} from '../../config/referenceTargets';
import {
  computeApertureRadius,
  deriveEntityTier,
  isInsideAperture,
} from '../../utils/spatialMath';
import type { SystemSummaryNode } from '../../types/astro';
import {
  PARSEC_TO_LY,
  computeEuclideanDistance3D,
  computeSystemHazardMask,
} from '../../utils/astroMath';
import {
  decodeTagsMask,
  type CompactSearchEntry,
} from '../../utils/compactDataCodec';
import {
  buildMetricGuideHref,
  buildStarTypeGuideHref,
  buildTagGalaxyHref,
  findFocusedEntryInCorpus,
  formatSlugFallbackTitle,
  resolveEntryCategory,
  resolveResultDisplayTitle,
  resolveReticleType,
  toUrlSlug,
} from '../searchService';
import {
  decodeSystemHazards,
  toCoordinatesTuple,
} from './hazardsAndComposition';
import { buildGalaxySystemNavigationHref } from './navigationAndCamera';
import { getApertureActiveCutoffForViewportWidth } from '../deviceTierService';
import type {
  ExtractGalaxyBodiesInput,
  GalacticInstrumentApertureResult,
  GalaxyBodiesSummary,
  GalaxyBodySystemItem,
  ResolveGalacticInstrumentApertureInput,
} from './types';

const corpusKnownIdsCache = new WeakMap<readonly CompactSearchEntry[], ReadonlySet<string>>();
const mergedCorpusCache = new WeakMap<
  readonly CompactSearchEntry[],
  { activeStars: readonly SystemSummaryNode[]; result: readonly CompactSearchEntry[] }
>();

interface StarSystemEntry {
  readonly id: string;
  readonly name: string;
  readonly coordinatesPc: readonly [number, number, number];
  readonly entry: CompactSearchEntry;
}

const corpusStarSystemsCache = new WeakMap<
  readonly CompactSearchEntry[],
  {
    systemsById: Map<string, StarSystemEntry>;
    stars: ReadonlyArray<{ sysSlug: string; entry: CompactSearchEntry; pos: [number, number, number] }>;
  }
>();

function getOrBuildCorpusStarSystems(corpus: readonly CompactSearchEntry[]): {
  systemsById: Map<string, StarSystemEntry>;
  stars: ReadonlyArray<{ sysSlug: string; entry: CompactSearchEntry; pos: [number, number, number] }>;
} {
  let cached = corpusStarSystemsCache.get(corpus);
  if (!cached) {
    const systemsById = new Map<string, StarSystemEntry>();
    const stars: Array<{ sysSlug: string; entry: CompactSearchEntry; pos: [number, number, number] }> = [];

    for (const entry of corpus) {
      if (entry.c !== 'stars' && resolveEntryCategory(entry) !== 'stars') {
        continue;
      }
      const sysSlug = toUrlSlug(entry.s ?? entry.i ?? entry.n);
      if (!sysSlug || systemsById.has(sysSlug)) {
        continue;
      }
      const pos: [number, number, number] = entry.p
        ? [entry.p[0], entry.p[1], entry.p[2]]
        : [0, 0, 0];
      systemsById.set(sysSlug, {
        id: entry.s ?? entry.i,
        name: resolveResultDisplayTitle(entry),
        coordinatesPc: pos,
        entry,
      });
      stars.push({ sysSlug, entry, pos });
    }

    cached = { systemsById, stars };
    corpusStarSystemsCache.set(corpus, cached);
  }
  return cached;
}

/**
 * Pure merge of the stars hydrated from streamed sector partitions (every star inside the live
 * instrument aperture) into the search corpus, so aperture membership and the objects panel cover
 * all active stars rather than only the catalogued search entries. Corpus entries win on id clashes.
 */
export function mergeActiveStarsIntoCorpus(
  corpus: readonly CompactSearchEntry[],
  activeStars: readonly SystemSummaryNode[],
): readonly CompactSearchEntry[] {
  if (activeStars.length === 0) {
    return corpus;
  }

  const cachedMerged = mergedCorpusCache.get(corpus);
  if (cachedMerged && cachedMerged.activeStars === activeStars) {
    return cachedMerged.result;
  }

  let knownIds = corpusKnownIdsCache.get(corpus);
  if (!knownIds) {
    const ids = new Set<string>();
    for (const entry of corpus) {
      ids.add(entry.i);
    }
    corpusKnownIdsCache.set(corpus, ids);
    knownIds = ids;
  }

  const seenIds = new Set<string>(knownIds);
  const extraEntries: CompactSearchEntry[] = [];
  for (const star of activeStars) {
    if (seenIds.has(star.id)) {
      continue;
    }
    seenIds.add(star.id);
    extraEntries.push({
      i: star.id,
      n: star.properName ?? star.name,
      p: [star.x, star.y, star.z],
      m: star.hasHabitableCandidate
        ? [star.mag, star.spect ?? 'Unknown', star.planetCount, 1]
        : [star.mag, star.spect ?? 'Unknown', star.planetCount],
      ...(star.hazardMask ? { H: star.hazardMask } : {}),
      c: 'stars',
    });
  }

  if (extraEntries.length === 0) {
    mergedCorpusCache.set(corpus, { activeStars, result: corpus });
    return corpus;
  }

  const result: readonly CompactSearchEntry[] = [...corpus, ...extraEntries];
  mergedCorpusCache.set(corpus, { activeStars, result });
  return result;
}

/**
 * Pure resolver evaluating 3D cartographic instrument aperture sphere intersection
 * and reference center for Galactic inspection (DEC-034).
 */
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
  let centerName = SOL_REFERENCE_TARGET.name;
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
  const { systemsById, stars } = getOrBuildCorpusStarSystems(corpus);

  const effectiveMaxActive =
    input.maxActiveEntities ?? getApertureActiveCutoffForViewportWidth(input.viewportWidthPx);

  const inApertureCandidates: Array<{
    sysSlug: string;
    entry: CompactSearchEntry;
    distance: number;
  }> = [];

  const [cx, cy, cz] = centerCoordinatesPc;
  for (let i = 0; i < stars.length; i++) {
    const star = stars[i]!;
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

/**
 * Pure builder assembling a `GalaxyBodiesSummary` containing only non-passive star systems
 * (focused, selected, or active within instrument aperture radius) ordered relative
 * to the focused primary system or instrument center (DEC-034).
 */
export function extractGalaxyBodies(
  input: ExtractGalaxyBodiesInput,
): GalaxyBodiesSummary {
  const {
    corpus = [],
    focusedEntity,
    selectedEntities = [],
    hoveredEntityId,
    cameraState,
    centerEntity,
    urlSystemSlug,
    currentSearch = '',
    aperture,
  } = input;

  const instrumentAperture =
    aperture ??
    resolveGalacticInstrumentAperture({
      cameraState,
      corpus,
      focusedEntity,
      centerEntity,
      urlSystemSlug,
      maxActiveEntities: input.maxActiveEntities,
    });

  let focusedSystemId: string | undefined;
  let focusedSystemName: string | undefined;
  let focusedSystemCoords: readonly [number, number, number] | undefined;
  let focusedSysSlug: string | undefined;

  if (focusedEntity) {
    const matched = findFocusedEntryInCorpus(focusedEntity.id, corpus);
    if (matched?.s) {
      const parentSys = findFocusedEntryInCorpus(matched.s, corpus);
      focusedSystemId = matched.s;
      focusedSystemName = parentSys
        ? resolveResultDisplayTitle(parentSys)
        : formatSlugFallbackTitle(matched.s);
      focusedSystemCoords = parentSys?.p
        ? [parentSys.p[0], parentSys.p[1], parentSys.p[2]]
        : toCoordinatesTuple(focusedEntity.position);
      focusedSysSlug = toUrlSlug(matched.s);
    } else {
      focusedSystemId = focusedEntity.id;
      focusedSystemName = focusedEntity.name;
      focusedSystemCoords = matched?.p
        ? [matched.p[0], matched.p[1], matched.p[2]]
        : toCoordinatesTuple(focusedEntity.position);
      focusedSysSlug = toUrlSlug(focusedEntity.id);
    }
  } else if (urlSystemSlug) {
    const matched = findFocusedEntryInCorpus(urlSystemSlug, corpus);
    focusedSystemId = matched?.i ?? urlSystemSlug;
    focusedSystemName = matched
      ? resolveResultDisplayTitle(matched)
      : formatSlugFallbackTitle(urlSystemSlug);
    focusedSystemCoords = matched?.p
      ? [matched.p[0], matched.p[1], matched.p[2]]
      : [0, 0, 0];
    focusedSysSlug = toUrlSlug(urlSystemSlug);
  }

  const selectedSet = new Set<string>();
  for (const sel of selectedEntities) {
    const matched = findFocusedEntryInCorpus(sel.id, corpus);
    const sysId = matched?.s ?? sel.id;
    selectedSet.add(sysId);
    selectedSet.add(toUrlSlug(sysId));
    selectedSet.add(sel.id);
    selectedSet.add(toUrlSlug(sel.id));
  }

  const candidateMap = new Map<
    string,
    {
      readonly id: string;
      readonly name: string;
      readonly coordinatesPc: readonly [number, number, number];
      readonly entry: CompactSearchEntry;
    }
  >();

  for (const id of instrumentAperture.apertureIds) {
    const sysSlug = instrumentAperture.systemsById.has(id) ? id : toUrlSlug(id);
    const sysData = instrumentAperture.systemsById.get(sysSlug);
    if (sysData) {
      candidateMap.set(sysSlug, sysData);
    }
  }

  const referenceOrigin =
    focusedSystemCoords ?? instrumentAperture.centerCoordinatesPc;
  const sortDistanceById = new Map<string, number>();
  const systems: GalaxyBodySystemItem[] = [];

  for (const [sysSlug, sysData] of candidateMap.entries()) {
    const rawTier = deriveEntityTier(sysSlug, {
      focusedId: focusedSysSlug ?? null,
      selectedIds: selectedSet,
      apertureIds: instrumentAperture.apertureIds,
    });

    const tier =
      rawTier === 'passive' &&
      (sysData.id === focusedSystemId || selectedSet.has(sysData.id))
        ? deriveEntityTier(sysData.id, {
            focusedId: focusedSystemId ?? null,
            selectedIds: selectedSet,
            apertureIds: instrumentAperture.apertureIds,
          })
        : rawTier;

    if (tier === 'passive') {
      continue;
    }

    const entry = sysData.entry;
    const reticleType = resolveReticleType(entry);
    const spectralType =
      entry.m?.[1] && entry.m[1] !== 'Unknown' ? entry.m[1] : undefined;
    const starTypeGuideHref = spectralType
      ? buildStarTypeGuideHref(spectralType)
      : undefined;
    const planetCount =
      entry.m?.[2] ??
      (entry.b
        ? (entry.b[0] ?? 0) +
          (entry.b[1] ?? 0) +
          (entry.b[2] ?? 0) +
          (entry.b[3] ?? 0)
        : 0);
    const hasHabitableCandidate = Boolean(
      entry.m?.[3] === 1 ||
        entry.z === 1 ||
        (entry.g !== undefined && (entry.g & 16) !== 0),
    );
    const habitableZoneGuideHref = hasHabitableCandidate
      ? buildTagGalaxyHref('HabitableCandidate')
      : undefined;

    const rawHazardMask =
      entry.H ??
      computeSystemHazardMask({
        spect: spectralType,
        tags: decodeTagsMask(entry.g),
      });
    const hazards = decodeSystemHazards(rawHazardMask);
    const hazardCount = hazards.length;
    const hazardSummaryLabel =
      hazardCount <= 0
        ? '0 hazards'
        : `${hazardCount} ${hazardCount === 1 ? 'hazard' : 'hazards'}`;
    const hasCriticalHazard = hazards.some((h) => h.severity === 'critical');

    const rawSortDist = computeEuclideanDistance3D(
      referenceOrigin,
      sysData.coordinatesPc,
    ).distance;
    sortDistanceById.set(sysData.id, rawSortDist);

    let distanceFromFocusPc: number | undefined;
    let distanceFromFocusLy: number | undefined;
    let distanceGuideHref: string | undefined;

    if (focusedSystemId && focusedSystemCoords) {
      const distPc = Math.round(rawSortDist * 100) / 100;
      const distLy = Math.round(distPc * PARSEC_TO_LY * 10) / 10;
      distanceFromFocusPc = distPc;
      distanceFromFocusLy = distLy;
      distanceGuideHref = buildMetricGuideHref('distance', sysData.id);
    }

    systems.push({
      id: sysData.id,
      name: sysData.name,
      href: buildGalaxySystemNavigationHref(sysData.id, currentSearch),
      tier,
      reticleType,
      ...(spectralType ? { spectralType } : {}),
      ...(starTypeGuideHref ? { starTypeGuideHref } : {}),
      planetCount,
      hasHabitableCandidate,
      ...(habitableZoneGuideHref ? { habitableZoneGuideHref } : {}),
      hazardCount,
      hazardSummaryLabel,
      hasCriticalHazard,
      ...(distanceFromFocusPc !== undefined ? { distanceFromFocusPc } : {}),
      ...(distanceFromFocusLy !== undefined ? { distanceFromFocusLy } : {}),
      ...(distanceGuideHref ? { distanceGuideHref } : {}),
    });
  }

  systems.sort((a, b) => {
    const distA = sortDistanceById.get(a.id) ?? 0;
    const distB = sortDistanceById.get(b.id) ?? 0;
    if (Math.abs(distA - distB) > 1e-5) {
      return distA - distB;
    }
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });

  return {
    scope: 'galaxy',
    centerId: instrumentAperture.centerId,
    centerName: instrumentAperture.centerName,
    centerCoordinatesPc: instrumentAperture.centerCoordinatesPc,
    apertureRadiusPc: instrumentAperture.apertureRadiusPc,
    apertureRadiusLy: instrumentAperture.apertureRadiusLy,
    ...(focusedSystemId ? { focusedSystemId } : {}),
    ...(focusedSystemName ? { focusedSystemName } : {}),
    ...(selectedEntities.length > 0
      ? { selectedEntityIds: selectedEntities.map((e) => e.id) }
      : {}),
    hoveredEntityId: hoveredEntityId ?? null,
    systems,
  };
}
