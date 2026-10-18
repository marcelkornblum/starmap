import type { CelestialClassification } from '../components/canvas/cartography/reticleGeometry';
import type { SpatialEntityDefinition } from '../components/canvas/entity/types';
import type { DecodedDetailRecord } from '../data/detailsRepository';
import type { PlanetCompositionClass } from '../data/guideCatalog';
import type {
  DatasetLayerKind,
  DatasetLayerManifest,
  DatasetLayerTargetType,
  ExoplanetRecord,
  SystemManifest,
  SystemSummaryNode,
} from '../types/astro';
import {
  computePlanetCompositionCounts,
  formatSectorId,
  isPlanetHabitableCandidate,
} from '../utils/astroMath';
import {
  decodeTagsMask,
  type CompactSearchEntry,
} from '../utils/compactDataCodec';
import {
  SEED_FICTIONAL_CANON_LAYERS,
  resolveEntityLayers,
  resolveSystemLayerEntries,
} from '../utils/datasetLayerCodec';
import {
  buildCanonLayerGalaxyHref,
  extractUrlPlanetSlug,
  extractUrlSystemSlug,
  findFocusedEntryInCorpus,
  formatSlugFallbackTitle,
  hasExplicitFocusParam,
  isArtificialSpacecraftEntry,
  resolveEntryCategory,
  resolveResultDisplayTitle,
  resolveReticleType,
  toUrlSlug,
} from './searchService';

export type { PlanetCompositionClass };

export type FocusedEntityKind =
  | 'system'
  | 'star'
  | 'planet'
  | 'minor-body'
  | 'structure';

export interface PlanetCompositionCount {
  readonly composition: PlanetCompositionClass;
  readonly count?: number;
}

export type SystemSummarySegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'spectral-badge'; readonly spectralType: string }
  | { readonly kind: 'planet-type-badge'; readonly composition: PlanetCompositionClass }
  | { readonly kind: 'habitable-badge'; readonly label: string };

export interface FocusedStarDetail {
  readonly id: string;
  readonly name: string;
  readonly href?: string;
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
  readonly href?: string;
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

export interface FocusedStarTelemetry {
  readonly componentDesignation: string;
  readonly spectralType: string;
  readonly mag: number;
  readonly absmag: number;
  readonly massMsun?: number;
  readonly radiusRsun?: number;
  readonly luminosityLsun?: number;
  readonly effectiveTempK?: number;
}

export interface FocusedPlanetTelemetry {
  readonly composition: PlanetCompositionClass;
  readonly isHabitableCandidate: boolean;
  readonly semiMajorAxisAu?: number;
  readonly periodDays?: number;
  readonly eccentricity?: number;
  readonly massMearth?: number;
  readonly radiusRearth?: number;
  readonly equilibriumTempK?: number;
  readonly discoveryYear?: number;
  readonly discoveryMethod?: string;
}

export interface FocusedMinorBodyTelemetry {
  readonly categoryLabel: string;
  readonly parentBodyName?: string;
}

export interface FocusedStructureTelemetry {
  readonly structureType: string;
  readonly radiusPc?: number;
  readonly dimensionsPc?: readonly [number, number, number];
}

export interface FocusedEntityDetailsBase {
  readonly id: string;
  readonly systemId: string;
  readonly name: string;
  readonly systemName: string;
  // Detent 1: Peek
  readonly spectralType?: string;
  readonly reticleType: CelestialClassification;
  readonly starCount: number;
  readonly planetCount: number;
  readonly planetCompositionBreakdown: readonly PlanetCompositionCount[];
  readonly planetCompositionSummary: string;
  readonly hasHabitableCandidate: boolean;
  readonly systemSummary: string;
  readonly systemSummarySegments: readonly SystemSummarySegment[];
  // Detent 2: Partial
  readonly coordinatesPc: readonly [number, number, number];
  readonly sectorId: string;
  readonly tags: readonly string[];
  readonly systemDetailsHref: string;
  readonly directionsHref: string;
  // Detent 3: Full
  readonly stars: readonly FocusedStarDetail[];
  readonly planets: readonly FocusedPlanetDetail[];
  readonly orbitingBodies?: readonly SystemElementBodyItem[];
  readonly canonAnnotations: readonly FocusedCanonAnnotation[];
}

export interface FocusedSystemEntityDetails extends FocusedEntityDetailsBase {
  readonly focusedKind: 'system';
  readonly starTelemetry?: undefined;
  readonly planetTelemetry?: undefined;
  readonly minorBodyTelemetry?: undefined;
  readonly structureTelemetry?: undefined;
}

export interface FocusedStarEntityDetails extends FocusedEntityDetailsBase {
  readonly focusedKind: 'star';
  readonly starTelemetry: FocusedStarTelemetry;
  readonly planetTelemetry?: undefined;
  readonly minorBodyTelemetry?: undefined;
  readonly structureTelemetry?: undefined;
}

export interface FocusedPlanetEntityDetails extends FocusedEntityDetailsBase {
  readonly focusedKind: 'planet';
  readonly planetTelemetry: FocusedPlanetTelemetry;
  readonly orbitingBodies: readonly SystemElementBodyItem[];
  readonly starTelemetry?: undefined;
  readonly minorBodyTelemetry?: undefined;
  readonly structureTelemetry?: undefined;
}

export interface FocusedMinorBodyEntityDetails extends FocusedEntityDetailsBase {
  readonly focusedKind: 'minor-body';
  readonly minorBodyTelemetry: FocusedMinorBodyTelemetry;
  readonly starTelemetry?: undefined;
  readonly planetTelemetry?: undefined;
  readonly structureTelemetry?: undefined;
}

export interface FocusedStructureEntityDetails extends FocusedEntityDetailsBase {
  readonly focusedKind: 'structure';
  readonly structureTelemetry: FocusedStructureTelemetry;
  readonly starTelemetry?: undefined;
  readonly planetTelemetry?: undefined;
  readonly minorBodyTelemetry?: undefined;
}

export type FocusedEntityDetails =
  | FocusedSystemEntityDetails
  | FocusedStarEntityDetails
  | FocusedPlanetEntityDetails
  | FocusedMinorBodyEntityDetails
  | FocusedStructureEntityDetails;

export interface SystemElementBodyItem {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly categoryLabel: string;
}

export interface SystemElementsSummary {
  readonly systemId: string;
  readonly systemName: string;
  readonly systemHref: string;
  readonly focusedEntityId?: string;
  readonly stars: readonly FocusedStarDetail[];
  readonly planets: readonly FocusedPlanetDetail[];
  readonly moonsAndDwarfPlanets: readonly SystemElementBodyItem[];
  readonly minorBodiesAndSpacecraft: readonly SystemElementBodyItem[];
  readonly canonAnnotations: readonly FocusedCanonAnnotation[];
}

export interface PlanetaryElementsSummary {
  readonly planetId: string;
  readonly planetName: string;
  readonly planetHref: string;
  readonly systemId: string;
  readonly systemName: string;
  readonly systemHref: string;
  readonly focusedEntityId?: string;
  readonly planetDetail?: FocusedPlanetDetail;
  readonly moons: readonly SystemElementBodyItem[];
  readonly minorBodiesAndSpacecraft: readonly SystemElementBodyItem[];
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
  readonly urlSystemSlug?: string | null;
  readonly urlPlanetSlug?: string | null;
  readonly hasExplicitFocus?: boolean;
}

/**
 * Pure classifier mapping a planet's precalculated composition or mass ($M_\oplus$) / radius ($R_\oplus$)
 * to its canonical composition class (`terrestrial`, `ice-giant`, or `gas-giant`).
 */
export const classifyExoplanetComposition = (planet: {
  readonly massMearth?: number;
  readonly radiusRearth?: number;
  readonly composition?: PlanetCompositionClass;
}): PlanetCompositionClass => {
  if (planet.composition) {
    return planet.composition;
  }
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
 * habitable equilibrium temperature envelope ($180\text{ K} \le T_\text{eq} \le 320\text{ K}$)
 * or (when equilibrium temperature is unavailable) has high Earth Similarity Index ($\text{ESI} \ge 0.7$).
 */
export const isExoplanetHabitableCandidate = (
  planet: Pick<
    ExoplanetRecord,
    'equilibriumTempK' | 'esi' | 'isHabitableCandidate'
  >,
): boolean => isPlanetHabitableCandidate(planet);

/**
 * Pure builder producing the structured planet composition breakdown for the Peek detent.
 * Reads precalculated composition counts `[terrestrial, iceGiant, gasGiant]` when available.
 */
export const buildPlanetCompositionBreakdown = (
  planets: readonly FocusedPlanetDetail[],
  fallbackCount: number,
  fallbackCensus?: readonly PlanetCompositionClass[],
  precalculatedCounts?: readonly [number, number, number],
): readonly PlanetCompositionCount[] => {
  const totalCount = Math.max(planets.length, fallbackCount);
  if (totalCount <= 0) {
    return [];
  }

  const hasPrecalculated =
    precalculatedCounts !== undefined &&
    (precalculatedCounts[0] > 0 ||
      precalculatedCounts[1] > 0 ||
      precalculatedCounts[2] > 0);

  if (hasPrecalculated && precalculatedCounts) {
    const items: PlanetCompositionCount[] = [];
    if (precalculatedCounts[0] > 0) {
      items.push({ composition: 'terrestrial', count: precalculatedCounts[0] });
    }
    if (precalculatedCounts[1] > 0) {
      items.push({ composition: 'ice-giant', count: precalculatedCounts[1] });
    }
    if (precalculatedCounts[2] > 0) {
      items.push({ composition: 'gas-giant', count: precalculatedCounts[2] });
    }
    return items;
  }

  if (planets.length > 0 && planets.length >= totalCount) {
    const [terrestrial, iceGiant, gasGiant] =
      computePlanetCompositionCounts(planets) ?? [0, 0, 0];
    const items: PlanetCompositionCount[] = [];
    if (terrestrial > 0) {
      items.push({ composition: 'terrestrial', count: terrestrial });
    }
    if (iceGiant > 0) {
      items.push({ composition: 'ice-giant', count: iceGiant });
    }
    if (gasGiant > 0) {
      items.push({ composition: 'gas-giant', count: gasGiant });
    }
    return items;
  }

  if (fallbackCensus && fallbackCensus.length > 0) {
    return fallbackCensus.map((composition) => ({ composition }));
  }

  return [{ composition: 'terrestrial' }];
};

/**
 * Pure formatter building the Peek detent's planet count and composition summary string.
 */
export const buildPlanetCompositionSummary = (
  planets: readonly FocusedPlanetDetail[],
  fallbackCount: number,
  hasHabitableCandidate: boolean,
  fallbackCensus?: readonly PlanetCompositionClass[],
  precalculatedCounts?: readonly [number, number, number],
): string => {
  const totalCount = Math.max(planets.length, fallbackCount);
  if (totalCount <= 0) {
    return '0 confirmed planets';
  }

  const countLabel = `${totalCount} ${totalCount === 1 ? 'planet' : 'planets'}`;
  const breakdown = buildPlanetCompositionBreakdown(
    planets,
    fallbackCount,
    fallbackCensus,
    precalculatedCounts,
  );

  const hasNumericCounts = breakdown.some((b) => b.count !== undefined);
  const breakdownParts: string[] = [];

  if (hasNumericCounts) {
    for (const item of breakdown) {
      breakdownParts.push(`${item.count} ${item.composition}`);
    }
  } else if (breakdown.length > 0) {
    breakdownParts.push(breakdown.map((item) => item.composition).join(', '));
  }

  if (hasHabitableCandidate) {
    breakdownParts.push('Habitable zone candidate');
  }

  return `${countLabel} (${breakdownParts.join(' · ')})`;
};

/**
 * Pure builder producing the structured summary segments for the Partial detent,
 * allowing UI components to render spectral-type and habitable-zone badges directly
 * from data without regular expression parsing.
 */
export const buildIntrinsicSystemSummarySegments = (input: {
  readonly name: string;
  readonly systemName: string;
  readonly isChildEntity: boolean;
  readonly focusedKind?: FocusedEntityKind;
  readonly spectralType?: string;
  readonly starCount: number;
  readonly planetCount: number;
  readonly hasHabitableCandidate: boolean;
  readonly planetComposition?: PlanetCompositionClass;
  readonly planetIsHabitable?: boolean;
  readonly orbitingBodyCount?: number;
  readonly minorBodyCategoryLabel?: string;
  readonly minorBodyParentName?: string;
  readonly manifestOverview?: string;
  readonly structureDescription?: string;
}): readonly SystemSummarySegment[] => {
  if (input.focusedKind === 'planet') {
    const composition = input.planetComposition ?? 'terrestrial';
    const count = input.orbitingBodyCount ?? 0;
    const orbitSuffix =
      count > 0
        ? ` with ${count} catalogued ${count === 1 ? 'body' : 'bodies'} in orbit.`
        : '.';
    const segments: SystemSummarySegment[] = [
      { kind: 'text', text: `${input.name} is a ` },
      { kind: 'planet-type-badge', composition },
    ];
    if (input.planetIsHabitable) {
      segments.push({
        kind: 'text',
        text: ` planet orbiting ${input.systemName}, within the `,
      });
      segments.push({
        kind: 'habitable-badge',
        label: 'habitable zone candidate',
      });
      segments.push({ kind: 'text', text: orbitSuffix });
    } else {
      segments.push({
        kind: 'text',
        text: ` planet orbiting ${input.systemName}${orbitSuffix}`,
      });
    }
    return segments;
  }

  if (input.focusedKind === 'minor-body') {
    const catLabel = (input.minorBodyCategoryLabel ?? 'celestial body').toLowerCase();
    const parentName = input.minorBodyParentName ?? input.systemName;
    const count = input.orbitingBodyCount ?? 0;
    const orbitSuffix =
      count > 0
        ? ` with ${count} catalogued ${count === 1 ? 'body' : 'bodies'} in orbit.`
        : '.';
    const text =
      catLabel === 'spacecraft'
        ? `${input.name} is a spacecraft operating in the ${input.systemName} system.`
        : `${input.name} is a ${catLabel} orbiting ${parentName}${orbitSuffix}`;
    return [{ kind: 'text', text }];
  }

  const allowManifestOverview =
    input.focusedKind === undefined || input.focusedKind === 'system';
  const customProse =
    allowManifestOverview &&
    input.manifestOverview &&
    input.manifestOverview.trim().length > 0
      ? input.manifestOverview.trim()
      : input.structureDescription &&
          input.structureDescription.trim().length > 0
        ? input.structureDescription.trim()
        : undefined;

  if (customProse) {
    const hzPhrase = 'habitable zone candidate';
    const lower = customProse.toLowerCase();
    const matchIdx = lower.indexOf(hzPhrase);
    if (matchIdx === -1) {
      return [{ kind: 'text', text: customProse }];
    }
    const before = customProse.slice(0, matchIdx);
    const matchedLabel = customProse.slice(matchIdx, matchIdx + hzPhrase.length);
    const after = customProse.slice(matchIdx + hzPhrase.length);
    const segments: SystemSummarySegment[] = [];
    if (before.length > 0) {
      segments.push({ kind: 'text', text: before });
    }
    segments.push({ kind: 'habitable-badge', label: matchedLabel });
    if (after.length > 0) {
      segments.push({ kind: 'text', text: after });
    }
    return segments;
  }

  const segments: SystemSummarySegment[] = [];
  const prefix =
    input.isChildEntity && input.name !== input.systemName
      ? `${input.name} is a catalogued body in the ${input.systemName} `
      : `${input.systemName} is a `;
  segments.push({ kind: 'text', text: prefix });

  if (input.spectralType && input.spectralType !== 'Unknown') {
    segments.push({
      kind: 'spectral-badge',
      spectralType: input.spectralType,
    });
    segments.push({ kind: 'text', text: ' ' });
  }

  const starMultiplicityPart =
    input.starCount > 1
      ? `${input.starCount}-star system`
      : 'stellar system';
  const planetPart =
    input.planetCount > 0
      ? ` hosting ${input.planetCount} confirmed ${input.planetCount === 1 ? 'planet' : 'planets'}`
      : ' with no confirmed exoplanets catalogued';

  if (input.hasHabitableCandidate) {
    segments.push({
      kind: 'text',
      text: `${starMultiplicityPart}${planetPart}, including a `,
    });
    segments.push({
      kind: 'habitable-badge',
      label: 'habitable zone candidate',
    });
    segments.push({ kind: 'text', text: '.' });
  } else {
    segments.push({
      kind: 'text',
      text: `${starMultiplicityPart}${planetPart}.`,
    });
  }

  return segments;
};

/**
 * Pure builder producing the intrinsic system/entity summary prose for the Partial detent.
 * Never includes unprompted Sol distances unless explicitly part of a route calculation.
 */
export const buildIntrinsicSystemSummary = (input: {
  readonly name: string;
  readonly systemName: string;
  readonly isChildEntity: boolean;
  readonly focusedKind?: FocusedEntityKind;
  readonly spectralType?: string;
  readonly starCount: number;
  readonly planetCount: number;
  readonly hasHabitableCandidate: boolean;
  readonly planetComposition?: PlanetCompositionClass;
  readonly planetIsHabitable?: boolean;
  readonly orbitingBodyCount?: number;
  readonly minorBodyCategoryLabel?: string;
  readonly minorBodyParentName?: string;
  readonly manifestOverview?: string;
  readonly structureDescription?: string;
}): string =>
  buildIntrinsicSystemSummarySegments(input)
    .map((seg) => {
      if (seg.kind === 'text') return seg.text;
      if (seg.kind === 'spectral-badge') return seg.spectralType;
      if (seg.kind === 'planet-type-badge') return seg.composition;
      return seg.label;
    })
    .join('');

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
 * Pure unit function building the URL to the System View with a specific child star or planet
 * set to focus (`/system/<systemSlug>?focus=<elementSlug>`, e.g. `/system/tau-ceti?focus=tau-ceti-e`).
 */
export const buildSystemElementFocusHref = (
  systemNameOrId: string,
  elementNameOrId: string,
): string => {
  const baseHref = buildSystemDetailsHref(systemNameOrId);
  const focusSlug = toUrlSlug(elementNameOrId) || elementNameOrId.trim();
  if (!focusSlug) {
    return baseHref;
  }
  const params = new URLSearchParams({ focus: focusSlug });
  return `${baseHref}?${params.toString()}`;
};

/**
 * Pure unit function building the URL to the Planetary View for a given planet
 * (`/planet/<planetSlug>`, e.g. `/planet/jupiter` or `/planet/tau-ceti-e`).
 */
export const buildPlanetDetailsHref = (planetNameOrId: string): string => {
  const slug = toUrlSlug(planetNameOrId);
  return `/planet/${encodeURIComponent(slug || planetNameOrId.trim() || 'earth')}`;
};

/**
 * Pure unit function building the URL to the Planetary View with a specific orbiting body
 * set to focus (`/planet/<planetSlug>?focus=<elementSlug>`, e.g. `/planet/jupiter?focus=europa`).
 */
export const buildPlanetElementFocusHref = (
  planetNameOrId: string,
  elementNameOrId: string,
): string => {
  const baseHref = buildPlanetDetailsHref(planetNameOrId);
  const focusSlug = toUrlSlug(elementNameOrId) || elementNameOrId.trim();
  if (!focusSlug) {
    return baseHref;
  }
  const params = new URLSearchParams({ focus: focusSlug });
  return `${baseHref}?${params.toString()}`;
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
  systemNameOrId: string,
): {
  readonly stars: readonly FocusedStarDetail[];
  readonly planets: readonly FocusedPlanetDetail[];
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

  const planets: FocusedPlanetDetail[] = sortedPlanets.map((p) => ({
    id: p.id,
    name: p.name,
    href: buildSystemElementFocusHref(systemNameOrId, p.name || p.id),
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

const resolveMinorBodyCategoryLabel = (entry?: CompactSearchEntry): string => {
  switch (entry?.k) {
    case 3:
      return 'Moon';
    case 4:
      return 'Dwarf Planet';
    case 6:
      return isArtificialSpacecraftEntry(entry)
        ? 'Spacecraft'
        : 'Asteroid / Minor Body';
    default:
      return 'Celestial Body';
  }
};

const resolveCorpusEntryComposition = (
  entry?: CompactSearchEntry,
): PlanetCompositionClass => {
  if (entry?.u === 'gas-giant' || entry?.u === 'ice-giant') {
    return entry.u;
  }
  return 'terrestrial';
};

const resolveOrbitingBodies = (
  planetTargetSlugs: ReadonlySet<string>,
  systemNameOrId: string,
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
    items.push({
      id: entry.i,
      name,
      href: urlPlanetSlug
        ? buildPlanetElementFocusHref(urlPlanetSlug, name || entry.i)
        : buildSystemElementFocusHref(systemNameOrId, name || entry.i),
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
    activeLayers,
    canonOrderOptions,
    urlSystemSlug,
    urlPlanetSlug,
    hasExplicitFocus = false,
  } = input;

  if (!focusedEntity) {
    return null;
  }

  const matchedCorpusEntry = findFocusedEntryInCorpus(focusedEntity.id, corpus);
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
    focusedEntity.id;

  const matchedSystemEntry =
    systemId !== focusedEntity.id
      ? findFocusedEntryInCorpus(systemId, corpus)
      : matchedCorpusEntry && resolveEntryCategory(matchedCorpusEntry) === 'stars'
        ? matchedCorpusEntry
        : urlMatchedSystemEntry;

  const systemName =
    sysManifest?.name ??
    summaryNode?.name ??
    (matchedSystemEntry
      ? resolveResultDisplayTitle(matchedSystemEntry)
      : systemId !== focusedEntity.id
        ? formatSlugFallbackTitle(systemId)
        : focusedEntity.name);

  let stars: readonly FocusedStarDetail[] = [];
  let planets: readonly FocusedPlanetDetail[] = [];

  if (sysManifest) {
    const mapped = mapManifestToStarsAndPlanets(
      sysManifest,
      systemName || systemId,
    );
    stars = mapped.stars;
    planets = mapped.planets;
  } else {
    const fallbackSpectral =
      focusedEntity.spectralType ??
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
        corpusPlanets.push({
          id: entry.i,
          name: planetName,
          href: buildSystemElementFocusHref(
            systemName || systemId,
            planetName || entry.i,
          ),
          composition: resolveCorpusEntryComposition(entry),
          isHabitableCandidate: entry.z === 1,
        });
      }
    }
    planets = corpusPlanets;
  }

  const focusIdSlug = toUrlSlug(focusedEntity.id);
  const focusNameSlug = toUrlSlug(focusedEntity.name);
  const matchedPlanetDetail = planets.find((p) => {
    const pId = toUrlSlug(p.id);
    const pName = toUrlSlug(p.name);
    return (
      pId === focusIdSlug ||
      pName === focusIdSlug ||
      (focusNameSlug.length > 0 &&
        (pId === focusNameSlug || pName === focusNameSlug))
    );
  });
  const matchedStarDetail = stars.find((s) => {
    const sId = toUrlSlug(s.id);
    const sName = toUrlSlug(s.name);
    return (
      sId === focusIdSlug ||
      sName === focusIdSlug ||
      (focusNameSlug.length > 0 &&
        (sId === focusNameSlug || sName === focusNameSlug))
    );
  });

  const focusedKind: FocusedEntityKind =
    structureRecord ||
    matchedCorpusEntry?.k === 5 ||
    focusedEntity.classification === 'cluster' ||
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
              (hasExplicitFocus || focusedEntity.id !== systemId)
            ? 'star'
            : 'system';

  const resolvedName =
    matchedPlanetDetail?.name ??
    (focusedKind === 'star' && matchedStarDetail
      ? matchedStarDetail.name
      : undefined) ??
    focusedEntity.name;

  const spectralType =
    (focusedKind === 'star' && matchedStarDetail
      ? matchedStarDetail.spectralType
      : undefined) ??
    focusedEntity.spectralType ??
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
      matchedPlanetDetail ? toUrlSlug(matchedPlanetDetail.id) : '',
      matchedPlanetDetail ? toUrlSlug(matchedPlanetDetail.name) : '',
    ].filter((s) => s.length > 0),
  );

  const orbitingBodies: readonly SystemElementBodyItem[] =
    focusedKind === 'planet' || focusedKind === 'minor-body'
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
    focusedKind === 'planet'
      ? planetComposition
      : (focusedEntity.classification as CelestialClassification | undefined) ??
        (matchedCorpusEntry
          ? resolveReticleType(matchedCorpusEntry)
          : 'stellar-system');

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
    focusedEntity.id !== systemId ||
    focusedKind === 'planet' ||
    focusedKind === 'minor-body';

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

  const systemSlug = toUrlSlug(systemName || systemId);
  const systemDetailsHref =
    focusedKind === 'planet'
      ? buildPlanetDetailsHref(resolvedName || focusedEntity.id)
      : buildSystemDetailsHref(systemName || systemId);
  const directionsHref = `/galaxy/${encodeURIComponent(systemSlug)}?anchor=sol`;

  const coordinatesPc: readonly [number, number, number] = sysManifest
    ? [sysManifest.x, sysManifest.y, sysManifest.z]
    : summaryNode
      ? [summaryNode.x, summaryNode.y, summaryNode.z]
      : structureRecord
        ? [structureRecord.x, structureRecord.y, structureRecord.z]
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
    !baseTags.includes('HabitableCandidate') &&
    !baseTags.includes('HabitableHost')
  ) {
    baseTags.push('HabitableCandidate');
  }
  const tags = baseTags;

  const baseDetails: FocusedEntityDetailsBase = {
    id: focusedEntity.id,
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
    systemSummary,
    systemSummarySegments,
    coordinatesPc,
    sectorId,
    tags,
    systemDetailsHref,
    directionsHref,
    stars,
    planets,
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
            spectralType: spectralType ?? 'Unknown',
            mag: summaryNode?.mag ?? matchedSystemEntry?.m?.[0] ?? 0,
            absmag: summaryNode?.absmag ?? 0,
          },
    };
  }

  if (focusedKind === 'planet') {
    const fallbackSemiMajorAxis = solarBodyRecord?.orbit?.semiMajorAxis;
    const fallbackPeriodDays = solarBodyRecord?.orbit?.periodDays;
    const fallbackEccentricity = solarBodyRecord?.orbit?.eccentricity;
    return {
      ...baseDetails,
      focusedKind: 'planet',
      orbitingBodies,
      planetTelemetry: {
        composition: planetComposition,
        isHabitableCandidate: planetIsHabitable,
        ...(matchedPlanetDetail?.semiMajorAxisAu !== undefined
          ? { semiMajorAxisAu: matchedPlanetDetail.semiMajorAxisAu }
          : fallbackSemiMajorAxis !== undefined
            ? { semiMajorAxisAu: fallbackSemiMajorAxis }
            : {}),
        ...(matchedPlanetDetail?.periodDays !== undefined
          ? { periodDays: matchedPlanetDetail.periodDays }
          : fallbackPeriodDays !== undefined
            ? { periodDays: fallbackPeriodDays }
            : {}),
        ...(matchedPlanetDetail?.eccentricity !== undefined
          ? { eccentricity: matchedPlanetDetail.eccentricity }
          : fallbackEccentricity !== undefined
            ? { eccentricity: fallbackEccentricity }
            : {}),
        ...(matchedPlanetDetail?.massMearth !== undefined
          ? { massMearth: matchedPlanetDetail.massMearth }
          : {}),
        ...(matchedPlanetDetail?.radiusRearth !== undefined
          ? { radiusRearth: matchedPlanetDetail.radiusRearth }
          : {}),
        ...(matchedPlanetDetail?.equilibriumTempK !== undefined
          ? { equilibriumTempK: matchedPlanetDetail.equilibriumTempK }
          : {}),
        ...(matchedPlanetDetail?.discoveryYear !== undefined
          ? { discoveryYear: matchedPlanetDetail.discoveryYear }
          : {}),
        ...(matchedPlanetDetail?.discoveryMethod
          ? { discoveryMethod: matchedPlanetDetail.discoveryMethod }
          : {}),
      },
    };
  }

  if (focusedKind === 'minor-body') {
    return {
      ...baseDetails,
      focusedKind: 'minor-body',
      minorBodyTelemetry: {
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

export interface BuildSystemElementsSummaryInput {
  readonly details: FocusedEntityDetails | null;
  readonly corpus?: readonly CompactSearchEntry[];
}

/**
 * Pure domain builder assembling a `SystemElementsSummary` showing all elements in the host system
 * broken into sections (`Stars`, `Planets`, `Moons & Dwarf Planets`, `Minor Bodies & Spacecraft`, `Canon Layers`).
 */
export const buildSystemElementsSummary = (
  input: BuildSystemElementsSummaryInput,
): SystemElementsSummary | null => {
  const { details, corpus = [] } = input;
  if (!details) {
    return null;
  }

  const { systemId, systemName, id: focusedEntityId, stars, planets } = details;
  const systemHref = buildSystemDetailsHref(systemName || systemId);

  const moonsAndDwarfPlanets: SystemElementBodyItem[] = [];
  const minorBodiesAndSpacecraft: SystemElementBodyItem[] = [];

  for (const entry of corpus) {
    if (entry.s !== systemId) {
      continue;
    }
    const name = resolveResultDisplayTitle(entry);
    const href = buildSystemElementFocusHref(
      systemName || systemId,
      name || entry.i,
    );
    if (entry.k === 3 || entry.k === 4) {
      moonsAndDwarfPlanets.push({
        id: entry.i,
        name,
        href,
        categoryLabel: entry.k === 3 ? 'Moon' : 'Dwarf Planet',
      });
    } else if (entry.k === 6) {
      minorBodiesAndSpacecraft.push({
        id: entry.i,
        name,
        href,
        categoryLabel: isArtificialSpacecraftEntry(entry)
          ? 'Spacecraft'
          : 'Minor Body',
      });
    }
  }

  const systemCanonAnnotations = resolveFocusedCanonAnnotations(
    systemId,
    systemId,
  );

  return {
    systemId,
    systemName,
    systemHref,
    focusedEntityId,
    stars,
    planets,
    moonsAndDwarfPlanets,
    minorBodiesAndSpacecraft,
    canonAnnotations: systemCanonAnnotations,
  };
};

export interface BuildPlanetaryElementsSummaryInput {
  readonly details: FocusedEntityDetails | null;
  readonly urlPlanetSlug?: string | null;
  readonly planetEntityDetail?: DecodedDetailRecord;
  readonly corpus?: readonly CompactSearchEntry[];
  readonly activeLayers?: readonly DatasetLayerManifest[];
}

const resolveDirectTargetCanonAnnotations = (
  targetIds: readonly string[],
  activeLayers: readonly DatasetLayerManifest[] = SEED_FICTIONAL_CANON_LAYERS,
): readonly FocusedCanonAnnotation[] => {
  const layersArray = [...activeLayers];
  const seen = new Set<string>();
  const annotations: FocusedCanonAnnotation[] = [];

  for (const targetId of targetIds) {
    const rawTargetKey = targetId.includes(':')
      ? (targetId.split(':')[1] ?? targetId)
      : targetId;
    for (const item of resolveEntityLayers(rawTargetKey, layersArray)) {
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
  }

  return sortCanonAnnotations(annotations);
};

/**
 * Pure domain builder assembling a `PlanetaryElementsSummary` showing the host planet and all
 * catalogued bodies in orbit around it (`Planet`, `Moons`, `Minor Bodies & Spacecraft`, `Canon Layers`).
 */
export const buildPlanetaryElementsSummary = (
  input: BuildPlanetaryElementsSummaryInput,
): PlanetaryElementsSummary | null => {
  const {
    details,
    urlPlanetSlug,
    planetEntityDetail,
    corpus = [],
    activeLayers,
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
      : (urlPlanetSlug ?? details?.id ?? 'earth'));

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
        : formatSlugFallbackTitle(urlPlanetSlug ?? details?.name ?? 'Earth'));

  const planetHref = buildPlanetDetailsHref(planetName || planetId);
  const systemId = details?.systemId ?? planetCorpusEntry?.s ?? 'sol';
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
        categoryLabel: entry.k === 3 ? 'Moon' : 'Dwarf Planet',
      });
    } else {
      minorBodiesAndSpacecraft.push({
        id: entry.i,
        name,
        href,
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
  const directCanon = resolveDirectTargetCanonAnnotations(
    targetIdsForCanon,
    activeLayers,
  );

  return {
    planetId,
    planetName,
    planetHref,
    systemId,
    systemName,
    systemHref,
    ...(details?.id ? { focusedEntityId: details.id } : {}),
    ...(planetDetail ? { planetDetail } : {}),
    moons,
    minorBodiesAndSpacecraft,
    canonAnnotations: directCanon,
  };
};

export interface BreadcrumbRouteLink {
  readonly label: string;
  readonly href?: string;
}

/**
 * Pure builder producing the breadcrumb trail for the active System or Galaxy view.
 */
export const buildSystemViewBreadcrumbs = (
  details: FocusedEntityDetails | null,
  urlSystemSlug: string | null,
  hasExplicitFocus: boolean,
): readonly BreadcrumbRouteLink[] => {
  const items: BreadcrumbRouteLink[] = [
    { label: 'Galaxy', href: '/galaxy' },
  ];

  const sysName = details?.systemName ?? urlSystemSlug ?? 'System';
  const sysHref = buildSystemDetailsHref(sysName);

  const isSubElementFocused =
    Boolean(details) &&
    (hasExplicitFocus ||
      (details !== null && details.focusedKind !== 'system'));

  if (isSubElementFocused && details) {
    items.push({ label: sysName, href: sysHref });
    items.push({ label: details.name });
  } else {
    items.push({ label: sysName });
  }

  return items;
};

/**
 * Pure builder producing the breadcrumb trail for the active Planetary view (`/planet/$planetId`).
 */
export const buildPlanetViewBreadcrumbs = (
  details: FocusedEntityDetails | null,
  planetaryElements: PlanetaryElementsSummary | null,
  urlPlanetSlug: string | null,
  hasExplicitFocus: boolean,
): readonly BreadcrumbRouteLink[] => {
  const items: BreadcrumbRouteLink[] = [
    { label: 'Galaxy', href: '/galaxy' },
  ];

  const sysName =
    planetaryElements?.systemName ?? details?.systemName ?? 'System';
  const sysHref =
    planetaryElements?.systemHref ?? buildSystemDetailsHref(sysName);
  items.push({ label: sysName, href: sysHref });

  const planetName =
    planetaryElements?.planetName ??
    (details?.focusedKind === 'planet' ? details.name : undefined) ??
    (urlPlanetSlug ? formatSlugFallbackTitle(urlPlanetSlug) : 'Planet');
  const planetHref =
    planetaryElements?.planetHref ?? buildPlanetDetailsHref(planetName);

  const planetIdSlug = toUrlSlug(
    planetaryElements?.planetId ?? urlPlanetSlug ?? planetName,
  );
  const planetNameSlug = toUrlSlug(planetName);

  const isSubElementFocused =
    details !== null &&
    hasExplicitFocus &&
    toUrlSlug(details.id) !== planetIdSlug &&
    toUrlSlug(details.name) !== planetNameSlug;

  if (isSubElementFocused && details) {
    items.push({ label: planetName, href: planetHref });
    items.push({ label: details.name });
  } else {
    items.push({ label: planetName });
  }

  return items;
};

export { extractUrlPlanetSlug, extractUrlSystemSlug, hasExplicitFocusParam };
