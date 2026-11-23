import {
  fetchDetailRecord,
  fetchSummaryNode,
  getCachedDetailRecord,
  getCachedSummaryNode,
} from '../../data/detailsRepository';
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
  const needDetail = !getCachedDetailRecord(targetId);
  const needSummary = !getCachedSummaryNode(targetId);
  if (!needDetail && !needSummary) {
    return Promise.resolve();
  }
  return Promise.all([
    needDetail ? fetchDetailRecord(targetId).catch(() => undefined) : Promise.resolve(undefined),
    needSummary ? fetchSummaryNode(targetId).catch(() => undefined) : Promise.resolve(undefined),
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
  if (
    scope === 'system' &&
    targetId &&
    (!getCachedDetailRecord(targetId) || !getCachedSummaryNode(targetId))
  ) {
    return Promise.all([scenePromise, viewPromise, preloadSystemData(targetId, forceInTest)]);
  }
  return Promise.all([scenePromise, viewPromise]);
}
