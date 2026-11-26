import type { DecodedDetailRecord } from '../../data/detailsRepository';
import type { CelestialSymbolType } from '../../types/astro';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import { computeHyperbolicRadiusAu } from '../../utils/keplerMath';
import { isArtificialSpacecraftEntry } from '../search/searchCorpusHelpers';
import type { FocusedEntityDetails } from './detailsEntityTypes';
import type {
  OrbitalSchematicEntityKind,
  OrbitalSchematicLineStyle,
  OrbitalSchematicTrackRow,
  OrbitalSchematicZone,
} from './detailsHierarchyTypes';

const MINOR_INFERRED_PREFIXES = ['pha-', 'distant-', 'comet-'] as const;

export const isBulkMinorBodyId = (id: string): boolean =>
  MINOR_INFERRED_PREFIXES.some((prefix) => id.startsWith(prefix));

export interface CollectorContext {
  readonly focusedDetails: FocusedEntityDetails;
  readonly systemDetail?: DecodedDetailRecord;
  readonly focusedDetail?: DecodedDetailRecord;
  readonly corpus: readonly CompactSearchEntry[];
  readonly epochMs: number;
  readonly focusedIdSlug: string;
  readonly selectedSet: ReadonlySet<string>;
  readonly selectedSlugSet: ReadonlySet<string>;
}

export const matchesIdOrSlug = (
  id: string,
  name: string,
  targetId: string,
  targetSlug: string,
): boolean => {
  if (id === targetId) return true;
  if (!targetSlug) return false;
  return toUrlSlug(id) === targetSlug || toUrlSlug(name) === targetSlug;
};

export const isInSelection = (
  id: string,
  name: string,
  selectedSet: ReadonlySet<string>,
  selectedSlugSet: ReadonlySet<string>,
): boolean =>
  selectedSet.has(id) ||
  selectedSlugSet.has(toUrlSlug(id)) ||
  selectedSlugSet.has(toUrlSlug(name));

export const isInsideHabitableZone = (
  distanceAu: number,
  habitableZoneAu: readonly [number, number] | undefined,
): boolean =>
  Boolean(
    habitableZoneAu &&
      Number.isFinite(distanceAu) &&
      distanceAu >= habitableZoneAu[0] &&
      distanceAu <= habitableZoneAu[1],
  );

export const resolveOrbitDistanceAndStyle = (
  orbit:
    | {
        readonly semiMajorAxis: number;
        readonly eccentricity: number;
        readonly meanAnomaly?: number;
      }
    | undefined,
  corpusSemiMajorAxis: number | undefined,
  epochMs: number,
  primaryMassMsun: number,
): { readonly sortDistanceAu: number; readonly lineStyle: OrbitalSchematicLineStyle } | null => {
  if (orbit && orbit.semiMajorAxis < 0 && orbit.eccentricity > 1) {
    return {
      sortDistanceAu: computeHyperbolicRadiusAu(orbit, epochMs, primaryMassMsun),
      lineStyle: 'dotted',
    };
  }
  if (orbit && Number.isFinite(orbit.semiMajorAxis) && orbit.semiMajorAxis > 0) {
    return {
      sortDistanceAu: orbit.semiMajorAxis,
      lineStyle: orbit.eccentricity >= 1 ? 'dotted' : 'dashed',
    };
  }
  if (
    typeof corpusSemiMajorAxis === 'number' &&
    Number.isFinite(corpusSemiMajorAxis) &&
    corpusSemiMajorAxis > 0
  ) {
    return { sortDistanceAu: corpusSemiMajorAxis, lineStyle: 'dashed' };
  }
  if (
    typeof corpusSemiMajorAxis === 'number' &&
    Number.isFinite(corpusSemiMajorAxis) &&
    corpusSemiMajorAxis < 0
  ) {
    return { sortDistanceAu: Math.abs(corpusSemiMajorAxis), lineStyle: 'dotted' };
  }
  return null;
};

export const resolveMinorCorpusKind = (
  entry: CompactSearchEntry,
  classification: string | undefined,
  reticleType: CelestialSymbolType | undefined,
): OrbitalSchematicEntityKind => {
  if (
    isArtificialSpacecraftEntry(entry) ||
    classification === 'Spacecraft' ||
    reticleType === 'construct' ||
    reticleType === 'spacecraft'
  ) {
    return 'spacecraft';
  }
  if (classification === 'Comet' || reticleType === 'comet') {
    return 'comet';
  }
  return 'minor-body';
};

export const assignZonesAndSortRows = (
  rawRows: readonly OrbitalSchematicTrackRow[],
  rawZones: readonly OrbitalSchematicZone[],
): {
  readonly rows: readonly OrbitalSchematicTrackRow[];
  readonly zones: readonly OrbitalSchematicZone[];
} => {
  const zones = [...rawZones].sort((a, b) => {
    if (a.innerRadiusAu !== b.innerRadiusAu) return a.innerRadiusAu - b.innerRadiusAu;
    return a.outerRadiusAu - b.outerRadiusAu;
  });

  const rowsWithZone = rawRows.map((row) => {
    let bestZone: OrbitalSchematicZone | undefined;
    let bestSpan = Number.POSITIVE_INFINITY;
    for (const zone of zones) {
      if (
        Number.isFinite(row.sortDistanceAu) &&
        row.sortDistanceAu >= zone.innerRadiusAu &&
        row.sortDistanceAu <= zone.outerRadiusAu
      ) {
        const span = zone.outerRadiusAu - zone.innerRadiusAu;
        if (span < bestSpan) {
          bestSpan = span;
          bestZone = zone;
        }
      }
    }
    return bestZone ? { ...row, zoneId: bestZone.id } : row;
  });

  const rows = rowsWithZone
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      if (a.row.sortDistanceAu !== b.row.sortDistanceAu) {
        return a.row.sortDistanceAu - b.row.sortDistanceAu;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.row);

  return { rows, zones };
};
