import type { ExoplanetRecord, SystemManifest, SystemSummaryNode } from '../../../types/astro';
import type { SpatialEntityDefinition } from '../entity';
import { resolveCorpusEntryComposition } from '../../../services/details/detailsComposition';
import { getCorpusSystemChildrenIndex } from '../../../services/details/focusedChildrenResolver';
import type { CompactSearchEntry } from '../../../utils/compactDataTypes';
import { toUrlSlug } from '../../../utils/datasetLayerSlugs';
import { formatSlugFallbackTitle } from '../../../utils/starNaming';
import { calculateKeplerianPosition } from '../math/kepler';
import type { StarDossierData } from './SystemScene';

const finiteOr = (val: number | undefined, fallback: number): number =>
  typeof val === 'number' && Number.isFinite(val) ? val : fallback;

const positiveFiniteOr = (val: number | undefined): number | undefined =>
  typeof val === 'number' && Number.isFinite(val) && val > 0 ? val : undefined;

export function resolveSystemPlanetEntity(
  planet: ExoplanetRecord,
  index: number,
  primaryStarMassMsun?: number,
): SpatialEntityDefinition {
  const cataloguedA = positiveFiniteOr(planet.orbit?.semiMajorAxis);
  const cataloguedP = positiveFiniteOr(planet.orbit?.periodDays);
  const parsedMass = positiveFiniteOr(primaryStarMassMsun);
  const starMass = parsedMass !== undefined ? parsedMass : 1.0;

  const a =
    cataloguedA ??
    (cataloguedP
      ? Math.round(Math.cbrt((cataloguedP / 365.25) ** 2 * starMass) * 10000) / 10000
      : Math.round((0.4 + index * 0.6) * 1000) / 1000);

  const e = finiteOr(planet.orbit?.eccentricity, 0);
  const inc = finiteOr(planet.orbit?.inclination, 0);
  const node = finiteOr(planet.orbit?.ascendingNode, 0);
  const peri = finiteOr(planet.orbit?.argumentOfPeriapsis, 0);
  const meanAnomaly = finiteOr(planet.orbit?.meanAnomaly, (index * 60) % 360);
  const period =
    cataloguedP ?? Math.round((Math.pow(a, 1.5) / Math.sqrt(starMass)) * 365.25);

  return {
    id: planet.id,
    name: planet.name,
    position: calculateKeplerianPosition(a, e, inc, node, peri, meanAnomaly),
    classification: planet.composition ?? 'terrestrial',
    orbit: {
      semiMajorAxis: a,
      eccentricity: e,
      inclination: inc,
      ascendingNode: node,
      argumentOfPeriapsis: peri,
      period,
      meanAnomaly,
      lineStyle: cataloguedA ? 'dashed' : 'dotted',
    },
  };
}

export function resolveCorpusPlanetEntity(
  entry: CompactSearchEntry,
  index: number,
): SpatialEntityDefinition {
  const cataloguedA = positiveFiniteOr(entry.A);
  const a = cataloguedA ?? Math.round((0.4 + index * 0.6) * 1000) / 1000;
  const meanAnomaly = (index * 60) % 360;

  return {
    id: entry.i,
    name: entry.n ?? entry.i,
    position: calculateKeplerianPosition(a, 0, 0, 0, 0, meanAnomaly),
    classification: resolveCorpusEntryComposition(entry),
    orbit: {
      semiMajorAxis: a,
      eccentricity: 0,
      inclination: 0,
      ascendingNode: 0,
      argumentOfPeriapsis: 0,
      period: Math.round(Math.pow(a, 1.5) * 365.25),
      meanAnomaly,
      lineStyle: cataloguedA ? 'dashed' : 'dotted',
    },
  };
}

export interface ResolveBaseSystemSceneEntitiesParams {
  readonly targetId?: string;
  readonly resolvedId?: string;
  readonly explicitSystem?: StarDossierData;
  readonly sysManifest?: SystemManifest;
  readonly summaryNode?: SystemSummaryNode;
  readonly matchedEntry?: CompactSearchEntry;
  readonly activeCorpus: readonly CompactSearchEntry[];
}

export interface ResolveSystemSceneEntitiesParams extends ResolveBaseSystemSceneEntitiesParams {
  readonly centerId?: string;
  readonly focusedId: string | null;
  readonly selectedIds: ReadonlySet<string>;
}

export interface BaseSystemSceneEntitiesResult {
  readonly baseEntities: SpatialEntityDefinition[];
  readonly baseKeys: ReadonlySet<string>;
  readonly lookupKeys: readonly string[];
  readonly resolvedSlug: string;
}

const EMPTY_EXTRA_ENTITIES: readonly SpatialEntityDefinition[] = [];

function recordEntityKeys(keys: Set<string>, id: string, name?: string): void {
  if (id) {
    keys.add(id);
    const idSlug = toUrlSlug(id);
    if (idSlug) keys.add(idSlug);
  }
  if (name) {
    const nameSlug = toUrlSlug(name);
    if (nameSlug) keys.add(nameSlug);
  }
}

function isEntryAlreadyRegistered(existingKeys: ReadonlySet<string>, entry: CompactSearchEntry): boolean {
  const idSlug = toUrlSlug(entry.i);
  const nameSlug = toUrlSlug(entry.n);
  return (
    existingKeys.has(entry.i) ||
    (idSlug !== '' && existingKeys.has(idSlug)) ||
    (nameSlug !== '' && existingKeys.has(nameSlug))
  );
}

function isOrbitingSystemStar(entry: CompactSearchEntry, resolvedSlug: string): boolean {
  return !entry.o || (resolvedSlug !== '' && toUrlSlug(entry.o) === resolvedSlug);
}

export function resolveBaseSystemSceneEntities({
  targetId,
  resolvedId,
  explicitSystem,
  sysManifest,
  summaryNode,
  matchedEntry,
  activeCorpus,
}: ResolveBaseSystemSceneEntitiesParams): BaseSystemSceneEntitiesResult {
  if (!resolvedId && !targetId) {
    return { baseEntities: [], baseKeys: new Set(), lookupKeys: [], resolvedSlug: '' };
  }

  const starName =
    explicitSystem?.name ??
    sysManifest?.name ??
    summaryNode?.name ??
    matchedEntry?.n ??
    (targetId ? formatSlugFallbackTitle(targetId) : 'System');
  const starSpectral =
    explicitSystem?.spectralType ??
    sysManifest?.stars?.[0]?.spectralType ??
    summaryNode?.spect ??
    matchedEntry?.m?.[1];

  const starEntity: SpatialEntityDefinition = {
    id: explicitSystem?.id ?? resolvedId ?? targetId ?? '',
    name: starName,
    position: [0, 0, 0],
    classification: 'star',
    spectralType: starSpectral,
    multiplicity: sysManifest?.stars?.length ?? summaryNode?.starCount ?? 1,
    planets: sysManifest?.planets?.map((p) => ({
      id: p.id,
      name: p.name,
      classification: p.composition ?? 'terrestrial',
    })),
  };

  const primaryStarMassMsun = explicitSystem?.massMsun ?? sysManifest?.stars?.[0]?.massMsun;
  const resolvedSlug = resolvedId ? toUrlSlug(resolvedId) : '';
  const childrenIndex = getCorpusSystemChildrenIndex(activeCorpus);
  const lookupKeys = [resolvedId, resolvedSlug, targetId].filter((key): key is string => Boolean(key));
  let planetEntities: SpatialEntityDefinition[] = [];

  if (explicitSystem?.planets?.length) {
    planetEntities = explicitSystem.planets.map((p, i) => resolveSystemPlanetEntity(p, i, primaryStarMassMsun));
  } else if (sysManifest?.planets?.length) {
    planetEntities = sysManifest.planets.map((p, i) => resolveSystemPlanetEntity(p, i, primaryStarMassMsun));
  } else {
    const seen = new Set<CompactSearchEntry>();
    const corpusPlanets: CompactSearchEntry[] = [];
    for (const key of lookupKeys) {
      for (const entry of childrenIndex.get(key) ?? []) {
        if ((entry.k === 2 || entry.k === 4) && isOrbitingSystemStar(entry, resolvedSlug) && !seen.has(entry)) {
          seen.add(entry);
          corpusPlanets.push(entry);
        }
      }
    }
    planetEntities = corpusPlanets.map((p, i) => resolveCorpusPlanetEntity(p, i));
  }

  const existingKeys = new Set<string>();
  recordEntityKeys(existingKeys, starEntity.id, starEntity.name);
  for (const planet of planetEntities) recordEntityKeys(existingKeys, planet.id, planet.name);

  const dwarfEntities: SpatialEntityDefinition[] = [];
  const seenDwarf = new Set<CompactSearchEntry>();
  for (const key of lookupKeys) {
    for (const entry of childrenIndex.get(key) ?? []) {
      if (entry.k !== 4 || seenDwarf.has(entry) || isEntryAlreadyRegistered(existingKeys, entry)) continue;
      seenDwarf.add(entry);
      if (!isOrbitingSystemStar(entry, resolvedSlug)) continue;
      dwarfEntities.push(resolveCorpusPlanetEntity(entry, planetEntities.length + dwarfEntities.length));
      recordEntityKeys(existingKeys, entry.i, entry.n);
    }
  }

  return { baseEntities: [starEntity, ...planetEntities, ...dwarfEntities], baseKeys: existingKeys, lookupKeys, resolvedSlug };
}

export function resolveTargetedSystemExtraEntities(params: {
  readonly base: BaseSystemSceneEntitiesResult;
  readonly activeCorpus: readonly CompactSearchEntry[];
  readonly centerId?: string;
  readonly focusedId: string | null;
  readonly selectedIds: ReadonlySet<string>;
}): readonly SpatialEntityDefinition[] {
  const { base, activeCorpus, centerId, focusedId, selectedIds } = params;
  if (base.baseEntities.length === 0) return EMPTY_EXTRA_ENTITIES;

  const targetMatchKeys = new Set<string>();
  recordEntityKeys(targetMatchKeys, centerId ?? '');
  recordEntityKeys(targetMatchKeys, focusedId ?? '');
  for (const id of selectedIds) recordEntityKeys(targetMatchKeys, id);
  if (targetMatchKeys.size === 0) return EMPTY_EXTRA_ENTITIES;

  let hasUnmountedTarget = false;
  for (const key of targetMatchKeys) {
    if (!base.baseKeys.has(key)) {
      hasUnmountedTarget = true;
      break;
    }
  }
  if (!hasUnmountedTarget) return EMPTY_EXTRA_ENTITIES;

  const childrenIndex = getCorpusSystemChildrenIndex(activeCorpus);
  const existingKeys = new Set(base.baseKeys);
  const extraEntities: SpatialEntityDefinition[] = [];
  const seenExtra = new Set<CompactSearchEntry>();

  for (const key of base.lookupKeys) {
    for (const entry of childrenIndex.get(key) ?? []) {
      if (seenExtra.has(entry) || isEntryAlreadyRegistered(existingKeys, entry)) continue;
      seenExtra.add(entry);
      if (!isOrbitingSystemStar(entry, base.resolvedSlug)) continue;

      const isEligibleKind = entry.k === 2 || entry.k === 4 || entry.k === 6 || (entry.k === 7 && entry.i !== entry.w);
      const idSlug = toUrlSlug(entry.i);
      const nameSlug = toUrlSlug(entry.n);
      const isTargeted =
        targetMatchKeys.has(entry.i) ||
        (idSlug !== '' && targetMatchKeys.has(idSlug)) ||
        (nameSlug !== '' && targetMatchKeys.has(nameSlug));
      if (!(isEligibleKind && isTargeted)) continue;

      extraEntities.push(resolveCorpusPlanetEntity(entry, base.baseEntities.length - 1 + extraEntities.length));
      recordEntityKeys(existingKeys, entry.i, entry.n);
    }
  }

  return extraEntities.length > 0 ? extraEntities : EMPTY_EXTRA_ENTITIES;
}

export function resolveSystemSceneEntities({
  centerId,
  focusedId,
  selectedIds,
  ...baseParams
}: ResolveSystemSceneEntitiesParams): SpatialEntityDefinition[] {
  const base = resolveBaseSystemSceneEntities(baseParams);
  if (base.baseEntities.length === 0) return [];
  const extras = resolveTargetedSystemExtraEntities({
    base,
    activeCorpus: baseParams.activeCorpus,
    centerId,
    focusedId,
    selectedIds,
  });
  return extras.length > 0 ? [...base.baseEntities, ...extras] : base.baseEntities;
}
