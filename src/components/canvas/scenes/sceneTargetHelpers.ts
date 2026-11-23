import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { SpatialEntityDefinition } from '../entity';
import { useOptionalSpatialEntityStoreApi } from '../entity/SpatialEntityContext';
import type { CompactSearchEntry } from '../../../utils/compactDataTypes';
import {
  getCachedCorpusForFilter,
  subscribeSearchRepository,
} from '../../../data/searchRepository';
import { getCachedDetailRecord } from '../../../data/detailsRepository';
import { SOL_REFERENCE_TARGET } from '../../../config/referenceTargets';
import { useSystemData } from '../../../hooks/useSystemData';
import { useSearchCorpus } from '../../../hooks/useSearchCorpus';
import {
  findFocusedEntryInCorpus,
  resolveReticleType,
} from '../../../services/search/searchCorpusHelpers';
import {
  resolveBaseSystemSceneEntities,
  resolveTargetedSystemExtraEntities,
} from './systemPlanetResolver';
import {
  resolvePlanetaryEntitiesAndTarget,
  resolveTargetCoordsFromEntities,
  type ResolvePlanetaryEntitiesParams,
  type ResolvedPlanetaryEntitiesResult,
} from './planetaryEntityResolver';
import type { StarDossierData } from './SystemScene';

const EMPTY_CORPUS: readonly CompactSearchEntry[] = [];
const EMPTY_SELECTED_IDS: ReadonlySet<string> = new Set();

export function useResolvedSystemEntitiesAndTarget(
  systemId?: string,
  explicitSystem?: StarDossierData,
  centerId?: string,
  centerCoordinates?:
    | readonly [number, number, number]
    | [number, number, number]
    | { x: number; y: number; z: number },
): {
  readonly entities: SpatialEntityDefinition[];
  readonly targetCoords: [number, number, number];
  readonly isSystemDetailReady: boolean;
} {
  const targetId = explicitSystem?.id ?? systemId;
  const { corpus } = useSearchCorpus('startup');
  const activeCorpus = corpus ?? EMPTY_CORPUS;

  const getExpandedCorpusSnapshot = useCallback(
    () => getCachedCorpusForFilter('all') ?? getCachedCorpusForFilter('minor-bodies'),
    [],
  );
  const cachedExpandedCorpus = useSyncExternalStore(
    subscribeSearchRepository,
    getExpandedCorpusSnapshot,
    () => undefined,
  );
  const effectiveCorpus = cachedExpandedCorpus ?? activeCorpus;

  const outerStore = useOptionalSpatialEntityStoreApi();
  const subscribeOuterStore = useCallback(
    (listener: () => void) => (outerStore ? outerStore.subscribe(listener) : () => undefined),
    [outerStore],
  );
  const selectedIds = useSyncExternalStore(
    subscribeOuterStore,
    () => outerStore?.getState().selectedIds ?? EMPTY_SELECTED_IDS,
    () => outerStore?.getState().selectedIds ?? EMPTY_SELECTED_IDS,
  );
  const focusedId = useSyncExternalStore(
    subscribeOuterStore,
    () => outerStore?.getState().focusedId ?? null,
    () => outerStore?.getState().focusedId ?? null,
  );

  const matchedEntry = useMemo(
    () =>
      activeCorpus.length > 0 && targetId
        ? findFocusedEntryInCorpus(targetId, activeCorpus)
        : undefined,
    [targetId, activeCorpus],
  );

  const candidateId = explicitSystem?.id ?? matchedEntry?.s ?? matchedEntry?.i ?? targetId;
  const resolvedId =
    targetId && getCachedDetailRecord(targetId) && (!candidateId || !getCachedDetailRecord(candidateId))
      ? targetId
      : candidateId;
  const {
    systemSummary: summaryNode,
    systemDetail: detailRecord,
    isLoading: isLoadingSystemData,
  } = useSystemData(resolvedId ?? targetId);
  const sysManifest = detailRecord?.kind === 'system' ? detailRecord.record : undefined;
  const isSystemDetailReady = Boolean(explicitSystem || sysManifest || !isLoadingSystemData);

  const baseResult = useMemo(
    () =>
      resolveBaseSystemSceneEntities({
        targetId,
        resolvedId,
        explicitSystem,
        sysManifest,
        summaryNode,
        matchedEntry,
        activeCorpus,
      }),
    [
      targetId,
      resolvedId,
      explicitSystem,
      sysManifest,
      summaryNode,
      matchedEntry,
      activeCorpus,
    ],
  );

  const extraEntities = useMemo(
    () =>
      resolveTargetedSystemExtraEntities({
        base: baseResult,
        activeCorpus: effectiveCorpus,
        centerId,
        focusedId,
        selectedIds,
      }),
    [baseResult, effectiveCorpus, centerId, focusedId, selectedIds],
  );

  const entities = useMemo<SpatialEntityDefinition[]>(
    () =>
      extraEntities.length > 0
        ? [...baseResult.baseEntities, ...extraEntities]
        : baseResult.baseEntities,
    [baseResult.baseEntities, extraEntities],
  );

  const targetCoords = useMemo(
    () => resolveTargetCoordsFromEntities(entities, centerId, centerCoordinates),
    [entities, centerId, centerCoordinates],
  );

  return { entities, targetCoords, isSystemDetailReady };
}

/**
 * Reactively resolves planetary entities (central globe + orbiting satellites) by subscribing
 * to the startup search corpus and the host system's detail shard.
 */
export function useResolvedPlanetaryEntitiesAndTarget({
  planetId,
  planetName,
  classification,
  radius,
  minPixelSize,
  fadeRange,
  planet,
  explicitSatellites,
  centerId,
  centerCoordinates,
}: ResolvePlanetaryEntitiesParams): ResolvedPlanetaryEntitiesResult {
  const { corpus } = useSearchCorpus('startup');
  const activeCorpus = corpus ?? EMPTY_CORPUS;

  const matchedEntry = useMemo(
    () =>
      activeCorpus.length > 0 && planetId
        ? findFocusedEntryInCorpus(planetId, activeCorpus)
        : undefined,
    [planetId, activeCorpus],
  );

  const hostSystemId =
    matchedEntry?.s ?? (matchedEntry?.k === 1 ? matchedEntry.i : SOL_REFERENCE_TARGET.id);
  const corpusReticleClassification = matchedEntry
    ? resolveReticleType(matchedEntry)
    : undefined;

  const { systemDetail } = useSystemData(hostSystemId, planetId);

  return useMemo(
    () =>
      resolvePlanetaryEntitiesAndTarget({
        planetId,
        planetName,
        classification,
        corpusReticleClassification,
        radius,
        minPixelSize,
        fadeRange,
        planet,
        explicitSatellites,
        centerId,
        centerCoordinates,
        hostSystemDetail: systemDetail,
      }),
    [
      planetId,
      planetName,
      classification,
      corpusReticleClassification,
      radius,
      minPixelSize,
      fadeRange,
      planet,
      explicitSatellites,
      centerId,
      centerCoordinates,
      systemDetail,
    ],
  );
}
