import {
  getCachedDetailRecord,
  type DecodedDetailRecord,
} from '../../data/detailsRepository';
import type {
  CelestialSymbolType,
  ExoplanetRecord,
  PlanetaryRingRecord,
} from '../../types/astro';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import {
  resolveResultDisplayTitle,
  resolveReticleType,
} from '../search/searchCorpusHelpers';
import type { FocusedEntityDetails } from './detailsEntityTypes';
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
  isBulkMinorBodyId,
  isInSelection,
  isInsideHabitableZone,
  matchesIdOrSlug,
  resolveMinorCorpusKind,
  resolveOrbitDistanceAndStyle,
  type CollectorContext,
} from './orbitalSchematicShared';

const findMatchingExoplanet = (
  systemDetail: DecodedDetailRecord | undefined,
  parentSlugs: ReadonlySet<string>,
): ExoplanetRecord | undefined => {
  if (systemDetail?.kind !== 'system') return undefined;
  return systemDetail.record.planets.find(
    (p) => parentSlugs.has(toUrlSlug(p.id)) || parentSlugs.has(toUrlSlug(p.name)),
  );
};

const resolvePlanetRings = (
  focusedDetails: FocusedEntityDetails,
  matchedExoplanet: ExoplanetRecord | undefined,
  focusedDetail: DecodedDetailRecord | undefined,
  parentSlugs: ReadonlySet<string>,
): readonly PlanetaryRingRecord[] => {
  if (matchedExoplanet?.rings && matchedExoplanet.rings.length > 0) {
    return matchedExoplanet.rings;
  }
  const matchedFocusedPlanet = focusedDetails.planets.find(
    (p) => parentSlugs.has(toUrlSlug(p.id)) || parentSlugs.has(toUrlSlug(p.name)),
  );
  if (matchedFocusedPlanet?.rings && matchedFocusedPlanet.rings.length > 0) {
    return matchedFocusedPlanet.rings;
  }
  if (focusedDetail?.kind === 'solar-body' && focusedDetail.record.rings?.length) {
    return focusedDetail.record.rings;
  }
  const cached = getCachedDetailRecord(focusedDetails.id);
  if (cached?.kind === 'solar-body' && cached.record.rings?.length) {
    return cached.record.rings;
  }
  return [];
};

export const collectSystemOrbitalEntries = (
  ctx: CollectorContext,
  habitableZoneAu: readonly [number, number] | undefined,
  primaryStarMass: number,
): {
  readonly rows: readonly OrbitalSchematicTrackRow[];
  readonly zones: readonly OrbitalSchematicZone[];
} => {
  const { focusedDetails, corpus, epochMs, focusedIdSlug, selectedSet, selectedSlugSet } = ctx;
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

    const cached = getCachedDetailRecord(entry.i);
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
    rows.push({
      id: entry.i,
      name,
      href: buildSystemElementFocusHref(systemRef, name || entry.i),
      kind,
      reticleType,
      tier,
      sortDistanceAu,
      lineStyle: resolvedOrbit?.lineStyle ?? 'dotted',
      inHabitableZone: Boolean(
        entry.z === 1 || isInsideHabitableZone(sortDistanceAu, habitableZoneAu),
      ),
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
      inHabitableZone: false,
      isFocused: matchesIdOrSlug(sat.id, sat.name, focusedDetails.id, focusedIdSlug),
      isSelected: isInSelection(sat.id, sat.name, selectedSet, selectedSlugSet),
    });
  }

  for (const entry of corpus) {
    if (!entry.o || !parentSlugs.has(toUrlSlug(entry.o))) continue;
    if (isBulkMinorBodyId(entry.i)) continue;
    const name = resolveResultDisplayTitle(entry);
    if (
      seenSatIds.has(entry.i) ||
      seenSatSlugs.has(toUrlSlug(entry.i)) ||
      seenSatSlugs.has(toUrlSlug(name))
    ) {
      continue;
    }

    const cached = getCachedDetailRecord(entry.i);
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

    rows.push({
      id: entry.i,
      name,
      href: buildPlanetElementFocusHref(parentRef, name || entry.i),
      kind,
      reticleType,
      tier,
      sortDistanceAu: resolvedOrbit?.sortDistanceAu ?? Number.POSITIVE_INFINITY,
      lineStyle: resolvedOrbit?.lineStyle ?? 'dotted',
      inHabitableZone: entry.z === 1,
      isFocused: matchesIdOrSlug(entry.i, name, focusedDetails.id, focusedIdSlug),
      isSelected: isInSelection(entry.i, name, selectedSet, selectedSlugSet),
    });
  }

  return { rows, zones };
};
