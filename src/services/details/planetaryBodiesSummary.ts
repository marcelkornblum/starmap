import type { DecodedEntityAnnotation } from '../../utils/datasetLayerTypes';
import {
  DEFAULT_ORIGIN_TARGETS,
  EARTH_REFERENCE_TARGET,
} from '../../config/referenceTargets';
import {
  findFocusedEntryInCorpus,
  isArtificialSpacecraftEntry,
  resolveResultDisplayTitle,
} from '../search/searchCorpusHelpers';
import { formatSlugFallbackTitle } from '../../utils/starNaming';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import { resolveCorpusEntryComposition } from './detailsComposition';
import { resolveMinorBodyCategoryLabel } from './detailsHazards';
import { resolveDirectTargetCanonAnnotations } from './detailsCanonAnnotations';
import {
  buildPlanetDetailsHref,
  buildPlanetElementFocusHref,
  buildSystemDetailsHref,
} from './detailsNavigation';
import type { FocusedPlanetDetail } from './detailsEntityTypes';
import type {
  BuildPlanetaryBodiesSummaryInput,
  PlanetaryBodiesSummary,
  SystemElementBodyItem,
} from './detailsHierarchyTypes';

export const buildPlanetaryBodiesSummary = (
  input: BuildPlanetaryBodiesSummaryInput,
): PlanetaryBodiesSummary | null => {
  const {
    details,
    urlPlanetSlug,
    planetEntityDetail,
    corpus = [],
    canonRecords = [],
    selectedEntityIds,
  } = input;
  if (!details && !urlPlanetSlug) {
    return null;
  }

  const planetCorpusEntry = urlPlanetSlug
    ? findFocusedEntryInCorpus(urlPlanetSlug, corpus)
    : details?.focusedKind === 'planet'
      ? findFocusedEntryInCorpus(details.id, corpus)
      : undefined;

  const planetId =
    planetCorpusEntry?.i ??
    (details?.focusedKind === 'planet'
      ? details.id
      : (urlPlanetSlug || details?.id || EARTH_REFERENCE_TARGET.id));

  const matchedPlanetFromDetails = details?.planets.find((p) => {
    const pId = toUrlSlug(p.id);
    const pName = toUrlSlug(p.name);
    const targetSlug = toUrlSlug(urlPlanetSlug ?? planetId);
    return pId === targetSlug || pName === targetSlug;
  });

  const planetName =
    matchedPlanetFromDetails?.name ??
    (planetCorpusEntry
      ? resolveResultDisplayTitle(planetCorpusEntry)
      : details?.focusedKind === 'planet'
        ? details.name
        : formatSlugFallbackTitle(urlPlanetSlug || details?.name || EARTH_REFERENCE_TARGET.id));

  const planetHref = buildPlanetDetailsHref(planetName || planetId);
  const systemId = details?.systemId ?? planetCorpusEntry?.s ?? DEFAULT_ORIGIN_TARGETS.interstellarOriginId;
  const systemEntry = findFocusedEntryInCorpus(systemId, corpus);
  const systemName =
    details?.systemName ??
    (systemEntry
      ? resolveResultDisplayTitle(systemEntry)
      : formatSlugFallbackTitle(systemId));
  const systemHref = buildSystemDetailsHref(systemName || systemId);

  const planetSolarRecord =
    planetEntityDetail?.kind === 'solar-body'
      ? planetEntityDetail.record
      : undefined;

  const planetDetail: FocusedPlanetDetail | undefined =
    matchedPlanetFromDetails
      ? {
          ...matchedPlanetFromDetails,
          href: planetHref,
        }
      : details?.focusedKind === 'planet'
        ? {
            id: planetId,
            name: planetName,
            href: planetHref,
            composition: details.planetTelemetry.composition,
            isHabitableCandidate: details.planetTelemetry.isHabitableCandidate,
            ...(details.planetTelemetry.semiMajorAxisAu !== undefined
              ? { semiMajorAxisAu: details.planetTelemetry.semiMajorAxisAu }
              : {}),
            ...(details.planetTelemetry.periodDays !== undefined
              ? { periodDays: details.planetTelemetry.periodDays }
              : {}),
            ...(details.planetTelemetry.eccentricity !== undefined
              ? { eccentricity: details.planetTelemetry.eccentricity }
              : {}),
            ...(details.planetTelemetry.inclinationDeg !== undefined
              ? { inclinationDeg: details.planetTelemetry.inclinationDeg }
              : {}),
            ...(details.planetTelemetry.massMearth !== undefined
              ? { massMearth: details.planetTelemetry.massMearth }
              : {}),
            ...(details.planetTelemetry.radiusRearth !== undefined
              ? { radiusRearth: details.planetTelemetry.radiusRearth }
              : {}),
            ...(details.planetTelemetry.equilibriumTempK !== undefined
              ? { equilibriumTempK: details.planetTelemetry.equilibriumTempK }
              : {}),
          }
        : planetCorpusEntry
          ? {
              id: planetId,
              name: planetName,
              href: planetHref,
              composition: resolveCorpusEntryComposition(planetCorpusEntry),
              isHabitableCandidate: planetCorpusEntry.z === 1,
              ...(planetSolarRecord?.orbit?.semiMajorAxis !== undefined
                ? { semiMajorAxisAu: planetSolarRecord.orbit.semiMajorAxis }
                : {}),
              ...(planetSolarRecord?.orbit?.periodDays !== undefined
                ? { periodDays: planetSolarRecord.orbit.periodDays }
                : {}),
              ...(planetSolarRecord?.orbit?.eccentricity !== undefined
                ? { eccentricity: planetSolarRecord.orbit.eccentricity }
                : {}),
              ...(planetSolarRecord?.orbit?.inclination !== undefined
                ? { inclinationDeg: planetSolarRecord.orbit.inclination }
                : {}),
            }
          : undefined;

  const planetTargetSlugs = new Set<string>(
    [
      toUrlSlug(planetId),
      toUrlSlug(planetName),
      urlPlanetSlug ? toUrlSlug(urlPlanetSlug) : '',
    ].filter((s) => s.length > 0),
  );

  const moons: SystemElementBodyItem[] = [];
  const minorBodiesAndSpacecraft: SystemElementBodyItem[] = [];

  for (const entry of corpus) {
    if (!entry.o) {
      continue;
    }
    const parentSlug = toUrlSlug(entry.o);
    if (!planetTargetSlugs.has(parentSlug)) {
      continue;
    }
    const name = resolveResultDisplayTitle(entry);
    const href = buildPlanetElementFocusHref(
      planetName || planetId,
      name || entry.i,
    );
    if (entry.k === 3 || entry.k === 4) {
      moons.push({
        id: entry.i,
        name,
        href,
        categoryKey: entry.k === 3 ? 'moon' : 'dwarf-planet',
        categoryLabel: entry.k === 3 ? 'Moon' : 'Dwarf Planet',
      });
    } else {
      const isSpacecraft = isArtificialSpacecraftEntry(entry);
      minorBodiesAndSpacecraft.push({
        id: entry.i,
        name,
        href,
        categoryKey: isSpacecraft ? 'spacecraft' : 'asteroid',
        categoryLabel: resolveMinorBodyCategoryLabel(entry),
      });
    }
  }

  const targetIdsForCanon = [
    planetId,
    planetName,
    ...moons.map((m) => m.id),
    ...minorBodiesAndSpacecraft.map((b) => b.id),
  ];
  const canonRecordsByTargetId: Record<string, DecodedEntityAnnotation[]> = {};
  for (const record of canonRecords) {
    (canonRecordsByTargetId[record.targetId] ??= []).push(record);
  }
  const directCanon = resolveDirectTargetCanonAnnotations(
    targetIdsForCanon,
    canonRecordsByTargetId,
  );

  const focusedEntityId =
    'focusedEntityId' in input ? input.focusedEntityId : details?.id;

  return {
    scope: 'planet',
    planetId,
    planetName,
    planetHref,
    systemId,
    systemName,
    systemHref,
    ...(focusedEntityId ? { focusedEntityId } : {}),
    ...(selectedEntityIds ? { selectedEntityIds } : {}),
    ...(planetDetail ? { planetDetail } : {}),
    moons,
    minorBodiesAndSpacecraft,
    canonAnnotations: directCanon,
  };
};
