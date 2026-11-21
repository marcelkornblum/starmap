import { formatSectorId } from '../../utils/sectorMath';
import { decodeTagsMask } from '../../utils/compactDataCodec';
import { buildDirectionsTriggerHref } from '../journey/journeyProfilesAndUrls';
import { resolveEntryCategory } from '../search/searchCorpusHelpers';
import {
  decodePlanetHazards,
  decodeSystemHazards,
  toCoordinatesTuple,
} from './detailsHazards';
import {
  buildPlanetDetailsHref,
  buildSystemDetailsHref,
} from './detailsNavigation';
import { buildCenterEntityHref } from './detailsCamera';
import { resolveFocusedCanonAnnotations } from './detailsCanonAnnotations';
import type { ResolvedFocusedTarget } from './focusedTargetResolverTypes';
import type {
  BuildFocusedEntityDetailsInput,
  EntityHazardItem,
  FocusedEntityDetailsBase,
  PlanetCompositionCount,
  SystemSummarySegment,
} from './detailsEntityTypes';

export interface BaseDetailsResult {
  readonly baseDetails: FocusedEntityDetailsBase;
  readonly hazards: readonly EntityHazardItem[];
}

export function buildFocusedBaseDetails(
  resolved: ResolvedFocusedTarget,
  input: BuildFocusedEntityDetailsInput,
  starCount: number,
  planetCount: number,
  hasHabitableCandidate: boolean,
  planetCompositionBreakdown: readonly PlanetCompositionCount[],
  planetCompositionSummary: string,
  systemSummarySegments: readonly SystemSummarySegment[],
  systemSummary: string,
): BaseDetailsResult {
  const {
    matchedCorpusEntry,
    matchedSystemEntry,
    sysManifest,
    structureRecord,
    solarBodyRecord,
    systemId,
    systemName,
    stars,
    planets,
    disks,
    matchedPlanetDetail,
    matchedDiskDetail,
    focusedKind,
    resolvedName,
    spectralType,
    orbitingBodies,
    reticleType,
  } = resolved;

  const {
    focusedEntity,
    canonRecords = [],
    canonOrderOptions,
    urlSystemSlug,
    urlPlanetSlug,
    hasExplicitFocus = false,
    viewScope: inputViewScope,
    currentPathname,
    currentSearch,
    corpus = [],
  } = input;

  const coordinatesPc: readonly [number, number, number] =
    sysManifest && Number.isFinite(sysManifest.x)
      ? [sysManifest.x, sysManifest.y, sysManifest.z]
      : input.summaryNode && Number.isFinite(input.summaryNode.x)
        ? [input.summaryNode.x, input.summaryNode.y, input.summaryNode.z]
        : structureRecord && Number.isFinite(structureRecord.x)
          ? [structureRecord.x, structureRecord.y, structureRecord.z]
          : toCoordinatesTuple(focusedEntity?.position ?? [0, 0, 0]);

  const sectorId =
    sysManifest?.sectorId ??
    input.summaryNode?.sectorId ??
    formatSectorId(coordinatesPc[0], coordinatesPc[1], coordinatesPc[2]);

  const resolvedTargetId = matchedDiskDetail?.id ?? focusedEntity?.id ?? systemId;

  const canonAnnotations = resolveFocusedCanonAnnotations(
    resolvedTargetId,
    systemId,
    canonRecords,
    canonOrderOptions,
    corpus,
    currentPathname,
    currentSearch,
  );

  const precalculatedMask =
    matchedSystemEntry?.g ??
    (matchedCorpusEntry && resolveEntryCategory(matchedCorpusEntry) === 'stars'
      ? matchedCorpusEntry.g
      : undefined);

  const precalculatedTags =
    sysManifest?.tags ??
    input.summaryNode?.tags ??
    (precalculatedMask !== undefined
      ? decodeTagsMask(precalculatedMask)
      : undefined);

  const fallbackTags: string[] = [];
  if (!precalculatedTags && focusedKind !== 'structure') {
    const isHome = matchedSystemEntry?.h === 1 || matchedCorpusEntry?.h === 1;
    if (isHome) fallbackTags.push('HomeSystem');
    const [cx, cy, cz] = coordinatesPc;
    const dist = Math.sqrt(cx * cx + cy * cy + cz * cz);
    if ((dist > 0 && dist <= 10) || isHome) fallbackTags.push('SolarNeighborhood10pc');
    const appMag = matchedSystemEntry?.m?.[0] ?? matchedCorpusEntry?.m?.[0];
    if (appMag !== undefined && appMag <= 6.5) fallbackTags.push('NakedEye');
    if (planetCount > 0) fallbackTags.push('ExoplanetHost');
    if (hasHabitableCandidate) fallbackTags.push('HabitableCandidate');
  }

  const tags = precalculatedTags ? [...precalculatedTags] : fallbackTags;
  if (hasHabitableCandidate && !tags.includes('HabitableCandidate')) {
    tags.push('HabitableCandidate');
  }

  const viewScope: 'galaxy' | 'system' | 'planet' =
    inputViewScope ?? (urlPlanetSlug ? 'planet' : urlSystemSlug ? 'system' : 'galaxy');
  const scopeTargetId = urlPlanetSlug ?? urlSystemSlug ?? resolvedTargetId;
  const centerHref = buildCenterEntityHref(viewScope, scopeTargetId, resolvedTargetId);

  let systemDetailsHref: string | undefined;
  if ((focusedKind === 'system' || focusedKind === 'star') && viewScope === 'galaxy') {
    systemDetailsHref = buildSystemDetailsHref(systemName || systemId);
  } else if (focusedKind === 'planet' && (viewScope === 'galaxy' || viewScope === 'system')) {
    systemDetailsHref = buildPlanetDetailsHref(resolvedName || resolvedTargetId);
  }

  const directionsHref = buildDirectionsTriggerHref({
    viewScope,
    focusedId: resolvedTargetId,
    systemId,
    focusedKind,
    currentPathname,
    currentSearch,
    hasExplicitFocus,
  });

  const rawSysHz =
    sysManifest?.hazardMask ??
    input.summaryNode?.hazardMask ??
    matchedSystemEntry?.H ??
    (matchedCorpusEntry && resolveEntryCategory(matchedCorpusEntry) === 'stars'
      ? matchedCorpusEntry.H
      : undefined);
  const systemHazards = decodeSystemHazards(rawSysHz ?? 0);

  const planetHazards =
    matchedPlanetDetail?.hazards && matchedPlanetDetail.hazards.length > 0
      ? matchedPlanetDetail.hazards
      : decodePlanetHazards(solarBodyRecord?.hazardMask ?? matchedCorpusEntry?.H ?? 0);

  const hazards =
    focusedKind === 'planet'
      ? [...systemHazards, ...planetHazards]
      : focusedKind === 'system' || focusedKind === 'star' || focusedKind === 'minor-body' || focusedKind === 'belt'
        ? systemHazards
        : [];
  const hazardCount = hazards.length;
  const hazardSummaryLabel =
    hazardCount <= 0 ? '0 hazards' : `${hazardCount} ${hazardCount === 1 ? 'hazard' : 'hazards'}`;

  const baseDetails: FocusedEntityDetailsBase = {
    id: resolvedTargetId,
    systemId,
    name: resolvedName,
    systemName,
    ...(spectralType && spectralType !== 'Unknown' ? { spectralType } : {}),
    reticleType,
    starCount,
    planetCount,
    planetCompositionBreakdown,
    planetCompositionSummary,
    hasHabitableCandidate,
    hazardCount,
    hazards,
    hazardSummaryLabel,
    systemSummary,
    systemSummarySegments,
    coordinatesPc,
    sectorId,
    sectorName: sectorId,
    tags,
    ...(systemDetailsHref ? { systemDetailsHref } : {}),
    directionsHref,
    centerHref,
    stars,
    planets,
    disks,
    ...(orbitingBodies.length > 0 ? { orbitingBodies } : {}),
    canonAnnotations,
  };

  return { baseDetails, hazards };
}
