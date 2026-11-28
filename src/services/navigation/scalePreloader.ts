import { SOL_REFERENCE_TARGET } from '../../config/referenceTargets';
import {
  fetchDetailRecord,
  fetchSolPrimaryShard,
  fetchSummaryNode,
  getCachedDetailRecord,
  getCachedSummaryNode,
  isSolPrimaryShardCached,
} from '../../data/detailsRepository';
import { getCachedCorpusForFilter } from '../../data/searchRepository';
import { resolveSystemIdFromCorpus } from '../search/searchCorpusHelpers';
import type { SpatialScale } from '../../utils/referenceFrameOrientation';

export type SpatialCanvasScope = SpatialScale;
export type SpatialViewPreloader = (scope: SpatialCanvasScope) => Promise<unknown>;
export type SceneEntryPreloader = (scope: SpatialCanvasScope) => Promise<unknown>;

let registeredViewPreloader: SpatialViewPreloader | null = null;
let registeredSceneEntryPreloader: SceneEntryPreloader | null = null;

/**
 * Registers the router-layer spatial view chunk preloader without introducing a service-to-router dependency.
 */
export function registerSpatialViewPreloader(preloader: SpatialViewPreloader | null): void {
  registeredViewPreloader = preloader;
}

/**
 * Invokes the registered spatial view chunk preloader for `scope` if present.
 */
export function preloadSpatialView(scope: SpatialCanvasScope): Promise<unknown> {
  return registeredViewPreloader ? registeredViewPreloader(scope) : Promise.resolve();
}

/**
 * Registers the canvas-layer scene-entry chunk preloader without introducing a service-to-component dependency.
 */
export function registerSceneEntryPreloader(preloader: SceneEntryPreloader | null): void {
  registeredSceneEntryPreloader = preloader;
}

/**
 * Invokes the registered scene-entry chunk preloader for `scope` if present.
 */
export function preloadSceneEntry(scope: SpatialCanvasScope): Promise<unknown> {
  return registeredSceneEntryPreloader ? registeredSceneEntryPreloader(scope) : Promise.resolve();
}

function resolvePreloadSystemId(targetId: string): string {
  if (getCachedDetailRecord(targetId)) {
    return targetId;
  }
  const corpus =
    getCachedCorpusForFilter('startup') ??
    getCachedCorpusForFilter('all') ??
    getCachedCorpusForFilter('stars');
  return corpus ? resolveSystemIdFromCorpus(targetId, corpus) : targetId;
}

function needsSystemDataPreload(resolvedId: string): boolean {
  return (
    !getCachedDetailRecord(resolvedId) ||
    !getCachedSummaryNode(resolvedId) ||
    (resolvedId === SOL_REFERENCE_TARGET.id && !isSolPrimaryShardCached())
  );
}

/**
 * Preloads system manifest and summary records when transitioning into a stellar system
 * so entities are warm in cache prior to the atomic scene swap.
 */
export function preloadSystemData(
  targetId?: string,
  forceInTest = false,
): Promise<void> {
  if (!targetId) return Promise.resolve();
  if (!forceInTest && import.meta.env.MODE === 'test') {
    return Promise.resolve();
  }
  const resolvedId = resolvePreloadSystemId(targetId);
  const needDetail = !getCachedDetailRecord(resolvedId);
  const needSummary = !getCachedSummaryNode(resolvedId);
  const needSolPrimary =
    resolvedId === SOL_REFERENCE_TARGET.id && !isSolPrimaryShardCached();
  if (!needDetail && !needSummary && !needSolPrimary) {
    return Promise.resolve();
  }
  return Promise.all([
    needDetail ? fetchDetailRecord(resolvedId).catch(() => undefined) : Promise.resolve(undefined),
    needSummary ? fetchSummaryNode(resolvedId).catch(() => undefined) : Promise.resolve(undefined),
    needSolPrimary ? fetchSolPrimaryShard().catch(() => false) : Promise.resolve(false),
  ]).then(() => undefined);
}

/**
 * Preloads the target scene chunk, route view chunk, and (for system transitions) backing data in parallel.
 */
export function preloadTargetScaleEntry(
  scope: SpatialScale,
  targetId?: string,
  forceInTest = false,
): Promise<unknown> {
  const scenePromise = preloadSceneEntry(scope);
  if (!forceInTest && import.meta.env.MODE === 'test') {
    return scenePromise;
  }
  const viewPromise = preloadSpatialView(scope).catch(() => undefined);
  if (scope === 'system' && targetId) {
    const resolvedId = resolvePreloadSystemId(targetId);
    if (needsSystemDataPreload(resolvedId)) {
      return Promise.all([scenePromise, viewPromise, preloadSystemData(targetId, forceInTest)]);
    }
  }
  return Promise.all([scenePromise, viewPromise]);
}
