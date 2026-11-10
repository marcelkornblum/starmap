import * as THREE from 'three';
import type { SpatialEntityDefinition } from '../components/canvas/entity/SpatialEntityStore';
import { SOL_REFERENCE_TARGET } from '../config/referenceTargets';
import { findFocusedEntryInCorpus, toUrlSlug } from '../services/searchService';
import type { CompactSearchEntry } from '../utils/compactDataCodec';

export const corpusSystemFirstChildCache = new WeakMap<
  readonly CompactSearchEntry[],
  Map<string, CompactSearchEntry>
>();

export function getCorpusSystemFirstChildMap(
  corpus: readonly CompactSearchEntry[],
): Map<string, CompactSearchEntry> {
  let map = corpusSystemFirstChildCache.get(corpus);
  if (!map) {
    map = new Map<string, CompactSearchEntry>();
    for (const entry of corpus) {
      if (!entry.s) continue;
      const rawS = entry.s;
      const slugS = toUrlSlug(rawS);
      if (!map.has(slugS)) {
        map.set(slugS, entry);
      }
      if (rawS !== slugS && !map.has(rawS)) {
        map.set(rawS, entry);
      }
    }
    corpusSystemFirstChildCache.set(corpus, map);
  }
  return map;
}

export interface ResolveGalaxyCenterCoordinatesParams {
  readonly cameraState: {
    readonly x?: number;
    readonly y?: number;
    readonly z?: number;
    readonly center?: string;
  };
  readonly urlFocusSlug: string | null;
  readonly canvasFocusedSlugs: ReadonlySet<string>;
  readonly pendingCenterSlug: string | null;
  readonly center?: string;
  readonly focusedEntity: SpatialEntityDefinition | null;
  readonly centerEntity: SpatialEntityDefinition | null;
  readonly selectedEntities: readonly SpatialEntityDefinition[];
  readonly apertureCorpus: readonly CompactSearchEntry[];
}

function extractPositionCoords(
  p: [number, number, number] | THREE.Vector3,
): [number, number, number] {
  return p instanceof THREE.Vector3 ? [p.x, p.y, p.z] : [p[0], p[1], p[2]];
}

export function resolveGalaxyCenterCoordinates({
  cameraState,
  urlFocusSlug,
  canvasFocusedSlugs,
  pendingCenterSlug,
  center,
  focusedEntity,
  centerEntity,
  selectedEntities,
  apertureCorpus,
}: ResolveGalaxyCenterCoordinatesParams): readonly [number, number, number] | undefined {
  if (
    cameraState.x !== undefined &&
    cameraState.y !== undefined &&
    cameraState.z !== undefined
  ) {
    return [cameraState.x, cameraState.y, cameraState.z];
  }

  const isCanvasClickFocus =
    urlFocusSlug !== null &&
    (canvasFocusedSlugs.has(urlFocusSlug) ||
      canvasFocusedSlugs.has(toUrlSlug(urlFocusSlug))) &&
    pendingCenterSlug !== urlFocusSlug;

  const effectiveCenterSlug =
    (center ? toUrlSlug(center) : undefined) ??
    cameraState.center ??
    pendingCenterSlug ??
    (!isCanvasClickFocus && urlFocusSlug ? toUrlSlug(urlFocusSlug) : undefined) ??
    undefined;

  if (
    effectiveCenterSlug &&
    (effectiveCenterSlug === urlFocusSlug ||
      effectiveCenterSlug === pendingCenterSlug ||
      effectiveCenterSlug === (center ? toUrlSlug(center) : undefined) ||
      effectiveCenterSlug === cameraState.center) &&
    focusedEntity?.position &&
    (focusedEntity.id === effectiveCenterSlug ||
      toUrlSlug(focusedEntity.id) === effectiveCenterSlug ||
      toUrlSlug(focusedEntity.name) === effectiveCenterSlug)
  ) {
    const coords = extractPositionCoords(focusedEntity.position);
    if (
      effectiveCenterSlug === SOL_REFERENCE_TARGET.id ||
      coords[0] !== 0 ||
      coords[1] !== 0 ||
      coords[2] !== 0
    ) {
      return coords;
    }
  }

  if (centerEntity?.position) {
    const coords = extractPositionCoords(centerEntity.position);
    if (
      effectiveCenterSlug === SOL_REFERENCE_TARGET.id ||
      coords[0] !== 0 ||
      coords[1] !== 0 ||
      coords[2] !== 0
    ) {
      return coords;
    }
  }

  if (effectiveCenterSlug) {
    const centerSlug = effectiveCenterSlug;

    const selectedMatch = selectedEntities.find(
      (s) =>
        s.id === centerSlug ||
        toUrlSlug(s.id) === centerSlug ||
        toUrlSlug(s.name) === centerSlug,
    );
    if (selectedMatch?.position) {
      const coords = extractPositionCoords(selectedMatch.position);
      if (
        centerSlug === SOL_REFERENCE_TARGET.id ||
        coords[0] !== 0 ||
        coords[1] !== 0 ||
        coords[2] !== 0
      ) {
        return coords;
      }
    }

    const directCorpusMatch = findFocusedEntryInCorpus(centerSlug, apertureCorpus);
    if (directCorpusMatch) {
      if (
        directCorpusMatch.p &&
        (centerSlug === SOL_REFERENCE_TARGET.id ||
          directCorpusMatch.p[0] !== 0 ||
          directCorpusMatch.p[1] !== 0 ||
          directCorpusMatch.p[2] !== 0)
      ) {
        return [directCorpusMatch.p[0], directCorpusMatch.p[1], directCorpusMatch.p[2]];
      }
      if (directCorpusMatch.s) {
        const host = findFocusedEntryInCorpus(directCorpusMatch.s, apertureCorpus);
        if (
          host?.p &&
          (centerSlug === SOL_REFERENCE_TARGET.id ||
            host.p[0] !== 0 ||
            host.p[1] !== 0 ||
            host.p[2] !== 0)
        ) {
          return [host.p[0], host.p[1], host.p[2]];
        }
      }
    }

    const childCorpusMatch = getCorpusSystemFirstChildMap(apertureCorpus).get(centerSlug);
    if (childCorpusMatch?.s) {
      const host = findFocusedEntryInCorpus(childCorpusMatch.s, apertureCorpus);
      if (
        host?.p &&
        (centerSlug === SOL_REFERENCE_TARGET.id ||
          host.p[0] !== 0 ||
          host.p[1] !== 0 ||
          host.p[2] !== 0)
      ) {
        return [host.p[0], host.p[1], host.p[2]];
      }
    }
  }

  return undefined;
}
