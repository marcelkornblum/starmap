import type { CelestialClassification } from '../components/canvas/cartography/reticleGeometry';
import type { SpatialEntityDefinition } from '../components/canvas/entity/types';
import type { DecodedDetailRecord } from '../data/detailsRepository';
import type {
  DatasetLayerKind,
  DatasetLayerManifest,
  DatasetLayerTargetType,
  ExoplanetRecord,
  SystemManifest,
  SystemSummaryNode,
} from '../types/astro';
import { formatSectorId } from '../utils/astroMath';
import type { CompactSearchEntry } from '../utils/compactDataCodec';
import {
  SEED_FICTIONAL_CANON_LAYERS,
  resolveEntityLayers,
  resolveSystemLayerEntries,
} from '../utils/datasetLayerCodec';
import {
  buildCanonLayerGalaxyHref,
  findFocusedEntryInCorpus,
  resolveEntryCategory,
  resolveResultDisplayTitle,
  resolveReticleType,
  toUrlSlug,
} from './searchService';

export type PlanetCompositionClass = 'terrestrial' | 'ice-giant' | 'gas-giant';

export interface FocusedStarDetail {
  readonly id: string;
  readonly name: string;
  readonly componentDesignation: string;
  readonly spectralType: string;
  readonly mag: number;
  readonly absmag: number;
  readonly massMsun?: number;
  readonly radiusRsun?: number;
  readonly luminosityLsun?: number;
  readonly effectiveTempK?: number;
}

export interface FocusedPlanetDetail {
  readonly id: string;
  readonly name: string;
  readonly letter?: string;
  readonly composition: PlanetCompositionClass;
  readonly semiMajorAxisAu?: number;
  readonly periodDays?: number;
  readonly eccentricity?: number;
  readonly massMearth?: number;
  readonly radiusRearth?: number;
  readonly equilibriumTempK?: number;
  readonly discoveryYear?: number;
  readonly discoveryMethod?: string;
  readonly isHabitableCandidate: boolean;
}

export interface FocusedCanonAnnotation {
  readonly layerId: string;
  readonly layerTitle: string;
  readonly layerHref: string;
  readonly kind: DatasetLayerKind;
  readonly targetId: string;
  readonly targetType: DatasetLayerTargetType;
  readonly inUniverseName?: string;
  readonly workTitle?: string;
  readonly text: string;
  readonly creator?: string;
  readonly publicationYear?: string;
  readonly tags: readonly string[];
}

export interface CanonAnnotationOrderOptions {
  readonly kindOrder?: readonly DatasetLayerKind[];
  readonly layerIdOrder?: readonly string[];
}

export interface FocusedEntityDetails {
  readonly id: string;
  readonly systemId: string;
  readonly name: string;
  readonly systemName: string;
  // Detent 1: Peek
  readonly spectralType?: string;
  readonly reticleType: CelestialClassification;
  readonly starCount: number;
  readonly planetCount: number;
  readonly planetCompositionSummary: string;
  readonly hasHabitableCandidate: boolean;
  readonly systemSummary: string;
  // Detent 2: Partial
  readonly coordinatesPc: readonly [number, number, number];
  readonly sectorId: string;
  readonly tags: readonly string[];
  readonly systemDetailsHref: string;
  readonly directionsHref: string;
  // Detent 3: Full
  readonly stars: readonly FocusedStarDetail[];
  readonly planets: readonly FocusedPlanetDetail[];
  readonly canonAnnotations: readonly FocusedCanonAnnotation[];
}

export interface BuildFocusedEntityDetailsInput {
  readonly focusedEntity: SpatialEntityDefinition | null | undefined;
  readonly corpus?: readonly CompactSearchEntry[];
  readonly summaryNode?: SystemSummaryNode;
  readonly systemDetail?: DecodedDetailRecord;
  readonly entityDetail?: DecodedDetailRecord;
  readonly activeLayers?: readonly DatasetLayerManifest[];
  readonly canonOrderOptions?: CanonAnnotationOrderOptions;
}

/**
 * Pure classifier mapping a planet's mass ($M_\oplus$) or radius ($R_\oplus$) to its
 * canonical composition class (`terrestrial`, `ice-giant`, or `gas-giant`).
 */
export const classifyExoplanetComposition = (planet: {
  readonly massMearth?: number;
  readonly radiusRearth?: number;
}): PlanetCompositionClass => {
  const mass = planet.massMearth ?? 0;
  const radius = planet.radiusRearth ?? 0;
  if (mass >= 50 || radius >= 6) {
    return 'gas-giant';
  }
  if (mass >= 10 || radius >= 2) {
    return 'ice-giant';
  }
  return 'terrestrial';
};

/**
 * Pure predicate determining whether an exoplanet record falls within the optimistic
 * habitable equilibrium temperature envelope ($200\text{ K} \le T_\text{eq} \le 320\text{ K}$)
 * or has high Earth Similarity Index ($\text{ESI} \ge 0.7$).
 */
export const isExoplanetHabitableCandidate = (
  planet: Pick<ExoplanetRecord, 'equilibriumTempK' | 'esi'>,
): boolean => {
  if (planet.esi !== undefined && planet.esi >= 0.7) {
    return true;
  }
  if (
    planet.equilibriumTempK !== undefined &&
    planet.equilibriumTempK >= 200 &&
    planet.equilibriumTempK <= 320
  ) {
    return true;
  }
  return false;
};

/**
 * Pure formatter building the Peek detent's planet count and composition summary string.
 */
export const buildPlanetCompositionSummary = (
  planets: readonly FocusedPlanetDetail[],
  fallbackCount: number,
  hasHabitableCandidate: boolean,
  fallbackCensus?: readonly PlanetCompositionClass[],
): string => {
  const totalCount = Math.max(planets.length, fallbackCount);
  if (totalCount <= 0) {
    return '0 confirmed planets';
  }

  const countLabel = `${totalCount} ${totalCount === 1 ? 'planet' : 'planets'}`;
  const breakdownParts: string[] = [];

  if (planets.length > 0 && planets.length >= totalCount) {
    const counts: Record<PlanetCompositionClass, number> = {
      terrestrial: 0,
      'ice-giant': 0,
      'gas-giant': 0,
    };
    for (const p of planets) {
      counts[p.composition]++;
    }
    if (counts.terrestrial > 0) {
      breakdownParts.push(`${counts.terrestrial} terrestrial`);
    }
    if (counts['ice-giant'] > 0) {
      breakdownParts.push(`${counts['ice-giant']} ice-giant`);
    }
    if (counts['gas-giant'] > 0) {
      breakdownParts.push(`${counts['gas-giant']} gas-giant`);
    }
  } else if (fallbackCensus && fallbackCensus.length > 0) {
    breakdownParts.push(fallbackCensus.join(', '));
  } else {
    breakdownParts.push('terrestrial');
  }

  if (hasHabitableCandidate) {
    breakdownParts.push('Habitable zone candidate');
  }

  return `${countLabel} (${breakdownParts.join(' · ')})`;
};

/**
 * Pure builder producing the intrinsic system/entity summary prose for the Partial detent.
 * Never includes unprompted Sol distances unless explicitly part of a route calculation.
 */
export const buildIntrinsicSystemSummary = (input: {
  readonly name: string;
  readonly systemName: string;
  readonly isChildEntity: boolean;
  readonly spectralType?: string;
  readonly starCount: number;
  readonly planetCount: number;
  readonly hasHabitableCandidate: boolean;
  readonly manifestOverview?: string;
  readonly structureDescription?: string;
}): string => {
  if (input.manifestOverview && input.manifestOverview.trim().length > 0) {
    return input.manifestOverview.trim();
  }
  if (
    input.structureDescription &&
    input.structureDescription.trim().length > 0
  ) {
    return input.structureDescription.trim();
  }

  const spectPart =
    input.spectralType && input.spectralType !== 'Unknown'
      ? `${input.spectralType} `
      : '';
  const starMultiplicityPart =
    input.starCount > 1
      ? `${input.starCount}-star system`
      : 'stellar system';
  const planetPart =
    input.planetCount > 0
      ? ` hosting ${input.planetCount} confirmed ${input.planetCount === 1 ? 'planet' : 'planets'}`
      : ' with no confirmed exoplanets catalogued';
  const hzPart = input.hasHabitableCandidate
    ? ', including a habitable zone candidate'
    : '';

  if (input.isChildEntity && input.name !== input.systemName) {
    return `${input.name} is a catalogued body in the ${input.systemName} ${spectPart}${starMultiplicityPart}${planetPart}${hzPart}.`;
  }

  return `${input.systemName} is a ${spectPart}${starMultiplicityPart}${planetPart}${hzPart}.`;
};

export const DEFAULT_CANON_LAYER_KIND_ORDER: readonly DatasetLayerKind[] = [
  'scientific-overlay',
  'custom-user',
  'fictional-canon',
];

/**
 * Dedicated hook resolving the numeric sort priority of a dataset layer kind.
 * Defaults to factual/scientific overlays (`scientific-overlay`) first, followed by
 * user-curated (`custom-user`) and fictional (`fictional-canon`) layers.
 */
export const resolveCanonLayerKindPriority = (
  kind: DatasetLayerKind,
  kindOrder: readonly DatasetLayerKind[] = DEFAULT_CANON_LAYER_KIND_ORDER,
): number => {
  const index = kindOrder.indexOf(kind);
  return index >= 0 ? index : kindOrder.length;
};

/**
 * Pure comparator for ordering `FocusedCanonAnnotation` records:
 * 1. Explicit user-curated `layerIdOrder` (when provided)
 * 2. Layer kind priority (`scientific-overlay` factual layers before `fictional-canon` layers)
 * 3. Stable insertion order (preserving direct entity matches before system-wide matches within the same kind)
 */
export const sortCanonAnnotations = (
  annotations: readonly FocusedCanonAnnotation[],
  options?: CanonAnnotationOrderOptions,
): readonly FocusedCanonAnnotation[] => {
  const kindOrder = options?.kindOrder ?? DEFAULT_CANON_LAYER_KIND_ORDER;
  const layerIdOrder = options?.layerIdOrder;

  return annotations
    .map((annotation, index) => ({ annotation, index }))
    .sort((a, b) => {
      if (layerIdOrder && layerIdOrder.length > 0) {
        const rankA = layerIdOrder.indexOf(a.annotation.layerId);
        const rankB = layerIdOrder.indexOf(b.annotation.layerId);
        const normA = rankA >= 0 ? rankA : Number.POSITIVE_INFINITY;
        const normB = rankB >= 0 ? rankB : Number.POSITIVE_INFINITY;
        if (normA !== normB) {
          return normA - normB;
        }
      }

      const kindPriorityA = resolveCanonLayerKindPriority(
        a.annotation.kind,
        kindOrder,
      );
      const kindPriorityB = resolveCanonLayerKindPriority(
        b.annotation.kind,
        kindOrder,
      );
      if (kindPriorityA !== kindPriorityB) {
        return kindPriorityA - kindPriorityB;
      }

      return a.index - b.index;
    })
    .map((entry) => entry.annotation);
};

/**
 * Pure unit function building the URL to the System View for a given star system
 * (`/system/<systemSlug>`, e.g. `/system/tau-ceti`).
 */
export const buildSystemDetailsHref = (systemNameOrId: string): string => {
  const slug = toUrlSlug(systemNameOrId);
  return `/system/${encodeURIComponent(slug || systemNameOrId.trim() || 'sol')}`;
};

/**
 * Pure resolver gathering all canon layer annotations (`FS-001` / `FS-002`) relevant to a focused
 * entity and its host star system, ordered with factual (`scientific-overlay`) layers before
 * fictional (`fictional-canon`) layers and supporting user-curated layer ordering.
 */
export const resolveFocusedCanonAnnotations = (
  targetId: string,
  systemId: string,
  activeLayers: readonly DatasetLayerManifest[] = SEED_FICTIONAL_CANON_LAYERS,
  orderOptions?: CanonAnnotationOrderOptions,
): readonly FocusedCanonAnnotation[] => {
  const layersArray = [...activeLayers];
  const rawTargetKey = targetId.includes(':')
    ? (targetId.split(':')[1] ?? targetId)
    : targetId;

  const directMatches = resolveEntityLayers(rawTargetKey, layersArray);
  const systemMatches = resolveSystemLayerEntries(systemId, layersArray);

  const combined = [...directMatches, ...systemMatches];
  const seen = new Set<string>();
  const annotations: FocusedCanonAnnotation[] = [];

  for (const item of combined) {
    const dedupeKey = `${item.layerId}:${item.entry.targetId}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    annotations.push({
      layerId: item.layerId,
      layerTitle: item.layerTitle,
      layerHref: buildCanonLayerGalaxyHref(item.layerId),
      kind: item.kind,
      targetId: item.entry.targetId,
      targetType: item.entry.targetType,
      ...(item.entry.inUniverseName
        ? { inUniverseName: item.entry.inUniverseName }
        : {}),
      ...(item.entry.workTitle ? { workTitle: item.entry.workTitle } : {}),
      text: item.entry.text,
      ...(item.source?.creator ? { creator: item.source.creator } : {}),
      ...(item.source?.publicationYear
        ? { publicationYear: item.source.publicationYear }
        : {}),
      tags: item.entry.tags ?? [],
    });
  }

  return sortCanonAnnotations(annotations, orderOptions);
};

const toCoordinatesTuple = (
  pos: SpatialEntityDefinition['position'],
): readonly [number, number, number] => {
  if (Array.isArray(pos)) {
    return [pos[0], pos[1], pos[2]];
  }
  return [pos.x, pos.y, pos.z];
};

const mapManifestToStarsAndPlanets = (
  manifest: SystemManifest,
): {
  readonly stars: readonly FocusedStarDetail[];
  readonly planets: readonly FocusedPlanetDetail[];
} => {
  const stars: FocusedStarDetail[] = manifest.stars.map((s) => ({
    id: s.id,
    name: s.name,
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

  const planets: FocusedPlanetDetail[] = sortedPlanets.map((p) => ({
    id: p.id,
    name: p.name,
    ...(p.letter ? { letter: p.letter } : {}),
    composition: classifyExoplanetComposition(p),
    ...(p.orbit?.semiMajorAxis !== undefined
      ? { semiMajorAxisAu: p.orbit.semiMajorAxis }
      : {}),
    ...(p.orbit?.periodDays !== undefined
      ? { periodDays: p.orbit.periodDays }
      : {}),
    ...(p.orbit?.eccentricity !== undefined
      ? { eccentricity: p.orbit.eccentricity }
      : {}),
    ...(p.massMearth !== undefined ? { massMearth: p.massMearth } : {}),
    ...(p.radiusRearth !== undefined ? { radiusRearth: p.radiusRearth } : {}),
    ...(p.equilibriumTempK !== undefined
      ? { equilibriumTempK: p.equilibriumTempK }
      : {}),
    ...(p.discoveryYear !== undefined
      ? { discoveryYear: p.discoveryYear }
      : {}),
    ...(p.discoveryMethod ? { discoveryMethod: p.discoveryMethod } : {}),
    isHabitableCandidate: isExoplanetHabitableCandidate(p),
  }));

  return { stars, planets };
};

/**
 * Pure domain builder that assembles a single `FocusedEntityDetails` object
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
    activeLayers,
    canonOrderOptions,
  } = input;

  if (!focusedEntity) {
    return null;
  }

  const matchedCorpusEntry = findFocusedEntryInCorpus(focusedEntity.id, corpus);
  const systemId =
    matchedCorpusEntry?.s ??
    (summaryNode ? summaryNode.id : undefined) ??
    focusedEntity.id;

  const matchedSystemEntry =
    systemId !== focusedEntity.id
      ? findFocusedEntryInCorpus(systemId, corpus)
      : matchedCorpusEntry && resolveEntryCategory(matchedCorpusEntry) === 'stars'
        ? matchedCorpusEntry
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

  const systemName =
    sysManifest?.name ??
    summaryNode?.name ??
    (matchedSystemEntry
      ? resolveResultDisplayTitle(matchedSystemEntry)
      : systemId === 'sol'
        ? 'Sol'
        : focusedEntity.name);

  const spectralType =
    focusedEntity.spectralType ??
    sysManifest?.stars[0]?.spectralType ??
    summaryNode?.spect ??
    matchedSystemEntry?.m?.[1] ??
    matchedCorpusEntry?.m?.[1];

  const reticleType: CelestialClassification =
    (focusedEntity.classification as CelestialClassification | undefined) ??
    (matchedCorpusEntry
      ? resolveReticleType(matchedCorpusEntry)
      : 'stellar-system');

  let stars: readonly FocusedStarDetail[] = [];
  let planets: readonly FocusedPlanetDetail[] = [];

  if (sysManifest) {
    const mapped = mapManifestToStarsAndPlanets(sysManifest);
    stars = mapped.stars;
    planets = mapped.planets;
  } else {
    // Fallback to corpus child planet entries and primary star entry when manifest shard hasn't loaded yet
    if (spectralType && spectralType !== 'Unknown') {
      stars = [
        {
          id: `${systemId}-A`,
          name: systemName,
          componentDesignation: 'A',
          spectralType,
          mag: summaryNode?.mag ?? matchedSystemEntry?.m?.[0] ?? 0,
          absmag: summaryNode?.absmag ?? 0,
        },
      ];
    }

    const corpusPlanets: FocusedPlanetDetail[] = [];
    for (const entry of corpus) {
      if (entry.k === 2 && entry.s === systemId) {
        corpusPlanets.push({
          id: entry.i,
          name: resolveResultDisplayTitle(entry),
          composition: 'terrestrial',
          isHabitableCandidate: false,
        });
      }
    }
    planets = corpusPlanets;
  }

  const starCount =
    sysManifest && sysManifest.stars.length > 0
      ? sysManifest.stars.length
      : (summaryNode?.starCount ?? 1);

  const fallbackPlanetCount =
    summaryNode?.planetCount ??
    matchedSystemEntry?.m?.[2] ??
    matchedCorpusEntry?.m?.[2] ??
    planets.length;

  const planetCount =
    sysManifest !== undefined ? sysManifest.planets.length : fallbackPlanetCount;

  const hasHabitableCandidate = Boolean(
    summaryNode?.hasHabitableCandidate ||
      matchedSystemEntry?.m?.[3] === 1 ||
      matchedCorpusEntry?.m?.[3] === 1 ||
      planets.some((p) => p.isHabitableCandidate),
  );

  const planetCompositionSummary = buildPlanetCompositionSummary(
    planets,
    planetCount,
    hasHabitableCandidate,
    summaryNode?.planetCensus,
  );

  const isChildEntity = focusedEntity.id !== systemId;

  const systemSummary = buildIntrinsicSystemSummary({
    name: focusedEntity.name,
    systemName,
    isChildEntity,
    spectralType,
    starCount,
    planetCount,
    hasHabitableCandidate,
    manifestOverview: sysManifest?.overviewText,
    structureDescription: structureRecord?.description,
  });

  const systemSlug = toUrlSlug(systemName || systemId);
  const systemDetailsHref = buildSystemDetailsHref(systemName || systemId);
  const directionsHref = `/galaxy/${encodeURIComponent(systemSlug)}?anchor=sol`;

  const coordinatesPc: readonly [number, number, number] = sysManifest
    ? [sysManifest.x, sysManifest.y, sysManifest.z]
    : summaryNode
      ? [summaryNode.x, summaryNode.y, summaryNode.z]
      : toCoordinatesTuple(focusedEntity.position);

  const sectorId =
    sysManifest?.sectorId ??
    summaryNode?.sectorId ??
    formatSectorId(coordinatesPc[0], coordinatesPc[1], coordinatesPc[2]);

  const canonAnnotations = resolveFocusedCanonAnnotations(
    focusedEntity.id,
    systemId,
    activeLayers,
    canonOrderOptions,
  );

  const tags = summaryNode?.tags ?? [];

  return {
    id: focusedEntity.id,
    systemId,
    name: focusedEntity.name,
    systemName,
    ...(spectralType && spectralType !== 'Unknown' ? { spectralType } : {}),
    reticleType,
    starCount,
    planetCount,
    planetCompositionSummary,
    hasHabitableCandidate,
    systemSummary,
    coordinatesPc,
    sectorId,
    tags,
    systemDetailsHref,
    directionsHref,
    stars,
    planets,
    canonAnnotations,
  };
};
