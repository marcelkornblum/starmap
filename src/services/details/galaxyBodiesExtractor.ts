import { deriveEntityTier } from '../../utils/spatialMath';
import {
  PARSEC_TO_LY,
  computeEuclideanDistance3D,
} from '../../utils/transitDynamics';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import {
  buildMetricGuideHref,
  buildStarTypeGuideHref,
} from '../../content/guide';
import { buildTagGalaxyHref } from '../search/searchUrls';
import {
  findFocusedEntryInCorpus,
  resolveReticleType,
} from '../search/searchCorpusHelpers';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import { decodeSystemHazards } from './detailsHazards';
import { buildGalaxySystemNavigationHref } from './detailsNavigation';
import { resolveGalacticInstrumentAperture } from './galacticAperture';
import { resolveGalaxyFocusContext } from './galaxyFocusResolver';
import type {
  GalaxyBodiesSummary,
  GalaxyBodySystemItem,
} from './detailsHierarchyTypes';
import type { ExtractGalaxyBodiesInput } from './detailsNavigationTypes';

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

  const {
    focusedSystemId,
    focusedSystemName,
    focusedSystemCoords,
    focusedSysSlug,
  } = resolveGalaxyFocusContext(focusedEntity, urlSystemSlug, corpus);

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

    const hazards = decodeSystemHazards(entry.H ?? 0);
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
