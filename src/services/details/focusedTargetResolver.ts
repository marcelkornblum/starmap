import type { CelestialClassification, SpatialEntityDefinition } from '../../types/spatial';
import type { SystemSummaryNode } from '../../types/astro';
import type { DecodedDetailRecord } from '../../data/detailsRepository';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import {
  findFocusedEntryInCorpus,
  resolveEntryCategory,
  resolveResultDisplayTitle,
  resolveReticleType,
} from '../search/searchCorpusHelpers';
import { formatSlugFallbackTitle } from '../../utils/starNaming';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import { resolveCorpusEntryComposition } from './detailsComposition';
import {
  decodePlanetHazards,
  resolveMinorBodyCategoryLabel,
} from './detailsHazards';
import { buildSystemElementFocusHref } from './detailsNavigation';
import { mapManifestToStarsAndPlanets } from './focusedManifestMapper';
import {
  getCorpusSystemChildrenIndex,
  resolveDiskResidentBodies,
  resolveOrbitingBodies,
} from './focusedChildrenResolver';
import type {
  FocusedDiskDetail,
  FocusedEntityKind,
  FocusedPlanetDetail,
  FocusedStarDetail,
} from './detailsEntityTypes';

import type { ResolvedFocusedTarget } from './focusedTargetResolverTypes';

export type { ResolvedFocusedTarget };

export function resolveFocusedTarget(
  focusedEntity: SpatialEntityDefinition | null | undefined,
  corpus: readonly CompactSearchEntry[],
  summaryNode: SystemSummaryNode | undefined,
  systemDetail: DecodedDetailRecord | undefined,
  entityDetail: DecodedDetailRecord | undefined,
  urlSystemSlug: string | null | undefined,
  urlPlanetSlug: string | null | undefined,
  urlFocusSlug: string | null | undefined,
  hasExplicitFocus: boolean,
  inputViewScope: 'galaxy' | 'system' | 'planet' | undefined,
): ResolvedFocusedTarget {
  const matchedCorpusEntry = focusedEntity
    ? (findFocusedEntryInCorpus(focusedEntity.id, corpus) ?? findFocusedEntryInCorpus(focusedEntity.name, corpus))
    : undefined;
  const urlMatchedSystemEntry = urlSystemSlug ? findFocusedEntryInCorpus(urlSystemSlug, corpus) : undefined;
  const sysManifest = systemDetail?.kind === 'system' ? systemDetail.record : entityDetail?.kind === 'system' ? entityDetail.record : undefined;
  const structureRecord = entityDetail?.kind === 'structure' ? entityDetail.record : systemDetail?.kind === 'structure' ? systemDetail.record : undefined;
  const solarBodyRecord = entityDetail?.kind === 'solar-body' ? entityDetail.record : systemDetail?.kind === 'solar-body' ? systemDetail.record : undefined;

  const systemId =
    solarBodyRecord?.parentBodyId ??
    sysManifest?.id ??
    summaryNode?.id ??
    matchedCorpusEntry?.s ??
    (matchedCorpusEntry && !matchedCorpusEntry.s ? matchedCorpusEntry.i : undefined) ??
    urlMatchedSystemEntry?.s ??
    urlMatchedSystemEntry?.i ??
    focusedEntity?.parentBodyId ??
    (focusedEntity ? focusedEntity.id : (urlSystemSlug ?? ''));

  const matchedSystemEntry =
    systemId && focusedEntity && systemId !== focusedEntity.id
      ? findFocusedEntryInCorpus(systemId, corpus)
      : matchedCorpusEntry && resolveEntryCategory(matchedCorpusEntry) === 'stars'
        ? matchedCorpusEntry
        : (urlMatchedSystemEntry ?? (systemId ? findFocusedEntryInCorpus(systemId, corpus) : undefined));

  const systemName =
    sysManifest?.name ??
    summaryNode?.name ??
    (matchedCorpusEntry && !matchedCorpusEntry.s ? (matchedCorpusEntry.n ?? matchedCorpusEntry.i) : undefined) ??
    (matchedSystemEntry
      ? resolveResultDisplayTitle(matchedSystemEntry)
      : systemId && (!focusedEntity || systemId !== focusedEntity.id)
        ? formatSlugFallbackTitle(systemId)
        : (focusedEntity?.name ?? 'System'));

  let stars: readonly FocusedStarDetail[] = [];
  let planets: readonly FocusedPlanetDetail[] = [];
  let disks: readonly FocusedDiskDetail[] = [];

  if (sysManifest) {
    const mapped = mapManifestToStarsAndPlanets(sysManifest, systemName || systemId);
    stars = mapped.stars;
    planets = mapped.planets;
    disks = mapped.disks;
  } else {
    const fallbackSpectral =
      focusedEntity?.spectralType ?? summaryNode?.spect ?? matchedSystemEntry?.m?.[1] ?? matchedCorpusEntry?.m?.[1];
    if (fallbackSpectral && fallbackSpectral !== 'Unknown') {
      stars = [{
        id: `${systemId}-A`,
        name: systemName,
        href: buildSystemElementFocusHref(systemName || systemId, systemName || `${systemId}-A`),
        componentDesignation: 'A',
        spectralType: fallbackSpectral,
        mag: summaryNode?.mag ?? matchedSystemEntry?.m?.[0] ?? 0,
        absmag: summaryNode?.absmag ?? 0,
      }];
    }
    const sysSlug = toUrlSlug(systemId);
    const candidateEntries = getCorpusSystemChildrenIndex(corpus).get(sysSlug) ??
      (systemId !== sysSlug ? getCorpusSystemChildrenIndex(corpus).get(systemId) : undefined) ?? corpus;
    planets = candidateEntries
      .filter((e) => e.k === 2 && (e.s === systemId || toUrlSlug(e.s ?? '') === sysSlug))
      .map((entry) => {
        const pName = resolveResultDisplayTitle(entry);
        const pHz = entry.H !== undefined ? decodePlanetHazards(entry.H) : undefined;
        return {
          id: entry.i,
          name: pName,
          href: buildSystemElementFocusHref(systemName || systemId, pName || entry.i),
          composition: resolveCorpusEntryComposition(entry),
          isHabitableCandidate: entry.z === 1,
          ...(pHz !== undefined ? { hazards: pHz, hazardCount: pHz.length } : {}),
        };
      });
  }

  const effectiveFocusSlug = urlFocusSlug ? toUrlSlug(urlFocusSlug) : '';
  const focusIdSlug = focusedEntity ? toUrlSlug(focusedEntity.id) : effectiveFocusSlug;
  const focusNameSlug = focusedEntity ? toUrlSlug(focusedEntity.name) : '';

  const matchesSlug = (id: string, name: string) => {
    const pId = toUrlSlug(id);
    const pName = toUrlSlug(name);
    return (
      pId === focusIdSlug ||
      pName === focusIdSlug ||
      (focusNameSlug.length > 0 && (pId === focusNameSlug || pName === focusNameSlug)) ||
      (effectiveFocusSlug.length > 0 && (pId === effectiveFocusSlug || pName === effectiveFocusSlug))
    );
  };

  const matchedPlanetDetail = (focusedEntity || effectiveFocusSlug)
    ? planets.find((p) => matchesSlug(p.id, p.name))
    : undefined;

  const matchedStarDetail = (focusedEntity || effectiveFocusSlug)
    ? stars.find((s) => matchesSlug(s.id, s.name))
    : undefined;

  const matchedDiskDetail = (focusedEntity || effectiveFocusSlug)
    ? disks.find((d) => matchesSlug(d.id, d.name))
    : undefined;

  const focusedKind: FocusedEntityKind = matchedDiskDetail
    ? 'belt'
    : !focusedEntity
      ? 'system'
      : structureRecord || matchedCorpusEntry?.k === 5 || focusedEntity.classification === 'stellar-cluster'
        ? 'structure'
        : matchedPlanetDetail || matchedCorpusEntry?.k === 2 || solarBodyRecord?.classification === 'Planet'
          ? 'planet'
          : matchedCorpusEntry && (matchedCorpusEntry.k === 3 || matchedCorpusEntry.k === 4 || matchedCorpusEntry.k === 6)
            ? 'minor-body'
            : (matchedStarDetail || solarBodyRecord?.classification === 'Star') &&
                ((hasExplicitFocus && Boolean(urlSystemSlug) && inputViewScope !== 'galaxy') || (focusedEntity.id !== systemId && toUrlSlug(focusedEntity.id) !== toUrlSlug(systemName) && toUrlSlug(focusedEntity.name) !== toUrlSlug(systemName)))
              ? 'star'
              : 'system';

  const resolvedName =
    matchedDiskDetail?.name ??
    matchedPlanetDetail?.name ??
    (focusedKind === 'star' && matchedStarDetail && matchedStarDetail.name !== systemName ? matchedStarDetail.name : undefined) ??
    (focusedEntity ? focusedEntity.name : systemName);

  const spectralType =
    (focusedKind === 'star' && matchedStarDetail ? matchedStarDetail.spectralType : undefined) ??
    focusedEntity?.spectralType ??
    sysManifest?.stars[0]?.spectralType ??
    summaryNode?.spect ??
    matchedSystemEntry?.m?.[1] ??
    matchedCorpusEntry?.m?.[1];

  const planetComposition = matchedPlanetDetail?.composition ?? resolveCorpusEntryComposition(matchedCorpusEntry);
  const planetIsHabitable = Boolean(matchedPlanetDetail?.isHabitableCandidate || matchedCorpusEntry?.z === 1);
  const planetTargetSlugs = new Set<string>([focusIdSlug, focusNameSlug, effectiveFocusSlug, matchedPlanetDetail ? toUrlSlug(matchedPlanetDetail.id) : '', matchedPlanetDetail ? toUrlSlug(matchedPlanetDetail.name) : ''].filter((s) => s.length > 0));

  const orbitingBodies =
    focusedKind === 'belt' && matchedDiskDetail
      ? resolveDiskResidentBodies(matchedDiskDetail, systemName || systemId, corpus, systemId, urlPlanetSlug)
      : focusedKind === 'planet' || focusedKind === 'minor-body'
        ? resolveOrbitingBodies(planetTargetSlugs, systemName || systemId, corpus, urlPlanetSlug)
        : [];

  const minorBodyCategoryLabel = focusedKind === 'minor-body' ? resolveMinorBodyCategoryLabel(matchedCorpusEntry) : undefined;
  const minorBodyParentName = focusedKind === 'minor-body' ? (solarBodyRecord?.parentBodyId ? formatSlugFallbackTitle(solarBodyRecord.parentBodyId) : matchedCorpusEntry?.o ? formatSlugFallbackTitle(matchedCorpusEntry.o) : systemName) : undefined;
  const reticleType: CelestialClassification = focusedKind === 'belt' ? 'terrestrial' : focusedKind === 'planet' ? planetComposition : ((focusedEntity?.classification as CelestialClassification | undefined) ?? (matchedCorpusEntry ? resolveReticleType(matchedCorpusEntry) : 'stellar-system'));

  return {
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
    reticleType,
  };
}
