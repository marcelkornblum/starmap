import { isBulkMinorBodyId } from '../../data/detailsRepository';
import type { CelestialSymbolType } from '../../types/astro';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import {
  resolveResultDisplayTitle,
  resolveReticleType,
} from '../search/searchCorpusHelpers';
import type {
  OrbitalSchematicEntityKind,
  OrbitalSchematicTier,
  OrbitalSchematicTrackRow,
  OrbitalSchematicZone,
} from './detailsHierarchyTypes';
import {
  buildPlanetElementFocusHref,
  buildSystemElementFocusHref,
} from './detailsNavigation';
import { getCorpusSystemChildrenIndex } from './focusedChildrenResolver';
import {
  findMatchingExoplanet,
  getCorpusParentChildrenIndex,
  isInSelection,
  isInsideHabitableZone,
  matchesIdOrSlug,
  resolveMinorCorpusKind,
  resolveOrbitDistanceAndStyle,
  resolvePlanetRings,
  type CollectorContext,
} from './orbitalSchematicShared';

export const collectSystemOrbitalEntries = (
  ctx: CollectorContext,
  habitableZoneAu: readonly [number, number] | undefined,
  primaryStarMass: number,
): {
  readonly rows: readonly OrbitalSchematicTrackRow[];
  readonly zones: readonly OrbitalSchematicZone[];
} => {
  const {
    focusedDetails,
    corpus,
    epochMs,
    focusedIdSlug,
    selectedSet,
    selectedSlugSet,
    getDetailRecord,
  } = ctx;
  const rows: OrbitalSchematicTrackRow[] = [];
  const zones: OrbitalSchematicZone[] = [];

  for (const disk of focusedDetails.disks ?? []) {
    const sortDistanceAu =
      typeof disk.semiMajorAxisAu === 'number' &&
      Number.isFinite(disk.semiMajorAxisAu) &&
      disk.semiMajorAxisAu > 0
        ? disk.semiMajorAxisAu
        : (disk.innerRadiusAu + disk.outerRadiusAu) / 2;
    zones.push({
      id: disk.id,
      name: disk.name,
      href: disk.href,
      kind: disk.kind === 'debris-disk' ? 'debris-disk' : 'belt',
      innerRadiusAu: disk.innerRadiusAu,
      outerRadiusAu: disk.outerRadiusAu,
      sortDistanceAu,
      isFocused: matchesIdOrSlug(disk.id, disk.name, focusedDetails.id, focusedIdSlug),
      isSelected: isInSelection(disk.id, disk.name, selectedSet, selectedSlugSet),
    });
  }

  const seenPlanetIds = new Set<string>();
  const seenPlanetSlugs = new Set<string>();
  const systemRef = focusedDetails.systemName || focusedDetails.systemId;

  for (const planet of focusedDetails.planets) {
    seenPlanetIds.add(planet.id);
    seenPlanetSlugs.add(toUrlSlug(planet.id));
    seenPlanetSlugs.add(toUrlSlug(planet.name));
    const sortDistanceAu =
      typeof planet.semiMajorAxisAu === 'number' &&
      Number.isFinite(planet.semiMajorAxisAu) &&
      planet.semiMajorAxisAu > 0
        ? planet.semiMajorAxisAu
        : Number.POSITIVE_INFINITY;
    rows.push({
      id: planet.id,
      name: planet.name,
      href: planet.href ?? buildSystemElementFocusHref(systemRef, planet.name || planet.id),
      kind: 'planet',
      reticleType: planet.composition,
      tier: 'primary',
      sortDistanceAu,
      lineStyle: planet.isTheoreticalOrbit ? 'dotted' : 'dashed',
      ...(planet.eccentricity !== undefined ? { eccentricity: planet.eccentricity } : {}),
      ...(planet.inclinationDeg !== undefined ? { inclinationDeg: planet.inclinationDeg } : {}),
      inHabitableZone: Boolean(
        planet.isHabitableCandidate || isInsideHabitableZone(sortDistanceAu, habitableZoneAu),
      ),
      isFocused: matchesIdOrSlug(planet.id, planet.name, focusedDetails.id, focusedIdSlug),
      isSelected: isInSelection(planet.id, planet.name, selectedSet, selectedSlugSet),
    });
  }

  const sysSlug = toUrlSlug(focusedDetails.systemId);
  const systemIndex = getCorpusSystemChildrenIndex(corpus);
  const candidateEntries =
    systemIndex.get(sysSlug) ??
    (focusedDetails.systemId !== sysSlug ? systemIndex.get(focusedDetails.systemId) : undefined) ??
    [];

  for (const entry of candidateEntries) {
    if (entry.k !== 4 && entry.k !== 6) continue;
    if (entry.o && toUrlSlug(entry.o) !== sysSlug) continue;
    if (isBulkMinorBodyId(entry.i)) continue;
    const name = resolveResultDisplayTitle(entry);
    if (
      seenPlanetIds.has(entry.i) ||
      seenPlanetSlugs.has(toUrlSlug(entry.i)) ||
      seenPlanetSlugs.has(toUrlSlug(name))
    ) {
      continue;
    }

    const cached = getDetailRecord(entry.i);
    const solarRecord = cached?.kind === 'solar-body' ? cached.record : undefined;
    const tier: OrbitalSchematicTier = entry.k === 4 ? 'primary' : 'minor';
    const reticleType: CelestialSymbolType =
      entry.k === 4
        ? (solarRecord?.reticleType ?? 'dwarf-planet')
        : (solarRecord?.reticleType ?? resolveReticleType(entry));
    const kind: OrbitalSchematicEntityKind =
      entry.k === 4
        ? 'dwarf-planet'
        : resolveMinorCorpusKind(entry, solarRecord?.classification, solarRecord?.reticleType);
    const resolvedOrbit = resolveOrbitDistanceAndStyle(
      solarRecord?.orbit,
      entry.A,
      epochMs,
      primaryStarMass,
    );
    if (!resolvedOrbit && tier === 'minor') continue;

    const sortDistanceAu = resolvedOrbit?.sortDistanceAu ?? Number.POSITIVE_INFINITY;
    const isUnbounded = Boolean(resolvedOrbit?.isUnboundedFallback);
    rows.push({
      id: entry.i,
      name,
      href: buildSystemElementFocusHref(systemRef, name || entry.i),
      kind,
      reticleType,
      tier,
      sortDistanceAu,
      lineStyle: resolvedOrbit?.lineStyle ?? 'dotted',
      ...(solarRecord?.orbit?.eccentricity !== undefined
        ? { eccentricity: solarRecord.orbit.eccentricity }
        : {}),
      ...(solarRecord?.orbit?.inclination !== undefined
        ? { inclinationDeg: solarRecord.orbit.inclination }
        : {}),
      inHabitableZone:
        !isUnbounded &&
        Boolean(entry.z === 1 || isInsideHabitableZone(sortDistanceAu, habitableZoneAu)),
      isFocused: matchesIdOrSlug(entry.i, name, focusedDetails.id, focusedIdSlug),
      isSelected: isInSelection(entry.i, name, selectedSet, selectedSlugSet),
    });
  }

  return { rows, zones };
};

export const collectPlanetaryOrbitalEntries = (
  ctx: CollectorContext,
): {
  readonly rows: readonly OrbitalSchematicTrackRow[];
  readonly zones: readonly OrbitalSchematicZone[];
} => {
  const {
    focusedDetails,
    systemDetail,
    focusedDetail,
    corpus,
    epochMs,
    focusedIdSlug,
    selectedSet,
    selectedSlugSet,
    getDetailRecord,
  } = ctx;
  const rows: OrbitalSchematicTrackRow[] = [];
  const zones: OrbitalSchematicZone[] = [];
  const parentRef = focusedDetails.name || focusedDetails.id;
  const parentSlugs = new Set(
    [focusedDetails.id, focusedDetails.name].map(toUrlSlug).filter(Boolean),
  );
  const matchedExoplanet = findMatchingExoplanet(systemDetail, parentSlugs);

  for (const ring of resolvePlanetRings(
    focusedDetails,
    matchedExoplanet,
    focusedDetail,
    parentSlugs,
    getDetailRecord,
  )) {
    zones.push({
      id: ring.id,
      name: ring.name,
      kind: 'ring-system',
      innerRadiusAu: ring.innerRadiusAu,
      outerRadiusAu: ring.outerRadiusAu,
      sortDistanceAu: (ring.innerRadiusAu + ring.outerRadiusAu) / 2,
      isFocused: false,
      isSelected: false,
    });
  }

  const seenSatIds = new Set<string>();
  const seenSatSlugs = new Set<string>();

  for (const sat of matchedExoplanet?.satellites ?? []) {
    seenSatIds.add(sat.id);
    seenSatSlugs.add(toUrlSlug(sat.id));
    seenSatSlugs.add(toUrlSlug(sat.name));
    const resolvedOrbit = resolveOrbitDistanceAndStyle(sat.orbit, undefined, epochMs, 1.0);
    rows.push({
      id: sat.id,
      name: sat.name,
      href: buildPlanetElementFocusHref(parentRef, sat.name || sat.id),
      kind: 'moon',
      reticleType: sat.reticleType ?? 'moon',
      tier: 'primary',
      sortDistanceAu: resolvedOrbit?.sortDistanceAu ?? Number.POSITIVE_INFINITY,
      lineStyle: resolvedOrbit?.lineStyle ?? 'dotted',
      ...(sat.orbit?.eccentricity !== undefined ? { eccentricity: sat.orbit.eccentricity } : {}),
      ...(sat.orbit?.inclination !== undefined ? { inclinationDeg: sat.orbit.inclination } : {}),
      inHabitableZone: false,
      isFocused: matchesIdOrSlug(sat.id, sat.name, focusedDetails.id, focusedIdSlug),
      isSelected: isInSelection(sat.id, sat.name, selectedSet, selectedSlugSet),
    });
  }

  const parentIndex = getCorpusParentChildrenIndex(corpus);
  const seenParentEntryIds = new Set<string>();
  const parentCandidates: CompactSearchEntry[] = [];
  for (const parentSlug of parentSlugs) {
    const list = parentIndex.get(parentSlug);
    if (!list) continue;
    for (const entry of list) {
      if (seenParentEntryIds.has(entry.i)) continue;
      seenParentEntryIds.add(entry.i);
      parentCandidates.push(entry);
    }
  }

  for (const entry of parentCandidates) {
    if (isBulkMinorBodyId(entry.i)) continue;
    const name = resolveResultDisplayTitle(entry);
    if (
      seenSatIds.has(entry.i) ||
      seenSatSlugs.has(toUrlSlug(entry.i)) ||
      seenSatSlugs.has(toUrlSlug(name))
    ) {
      continue;
    }

    const cached = getDetailRecord(entry.i);
    const solarRecord = cached?.kind === 'solar-body' ? cached.record : undefined;
    const tier: OrbitalSchematicTier = entry.k === 3 || entry.k === 4 ? 'primary' : 'minor';
    const kind: OrbitalSchematicEntityKind =
      entry.k === 3
        ? 'moon'
        : entry.k === 4
          ? 'dwarf-planet'
          : resolveMinorCorpusKind(entry, solarRecord?.classification, solarRecord?.reticleType);
    const reticleType: CelestialSymbolType =
      entry.k === 3
        ? (solarRecord?.reticleType ?? 'moon')
        : entry.k === 4
          ? (solarRecord?.reticleType ?? 'dwarf-planet')
          : (solarRecord?.reticleType ?? resolveReticleType(entry));
    const resolvedOrbit = resolveOrbitDistanceAndStyle(solarRecord?.orbit, entry.A, epochMs, 1.0);
    if (!resolvedOrbit && tier === 'minor') continue;

    const isUnbounded = Boolean(resolvedOrbit?.isUnboundedFallback);
    rows.push({
      id: entry.i,
      name,
      href: buildPlanetElementFocusHref(parentRef, name || entry.i),
      kind,
      reticleType,
      tier,
      sortDistanceAu: resolvedOrbit?.sortDistanceAu ?? Number.POSITIVE_INFINITY,
      lineStyle: resolvedOrbit?.lineStyle ?? 'dotted',
      ...(solarRecord?.orbit?.eccentricity !== undefined
        ? { eccentricity: solarRecord.orbit.eccentricity }
        : {}),
      ...(solarRecord?.orbit?.inclination !== undefined
        ? { inclinationDeg: solarRecord.orbit.inclination }
        : {}),
      inHabitableZone: !isUnbounded && entry.z === 1,
      isFocused: matchesIdOrSlug(entry.i, name, focusedDetails.id, focusedIdSlug),
      isSelected: isInSelection(entry.i, name, selectedSet, selectedSlugSet),
    });
  }

  return { rows, zones };
};
