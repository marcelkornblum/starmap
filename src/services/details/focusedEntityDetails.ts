import { resolveEntryCategory } from '../search/searchCorpusHelpers';
import {
  buildPlanetCompositionBreakdown,
  buildPlanetCompositionSummary,
} from './detailsComposition';
import {
  buildIntrinsicSystemSummary,
  buildIntrinsicSystemSummarySegments,
} from './detailsSystemSummary';
import { resolveFocusedTarget } from './focusedTargetResolver';
import { buildFocusedBaseDetails } from './focusedBaseDetails';
import { buildFocusedStructureDetails } from './focusedStructureDetails';
import {
  buildFocusedBeltDetails,
  buildFocusedMinorBodyDetails,
} from './focusedSubstellarDetails';
import {
  buildFocusedStarDetails,
  buildFocusedSystemDetails,
} from './focusedStarSystemDetails';
import { buildFocusedPlanetDetails } from './focusedPlanetDetails';
import type {
  BuildFocusedEntityDetailsInput,
  FocusedEntityDetails,
} from './detailsEntityTypes';

const DEFAULT_SYSTEM_STAR_COUNT = 1;

export const buildFocusedEntityDetails = (
  input: BuildFocusedEntityDetailsInput,
): FocusedEntityDetails | null => {
  const {
    focusedEntity,
    corpus = [],
    summaryNode,
    systemDetail,
    entityDetail,
    urlSystemSlug,
    urlPlanetSlug,
    urlFocusSlug,
    hasExplicitFocus = false,
    viewScope: inputViewScope,
  } = input;

  if (!focusedEntity && !urlSystemSlug && !urlFocusSlug) return null;

  const resolved = resolveFocusedTarget({
    focusedEntity,
    corpus,
    summaryNode,
    systemDetail,
    entityDetail,
    urlSystemSlug,
    urlPlanetSlug,
    urlFocusSlug,
    hasExplicitFocus,
    viewScope: inputViewScope,
  });

  const {
    matchedCorpusEntry,
    matchedSystemEntry,
    sysManifest,
    structureRecord,
    solarBodyRecord,
    systemName,
    stars,
    planets,
    disks,
    matchedPlanetDetail,
    matchedStarDetail,
    matchedDiskDetail,
    focusedKind,
    resolvedName,
    spectralType,
    planetComposition,
    planetIsHabitable,
    orbitingBodies,
    minorBodyCategoryLabel,
    minorBodyParentName,
  } = resolved;

  const starCount =
    focusedKind === 'structure'
      ? 0
      : sysManifest && sysManifest.stars.length > 0
        ? sysManifest.stars.length
        : (summaryNode?.starCount ?? DEFAULT_SYSTEM_STAR_COUNT);

  const fallbackPlanetCount =
    summaryNode?.planetCount ??
    matchedSystemEntry?.m?.[2] ??
    matchedCorpusEntry?.m?.[2] ??
    planets.length;

  const planetCount =
    focusedKind === 'structure'
      ? 0
      : sysManifest !== undefined
        ? sysManifest.planets.length
        : fallbackPlanetCount;

  const hasHabitableCandidate =
    focusedKind === 'structure'
      ? false
      : Boolean(
          sysManifest?.hasHabitableCandidate ||
            summaryNode?.hasHabitableCandidate ||
            matchedSystemEntry?.m?.[3] === 1 ||
            matchedCorpusEntry?.m?.[3] === 1 ||
            matchedCorpusEntry?.z === 1 ||
            planets.some((p) => p.isHabitableCandidate),
        );

  const precalculatedCompositionCounts =
    sysManifest?.planetCompositionCounts ??
    summaryNode?.planetCompositionCounts ??
    matchedSystemEntry?.b ??
    (matchedCorpusEntry && resolveEntryCategory(matchedCorpusEntry) === 'stars'
      ? matchedCorpusEntry.b
      : undefined);

  const planetCompositionBreakdown = buildPlanetCompositionBreakdown(
    planets,
    planetCount,
    summaryNode?.planetCensus,
    precalculatedCompositionCounts,
  );

  const planetCompositionSummary = buildPlanetCompositionSummary(
    planets,
    planetCount,
    hasHabitableCandidate,
    summaryNode?.planetCensus,
    precalculatedCompositionCounts,
  );

  const isChild =
    (focusedEntity ? focusedEntity.id !== resolved.systemId : false) ||
    focusedKind === 'planet' ||
    focusedKind === 'minor-body' ||
    focusedKind === 'belt';

  const summaryInput = {
    name: resolvedName,
    systemName,
    isChildEntity: isChild,
    focusedKind,
    spectralType,
    starCount,
    planetCount,
    hasHabitableCandidate,
    planetComposition,
    planetIsHabitable,
    orbitingBodyCount: orbitingBodies.length,
    minorBodyCategoryLabel,
    minorBodyParentName,
    manifestOverview: sysManifest?.overviewText,
    structureDescription: structureRecord?.description,
  };

  const systemSummarySegments = buildIntrinsicSystemSummarySegments(summaryInput);
  const systemSummary = buildIntrinsicSystemSummary(summaryInput);

  const { baseDetails, hazards } = buildFocusedBaseDetails(
    resolved,
    input,
    starCount,
    planetCount,
    hasHabitableCandidate,
    planetCompositionBreakdown,
    planetCompositionSummary,
    systemSummarySegments,
    systemSummary,
  );

  if (focusedKind === 'star') {
    return buildFocusedStarDetails(baseDetails, matchedStarDetail, stars, spectralType, summaryNode);
  }
  if (focusedKind === 'planet') {
    return buildFocusedPlanetDetails(
      baseDetails,
      matchedPlanetDetail,
      solarBodyRecord,
      matchedCorpusEntry,
      sysManifest,
      planetComposition,
      planetIsHabitable,
      orbitingBodies,
      hazards,
    );
  }
  if (focusedKind === 'belt') {
    return buildFocusedBeltDetails(baseDetails, matchedDiskDetail, disks, orbitingBodies);
  }
  if (focusedKind === 'minor-body') {
    return buildFocusedMinorBodyDetails(
      baseDetails,
      matchedCorpusEntry,
      minorBodyCategoryLabel,
      minorBodyParentName,
      systemName,
    );
  }
  if (focusedKind === 'structure') {
    return buildFocusedStructureDetails(baseDetails, structureRecord);
  }
  return buildFocusedSystemDetails(baseDetails);
};
