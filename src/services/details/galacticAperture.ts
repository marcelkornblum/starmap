import { GALACTIC_FRAME } from '../../components/canvas/instrument/referenceFrame';
import {
  computeApertureRadius,
  isInsideAperture,
} from '../../components/canvas/math/aperture';
import { deriveEntityTier } from '../../components/canvas/math/tiers';
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
  formatHazardSummaryLabel,
  toCoordinatesTuple,
} from './hazardsAndComposition';
import { buildGalaxySystemNavigationHref } from './navigationAndCamera';
import type {
  ExtractGalaxyBodiesInput,
  GalacticInstrumentApertureResult,
  GalaxyBodiesSummary,
  GalaxyBodySystemItem,
  ResolveGalacticInstrumentApertureInput,
} from './types';

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

  let centerId = 'sol';
  let centerName = 'Sol';
  let centerCoordinatesPc: readonly [number, number, number] = [0, 0, 0];

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
        centerId = toUrlSlug(cameraState.center) || 'sol';
        centerName = formatSlugFallbackTitle(cameraState.center);
        centerCoordinatesPc = [0, 0, 0];
      }
    }
  } else if (urlSystemSlug || focusedEntity) {
    const targetKey = urlSystemSlug ?? focusedEntity?.id ?? 'sol';
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
      centerId = toUrlSlug(urlSystemSlug ?? 'sol') || 'sol';
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
  const systemsById = new Map<
    string,
    {
      readonly id: string;
      readonly name: string;
      readonly coordinatesPc: readonly [number, number, number];
      readonly entry: CompactSearchEntry;
    }
  >();

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
    if (isInsideAperture(pos, centerCoordinatesPc, rawAperturePc)) {
      apertureIds.add(sysSlug);
      apertureIds.add(entry.i);
      if (entry.s) {
        apertureIds.add(entry.s);
      }
    }
  }

  return {
    centerId,
    centerName,
    centerCoordinatesPc,
    rawAperturePc,
    apertureRadiusPc,
    apertureRadiusLy,
    apertureIds,
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

  const candidateMap = new Map(instrumentAperture.systemsById);

  if (focusedSysSlug && !candidateMap.has(focusedSysSlug)) {
    const matched = focusedSystemId
      ? findFocusedEntryInCorpus(focusedSystemId, corpus)
      : undefined;
    candidateMap.set(focusedSysSlug, {
      id: focusedSystemId ?? focusedSysSlug,
      name: focusedSystemName ?? formatSlugFallbackTitle(focusedSysSlug),
      coordinatesPc: focusedSystemCoords ?? [0, 0, 0],
      entry: matched ?? {
        i: focusedSystemId ?? focusedSysSlug,
        n: focusedSystemName ?? formatSlugFallbackTitle(focusedSysSlug),
        p: focusedSystemCoords
          ? [focusedSystemCoords[0], focusedSystemCoords[1], focusedSystemCoords[2]]
          : [0, 0, 0],
        c: 'stars',
      },
    });
  }

  for (const sel of selectedEntities) {
    const matched = findFocusedEntryInCorpus(sel.id, corpus);
    const sysId = matched?.s ?? sel.id;
    const sysSlug = toUrlSlug(sysId);
    if (!candidateMap.has(sysSlug)) {
      const sysEntry = findFocusedEntryInCorpus(sysId, corpus);
      const pos: readonly [number, number, number] = sysEntry?.p
        ? [sysEntry.p[0], sysEntry.p[1], sysEntry.p[2]]
        : toCoordinatesTuple(sel.position);
      candidateMap.set(sysSlug, {
        id: sysId,
        name: sysEntry ? resolveResultDisplayTitle(sysEntry) : sel.name,
        coordinatesPc: pos,
        entry: sysEntry ?? {
          i: sysId,
          n: sel.name,
          p: [pos[0], pos[1], pos[2]],
          c: 'stars',
        },
      });
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
    const hazardSummaryLabel = formatHazardSummaryLabel(hazardCount);
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
    return a.name.localeCompare(b.name);
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
