import type { SpatialEntityDefinition } from '../../components/canvas/entity/types';
import type {
  CircumstellarDiskKind,
  CircumstellarDiskRecord,
  DatasetLayerKind,
  ExoplanetRecord,
} from '../../types/astro';
import {
  PLANET_HAZARD_BITS,
  SYSTEM_HAZARD_BITS,
  classifyPlanetPhysical,
  isPlanetHabitableCandidate,
  computePlanetCompositionCounts,
} from '../../utils/astroMath';
import type { CompactSearchEntry } from '../../utils/compactDataCodec';
import {
  toAnnotationLookupKey,
  toCanonicalLayerSlug,
  toUrlSlug,
  type DecodedEntityAnnotation,
} from '../../utils/datasetLayerCodec';
import {
  buildLayerGalaxyHref,
  isArtificialSpacecraftEntry,
} from '../searchService';
import type {
  CanonAnnotationOrderOptions,
  EntityHazardItem,
  FocusedCanonAnnotation,
  FocusedDiskDetail,
  FocusedEntityKind,
  FocusedPlanetDetail,
  PlanetCompositionClass,
  PlanetCompositionCount,
  SystemSummarySegment,
} from './types';

export function decodeSystemHazards(mask?: number): readonly EntityHazardItem[] {
  if (!mask || mask <= 0) return [];
  const hazards: EntityHazardItem[] = [];

  if (mask & SYSTEM_HAZARD_BITS.FLARE_STAR) {
    hazards.push({
      code: 'flare-star',
      label: 'Stellar flare activity',
      severity: 'warning',
      description: 'Active stellar chromosphere flare events producing ultraviolet and X-ray radiation spikes.',
    });
  }

  if (mask & SYSTEM_HAZARD_BITS.IONISING_RADIATION) {
    hazards.push({
      code: 'ionising-radiation',
      label: 'Hard ionising radiation',
      severity: 'critical',
      description: 'High-energy ionizing flux from high-temperature stellar surface or degenerate remnant.',
    });
  }

  if (mask & SYSTEM_HAZARD_BITS.VARIABLE_FLUX) {
    hazards.push({
      code: 'variable-flux',
      label: 'Variable stellar flux',
      severity: 'warning',
      description: 'Significant bolometric luminosity fluctuations across periodic stellar cycles.',
    });
  }

  return hazards;
}

export function decodePlanetHazards(mask?: number): readonly EntityHazardItem[] {
  if (!mask || mask <= 0) return [];
  const hazards: EntityHazardItem[] = [];

  if (mask & PLANET_HAZARD_BITS.EXTREME_HEAT) {
    hazards.push({
      code: 'extreme-heat',
      label: 'Extreme thermal flux',
      severity: 'critical',
      description: 'Surface equilibrium temperature exceeds 373 K (boiling point of water at 1 atm).',
    });
  }

  if (mask & PLANET_HAZARD_BITS.CRYOGENIC_COLD) {
    hazards.push({
      code: 'cryogenic-cold',
      label: 'Cryogenic surface temperature',
      severity: 'warning',
      description: 'Surface equilibrium temperature drops below 180 K, freezing volatile compounds.',
    });
  }

  if (mask & PLANET_HAZARD_BITS.HIGH_GRAVITY) {
    hazards.push({
      code: 'high-gravity',
      label: 'High surface gravity',
      severity: 'warning',
      description: 'Surface gravitational acceleration exceeds 1.2 g Earth standard.',
    });
  }

  if (mask & PLANET_HAZARD_BITS.TIDAL_LOCKING) {
    hazards.push({
      code: 'tidal-locking',
      label: 'Tidally locked (synchronous)',
      severity: 'warning',
      description: 'Rotational period synchronised with orbital period, creating permanent day/night hemispheres.',
    });
  }

  if (mask & PLANET_HAZARD_BITS.HIGH_ECCENTRICITY) {
    hazards.push({
      code: 'high-eccentricity',
      label: 'High orbital eccentricity',
      severity: 'warning',
      description: 'Orbital eccentricity exceeds 0.20, driving severe seasonal climate variability.',
    });
  }

  return hazards;
}

export function formatHazardSummaryLabel(count: number): string {
  if (count <= 0) return '0 hazards';
  return `${count} ${count === 1 ? 'hazard' : 'hazards'}`;
}

export function formatDiskKindLabel(kind: CircumstellarDiskKind): string {
  switch (kind) {
    case 'asteroid-belt':
      return 'Asteroid Belt';
    case 'kuiper-belt':
      return 'Kuiper Belt';
    case 'debris-disk':
      return 'Debris Disk';
    default:
      return 'Circumstellar Disk';
  }
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
  return classifyPlanetPhysical(planet);
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
 * Pure predicate determining whether an orbiting body or search entry resides within
 * a circumstellar disk or belt (either via explicit 'belt'/'kuiper' region flag or radial range).
 */
export const isDwarfPlanetInDisk = (
  entry: CompactSearchEntry | undefined,
  disk: CircumstellarDiskRecord | FocusedDiskDetail,
  semiMajorAxisAu?: number,
): boolean => {
  if (entry?.e === 'belt' && disk.kind === 'asteroid-belt') return true;
  if (entry?.e === 'kuiper' && disk.kind === 'kuiper-belt') return true;

  const a = semiMajorAxisAu ?? entry?.A;
  if (a !== undefined && Number.isFinite(a)) {
    return a >= disk.innerRadiusAu && a <= disk.outerRadiusAu;
  }
  return false;
};

/**
 * Pure builder producing the structured planet composition breakdown for the Peek detent.
 * Reads precalculated composition counts `[terrestrial, superEarth, iceGiant, gasGiant]`
 * or legacy `[terrestrial, iceGiant, gasGiant]` when available.
 */
export const buildPlanetCompositionBreakdown = (
  planets: readonly FocusedPlanetDetail[],
  fallbackCount: number,
  fallbackCensus?: readonly PlanetCompositionClass[],
  precalculatedCounts?:
    | readonly [number, number, number, number]
    | readonly [number, number, number],
): readonly PlanetCompositionCount[] => {
  const totalCount = Math.max(planets.length, fallbackCount);
  if (totalCount <= 0) {
    return [];
  }

  const hasPrecalculated =
    precalculatedCounts !== undefined &&
    ((precalculatedCounts[0] ?? 0) > 0 ||
      (precalculatedCounts[1] ?? 0) > 0 ||
      (precalculatedCounts[2] ?? 0) > 0 ||
      (precalculatedCounts[3] !== undefined && precalculatedCounts[3] > 0));

  if (hasPrecalculated && precalculatedCounts) {
    const items: PlanetCompositionCount[] = [];
    if (precalculatedCounts.length === 4) {
      if (precalculatedCounts[0] > 0) {
        items.push({ composition: 'terrestrial', count: precalculatedCounts[0] });
      }
      if (precalculatedCounts[1] > 0) {
        items.push({ composition: 'super-earth', count: precalculatedCounts[1] });
      }
      if (precalculatedCounts[2] > 0) {
        items.push({ composition: 'ice-giant', count: precalculatedCounts[2] });
      }
      if (precalculatedCounts[3] > 0) {
        items.push({ composition: 'gas-giant', count: precalculatedCounts[3] });
      }
    } else {
      // Legacy 3-tuple [terrestrial, iceGiant, gasGiant]
      if (precalculatedCounts[0] > 0) {
        items.push({ composition: 'terrestrial', count: precalculatedCounts[0] });
      }
      if (precalculatedCounts[1] > 0) {
        items.push({ composition: 'ice-giant', count: precalculatedCounts[1] });
      }
      if (precalculatedCounts[2] > 0) {
        items.push({ composition: 'gas-giant', count: precalculatedCounts[2] });
      }
    }
    return items;
  }

  if (planets.length > 0 && planets.length >= totalCount) {
    const counts = computePlanetCompositionCounts(planets) ?? [0, 0, 0, 0];
    const [terrestrial, superEarth, iceGiant, gasGiant] = counts;
    const items: PlanetCompositionCount[] = [];
    if (terrestrial > 0) {
      items.push({ composition: 'terrestrial', count: terrestrial });
    }
    if (superEarth > 0) {
      items.push({ composition: 'super-earth', count: superEarth });
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
  precalculatedCounts?:
    | readonly [number, number, number, number]
    | readonly [number, number, number],
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

  if (input.focusedKind === 'belt') {
    const count = input.orbitingBodyCount ?? 0;
    const residentSuffix =
      count > 0
        ? ` hosting ${count} catalogued resident ${count === 1 ? 'body' : 'bodies'}.`
        : '.';
    return [
      {
        kind: 'text',
        text: `${input.name} is a circumstellar disk orbiting ${input.systemName}${residentSuffix}`,
      },
    ];
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

export function buildInPlaceLayerItemHref(
  layerId: string,
  targetId: string,
  name?: string,
  currentPathname?: string,
  currentSearch?: string,
): string {
  const cleanId = targetId.includes(':')
    ? targetId.split(':').slice(1).join(':')
    : targetId;
  const itemSlug = toUrlSlug(name || cleanId);
  const layerSlug = toCanonicalLayerSlug(layerId) || toUrlSlug(layerId);

  const searchParams = new URLSearchParams(currentSearch ?? '');
  searchParams.set('select', `layer:${layerSlug}`);
  searchParams.set('layer', `${layerSlug}:${itemSlug}`);
  const qs = searchParams.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ',');
  const basePath = currentPathname || '/galaxy';
  return `${basePath}?${qs}`;
}

const toFocusedCanonAnnotation = (
  record: DecodedEntityAnnotation,
  _corpus?: readonly CompactSearchEntry[],
  currentPathname?: string,
  currentSearch?: string,
): FocusedCanonAnnotation => {
  const displayName = record.inUniverseName || record.resolvedName;
  return {
    layerId: record.layerId,
    layerTitle: record.layerTitle,
    layerHref: buildLayerGalaxyHref(record.layerId),
    href: buildInPlaceLayerItemHref(
      record.layerId,
      record.targetId,
      displayName,
      currentPathname,
      currentSearch,
    ),
    kind: record.kind,
    targetId: record.targetId,
    targetType: record.targetType,
    ...(record.inUniverseName ? { inUniverseName: record.inUniverseName } : {}),
    ...(record.resolvedName ? { resolvedName: record.resolvedName } : {}),
    ...(record.subtitle ? { subtitle: record.subtitle } : {}),
    ...(record.workTitle ? { workTitle: record.workTitle } : {}),
    text: record.text,
    ...(record.creator ? { creator: record.creator } : {}),
    ...(record.publicationYear
      ? { publicationYear: record.publicationYear }
      : {}),
  };
};

/**
 * Pure resolver gathering all canon layer annotations (`FS-001` / `FS-002`) relevant to a focused
 * entity and its host star system from decoded by-entity annotation records, ordered with factual
 * (`scientific-overlay`) layers before fictional (`fictional-canon`) layers and supporting
 * user-curated layer ordering. Direct entity matches precede system-wide matches within a kind.
 */
export const resolveFocusedCanonAnnotations = (
  targetId: string,
  systemId: string,
  records: readonly DecodedEntityAnnotation[],
  orderOptions?: CanonAnnotationOrderOptions,
  corpus?: readonly CompactSearchEntry[],
  currentPathname?: string,
  currentSearch?: string,
): readonly FocusedCanonAnnotation[] => {
  const rawTargetKey = toAnnotationLookupKey(targetId);

  const directMatches = records.filter((r) => r.targetId === rawTargetKey);
  const systemMatches = records.filter(
    (r) => r.systemId === systemId || r.targetId === systemId,
  );

  const seen = new Set<string>();
  const annotations: FocusedCanonAnnotation[] = [];

  for (const record of [...directMatches, ...systemMatches]) {
    const dedupeKey = `${record.layerId}:${record.targetId}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    annotations.push(
      toFocusedCanonAnnotation(record, corpus, currentPathname, currentSearch),
    );
  }

  return sortCanonAnnotations(annotations, orderOptions);
};

export const toCoordinatesTuple = (
  pos: SpatialEntityDefinition['position'] | undefined,
): readonly [number, number, number] => {
  if (Array.isArray(pos)) {
    const x = Number.isFinite(pos[0]) ? pos[0] : 0;
    const y = Number.isFinite(pos[1]) ? pos[1] : 0;
    const z = Number.isFinite(pos[2]) ? pos[2] : 0;
    return [x, y, z];
  }
  if (pos && typeof pos === 'object') {
    const x = Number.isFinite(pos.x) ? pos.x : 0;
    const y = Number.isFinite(pos.y) ? pos.y : 0;
    const z = Number.isFinite(pos.z) ? pos.z : 0;
    return [x, y, z];
  }
  return [0, 0, 0];
};

export const resolveMinorBodyCategoryLabel = (entry?: CompactSearchEntry): string => {
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

export const resolveCorpusEntryComposition = (
  entry?: CompactSearchEntry,
): PlanetCompositionClass => {
  if (
    entry?.u === 'gas-giant' ||
    entry?.u === 'ice-giant' ||
    entry?.u === 'super-earth'
  ) {
    return entry.u;
  }
  return 'terrestrial';
};

export const resolveDirectTargetCanonAnnotations = (
  targetIds: readonly string[],
  recordsById: Readonly<Record<string, readonly DecodedEntityAnnotation[]>>,
  corpus?: readonly CompactSearchEntry[],
): readonly FocusedCanonAnnotation[] => {
  const seen = new Set<string>();
  const annotations: FocusedCanonAnnotation[] = [];

  for (const targetId of targetIds) {
    const rawTargetKey = toAnnotationLookupKey(targetId);
    for (const record of recordsById[rawTargetKey] ?? []) {
      if (record.targetId !== rawTargetKey) {
        continue;
      }
      const dedupeKey = `${record.layerId}:${record.targetId}`;
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      annotations.push(toFocusedCanonAnnotation(record, corpus));
    }
  }

  return sortCanonAnnotations(annotations);
};
