import type { DecodedDetailRecord } from '../../data/detailsRepository';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import {
  J2000_UNIX_MS,
  computeOptimisticHabitableZoneAu,
} from '../../utils/keplerMath';
import type { FocusedEntityDetails } from './detailsEntityTypes';
import type {
  OrbitalSchematicBand,
  OrbitalSchematicParentKind,
  OrbitalSchematicSummary,
  OrbitalSchematicTrackRow,
} from './detailsHierarchyTypes';
import {
  collectPlanetaryOrbitalEntries,
  collectSystemOrbitalEntries,
} from './orbitalSchematicCollectors';
import { assignZonesAndSortRows } from './orbitalSchematicShared';

export const MINOR_ORBITER_TOGGLE_THRESHOLD = 3;

export interface BuildOrbitalSchematicInput {
  readonly focusedDetails: FocusedEntityDetails | null;
  readonly systemDetail?: DecodedDetailRecord;
  readonly focusedDetail?: DecodedDetailRecord;
  readonly corpus?: readonly CompactSearchEntry[];
  readonly selectedEntityIds?: readonly string[];
  readonly epochMs?: number;
  readonly getDetailRecord?: (id: string) => DecodedDetailRecord | undefined;
}

const emptyDetailLookup = (): DecodedDetailRecord | undefined => undefined;

export const buildOrbitalSchematic = (
  input: BuildOrbitalSchematicInput,
): OrbitalSchematicSummary | null => {
  const { focusedDetails, systemDetail, focusedDetail } = input;
  if (!focusedDetails) return null;
  if (focusedDetails.focusedKind === 'belt' || focusedDetails.focusedKind === 'structure') {
    return null;
  }

  const selectedIds = input.selectedEntityIds ?? [];
  const ctx = {
    focusedDetails,
    systemDetail,
    focusedDetail,
    corpus: input.corpus ?? [],
    epochMs: input.epochMs ?? J2000_UNIX_MS,
    focusedIdSlug: toUrlSlug(focusedDetails.id),
    selectedSet: new Set(selectedIds),
    selectedSlugSet: new Set(selectedIds.map(toUrlSlug).filter(Boolean)),
    getDetailRecord: input.getDetailRecord ?? emptyDetailLookup,
  };

  let habitableZoneAu: readonly [number, number] | undefined;
  let parentKind: OrbitalSchematicParentKind;
  let collected: ReturnType<typeof collectSystemOrbitalEntries>;

  if (focusedDetails.focusedKind === 'system' || focusedDetails.focusedKind === 'star') {
    parentKind = focusedDetails.focusedKind === 'star' ? 'star' : 'system';
    const primaryStar = focusedDetails.stars[0];
    const primaryStarMass =
      typeof primaryStar?.massMsun === 'number' &&
      Number.isFinite(primaryStar.massMsun) &&
      primaryStar.massMsun > 0
        ? primaryStar.massMsun
        : 1.0;
    habitableZoneAu = computeOptimisticHabitableZoneAu(primaryStar?.luminosityLsun);
    collected = collectSystemOrbitalEntries(ctx, habitableZoneAu, primaryStarMass);
  } else {
    parentKind =
      focusedDetails.focusedKind === 'planet'
        ? 'planet'
        : focusedDetails.minorBodyTelemetry?.classification === 'dwarf-planet'
          ? 'dwarf-planet'
          : 'minor-body';
    collected = collectPlanetaryOrbitalEntries(ctx);
  }

  const { rows, zones } = assignZonesAndSortRows(collected.rows, collected.zones);
  if (rows.length === 0 && zones.length === 0) {
    return null;
  }

  const minorBodyCount = rows.filter((r) => r.tier === 'minor').length;
  return {
    parentId: focusedDetails.id,
    parentName: focusedDetails.name,
    parentKind,
    systemId: focusedDetails.systemId,
    systemName: focusedDetails.systemName,
    ...(habitableZoneAu ? { habitableZoneAu } : {}),
    rows,
    zones,
    minorBodyCount,
    hasMinorToggle: minorBodyCount > MINOR_ORBITER_TOGGLE_THRESHOLD,
  };
};

export const buildOrbitalSchematicBands = (
  summary: OrbitalSchematicSummary,
  includeMinor: boolean,
): readonly OrbitalSchematicBand[] => {
  const visibleRows =
    !summary.hasMinorToggle || includeMinor
      ? summary.rows
      : summary.rows.filter((r) => r.tier === 'primary');

  const zoneIdSet = new Set(summary.zones.map((z) => z.id));
  const rowsByZoneId = new Map<string, OrbitalSchematicTrackRow[]>();
  const unzonedRows: OrbitalSchematicTrackRow[] = [];

  for (const row of visibleRows) {
    if (row.zoneId && zoneIdSet.has(row.zoneId)) {
      const group = rowsByZoneId.get(row.zoneId);
      if (group) {
        group.push(row);
      } else {
        rowsByZoneId.set(row.zoneId, [row]);
      }
    } else {
      unzonedRows.push(row);
    }
  }

  const sortableBands: Array<{
    readonly band: OrbitalSchematicBand;
    readonly sortDistanceAu: number;
    readonly order: number;
  }> = [];

  for (const row of unzonedRows) {
    sortableBands.push({
      band: {
        type: 'row',
        row,
        inHabitableZone: row.inHabitableZone,
      },
      sortDistanceAu: row.sortDistanceAu,
      order: sortableBands.length,
    });
  }

  for (const zone of summary.zones) {
    const zoneRows = rowsByZoneId.get(zone.id) ?? [];
    const firstRow = zoneRows[0];
    const sortDistanceAu = firstRow ? firstRow.sortDistanceAu : zone.sortDistanceAu;
    sortableBands.push({
      band: {
        type: 'zone',
        zone,
        rows: zoneRows,
        titleInsertIndex: Math.floor(zoneRows.length / 2),
        inHabitableZone: zoneRows.some((r) => r.inHabitableZone),
      },
      sortDistanceAu,
      order: sortableBands.length,
    });
  }

  sortableBands.sort((a, b) => {
    if (a.sortDistanceAu !== b.sortDistanceAu) {
      return a.sortDistanceAu - b.sortDistanceAu;
    }
    return a.order - b.order;
  });

  return sortableBands.map((entry) => entry.band);
};
