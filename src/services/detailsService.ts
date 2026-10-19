import type { CelestialClassification } from '../components/canvas/cartography/reticleGeometry';
import type { SpatialEntityDefinition } from '../components/canvas/entity/types';
import { getCachedDetailRecord, type DecodedDetailRecord } from '../data/detailsRepository';
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
  readonly inclinationDeg?: number;
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
  readonly inclinationDeg?: number;
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
  readonly sectorName?: string;
  readonly tags: readonly string[];
  readonly systemDetailsHref?: string;
  readonly directionsHref: string;
  readonly centerHref?: string;
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

export interface SystemBodiesSummary {
  readonly scope: 'system';
  readonly systemId: string;
  readonly systemName: string;
  readonly systemHref: string;
  readonly focusedEntityId?: string;
  readonly selectedEntityIds?: readonly string[];
  readonly stars: readonly FocusedStarDetail[];
  readonly planets: readonly FocusedPlanetDetail[];
  readonly moonsAndDwarfPlanets: readonly SystemElementBodyItem[];
  readonly minorBodiesAndSpacecraft: readonly SystemElementBodyItem[];
  readonly canonAnnotations: readonly FocusedCanonAnnotation[];
}

export interface PlanetaryBodiesSummary {
  readonly scope: 'planet';
  readonly planetId: string;
  readonly planetName: string;
  readonly planetHref: string;
  readonly systemId: string;
  readonly systemName: string;
  readonly systemHref: string;
  readonly focusedEntityId?: string;
  readonly selectedEntityIds?: readonly string[];
  readonly planetDetail?: FocusedPlanetDetail;
  readonly moons: readonly SystemElementBodyItem[];
  readonly minorBodiesAndSpacecraft: readonly SystemElementBodyItem[];
  readonly canonAnnotations: readonly FocusedCanonAnnotation[];
}

export type BodiesPanelSummary = SystemBodiesSummary | PlanetaryBodiesSummary;

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
  readonly viewScope?: 'galaxy' | 'system' | 'planet';
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
 * Pure unit function building the URL to center and focus a target entity
 * across Galaxy, System, and Planet view scopes (DEC-021).
 */
export const buildCenterEntityHref = (
  viewScope: 'galaxy' | 'system' | 'planet',
  scopeTargetId?: string,
  focusId?: string,
): string | undefined => {
  if (!focusId) {
    return undefined;
  }
  const encFocus = encodeURIComponent(focusId);
  if (viewScope === 'galaxy' || !scopeTargetId) {
    return `/galaxy?center=${encFocus}&focus=${encFocus}`;
  }
  const encTarget = encodeURIComponent(scopeTargetId);
  if (viewScope === 'system') {
    return `/system/${encTarget}?center=${encFocus}&focus=${encFocus}`;
  }
  return `/planet/${encTarget}?center=${encFocus}&focus=${encFocus}`;
};

export interface SceneCameraUrlState {
  readonly center?: string;
  readonly x?: number;
  readonly y?: number;
  readonly z?: number;
  readonly az?: number;
  readonly el?: number;
  readonly dist?: number;
  readonly zoom?: number;
}

/**
 * Pure parser extracting 3D scene camera state and reference point (`center`, `x`, `y`, `z`,
 * `az`, `el`, `dist`, `zoom`) from a URL search string (DEC-021).
 */
export const extractUrlSceneCameraState = (
  searchString: string,
): SceneCameraUrlState => {
  const params = new URLSearchParams(searchString);
  const centerRaw = params.get('center');
  const center =
    centerRaw !== null && centerRaw.trim().length > 0
      ? toUrlSlug(centerRaw)
      : undefined;

  const parseNum = (key: string): number | undefined => {
    const raw = params.get(key);
    if (raw === null || raw.trim() === '') return undefined;
    const num = Number(raw);
    return Number.isFinite(num) ? num : undefined;
  };

  const x = parseNum('x');
  const y = parseNum('y');
  const z = parseNum('z');
  const az = parseNum('az');
  const el = parseNum('el');
  const dist = parseNum('dist');
  const zoom = parseNum('zoom');

  return {
    ...(center !== undefined ? { center } : {}),
    ...(x !== undefined ? { x } : {}),
    ...(y !== undefined ? { y } : {}),
    ...(z !== undefined ? { z } : {}),
    ...(az !== undefined ? { az } : {}),
    ...(el !== undefined ? { el } : {}),
    ...(dist !== undefined ? { dist } : {}),
    ...(zoom !== undefined ? { zoom } : {}),
  };
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
    ...(p.orbit?.inclination !== undefined
      ? { inclinationDeg: p.orbit.inclination }
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
    viewScope: inputViewScope,
  } = input;

  if (!focusedEntity && !urlSystemSlug) {
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

  if (sysManifest) {
    const mapped = mapManifestToStarsAndPlanets(
      sysManifest,
      systemName || systemId,
    );
    stars = mapped.stars;
    planets = mapped.planets;
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

  const focusIdSlug = focusedEntity ? toUrlSlug(focusedEntity.id) : '';
  const focusNameSlug = focusedEntity ? toUrlSlug(focusedEntity.name) : '';
  const matchedPlanetDetail = focusedEntity
    ? planets.find((p) => {
        const pId = toUrlSlug(p.id);
        const pName = toUrlSlug(p.name);
        return (
          pId === focusIdSlug ||
          pName === focusIdSlug ||
          (focusNameSlug.length > 0 &&
            (pId === focusNameSlug || pName === focusNameSlug))
        );
      })
    : undefined;
  const matchedStarDetail = focusedEntity
    ? stars.find((s) => {
        const sId = toUrlSlug(s.id);
        const sName = toUrlSlug(s.name);
        return (
          sId === focusIdSlug ||
          sName === focusIdSlug ||
          (focusNameSlug.length > 0 &&
            (sId === focusNameSlug || sName === focusNameSlug))
        );
      })
    : undefined;

  const focusedKind: FocusedEntityKind = !focusedEntity
    ? 'system'
    : structureRecord ||
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
  const directionsHref = `/galaxy/${encodeURIComponent(systemSlug)}?anchor=sol`;

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

  const canonAnnotations = resolveFocusedCanonAnnotations(
    focusedEntity?.id ?? systemId,
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

  const viewScope: 'galaxy' | 'system' | 'planet' =
    inputViewScope ??
    (urlPlanetSlug
      ? 'planet'
      : urlSystemSlug
        ? 'system'
        : 'galaxy');
  const scopeTargetId = urlPlanetSlug ?? urlSystemSlug ?? (focusedEntity?.id ?? systemId);
  const centerHref = buildCenterEntityHref(
    viewScope,
    scopeTargetId,
    focusedEntity?.id ?? systemId,
  );

  let systemDetailsHref: string | undefined;
  if (focusedKind === 'system' && viewScope === 'galaxy') {
    systemDetailsHref = buildSystemDetailsHref(systemName || systemId);
  } else if (
    focusedKind === 'planet' &&
    (viewScope === 'galaxy' || viewScope === 'system')
  ) {
    systemDetailsHref = buildPlanetDetailsHref(
      resolvedName || (focusedEntity?.id ?? systemId),
    );
  }

  const baseDetails: FocusedEntityDetailsBase = {
    id: focusedEntity?.id ?? systemId,
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
    sectorName: sectorId,
    tags,
    ...(systemDetailsHref ? { systemDetailsHref } : {}),
    directionsHref,
    centerHref,
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
    const fallbackInclination = solarBodyRecord?.orbit?.inclination;
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
        ...(matchedPlanetDetail?.inclinationDeg !== undefined
          ? { inclinationDeg: matchedPlanetDetail.inclinationDeg }
          : fallbackInclination !== undefined
            ? { inclinationDeg: fallbackInclination }
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

export interface BuildSystemBodiesSummaryInput {
  readonly details: FocusedEntityDetails | null;
  readonly corpus?: readonly CompactSearchEntry[];
  readonly selectedEntityIds?: readonly string[];
  readonly focusedEntityId?: string;
}

/**
 * Pure domain builder assembling a `SystemBodiesSummary` showing all elements in the host system
 * broken into sections (`Stars`, `Planets`, `Moons & Dwarf Planets`, `Minor Bodies & Spacecraft`, `Canon Layers`).
 */
export const buildSystemBodiesSummary = (
  input: BuildSystemBodiesSummaryInput,
): SystemBodiesSummary | null => {
  const { details, corpus = [], selectedEntityIds } = input;
  if (!details) {
    return null;
  }

  const { systemId, systemName, stars, planets } = details;
  const focusedEntityId =
    'focusedEntityId' in input ? input.focusedEntityId : details.id;
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
    scope: 'system',
    systemId,
    systemName,
    systemHref,
    focusedEntityId,
    ...(selectedEntityIds ? { selectedEntityIds } : {}),
    stars,
    planets,
    moonsAndDwarfPlanets,
    minorBodiesAndSpacecraft,
    canonAnnotations: systemCanonAnnotations,
  };
};

export interface BuildPlanetaryBodiesSummaryInput {
  readonly details: FocusedEntityDetails | null;
  readonly urlPlanetSlug?: string | null;
  readonly planetEntityDetail?: DecodedDetailRecord;
  readonly corpus?: readonly CompactSearchEntry[];
  readonly activeLayers?: readonly DatasetLayerManifest[];
  readonly selectedEntityIds?: readonly string[];
  readonly focusedEntityId?: string;
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
 * Pure domain builder assembling a `PlanetaryBodiesSummary` showing the host planet and all
 * catalogued bodies in orbit around it (`Planet`, `Moons`, `Minor Bodies & Spacecraft`, `Canon Layers`).
 */
export const buildPlanetaryBodiesSummary = (
  input: BuildPlanetaryBodiesSummaryInput,
): PlanetaryBodiesSummary | null => {
  const {
    details,
    urlPlanetSlug,
    planetEntityDetail,
    corpus = [],
    activeLayers,
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
  _hasExplicitFocus?: boolean,
): readonly BreadcrumbRouteLink[] => {
  const sysName =
    details?.systemName ??
    (urlSystemSlug ? formatSlugFallbackTitle(urlSystemSlug) : 'System');

  return [
    { label: 'Galaxy', href: '/galaxy' },
    { label: sysName },
  ];
};

/**
 * Pure builder producing the breadcrumb trail for the active Planetary view (`/planet/$planetId`).
 */
export const buildPlanetViewBreadcrumbs = (
  details: FocusedEntityDetails | null,
  planetaryElements: PlanetaryBodiesSummary | null,
  urlPlanetSlug: string | null,
  _hasExplicitFocus?: boolean,
): readonly BreadcrumbRouteLink[] => {
  const sysName =
    planetaryElements?.systemName ?? details?.systemName ?? 'System';
  const sysHref =
    planetaryElements?.systemHref ?? buildSystemDetailsHref(sysName);

  const planetName =
    planetaryElements?.planetName ??
    (details?.focusedKind === 'planet' ? details.name : undefined) ??
    (urlPlanetSlug ? formatSlugFallbackTitle(urlPlanetSlug) : 'Planet');

  return [
    { label: 'Galaxy', href: '/galaxy' },
    { label: sysName, href: sysHref },
    { label: planetName },
  ];
};

export type OrbitalSchematicRegion =
  | 'habitable-zone'
  | 'asteroid-belt'
  | 'kuiper-belt';

export type OrbitalSchematicEntityKind =
  | 'star'
  | 'planet'
  | 'dwarf-planet'
  | 'moon'
  | 'minor-body'
  | 'spacecraft';

export interface OrbitalSchematicItem {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly kind: OrbitalSchematicEntityKind;
  readonly orbitRank: number;
  readonly summaryLabel: string;
  readonly inHabitableZone: boolean;
  readonly region?: OrbitalSchematicRegion;
  readonly isFocused: boolean;
  readonly isSelected: boolean;
  readonly children?: readonly OrbitalSchematicItem[];
}

export interface OrbitalSchematicSummary {
  readonly scope: 'system' | 'planet';
  readonly systemId: string;
  readonly systemName: string;
  readonly planetId?: string;
  readonly planetName?: string;
  readonly habitableZoneAu?: readonly [number, number];
  readonly items: readonly OrbitalSchematicItem[];
}

/**
 * Pure domain builder assembling an `OrbitalSchematicSummary` for a star system.
 * Starts with primary stars (orbitRank 0), followed by all system-level orbiting bodies
 * sorted strictly by radial orbital rank (closest to primary first).
 */
export const buildSystemOrbitalSchematic = (
  systemBodies: SystemBodiesSummary | null,
  corpus: readonly CompactSearchEntry[] = [],
): OrbitalSchematicSummary | null => {
  if (!systemBodies) {
    return null;
  }

  const {
    systemId,
    systemName,
    focusedEntityId,
    selectedEntityIds,
    stars,
    planets,
    moonsAndDwarfPlanets,
  } = systemBodies;

  const selectedSet = new Set(selectedEntityIds ?? []);
  const items: OrbitalSchematicItem[] = [];

  for (const star of stars) {
    items.push({
      id: star.id,
      name: star.name,
      href:
        star.href ??
        buildSystemElementFocusHref(
          systemName || systemId,
          star.name || star.id,
        ),
      kind: 'star',
      orbitRank: 0,
      summaryLabel: `Component ${star.componentDesignation} · ${star.spectralType}`,
      inHabitableZone: false,
      isFocused: focusedEntityId === star.id,
      isSelected: selectedSet.has(star.id),
    });
  }

  interface CandidateItem {
    readonly id: string;
    readonly name: string;
    readonly href: string;
    readonly kind: OrbitalSchematicEntityKind;
    readonly summaryLabel: string;
    readonly semiMajorAxisAu?: number;
    readonly isHabitableCandidate: boolean;
    readonly entry?: CompactSearchEntry;
    readonly originalIndex: number;
  }

  const candidates: CandidateItem[] = [];

  for (const planet of planets) {
    const entry =
      corpus.find((e) => e.i === planet.id) ||
      corpus.find((e) => toUrlSlug(e.i) === toUrlSlug(planet.id));
    candidates.push({
      id: planet.id,
      name: planet.name,
      href: planet.href ?? buildPlanetDetailsHref(planet.name || planet.id),
      kind: 'planet',
      summaryLabel: planet.composition ?? 'Planet',
      semiMajorAxisAu: planet.semiMajorAxisAu,
      isHabitableCandidate: Boolean(planet.isHabitableCandidate || entry?.z === 1),
      entry,
      originalIndex: candidates.length,
    });
  }

  for (const body of moonsAndDwarfPlanets) {
    const entry =
      corpus.find((e) => e.i === body.id) ||
      corpus.find((e) => toUrlSlug(e.i) === toUrlSlug(body.id));
    if (entry?.o) {
      continue;
    }
    const isDwarf = entry?.k === 4 || body.categoryLabel === 'Dwarf Planet';
    candidates.push({
      id: body.id,
      name: body.name,
      href: body.href,
      kind: isDwarf ? 'dwarf-planet' : 'moon',
      summaryLabel: body.categoryLabel,
      isHabitableCandidate: Boolean(entry?.z === 1),
      entry,
      originalIndex: candidates.length,
    });
  }


  candidates.sort((a, b) => {
    const rankA = a.entry?.r;
    const rankB = b.entry?.r;
    if (rankA !== undefined && rankB !== undefined) {
      if (rankA !== rankB) return rankA - rankB;
    }
    if (a.semiMajorAxisAu !== undefined && b.semiMajorAxisAu !== undefined) {
      if (a.semiMajorAxisAu !== b.semiMajorAxisAu) {
        return a.semiMajorAxisAu - b.semiMajorAxisAu;
      }
    }
    if (rankA !== undefined && b.semiMajorAxisAu === undefined) return -1;
    if (rankB !== undefined && a.semiMajorAxisAu === undefined) return 1;
    return a.originalIndex - b.originalIndex;
  });

  candidates.forEach((c, index) => {
    const inHabitableZone = c.isHabitableCandidate || c.entry?.z === 1;
    let region: OrbitalSchematicRegion | undefined;
    if (c.entry?.e === 'belt') {
      region = 'asteroid-belt';
    } else if (c.entry?.e === 'kuiper') {
      region = 'kuiper-belt';
    } else if (inHabitableZone) {
      region = 'habitable-zone';
    }

    const matchingMoons = moonsAndDwarfPlanets.filter((moon) => {
      const entry =
        corpus.find((e) => e.i === moon.id) ||
        corpus.find((e) => toUrlSlug(e.i) === toUrlSlug(moon.id));
      if (!entry?.o) {
        return false;
      }
      return (
        entry.o === c.id ||
        toUrlSlug(entry.o) === toUrlSlug(c.id) ||
        toUrlSlug(entry.o) === toUrlSlug(c.name)
      );
    });

    matchingMoons.sort((a, b) => {
      const entryA =
        corpus.find((e) => e.i === a.id) ||
        corpus.find((e) => toUrlSlug(e.i) === toUrlSlug(a.id));
      const entryB =
        corpus.find((e) => e.i === b.id) ||
        corpus.find((e) => toUrlSlug(e.i) === toUrlSlug(b.id));
      const rankA = entryA?.r ?? Number.POSITIVE_INFINITY;
      const rankB = entryB?.r ?? Number.POSITIVE_INFINITY;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return 0;
    });

    const children: OrbitalSchematicItem[] = matchingMoons.map((moon, mIdx) => {
      const childEntry =
        corpus.find((e) => e.i === moon.id) ||
        corpus.find((e) => toUrlSlug(e.i) === toUrlSlug(moon.id));
      const childInHz = Boolean(childEntry?.z === 1);
      let childRegion: OrbitalSchematicRegion | undefined;
      if (childEntry?.e === 'belt') {
        childRegion = 'asteroid-belt';
      } else if (childEntry?.e === 'kuiper') {
        childRegion = 'kuiper-belt';
      } else if (childInHz) {
        childRegion = 'habitable-zone';
      }
      return {
        id: moon.id,
        name: moon.name,
        href: moon.href,
        kind: 'moon' as const,
        orbitRank: childEntry?.r ?? mIdx + 1,
        summaryLabel: moon.categoryLabel,
        inHabitableZone: childInHz,
        ...(childRegion ? { region: childRegion } : {}),
        isFocused: focusedEntityId === moon.id,
        isSelected: selectedSet.has(moon.id),
      };
    });

    items.push({
      id: c.id,
      name: c.name,
      href: c.href,
      kind: c.kind,
      orbitRank: c.entry?.r ?? index + 1,
      summaryLabel: c.summaryLabel,
      inHabitableZone,
      ...(region ? { region } : {}),
      isFocused: focusedEntityId === c.id,
      isSelected: selectedSet.has(c.id),
      ...(children.length > 0 ? { children } : {}),
    });
  });

  return {
    scope: 'system',
    systemId,
    systemName,
    items,
  };
};

/**
 * Pure domain builder assembling an `OrbitalSchematicSummary` for a planetary system.
 * Starts with the host planet (orbitRank 0), followed by all moons and minor bodies
 * in orbit around it sorted strictly by radial orbital rank.
 */
export const buildPlanetaryOrbitalSchematic = (
  planetaryBodies: PlanetaryBodiesSummary | null,
  corpus: readonly CompactSearchEntry[] = [],
): OrbitalSchematicSummary | null => {
  if (!planetaryBodies) {
    return null;
  }

  const {
    systemId,
    systemName,
    planetId,
    planetName,
    planetHref,
    focusedEntityId,
    selectedEntityIds,
    planetDetail,
    moons,
  } = planetaryBodies;

  const selectedSet = new Set(selectedEntityIds ?? []);
  const items: OrbitalSchematicItem[] = [];

  const hostInHz = Boolean(planetDetail?.isHabitableCandidate);
  items.push({
    id: planetId,
    name: planetName,
    href: planetHref,
    kind: 'planet',
    orbitRank: 0,
    summaryLabel: planetDetail?.composition ?? 'Planet',
    inHabitableZone: hostInHz,
    ...(hostInHz ? { region: 'habitable-zone' as const } : {}),
    isFocused: focusedEntityId === planetId,
    isSelected: selectedSet.has(planetId),
  });

  interface CandidateItem {
    readonly id: string;
    readonly name: string;
    readonly href: string;
    readonly kind: OrbitalSchematicEntityKind;
    readonly summaryLabel: string;
    readonly entry?: CompactSearchEntry;
    readonly originalIndex: number;
  }

  const orbitingCandidates: CandidateItem[] = [];

  for (const moon of moons) {
    const entry =
      corpus.find((e) => e.i === moon.id) ||
      corpus.find((e) => toUrlSlug(e.i) === toUrlSlug(moon.id));
    const isDwarf = entry?.k === 4 || moon.categoryLabel === 'Dwarf Planet';
    orbitingCandidates.push({
      id: moon.id,
      name: moon.name,
      href: moon.href,
      kind: isDwarf ? 'dwarf-planet' : 'moon',
      summaryLabel: moon.categoryLabel,
      entry,
      originalIndex: orbitingCandidates.length,
    });
  }


  orbitingCandidates.sort((a, b) => {
    const rankA = a.entry?.r ?? Number.POSITIVE_INFINITY;
    const rankB = b.entry?.r ?? Number.POSITIVE_INFINITY;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return a.originalIndex - b.originalIndex;
  });

  orbitingCandidates.forEach((c, index) => {
    const inHabitableZone = Boolean(c.entry?.z === 1);
    let region: OrbitalSchematicRegion | undefined;
    if (c.entry?.e === 'belt') {
      region = 'asteroid-belt';
    } else if (c.entry?.e === 'kuiper') {
      region = 'kuiper-belt';
    } else if (inHabitableZone) {
      region = 'habitable-zone';
    }

    items.push({
      id: c.id,
      name: c.name,
      href: c.href,
      kind: c.kind,
      orbitRank: c.entry?.r ?? index + 1,
      summaryLabel: c.summaryLabel,
      inHabitableZone,
      ...(region ? { region } : {}),
      isFocused: focusedEntityId === c.id,
      isSelected: selectedSet.has(c.id),
    });
  });

  return {
    scope: 'planet',
    systemId,
    systemName,
    planetId,
    planetName,
    items,
  };
};

export type PreviewMode =
  | 'system-orbits'
  | 'planetary-system'
  | 'object-orbit';

export interface PreviewOrbitElement {
  readonly id: string;
  readonly name: string;
  readonly kind: OrbitalSchematicEntityKind;
  readonly orbitRank: number;
  readonly semiMajorAxisAu?: number;
  readonly inclinationDeg?: number;
  readonly eccentricity?: number;
  readonly inHabitableZone: boolean;
}

export interface FocusedPreviewSummary {
  readonly targetId: string;
  readonly targetName: string;
  readonly systemId: string;
  readonly systemName: string;
  readonly focusedKind: FocusedEntityKind;
  readonly previewMode: PreviewMode;
  readonly primaryInclinationDeg?: number;
  readonly primaryEccentricity?: number;
  readonly primarySemiMajorAxisAu?: number;
  readonly orbitElements: readonly PreviewOrbitElement[];
}

/**
 * Pure domain builder producing a `FocusedPreviewSummary` for the contextual 3D focus preview window (DEC-016).
 * Returns `null` when no entity is focused.
 */
export const buildFocusedPreviewSummary = (
  details: FocusedEntityDetails | null,
  entityDetail?: DecodedDetailRecord,
): FocusedPreviewSummary | null => {
  if (!details) {
    return null;
  }

  const { id: targetId, name: targetName, systemId, systemName, focusedKind } = details;

  let previewMode: PreviewMode;
  if (focusedKind === 'system' || focusedKind === 'star') {
    previewMode = 'system-orbits';
  } else if (focusedKind === 'planet') {
    previewMode = 'planetary-system';
  } else {
    previewMode = 'object-orbit';
  }

  const solarOrbit =
    entityDetail?.kind === 'solar-body' ? entityDetail.record.orbit : undefined;

  let primaryInclinationDeg: number | undefined;
  let primaryEccentricity: number | undefined;
  let primarySemiMajorAxisAu: number | undefined;

  if (focusedKind === 'planet') {
    primaryInclinationDeg =
      details.planetTelemetry?.inclinationDeg ?? solarOrbit?.inclination;
    primaryEccentricity =
      details.planetTelemetry?.eccentricity ?? solarOrbit?.eccentricity;
    primarySemiMajorAxisAu =
      details.planetTelemetry?.semiMajorAxisAu ?? solarOrbit?.semiMajorAxis;
  } else if (focusedKind === 'minor-body') {
    primaryInclinationDeg = solarOrbit?.inclination;
    primaryEccentricity = solarOrbit?.eccentricity;
    primarySemiMajorAxisAu = solarOrbit?.semiMajorAxis;
  }

  let orbitElements: PreviewOrbitElement[] = [];
  if (previewMode === 'system-orbits') {
    orbitElements = details.planets.map((p, index) => ({
      id: p.id,
      name: p.name,
      kind: 'planet',
      orbitRank: index + 1,
      ...(p.semiMajorAxisAu !== undefined ? { semiMajorAxisAu: p.semiMajorAxisAu } : {}),
      ...(p.inclinationDeg !== undefined ? { inclinationDeg: p.inclinationDeg } : {}),
      ...(p.eccentricity !== undefined ? { eccentricity: p.eccentricity } : {}),
      inHabitableZone: p.isHabitableCandidate,
    }));
  } else if (previewMode === 'planetary-system') {
    orbitElements = (details.orbitingBodies ?? []).map((b, index) => {
      const kind: OrbitalSchematicEntityKind =
        b.categoryLabel === 'Moon'
          ? 'moon'
          : b.categoryLabel === 'Spacecraft'
            ? 'spacecraft'
            : 'minor-body';
      return {
        id: b.id,
        name: b.name,
        kind,
        orbitRank: index + 1,
        inHabitableZone: false,
      };
    });
  }

  return {
    targetId,
    targetName,
    systemId,
    systemName,
    focusedKind,
    previewMode,
    ...(primaryInclinationDeg !== undefined ? { primaryInclinationDeg } : {}),
    ...(primaryEccentricity !== undefined ? { primaryEccentricity } : {}),
    ...(primarySemiMajorAxisAu !== undefined ? { primarySemiMajorAxisAu } : {}),
    orbitElements,
  };
};

export type MinimapScope = 'galaxy' | 'system' | 'planet';

export interface MinimapMarkerItem {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly role: 'origin' | 'anchor' | 'focused' | 'selected';
  readonly href: string;
  readonly coordinatesPc?: readonly [number, number, number];
  readonly distanceFromOriginPc?: number;
  readonly semiMajorAxisAu?: number;
}

export interface MinimapOrientationSummary {
  readonly scope: MinimapScope;
  readonly anchorId: string;
  readonly anchorName: string;
  readonly systemId: string;
  readonly systemName: string;
  readonly sectorName?: string;
  readonly coordinatesPc?: readonly [number, number, number];
  readonly distanceFromOriginPc?: number;
  readonly outerOrbitalRadiusAu?: number;
  readonly habitableZoneAu?: readonly [number, number];
  readonly parentSemiMajorAxisAu?: number;
  readonly orbitingBodyCount?: number;
  readonly cameraAzimuthDeg?: number;
  readonly cameraElevationDeg?: number;
  readonly cameraDistance?: number;
  readonly focusedMarker: MinimapMarkerItem | null;
  readonly selectedMarkers: readonly MinimapMarkerItem[];
  readonly markers: readonly MinimapMarkerItem[];
}

/**
 * Pure type-safe helper function to resolve marker kind from an entity definition.
 */
const resolveEntityMarkerKind = (
  entity: { readonly classification?: string; readonly type?: string } | null | undefined,
): string => {
  if (!entity) return 'point';
  if (typeof entity.type === 'string' && entity.type.length > 0) return entity.type;
  if (typeof entity.classification === 'string' && entity.classification.length > 0) {
    return entity.classification;
  }
  return 'entity';
};

/**
 * Pure domain builder producing a `MinimapOrientationSummary` for the galactic reference frame (`GalaxyView`).
 * Orients around Sol as the galactic origin anchor [0, 0, 0] pc (DEC-017, DEC-021).
 */
export const buildGalaxyMinimapOrientation = (
  focusedEntity: SpatialEntityDefinition | null | undefined,
  selectedEntities: readonly SpatialEntityDefinition[] = [],
  focusedDetails: FocusedEntityDetails | null = null,
  cameraState?: SceneCameraUrlState,
  centerEntity?: SpatialEntityDefinition | null,
): MinimapOrientationSummary => {
  const scope: MinimapScope = 'galaxy';
  let anchorId = 'sol';
  let anchorName = 'Sol';
  const systemId = focusedDetails?.systemId ?? 'sol';
  const systemName = focusedDetails?.systemName ?? 'Sol';
  const sectorName = focusedDetails?.sectorName ?? '0,0,0';

  let coordinatesPc: readonly [number, number, number] =
    focusedDetails?.coordinatesPc ??
    (focusedEntity ? toCoordinatesTuple(focusedEntity.position) : [0, 0, 0]);

  if (centerEntity) {
    anchorId = centerEntity.id;
    anchorName = centerEntity.name;
    coordinatesPc = toCoordinatesTuple(centerEntity.position);
  } else if (
    cameraState?.center &&
    focusedEntity &&
    (toUrlSlug(cameraState.center) === toUrlSlug(focusedEntity.id) ||
      toUrlSlug(cameraState.center) === toUrlSlug(focusedEntity.name))
  ) {
    anchorId = focusedEntity.id;
    anchorName = focusedEntity.name;
    coordinatesPc = toCoordinatesTuple(focusedEntity.position);
  } else if (
    cameraState?.x !== undefined &&
    cameraState?.y !== undefined &&
    cameraState?.z !== undefined
  ) {
    anchorId = cameraState.center ?? 'custom';
    anchorName = cameraState.center ?? 'Custom Coordinates';
    coordinatesPc = [cameraState.x, cameraState.y, cameraState.z];
  }

  const distanceFromOriginPc = Number(
    Math.hypot(coordinatesPc[0], coordinatesPc[1], coordinatesPc[2]).toFixed(2),
  );

  const originMarker: MinimapMarkerItem = {
    id: 'sol',
    name: 'Sol',
    kind: 'star',
    role: 'origin',
    href: '/galaxy/sol',
    coordinatesPc: [0, 0, 0],
    distanceFromOriginPc: 0,
  };

  let focusedMarker: MinimapMarkerItem | null = null;
  if (focusedEntity) {
    const coords = toCoordinatesTuple(focusedEntity.position);
    focusedMarker = {
      id: focusedEntity.id,
      name: focusedEntity.name,
      kind: resolveEntityMarkerKind(focusedEntity),
      role: 'focused',
      href: `/galaxy/${focusedDetails?.systemId ?? focusedEntity.id}?focus=${focusedEntity.id}`,
      coordinatesPc: coords,
      distanceFromOriginPc: Number(
        Math.hypot(coords[0], coords[1], coords[2]).toFixed(2),
      ),
    };
  }

  const anchorMarker: MinimapMarkerItem | null =
    anchorId !== 'sol' && anchorId !== focusedMarker?.id
      ? {
          id: anchorId,
          name: anchorName,
          kind: resolveEntityMarkerKind(centerEntity),
          role: 'anchor',
          href: `/galaxy/${anchorId}`,
          coordinatesPc,
          distanceFromOriginPc,
        }
      : null;

  const selectedMarkers: MinimapMarkerItem[] = selectedEntities.map((e) => {
    const coords = toCoordinatesTuple(e.position);
    return {
      id: e.id,
      name: e.name,
      kind: resolveEntityMarkerKind(e),
      role: 'selected',
      href: `/galaxy/${e.id}?focus=${e.id}`,
      coordinatesPc: coords,
      distanceFromOriginPc: Number(
        Math.hypot(coords[0], coords[1], coords[2]).toFixed(2),
      ),
    };
  });

  const markers: MinimapMarkerItem[] = [
    originMarker,
    ...(anchorMarker ? [anchorMarker] : []),
    ...(focusedMarker ? [focusedMarker] : []),
    ...selectedMarkers.filter(
      (m) =>
        m.id !== focusedMarker?.id &&
        m.id !== 'sol' &&
        m.id !== anchorMarker?.id,
    ),
  ];

  return {
    scope,
    anchorId,
    anchorName,
    systemId,
    systemName,
    sectorName,
    coordinatesPc,
    distanceFromOriginPc,
    ...(cameraState?.az !== undefined ? { cameraAzimuthDeg: cameraState.az } : {}),
    ...(cameraState?.el !== undefined ? { cameraElevationDeg: cameraState.el } : {}),
    ...(cameraState?.dist !== undefined ? { cameraDistance: cameraState.dist } : {}),
    focusedMarker,
    selectedMarkers,
    markers,
  };
};

/**
 * Pure domain builder producing a `MinimapOrientationSummary` for a stellar system frame (`SystemView`).
 * Orients around the host star / barycenter anchor or centered body (DEC-017, DEC-021).
 */
export const buildSystemMinimapOrientation = (
  bodiesSummary: SystemBodiesSummary | PlanetaryBodiesSummary,
  schematic: OrbitalSchematicSummary | null,
  systemDetails: FocusedEntityDetails | null,
  focusedEntity: SpatialEntityDefinition | null | undefined,
  selectedEntities: readonly SpatialEntityDefinition[] = [],
  cameraState?: SceneCameraUrlState,
): MinimapOrientationSummary => {
  const scope: MinimapScope = 'system';
  let anchorId = bodiesSummary.scope === 'system' ? bodiesSummary.systemId : bodiesSummary.planetId;
  let anchorName = bodiesSummary.scope === 'system' ? bodiesSummary.systemName : bodiesSummary.planetName;
  const systemId = bodiesSummary.systemId;
  const systemName = bodiesSummary.systemName;

  const sectorName = systemDetails?.sectorName;
  let coordinatesPc = systemDetails?.coordinatesPc;
  let parentSemiMajorAxisAu: number | undefined;

  if (cameraState?.center) {
    const centerSlug = toUrlSlug(cameraState.center);
    const matchedPlanet =
      bodiesSummary.scope === 'system'
        ? bodiesSummary.planets?.find(
            (p) => toUrlSlug(p.id) === centerSlug || toUrlSlug(p.name) === centerSlug,
          )
        : undefined;
    const matchedStar =
      bodiesSummary.scope === 'system'
        ? bodiesSummary.stars?.find(
            (s) => toUrlSlug(s.id) === centerSlug || toUrlSlug(s.name) === centerSlug,
          )
        : undefined;
    const matchedMoon =
      bodiesSummary.scope === 'system'
        ? bodiesSummary.moonsAndDwarfPlanets?.find(
            (m) => toUrlSlug(m.id) === centerSlug || toUrlSlug(m.name) === centerSlug,
          )
        : bodiesSummary.moons?.find(
            (m) => toUrlSlug(m.id) === centerSlug || toUrlSlug(m.name) === centerSlug,
          );
    const matchedMinor = bodiesSummary.minorBodiesAndSpacecraft?.find(
      (m) => toUrlSlug(m.id) === centerSlug || toUrlSlug(m.name) === centerSlug,
    );
    const matchedFocused =
      focusedEntity &&
      (toUrlSlug(focusedEntity.id) === centerSlug ||
        toUrlSlug(focusedEntity.name) === centerSlug)
        ? focusedEntity
        : undefined;

    if (matchedPlanet) {
      anchorId = matchedPlanet.id;
      anchorName = matchedPlanet.name;
      if (matchedPlanet.semiMajorAxisAu !== undefined) {
        parentSemiMajorAxisAu = matchedPlanet.semiMajorAxisAu;
      }
    } else if (matchedStar) {
      anchorId = matchedStar.id;
      anchorName = matchedStar.name;
    } else if (matchedMoon) {
      anchorId = matchedMoon.id;
      anchorName = matchedMoon.name;
    } else if (matchedMinor) {
      anchorId = matchedMinor.id;
      anchorName = matchedMinor.name;
    } else if (matchedFocused) {
      anchorId = matchedFocused.id;
      anchorName = matchedFocused.name;
    }
  }

  if (
    cameraState?.x !== undefined &&
    cameraState?.y !== undefined &&
    cameraState?.z !== undefined
  ) {
    coordinatesPc = [cameraState.x, cameraState.y, cameraState.z];
  }

  const distanceFromOriginPc = coordinatesPc
    ? Number(Math.hypot(coordinatesPc[0], coordinatesPc[1], coordinatesPc[2]).toFixed(2))
    : undefined;

  const planetRadii = (bodiesSummary.scope === 'system' ? (bodiesSummary.planets ?? []) : [])
    .map((p) => p.semiMajorAxisAu)
    .filter((r): r is number => typeof r === 'number' && !Number.isNaN(r));
  const outerOrbitalRadiusAu =
    planetRadii.length > 0 ? Math.max(...planetRadii) : undefined;

  const habitableZoneAu = schematic?.habitableZoneAu;

  const planetsCount =
    bodiesSummary.scope === 'system' ? (bodiesSummary.planets?.length ?? 0) : 0;
  const moonsCount =
    bodiesSummary.scope === 'system'
      ? (bodiesSummary.moonsAndDwarfPlanets?.length ?? 0)
      : (bodiesSummary.moons?.length ?? 0);
  const minorBodiesCount = bodiesSummary.minorBodiesAndSpacecraft?.length ?? 0;
  const orbitingBodyCount = planetsCount + moonsCount + minorBodiesCount;

  const anchorMarker: MinimapMarkerItem = {
    id: bodiesSummary.systemId,
    name: bodiesSummary.systemName,
    kind: 'system',
    role: 'anchor',
    href: `/system/${bodiesSummary.systemId}`,
  };

  let focusedMarker: MinimapMarkerItem | null = null;
  if (focusedEntity) {
    const matchedPlanet =
      bodiesSummary.scope === 'system'
        ? bodiesSummary.planets?.find(
            (p) =>
              p.id === focusedEntity.id ||
              toUrlSlug(p.id) === toUrlSlug(focusedEntity.id) ||
              p.name.toLowerCase() === focusedEntity.name.toLowerCase(),
          )
        : undefined;
    focusedMarker = {
      id: focusedEntity.id,
      name: focusedEntity.name,
      kind: resolveEntityMarkerKind(focusedEntity),
      role: 'focused',
      href: `/system/${bodiesSummary.systemId}?focus=${focusedEntity.id}`,
      ...(matchedPlanet?.semiMajorAxisAu !== undefined
        ? { semiMajorAxisAu: matchedPlanet.semiMajorAxisAu }
        : {}),
    };
  }

  const selectedMarkers: MinimapMarkerItem[] = selectedEntities.map((e) => ({
    id: e.id,
    name: e.name,
    kind: resolveEntityMarkerKind(e),
    role: 'selected',
    href: `/system/${bodiesSummary.systemId}?focus=${e.id}`,
  }));

  const markers: MinimapMarkerItem[] = [
    anchorMarker,
    ...(focusedMarker && focusedMarker.id !== anchorMarker.id
      ? [focusedMarker]
      : []),
    ...selectedMarkers.filter(
      (m) => m.id !== anchorMarker.id && m.id !== focusedMarker?.id,
    ),
  ];

  return {
    scope,
    anchorId,
    anchorName,
    systemId,
    systemName,
    ...(sectorName !== undefined ? { sectorName } : {}),
    ...(coordinatesPc !== undefined ? { coordinatesPc } : {}),
    ...(distanceFromOriginPc !== undefined ? { distanceFromOriginPc } : {}),
    ...(outerOrbitalRadiusAu !== undefined ? { outerOrbitalRadiusAu } : {}),
    ...(habitableZoneAu !== undefined ? { habitableZoneAu } : {}),
    ...(parentSemiMajorAxisAu !== undefined ? { parentSemiMajorAxisAu } : {}),
    ...(cameraState?.az !== undefined ? { cameraAzimuthDeg: cameraState.az } : {}),
    ...(cameraState?.el !== undefined ? { cameraElevationDeg: cameraState.el } : {}),
    ...(cameraState?.dist !== undefined ? { cameraDistance: cameraState.dist } : {}),
    orbitingBodyCount,
    focusedMarker,
    selectedMarkers,
    markers,
  };
};

/**
 * Pure domain builder producing a `MinimapOrientationSummary` for a planetary frame (`PlanetView`).
 * Orients around the primary planet anchor or centered body (DEC-017, DEC-021).
 */
export const buildPlanetMinimapOrientation = (
  bodiesSummary: PlanetaryBodiesSummary | SystemBodiesSummary,
  focusedEntity: SpatialEntityDefinition | null | undefined,
  selectedEntities: readonly SpatialEntityDefinition[] = [],
  cameraState?: SceneCameraUrlState,
): MinimapOrientationSummary => {
  const scope: MinimapScope = 'planet';
  const primaryId = bodiesSummary.scope === 'planet' ? bodiesSummary.planetId : bodiesSummary.systemId;
  const primaryName = bodiesSummary.scope === 'planet' ? bodiesSummary.planetName : bodiesSummary.systemName;
  let anchorId = primaryId;
  let anchorName = primaryName;
  const systemId = bodiesSummary.systemId;
  const systemName = bodiesSummary.systemName;

  let parentSemiMajorAxisAu =
    bodiesSummary.scope === 'planet'
      ? bodiesSummary.planetDetail?.semiMajorAxisAu
      : undefined;
  let coordinatesPc: readonly [number, number, number] | undefined;

  if (cameraState?.center) {
    const centerSlug = toUrlSlug(cameraState.center);
    const matchedMoon =
      bodiesSummary.scope === 'planet'
        ? bodiesSummary.moons?.find(
            (m) => toUrlSlug(m.id) === centerSlug || toUrlSlug(m.name) === centerSlug,
          )
        : bodiesSummary.moonsAndDwarfPlanets?.find(
            (m) => toUrlSlug(m.id) === centerSlug || toUrlSlug(m.name) === centerSlug,
          );
    const matchedMinor = bodiesSummary.minorBodiesAndSpacecraft?.find(
      (m) => toUrlSlug(m.id) === centerSlug || toUrlSlug(m.name) === centerSlug,
    );
    const matchedFocused =
      focusedEntity &&
      (toUrlSlug(focusedEntity.id) === centerSlug ||
        toUrlSlug(focusedEntity.name) === centerSlug)
        ? focusedEntity
        : undefined;

    if (matchedMoon) {
      anchorId = matchedMoon.id;
      anchorName = matchedMoon.name;
    } else if (matchedMinor) {
      anchorId = matchedMinor.id;
      anchorName = matchedMinor.name;
    } else if (matchedFocused) {
      anchorId = matchedFocused.id;
      anchorName = matchedFocused.name;
    }
  }

  if (
    cameraState?.x !== undefined &&
    cameraState?.y !== undefined &&
    cameraState?.z !== undefined
  ) {
    coordinatesPc = [cameraState.x, cameraState.y, cameraState.z];
  }

  const moonsCount =
    bodiesSummary.scope === 'planet'
      ? (bodiesSummary.moons?.length ?? 0)
      : (bodiesSummary.moonsAndDwarfPlanets?.length ?? 0);
  const minorBodiesCount = bodiesSummary.minorBodiesAndSpacecraft?.length ?? 0;
  const orbitingBodyCount = moonsCount + minorBodiesCount;

  const anchorMarker: MinimapMarkerItem = {
    id: primaryId,
    name: primaryName,
    kind: bodiesSummary.scope === 'planet' ? 'planet' : 'system',
    role: 'anchor',
    href:
      bodiesSummary.scope === 'planet'
        ? `/planet/${primaryId}?focus=${primaryId}`
        : `/system/${primaryId}`,
    ...(parentSemiMajorAxisAu !== undefined ? { semiMajorAxisAu: parentSemiMajorAxisAu } : {}),
  };

  let focusedMarker: MinimapMarkerItem | null = null;
  if (focusedEntity) {
    focusedMarker = {
      id: focusedEntity.id,
      name: focusedEntity.name,
      kind: resolveEntityMarkerKind(focusedEntity),
      role: 'focused',
      href: `/planet/${primaryId}?focus=${focusedEntity.id}`,
    };
  }

  const selectedMarkers: MinimapMarkerItem[] = selectedEntities.map((e) => ({
    id: e.id,
    name: e.name,
    kind: resolveEntityMarkerKind(e),
    role: 'selected',
    href: `/planet/${primaryId}?focus=${e.id}`,
  }));

  const markers: MinimapMarkerItem[] = [
    anchorMarker,
    ...(focusedMarker && focusedMarker.id !== anchorMarker.id
      ? [focusedMarker]
      : []),
    ...selectedMarkers.filter(
      (m) => m.id !== anchorMarker.id && m.id !== focusedMarker?.id,
    ),
  ];

  return {
    scope,
    anchorId,
    anchorName,
    systemId,
    systemName,
    ...(coordinatesPc !== undefined ? { coordinatesPc } : {}),
    ...(parentSemiMajorAxisAu !== undefined ? { parentSemiMajorAxisAu } : {}),
    ...(cameraState?.az !== undefined ? { cameraAzimuthDeg: cameraState.az } : {}),
    ...(cameraState?.el !== undefined ? { cameraElevationDeg: cameraState.el } : {}),
    ...(cameraState?.dist !== undefined ? { cameraDistance: cameraState.dist } : {}),
    orbitingBodyCount,
    focusedMarker,
    selectedMarkers,
    markers,
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

export { extractUrlPlanetSlug, extractUrlSystemSlug, hasExplicitFocusParam };
