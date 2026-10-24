import type { CelestialClassification } from '../../components/canvas/cartography/reticleGeometry';
import { getCachedDetailRecord } from '../../data/detailsRepository';
import type { SystemManifest } from '../../types/astro';
import {
  computePlanetSurfaceGravityG,
  computePlanetHazardMask,
  computeSystemHazardMask,
  isPlanetTidallyLocked,
  formatSectorId,
} from '../../utils/astroMath';
import {
  decodeTagsMask,
  type CompactSearchEntry,
} from '../../utils/compactDataCodec';
import { buildDirectionsTriggerHref } from '../journeyService';
import {
  buildMetricGuideHref,
  findFocusedEntryInCorpus,
  formatSlugFallbackTitle,
  isArtificialSpacecraftEntry,
  resolveEntryCategory,
  resolveResultDisplayTitle,
  resolveReticleType,
  toUrlSlug,
} from '../searchService';
import {
  buildIntrinsicSystemSummary,
  buildIntrinsicSystemSummarySegments,
  buildPlanetCompositionBreakdown,
  buildPlanetCompositionSummary,
  classifyExoplanetComposition,
  decodePlanetHazards,
  decodeSystemHazards,
  formatDiskKindLabel,
  formatHazardSummaryLabel,
  isDwarfPlanetInDisk,
  isExoplanetHabitableCandidate,
  resolveCorpusEntryComposition,
  resolveFocusedCanonAnnotations,
  resolveMinorBodyCategoryLabel,
  toCoordinatesTuple,
} from './hazardsAndComposition';
import {
  buildCenterEntityHref,
  buildPlanetDetailsHref,
  buildPlanetElementFocusHref,
  buildSystemDetailsHref,
  buildSystemElementFocusHref,
} from './navigationAndCamera';
import type {
  BuildFocusedEntityDetailsInput,
  FocusedDiskDetail,
  FocusedEntityDetails,
  FocusedEntityDetailsBase,
  FocusedEntityKind,
  FocusedPlanetDetail,
  FocusedStarDetail,
  MinorBodyClassification,
  PlanetCompositionClass,
  StructureSymbolType,
  SystemElementBodyItem,
  SystemElementCategoryKey,
} from './types';

export const resolveStructureSymbolType = (structureType?: string): StructureSymbolType => {
  if (!structureType) return 'stellar-cluster';
  const lower = structureType.toLowerCase();
  if (lower.includes('pulsar')) return 'neutron-star';
  if (lower.includes('supernova') || lower.includes('remnant')) return 'supernova-remnant';
  if (lower.includes('interstellar') || lower.includes('ism')) return 'ism';
  if (lower.includes('nebula')) return 'nebula';
  return 'stellar-cluster';
};

export const mapManifestToStarsAndPlanets = (
  manifest: SystemManifest,
  systemNameOrId: string,
): {
  readonly stars: readonly FocusedStarDetail[];
  readonly planets: readonly FocusedPlanetDetail[];
  readonly disks: readonly FocusedDiskDetail[];
} => {
  const stars: FocusedStarDetail[] = manifest.stars.map((s) => ({
    id: s.id,
    name: s.name,
    href: buildSystemElementFocusHref(systemNameOrId, s.name || s.id),
    componentDesignation: s.componentDesignation ?? 'A',
    spectralType: s.spectralType,
    mag: s.mag,
    absmag: s.absmag,
    ...(s.massMsun !== undefined ? { massMsun: s.massMsun } : {}),
    ...(s.radiusRsun !== undefined ? { radiusRsun: s.radiusRsun } : {}),
    ...(s.luminosityLsun !== undefined
      ? { luminosityLsun: s.luminosityLsun }
      : {}),
    ...(s.effectiveTempK !== undefined
      ? { effectiveTempK: s.effectiveTempK }
      : {}),
  }));

  const sortedPlanets = [...manifest.planets].sort(
    (a, b) =>
      (a.orbit?.semiMajorAxis ?? Number.POSITIVE_INFINITY) -
      (b.orbit?.semiMajorAxis ?? Number.POSITIVE_INFINITY),
  );

  const planets: FocusedPlanetDetail[] = sortedPlanets.map((p) => {
    const composition = classifyExoplanetComposition(p);
    const surfaceGravityG =
      p.surfaceGravityG ?? computePlanetSurfaceGravityG(p);
    const isTidallyLocked =
      p.orbit !== undefined
        ? isPlanetTidallyLocked({
            periodDays: p.orbit.periodDays,
            semiMajorAxisAu: p.orbit.semiMajorAxis,
          })
        : false;
    const effectiveHazardMask =
      p.hazardMask ??
      computePlanetHazardMask({
        equilibriumTempK: p.equilibriumTempK,
        surfaceGravityG,
        periodDays: p.orbit?.periodDays,
        semiMajorAxisAu: p.orbit?.semiMajorAxis,
        eccentricity: p.orbit?.eccentricity,
      });
    const hazards = decodePlanetHazards(effectiveHazardMask);

    return {
      id: p.id,
      name: p.name,
      href: buildSystemElementFocusHref(systemNameOrId, p.name || p.id),
      ...(p.letter ? { letter: p.letter } : {}),
      composition,
      ...(p.orbit?.semiMajorAxis !== undefined
        ? { semiMajorAxisAu: p.orbit.semiMajorAxis }
        : {}),
      ...(p.orbit?.periodDays !== undefined
        ? { periodDays: p.orbit.periodDays }
        : {}),
      ...(p.orbit?.eccentricity !== undefined
        ? { eccentricity: p.orbit.eccentricity }
        : {}),
      ...(p.orbit?.inclination !== undefined
        ? { inclinationDeg: p.orbit.inclination }
        : {}),
      ...(p.massMearth !== undefined ? { massMearth: p.massMearth } : {}),
      ...(p.radiusRearth !== undefined ? { radiusRearth: p.radiusRearth } : {}),
      ...(p.equilibriumTempK !== undefined
        ? { equilibriumTempK: p.equilibriumTempK }
        : {}),
      ...(p.esi !== undefined ? { esi: p.esi } : {}),
      ...(surfaceGravityG !== undefined ? { surfaceGravityG } : {}),
      ...(isTidallyLocked ? { isTidallyLocked } : {}),
      ...(p.discoveryYear !== undefined
        ? { discoveryYear: p.discoveryYear }
        : {}),
      ...(p.discoveryMethod ? { discoveryMethod: p.discoveryMethod } : {}),
      isHabitableCandidate: isExoplanetHabitableCandidate(p),
      hazardCount: hazards.length,
      hazards,
    };
  });

  const disks: FocusedDiskDetail[] = (manifest.disks ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    kind: d.kind,
    kindLabel: formatDiskKindLabel(d.kind),
    href: buildSystemElementFocusHref(systemNameOrId, d.name || d.id),
    innerRadiusAu: d.innerRadiusAu,
    outerRadiusAu: d.outerRadiusAu,
    semiMajorAxisAu:
      d.semiMajorAxisAu ?? (d.innerRadiusAu + d.outerRadiusAu) / 2,
    ...(d.tempK !== undefined ? { tempK: d.tempK } : {}),
    composition: d.composition,
    ...(d.confidence ? { confidence: d.confidence } : {}),
    guideHref: buildMetricGuideHref('semi-major-axis'),
  }));

  return { stars, planets, disks };
};

const resolveOrbitingBodies = (
  planetTargetSlugs: ReadonlySet<string>,
  _systemNameOrId: string,
  corpus: readonly CompactSearchEntry[],
  urlPlanetSlug?: string | null,
): readonly SystemElementBodyItem[] => {
  if (planetTargetSlugs.size === 0 || corpus.length === 0) {
    return [];
  }
  const items: SystemElementBodyItem[] = [];
  for (const entry of corpus) {
    if (!entry.o) {
      continue;
    }
    const parentSlug = toUrlSlug(entry.o);
    if (!planetTargetSlugs.has(parentSlug)) {
      continue;
    }
    const name = resolveResultDisplayTitle(entry);
    const parentPlanetSlug = urlPlanetSlug || parentSlug;
    const isMoon = entry.k === 3;
    const isDwarf = entry.k === 4;
    const isSpacecraft = isArtificialSpacecraftEntry(entry);
    const categoryKey: SystemElementCategoryKey = isMoon
      ? 'moon'
      : isDwarf
        ? 'dwarf-planet'
        : isSpacecraft
          ? 'spacecraft'
          : 'asteroid';

    items.push({
      id: entry.i,
      name,
      href: buildPlanetElementFocusHref(parentPlanetSlug, name || entry.i),
      categoryKey,
      categoryLabel: resolveMinorBodyCategoryLabel(entry),
    });
  }
  return items;
};

/**
 * Pure domain builder that assembles a single `FocusedEntityDetails` discriminated union
 * for decomposition by `<DetailsPanel>` across its 3 detents (`Peek`, `Partial`, `Full`).
 * Returns `null` when nothing is focused.
 */
export const buildFocusedEntityDetails = (
  input: BuildFocusedEntityDetailsInput,
): FocusedEntityDetails | null => {
  const {
    focusedEntity,
    corpus = [],
    summaryNode,
    systemDetail,
    entityDetail,
    canonRecords = [],
    canonOrderOptions,
    urlSystemSlug,
    urlPlanetSlug,
    urlFocusSlug,
    hasExplicitFocus = false,
    viewScope: inputViewScope,
    currentPathname,
    currentSearch,
  } = input;

  if (!focusedEntity && !urlSystemSlug && !urlFocusSlug) {
    return null;
  }

  const matchedCorpusEntry = focusedEntity
    ? findFocusedEntryInCorpus(focusedEntity.id, corpus)
    : undefined;
  const urlMatchedSystemEntry = urlSystemSlug
    ? findFocusedEntryInCorpus(urlSystemSlug, corpus)
    : undefined;

  const sysManifest =
    systemDetail?.kind === 'system'
      ? systemDetail.record
      : entityDetail?.kind === 'system'
        ? entityDetail.record
        : undefined;

  const structureRecord =
    entityDetail?.kind === 'structure'
      ? entityDetail.record
      : systemDetail?.kind === 'structure'
        ? systemDetail.record
        : undefined;

  const solarBodyRecord =
    entityDetail?.kind === 'solar-body'
      ? entityDetail.record
      : systemDetail?.kind === 'solar-body'
        ? systemDetail.record
        : undefined;

  const systemId =
    matchedCorpusEntry?.s ??
    (summaryNode ? summaryNode.id : undefined) ??
    (sysManifest ? sysManifest.id : undefined) ??
    urlMatchedSystemEntry?.s ??
    urlMatchedSystemEntry?.i ??
    (focusedEntity ? focusedEntity.id : (urlSystemSlug ?? ''));

  const matchedSystemEntry =
    systemId && focusedEntity && systemId !== focusedEntity.id
      ? findFocusedEntryInCorpus(systemId, corpus)
      : matchedCorpusEntry && resolveEntryCategory(matchedCorpusEntry) === 'stars'
        ? matchedCorpusEntry
        : (urlMatchedSystemEntry ??
          (systemId ? findFocusedEntryInCorpus(systemId, corpus) : undefined));

  const systemName =
    sysManifest?.name ??
    summaryNode?.name ??
    (matchedSystemEntry
      ? resolveResultDisplayTitle(matchedSystemEntry)
      : systemId && (!focusedEntity || systemId !== focusedEntity.id)
        ? formatSlugFallbackTitle(systemId)
        : (focusedEntity?.name ?? 'System'));

  let stars: readonly FocusedStarDetail[] = [];
  let planets: readonly FocusedPlanetDetail[] = [];
  let disks: readonly FocusedDiskDetail[] = [];

  if (sysManifest) {
    const mapped = mapManifestToStarsAndPlanets(
      sysManifest,
      systemName || systemId,
    );
    stars = mapped.stars;
    planets = mapped.planets;
    disks = mapped.disks;
  } else {
    const fallbackSpectral =
      focusedEntity?.spectralType ??
      summaryNode?.spect ??
      matchedSystemEntry?.m?.[1] ??
      matchedCorpusEntry?.m?.[1];

    if (fallbackSpectral && fallbackSpectral !== 'Unknown') {
      stars = [
        {
          id: `${systemId}-A`,
          name: systemName,
          href: buildSystemElementFocusHref(
            systemName || systemId,
            systemName || `${systemId}-A`,
          ),
          componentDesignation: 'A',
          spectralType: fallbackSpectral,
          mag: summaryNode?.mag ?? matchedSystemEntry?.m?.[0] ?? 0,
          absmag: summaryNode?.absmag ?? 0,
        },
      ];
    }

    const corpusPlanets: FocusedPlanetDetail[] = [];
    for (const entry of corpus) {
      if (entry.k === 2 && entry.s === systemId) {
        const planetName = resolveResultDisplayTitle(entry);
        const hazards = entry.H !== undefined ? decodePlanetHazards(entry.H) : undefined;
        corpusPlanets.push({
          id: entry.i,
          name: planetName,
          href: buildSystemElementFocusHref(
            systemName || systemId,
            planetName || entry.i,
          ),
          composition: resolveCorpusEntryComposition(entry),
          isHabitableCandidate: entry.z === 1,
          ...(hazards !== undefined
            ? { hazards, hazardCount: hazards.length }
            : {}),
        });
      }
    }
    planets = corpusPlanets;
  }

  const effectiveFocusSlug = urlFocusSlug ? toUrlSlug(urlFocusSlug) : '';
  const focusIdSlug = focusedEntity ? toUrlSlug(focusedEntity.id) : effectiveFocusSlug;
  const focusNameSlug = focusedEntity ? toUrlSlug(focusedEntity.name) : '';

  const matchedPlanetDetail = (focusedEntity || effectiveFocusSlug)
    ? planets.find((p) => {
        const pId = toUrlSlug(p.id);
        const pName = toUrlSlug(p.name);
        return (
          pId === focusIdSlug ||
          pName === focusIdSlug ||
          (focusNameSlug.length > 0 &&
            (pId === focusNameSlug || pName === focusNameSlug)) ||
          (effectiveFocusSlug.length > 0 &&
            (pId === effectiveFocusSlug || pName === effectiveFocusSlug))
        );
      })
    : undefined;

  const matchedStarDetail = (focusedEntity || effectiveFocusSlug)
    ? stars.find((s) => {
        const sId = toUrlSlug(s.id);
        const sName = toUrlSlug(s.name);
        return (
          sId === focusIdSlug ||
          sName === focusIdSlug ||
          (focusNameSlug.length > 0 &&
            (sId === focusNameSlug || sName === focusNameSlug)) ||
          (effectiveFocusSlug.length > 0 &&
            (sId === effectiveFocusSlug || sName === effectiveFocusSlug))
        );
      })
    : undefined;

  const matchedDiskDetail = (focusedEntity || effectiveFocusSlug)
    ? disks.find((d) => {
        const dId = toUrlSlug(d.id);
        const dName = toUrlSlug(d.name);
        return (
          dId === focusIdSlug ||
          dName === focusIdSlug ||
          (focusNameSlug.length > 0 &&
            (dId === focusNameSlug || dName === focusNameSlug)) ||
          (effectiveFocusSlug.length > 0 &&
            (dId === effectiveFocusSlug || dName === effectiveFocusSlug))
        );
      })
    : undefined;

  const focusedKind: FocusedEntityKind = matchedDiskDetail
    ? 'belt'
    : !focusedEntity
      ? 'system'
      : structureRecord ||
        matchedCorpusEntry?.k === 5 ||
        focusedEntity.classification === 'stellar-cluster'
        ? 'structure'
        : matchedPlanetDetail ||
          matchedCorpusEntry?.k === 2 ||
          solarBodyRecord?.classification === 'Planet'
        ? 'planet'
        : matchedCorpusEntry &&
            (matchedCorpusEntry.k === 3 ||
              matchedCorpusEntry.k === 4 ||
              matchedCorpusEntry.k === 6)
          ? 'minor-body'
          : (matchedStarDetail || solarBodyRecord?.classification === 'Star') &&
              ((hasExplicitFocus && Boolean(urlSystemSlug)) || focusedEntity.id !== systemId)
            ? 'star'
            : 'system';

  const resolvedName =
    matchedDiskDetail?.name ??
    matchedPlanetDetail?.name ??
    (focusedKind === 'star' && matchedStarDetail && matchedStarDetail.name !== systemName
      ? matchedStarDetail.name
      : undefined) ??
    (focusedEntity ? focusedEntity.name : systemName);

  const spectralType =
    (focusedKind === 'star' && matchedStarDetail
      ? matchedStarDetail.spectralType
      : undefined) ??
    focusedEntity?.spectralType ??
    sysManifest?.stars[0]?.spectralType ??
    summaryNode?.spect ??
    matchedSystemEntry?.m?.[1] ??
    matchedCorpusEntry?.m?.[1];

  const planetComposition: PlanetCompositionClass =
    matchedPlanetDetail?.composition ??
    resolveCorpusEntryComposition(matchedCorpusEntry);

  const planetIsHabitable = Boolean(
    matchedPlanetDetail?.isHabitableCandidate || matchedCorpusEntry?.z === 1,
  );

  const planetTargetSlugs = new Set<string>(
    [
      focusIdSlug,
      focusNameSlug,
      effectiveFocusSlug,
      matchedPlanetDetail ? toUrlSlug(matchedPlanetDetail.id) : '',
      matchedPlanetDetail ? toUrlSlug(matchedPlanetDetail.name) : '',
    ].filter((s) => s.length > 0),
  );

  const resolveDiskResidentBodies = (
    disk: FocusedDiskDetail,
    systemNameOrId: string,
    corpusEntries: readonly CompactSearchEntry[],
    urlPlanet?: string | null,
  ): readonly SystemElementBodyItem[] => {
    const items: SystemElementBodyItem[] = [];
    for (const entry of corpusEntries) {
      if (entry.s !== systemId) continue;
      if (entry.o) continue;
      if (entry.k !== 4 && entry.k !== 6) continue;
      if (isDwarfPlanetInDisk(entry, disk)) {
        const name = resolveResultDisplayTitle(entry);
        const isSpacecraft = isArtificialSpacecraftEntry(entry);
        const categoryKey: SystemElementCategoryKey = entry.k === 4
          ? 'dwarf-planet'
          : isSpacecraft
            ? 'spacecraft'
            : 'asteroid';

        items.push({
          id: entry.i,
          name,
          href: urlPlanet
            ? buildPlanetElementFocusHref(urlPlanet, name || entry.i)
            : buildSystemElementFocusHref(systemNameOrId, name || entry.i),
          categoryKey,
          categoryLabel: resolveMinorBodyCategoryLabel(entry),
        });
      }
    }
    return items;
  };

  const orbitingBodies: readonly SystemElementBodyItem[] =
    focusedKind === 'belt' && matchedDiskDetail
      ? resolveDiskResidentBodies(
          matchedDiskDetail,
          systemName || systemId,
          corpus,
          urlPlanetSlug,
        )
      : focusedKind === 'planet' || focusedKind === 'minor-body'
        ? resolveOrbitingBodies(
            planetTargetSlugs,
            systemName || systemId,
            corpus,
            urlPlanetSlug,
          )
        : [];

  const minorBodyCategoryLabel =
    focusedKind === 'minor-body'
      ? resolveMinorBodyCategoryLabel(matchedCorpusEntry)
      : undefined;

  const minorBodyParentName =
    focusedKind === 'minor-body'
      ? solarBodyRecord?.parentBodyId
        ? formatSlugFallbackTitle(solarBodyRecord.parentBodyId)
        : matchedCorpusEntry?.o
          ? formatSlugFallbackTitle(matchedCorpusEntry.o)
          : systemName
      : undefined;

  const reticleType: CelestialClassification =
    focusedKind === 'belt'
      ? 'terrestrial'
      : focusedKind === 'planet'
        ? planetComposition
        : ((focusedEntity?.classification as CelestialClassification | undefined) ??
          (matchedCorpusEntry
            ? resolveReticleType(matchedCorpusEntry)
            : 'stellar-system'));

  const starCount =
    focusedKind === 'structure'
      ? 0
      : sysManifest && sysManifest.stars.length > 0
        ? sysManifest.stars.length
        : (summaryNode?.starCount ?? 1);

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

  const isChildEntity =
    (focusedEntity ? focusedEntity.id !== systemId : false) ||
    focusedKind === 'planet' ||
    focusedKind === 'minor-body' ||
    focusedKind === 'belt';

  const summaryInput = {
    name: resolvedName,
    systemName,
    isChildEntity,
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

  const coordinatesPc: readonly [number, number, number] =
    sysManifest && Number.isFinite(sysManifest.x)
      ? [sysManifest.x, sysManifest.y, sysManifest.z]
      : summaryNode && Number.isFinite(summaryNode.x)
        ? [summaryNode.x, summaryNode.y, summaryNode.z]
        : structureRecord && Number.isFinite(structureRecord.x)
          ? [structureRecord.x, structureRecord.y, structureRecord.z]
          : toCoordinatesTuple(focusedEntity?.position ?? [0, 0, 0]);

  const sectorId =
    sysManifest?.sectorId ??
    summaryNode?.sectorId ??
    formatSectorId(coordinatesPc[0], coordinatesPc[1], coordinatesPc[2]);

  const resolvedTargetId = matchedDiskDetail?.id ?? focusedEntity?.id ?? systemId;

  const canonAnnotations = resolveFocusedCanonAnnotations(
    resolvedTargetId,
    systemId,
    canonRecords,
    canonOrderOptions,
    corpus,
  );

  const precalculatedMask =
    matchedSystemEntry?.g ??
    (matchedCorpusEntry && resolveEntryCategory(matchedCorpusEntry) === 'stars'
      ? matchedCorpusEntry.g
      : undefined);

  const precalculatedTags =
    sysManifest?.tags ??
    summaryNode?.tags ??
    (precalculatedMask !== undefined
      ? decodeTagsMask(precalculatedMask)
      : undefined);

  const fallbackTags: string[] = [];
  if (!precalculatedTags && focusedKind !== 'structure') {
    const isHomeSystem =
      matchedSystemEntry?.h === 1 || matchedCorpusEntry?.h === 1;
    if (isHomeSystem) {
      fallbackTags.push('HomeSystem');
    }
    const [cx, cy, cz] = coordinatesPc;
    const distPc = Math.sqrt(cx * cx + cy * cy + cz * cz);
    if ((distPc > 0 && distPc <= 10) || isHomeSystem) {
      fallbackTags.push('SolarNeighborhood10pc');
    }
    const apparentMag = matchedSystemEntry?.m?.[0] ?? matchedCorpusEntry?.m?.[0];
    if (apparentMag !== undefined && apparentMag <= 6.5) {
      fallbackTags.push('NakedEye');
    }
    if (planetCount > 0) {
      fallbackTags.push('ExoplanetHost');
    }
    if (hasHabitableCandidate) {
      fallbackTags.push('HabitableCandidate');
    }
  }

  const baseTags = precalculatedTags ? [...precalculatedTags] : fallbackTags;
  if (
    hasHabitableCandidate &&
    !baseTags.includes('HabitableCandidate')
  ) {
    baseTags.push('HabitableCandidate');
  }
  const tags = baseTags;

  const viewScope: 'galaxy' | 'system' | 'planet' =
    inputViewScope ??
    (urlPlanetSlug
      ? 'planet'
      : urlSystemSlug
        ? 'system'
        : 'galaxy');
  const scopeTargetId = urlPlanetSlug ?? urlSystemSlug ?? resolvedTargetId;
  const centerHref = buildCenterEntityHref(
    viewScope,
    scopeTargetId,
    resolvedTargetId,
  );

  let systemDetailsHref: string | undefined;
  if (focusedKind === 'system' && viewScope === 'galaxy') {
    systemDetailsHref = buildSystemDetailsHref(systemName || systemId);
  } else if (
    focusedKind === 'planet' &&
    (viewScope === 'galaxy' || viewScope === 'system')
  ) {
    systemDetailsHref = buildPlanetDetailsHref(
      resolvedName || resolvedTargetId,
    );
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

  const rawSystemHazardMask =
    sysManifest?.hazardMask ??
    summaryNode?.hazardMask ??
    matchedSystemEntry?.H ??
    (matchedCorpusEntry && resolveEntryCategory(matchedCorpusEntry) === 'stars'
      ? matchedCorpusEntry.H
      : undefined);

  const effectiveSystemHazardMask =
    rawSystemHazardMask ??
    computeSystemHazardMask({
      spect: spectralType,
      tags,
    });

  const systemHazards = decodeSystemHazards(effectiveSystemHazardMask);

  const fallbackSemiMajorAxis = solarBodyRecord?.orbit?.semiMajorAxis;
  const fallbackPeriodDays = solarBodyRecord?.orbit?.periodDays;
  const fallbackEccentricity = solarBodyRecord?.orbit?.eccentricity;
  const fallbackInclination = solarBodyRecord?.orbit?.inclination;

  const semiMajorAxisAu =
    matchedPlanetDetail?.semiMajorAxisAu ?? fallbackSemiMajorAxis;
  const periodDays =
    matchedPlanetDetail?.periodDays ?? fallbackPeriodDays;
  const eccentricity =
    matchedPlanetDetail?.eccentricity ?? fallbackEccentricity;
  const inclinationDeg =
    matchedPlanetDetail?.inclinationDeg ?? fallbackInclination;

  const surfaceGravityG =
    matchedPlanetDetail?.surfaceGravityG ??
    (solarBodyRecord && solarBodyRecord.massKg && solarBodyRecord.meanRadiusKm
      ? computePlanetSurfaceGravityG({
          massMearth: solarBodyRecord.massKg / 5.97237e24,
          radiusRearth: solarBodyRecord.meanRadiusKm / 6371.0,
        })
      : computePlanetSurfaceGravityG({
          massMearth: matchedPlanetDetail?.massMearth,
          radiusRearth: matchedPlanetDetail?.radiusRearth,
        }));

  const isTidallyLocked =
    matchedPlanetDetail?.isTidallyLocked ??
    isPlanetTidallyLocked({
      periodDays,
      semiMajorAxisAu,
    });

  const esi =
    matchedPlanetDetail?.esi ??
    (matchedPlanetDetail?.radiusRearth && matchedPlanetDetail?.equilibriumTempK
      ? Math.round(
          Math.sqrt(
            Math.max(
              0,
              (1 - Math.abs((matchedPlanetDetail.radiusRearth - 1) / (matchedPlanetDetail.radiusRearth + 1))) *
                (1 - Math.abs((matchedPlanetDetail.equilibriumTempK - 288) / (matchedPlanetDetail.equilibriumTempK + 288))),
            ),
          ) * 100,
        ) / 100
      : undefined);

  const computedPlanetHazardMask =
    matchedCorpusEntry?.H ??
    computePlanetHazardMask({
      equilibriumTempK: matchedPlanetDetail?.equilibriumTempK,
      surfaceGravityG,
      periodDays,
      semiMajorAxisAu,
      eccentricity,
    });

  const planetHazards =
    matchedPlanetDetail?.hazards && matchedPlanetDetail.hazards.length > 0
      ? matchedPlanetDetail.hazards
      : decodePlanetHazards(computedPlanetHazardMask);

  const hazards =
    focusedKind === 'planet'
      ? [...systemHazards, ...planetHazards]
      : focusedKind === 'system' || focusedKind === 'star' || focusedKind === 'minor-body' || focusedKind === 'belt'
        ? systemHazards
        : [];

  const hazardCount = hazards.length;
  const hazardSummaryLabel = formatHazardSummaryLabel(hazardCount);

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

  if (focusedKind === 'star') {
    const starSource = matchedStarDetail ?? stars[0];
    return {
      ...baseDetails,
      focusedKind: 'star',
      starTelemetry: starSource
        ? {
            componentDesignation: starSource.componentDesignation,
            spectralType: starSource.spectralType,
            mag: starSource.mag,
            absmag: starSource.absmag,
            ...(starSource.massMsun !== undefined
              ? { massMsun: starSource.massMsun }
              : {}),
            ...(starSource.radiusRsun !== undefined
              ? { radiusRsun: starSource.radiusRsun }
              : {}),
            ...(starSource.luminosityLsun !== undefined
              ? { luminosityLsun: starSource.luminosityLsun }
              : {}),
            ...(starSource.effectiveTempK !== undefined
              ? { effectiveTempK: starSource.effectiveTempK }
              : {}),
          }
        : {
            componentDesignation: 'A',
            spectralType: spectralType ?? 'G2V',
            mag: summaryNode?.mag ?? 0,
            absmag: summaryNode?.absmag ?? 0,
          },
    };
  }

  if (focusedKind === 'planet') {
    return {
      ...baseDetails,
      focusedKind: 'planet',
      orbitingBodies,
      planetTelemetry: {
        composition: planetComposition,
        isHabitableCandidate: planetIsHabitable,
        ...(semiMajorAxisAu !== undefined ? { semiMajorAxisAu } : {}),
        ...(periodDays !== undefined ? { periodDays } : {}),
        ...(eccentricity !== undefined ? { eccentricity } : {}),
        ...(inclinationDeg !== undefined ? { inclinationDeg } : {}),
        ...(matchedPlanetDetail?.massMearth !== undefined
          ? { massMearth: matchedPlanetDetail.massMearth }
          : {}),
        ...(matchedPlanetDetail?.radiusRearth !== undefined
          ? { radiusRearth: matchedPlanetDetail.radiusRearth }
          : {}),
        ...(matchedPlanetDetail?.equilibriumTempK !== undefined
          ? { equilibriumTempK: matchedPlanetDetail.equilibriumTempK }
          : {}),
        ...(esi !== undefined ? { esi } : {}),
        ...(surfaceGravityG !== undefined ? { surfaceGravityG } : {}),
        isTidallyLocked,
        ...(matchedPlanetDetail?.discoveryYear !== undefined
          ? { discoveryYear: matchedPlanetDetail.discoveryYear }
          : {}),
        ...(matchedPlanetDetail?.discoveryMethod
          ? { discoveryMethod: matchedPlanetDetail.discoveryMethod }
          : {}),
        hazardCount: hazards.length,
        hazards,
      },
    };
  }

  if (focusedKind === 'belt') {
    const diskSource = matchedDiskDetail ?? disks[0];
    return {
      ...baseDetails,
      focusedKind: 'belt',
      orbitingBodies,
      diskTelemetry: {
        classification: diskSource?.kind ?? 'debris-disk',
        classificationLabel: diskSource?.kindLabel ?? 'Circumstellar Disk',
        innerRadiusAu: diskSource?.innerRadiusAu ?? 0,
        outerRadiusAu: diskSource?.outerRadiusAu ?? 0,
        semiMajorAxisAu: diskSource?.semiMajorAxisAu ?? 0,
        ...(diskSource?.tempK !== undefined ? { tempK: diskSource.tempK } : {}),
        composition: diskSource?.composition ?? 'Silicates & dust',
        ...(diskSource?.confidence ? { confidence: diskSource.confidence } : {}),
      },
    };
  }

  if (focusedKind === 'minor-body') {
    const isSpacecraft = matchedCorpusEntry ? isArtificialSpacecraftEntry(matchedCorpusEntry) : false;
    const isMoon = matchedCorpusEntry?.k === 3 || minorBodyCategoryLabel === 'Moon';
    const isDwarf = matchedCorpusEntry?.k === 4 || minorBodyCategoryLabel === 'Dwarf Planet';
    const isComet = minorBodyCategoryLabel === 'Comet';
    const classification: MinorBodyClassification = isMoon
      ? 'moon'
      : isDwarf
        ? 'dwarf-planet'
        : isSpacecraft
          ? 'construct'
          : isComet
            ? 'comet'
            : 'asteroid';

    return {
      ...baseDetails,
      focusedKind: 'minor-body',
      minorBodyTelemetry: {
        classification,
        categoryLabel: minorBodyCategoryLabel ?? resolveMinorBodyCategoryLabel(matchedCorpusEntry),
        parentBodyName: minorBodyParentName ?? systemName,
      },
    };
  }

  if (focusedKind === 'structure') {
    return {
      ...baseDetails,
      focusedKind: 'structure',
      structureTelemetry: {
        structureType: structureRecord?.type ?? 'Galactic Structure',
        symbolType: resolveStructureSymbolType(structureRecord?.type),
        ...(structureRecord?.radiusPc !== undefined
          ? { radiusPc: structureRecord.radiusPc }
          : {}),
      },
    };
  }

  return {
    ...baseDetails,
    focusedKind: 'system',
  };
};

const BENCHMARK_SOL_MANIFEST: SystemManifest = {
  id: 'sol',
  name: 'Sol',
  properName: 'Sun',
  x: 0,
  y: 0,
  z: 0,
  dist: 0,
  sectorId: 'sector_+000_+000_+000',
  stars: [
    {
      id: 'sol-A',
      name: 'Sol',
      componentDesignation: 'A',
      spectralType: 'G2V',
      mag: -26.74,
      absmag: 4.83,
      luminosityLsun: 1.0,
      massMsun: 1.0,
      radiusRsun: 1.0,
      effectiveTempK: 5778,
    },
  ],
  planets: [
    {
      id: 'earth',
      name: 'Earth',
      letter: 'd',
      composition: 'terrestrial',
      massMearth: 1.0,
      radiusRearth: 1.0,
      equilibriumTempK: 255,
      isHabitableCandidate: true,
      orbit: {
        semiMajorAxis: 1.0,
        eccentricity: 0.0167,
        inclination: 0.0,
        ascendingNode: 0.0,
        argumentOfPeriapsis: 102.9,
        meanAnomaly: 100.46,
        periodDays: 365.256,
      },
    },
  ],
};

const BENCHMARK_TAU_CETI_MANIFEST: SystemManifest = {
  id: 'tau-ceti',
  name: 'Tau Ceti',
  properName: 'Tau Ceti',
  x: 3.154,
  y: 1.539,
  z: -1.002,
  dist: 3.65,
  sectorId: 'sector_+000_+000_-025',
  stars: [
    {
      id: 'tau-ceti-A',
      name: 'Tau Ceti',
      componentDesignation: 'A',
      spectralType: 'G8.5V',
      mag: 3.5,
      absmag: 5.68,
      luminosityLsun: 0.52,
      massMsun: 0.783,
      radiusRsun: 0.793,
      effectiveTempK: 5344,
    },
  ],
  planets: [
    {
      id: 'tau-ceti-e',
      name: 'Tau Ceti e',
      letter: 'e',
      composition: 'terrestrial',
      massMearth: 3.93,
      radiusRearth: 1.81,
      equilibriumTempK: 282,
      isHabitableCandidate: true,
      orbit: {
        semiMajorAxis: 0.538,
        eccentricity: 0.18,
        inclination: 0.0,
        ascendingNode: 0.0,
        argumentOfPeriapsis: 0.0,
        meanAnomaly: 0.0,
        periodDays: 162.87,
      },
    },
  ],
};

/**
 * Context-aware entity details resolver used for telemetry comparisons,
 * fallback guides, and direct entity inspection.
 */
export const getFocusedEntityDetails = (
  focusedEntityId?: string,
): FocusedEntityDetails | null => {
  if (!focusedEntityId) return null;
  const normalized = toUrlSlug(focusedEntityId) || focusedEntityId.trim().toLowerCase();
  if (!normalized) return null;

  // 1. Check in-memory decoded detail cache
  const cached = getCachedDetailRecord(normalized);
  if (cached?.kind === 'system') {
    return buildFocusedEntityDetails({
      focusedEntity: {
        id: cached.record.id,
        name: cached.record.name,
        position: [cached.record.x, cached.record.y, cached.record.z],
        classification: 'star',
      },
      systemDetail: cached,
      urlSystemSlug: cached.record.id,
    });
  }

  // 2. Check benchmark manifests
  const benchmarkManifests: readonly SystemManifest[] = [
    BENCHMARK_SOL_MANIFEST,
    BENCHMARK_TAU_CETI_MANIFEST,
  ];

  for (const manifest of benchmarkManifests) {
    if (toUrlSlug(manifest.id) === normalized || toUrlSlug(manifest.name) === normalized) {
      return buildFocusedEntityDetails({
        focusedEntity: {
          id: manifest.id,
          name: manifest.name,
          position: [manifest.x, manifest.y, manifest.z],
          classification: 'star',
        },
        systemDetail: { kind: 'system', record: manifest },
        urlSystemSlug: manifest.id,
      });
    }

    const matchedStar = manifest.stars.find(
      (s) => toUrlSlug(s.id) === normalized || toUrlSlug(s.name) === normalized,
    );
    if (matchedStar) {
      return buildFocusedEntityDetails({
        focusedEntity: {
          id: matchedStar.id,
          name: matchedStar.name,
          position: [manifest.x, manifest.y, manifest.z],
          classification: 'star',
          spectralType: matchedStar.spectralType,
        },
        systemDetail: { kind: 'system', record: manifest },
        urlSystemSlug: manifest.id,
        hasExplicitFocus: true,
      });
    }

    const matchedPlanet = manifest.planets.find(
      (p) => toUrlSlug(p.id) === normalized || toUrlSlug(p.name) === normalized,
    );
    if (matchedPlanet) {
      return buildFocusedEntityDetails({
        focusedEntity: {
          id: matchedPlanet.id,
          name: matchedPlanet.name,
          position: [manifest.x, manifest.y, manifest.z],
          classification: matchedPlanet.composition ?? 'terrestrial',
        },
        systemDetail: { kind: 'system', record: manifest },
        urlSystemSlug: manifest.id,
        urlPlanetSlug: matchedPlanet.id,
        hasExplicitFocus: true,
      });
    }
  }

  return null;
};
