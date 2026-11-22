import { createElement, type ReactNode } from 'react';
import * as THREE from 'three';
import {
  fetchDetailRecord,
  fetchSummaryNode,
  getCachedDetailRecord,
  getCachedSummaryNode,
} from '../../../data/detailsRepository';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useUIStore } from '../../../stores/useUIStore';
import type { SpatialScale, TargetPlaneMetadata } from '../../../utils/referenceFrameOrientation';
import type { SpatialEntityDefinition } from '../../canvas/entity/types';
import type { SpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';
import { clearPendingCrossScaleArrival } from '../../canvas/instrument/crossScaleArrivalState';
import { resetCrossScaleInstrumentFade } from '../../canvas/instrument/crossScaleFadeState';
import {
  clearCrossScalePlanePreview,
  resetCrossScaleSceneScale,
} from '../../canvas/instrument/crossScaleVisualState';
import type { OrbitControlsLike } from '../../canvas/scenes/cameraControllerUtils';
import { computeCameraPoseSnapshot } from '../../canvas/scenes/galacticCameraHelpers';
import {
  getLoadedGalacticScene,
  getLoadedPlanetaryScene,
  getLoadedSystemScene,
  LazyGalacticSceneContent,
  LazyPlanetarySceneContent,
  LazySystemSceneContent,
  preloadSceneEntry,
  preloadSpatialView,
} from './sceneEntryLoader';

export interface SpatialStageSceneProps {
  readonly scope: SpatialScale;
  readonly targetId?: string;
  readonly centerId?: string;
  readonly centerCoordinates?: readonly [number, number, number];
  readonly selectedEntities?: readonly SpatialEntityDefinition[];
  readonly cameraDistance?: number;
  readonly isSpatialSceneMounted: boolean;
  readonly onInspect?: (id: string) => void;
  readonly onSelect?: (id: string | null) => void;
  readonly onFocusChange?: (id: string | null) => void;
}

function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Resolves an entity's 3D position from the outer `SpatialEntityStore` by ID or slug.
 */
export function resolveEntityPosition(
  outerStore: SpatialEntityStore | null,
  targetId?: string,
): [number, number, number] | null {
  if (!outerStore || !targetId) return null;
  const state = outerStore.getState();
  const resolvedId = state.resolveEntityId(targetId) ?? targetId;
  const entity = state.entities[resolvedId];
  if (!entity?.position) return null;
  return entity.position instanceof THREE.Vector3
    ? [entity.position.x, entity.position.y, entity.position.z]
    : [entity.position[0], entity.position[1], entity.position[2]];
}

/**
 * Resolves orbital inclination, ascending node, and axial obliquity metadata
 * for `targetId` from the outer `SpatialEntityStore`.
 */
export function resolveTargetPlaneMetadata(
  outerStore: SpatialEntityStore | null,
  targetId?: string,
): TargetPlaneMetadata | undefined {
  if (!outerStore || !targetId) return undefined;
  const state = outerStore.getState();
  const resolvedId = state.resolveEntityId(targetId) ?? targetId;
  const entity = state.entities[resolvedId];
  if (!entity) return undefined;

  const inclinationDeg = toFiniteNumber(entity.orbit?.inclination);
  const ascendingNodeDeg = toFiniteNumber(entity.orbit?.ascendingNode);
  const axialTiltDeg = toFiniteNumber(entity.data?.axialTiltDeg);
  const obliquityDeg = toFiniteNumber(entity.data?.obliquityDeg);

  if (
    inclinationDeg === undefined &&
    ascendingNodeDeg === undefined &&
    axialTiltDeg === undefined &&
    obliquityDeg === undefined
  ) {
    return undefined;
  }

  return {
    ...(inclinationDeg !== undefined ? { inclinationDeg } : {}),
    ...(ascendingNodeDeg !== undefined ? { ascendingNodeDeg } : {}),
    ...(axialTiltDeg !== undefined ? { axialTiltDeg } : {}),
    ...(obliquityDeg !== undefined ? { obliquityDeg } : {}),
  };
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
 * Preloads the target scene chunk and (for system transitions) its backing data in parallel.
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

/**
 * Resolves the focal target for Stage 1 cross-scale departure.
 */
export function resolveDepartureTarget(
  direction: 'in' | 'out',
  outerStore: SpatialEntityStore | null,
  nextTargetId: string | undefined,
  committedCenterCoordinates: readonly [number, number, number] | undefined,
  controls: OrbitControlsLike | undefined,
): [number, number, number] {
  if (direction === 'in') {
    const entityPos = resolveEntityPosition(outerStore, nextTargetId);
    if (entityPos) return entityPos;
    if (committedCenterCoordinates) {
      return [
        committedCenterCoordinates[0],
        committedCenterCoordinates[1],
        committedCenterCoordinates[2],
      ];
    }
  }
  if (controls?.target) {
    return [controls.target.x, controls.target.y, controls.target.z];
  }
  return [0, 0, 0];
}

/**
 * Returns `true` when two scene targets represent the same mounted scene identity.
 */
export function isMatchingSceneTarget(
  aScope: SpatialScale,
  aTargetId: string | undefined,
  bScope: SpatialScale,
  bTargetId: string | undefined,
): boolean {
  return aScope === bScope && (aScope === 'galaxy' || aTargetId === bTargetId);
}

/**
 * Captures and persists the pre-dive galactic camera pose before Stage 1 tilts or zooms.
 */
export function snapshotPreDiveGalaxyCamera(
  camera: THREE.Camera,
  controls: OrbitControlsLike | undefined,
  fallbackTarget: readonly [number, number, number],
): void {
  const snapshot = computeCameraPoseSnapshot(camera, controls, fallbackTarget);
  useCameraStore.getState().setSavedGalaxyCamera({
    position: snapshot.position,
    target: snapshot.target,
    up: snapshot.up,
    zoom: snapshot.zoom,
    focalDistance: snapshot.focalDistance,
    centerKey: `${snapshot.target[0]},${snapshot.target[1]},${snapshot.target[2]}`,
  });
}

/**
 * Resets all module-level cross-scale visual and transition states cleanly.
 */
export function resetAllCrossScaleVisualState(): void {
  resetCrossScaleSceneScale();
  resetCrossScaleInstrumentFade();
  clearCrossScalePlanePreview();
  clearPendingCrossScaleArrival();
  useUIStore.getState().setCameraTransitioning(false);
}

/**
 * Resolves committed stage props for a swap, synthesising target props when the router
 * advances ahead of lazy-loaded route props.
 */
export function resolveStageSwapProps<T extends SpatialStageSceneProps>(
  latestProps: T | undefined,
  props: T,
  committedProps: T,
  doPropsMatchRequested: boolean,
  requestedScope: SpatialScale,
  requestedTargetId: string | undefined,
): T {
  if (latestProps) return latestProps;
  if (doPropsMatchRequested) return props;
  return {
    ...committedProps,
    scope: requestedScope,
    targetId: requestedTargetId,
    centerId: undefined,
    centerCoordinates: undefined,
  };
}

/**
 * Creates the active spatial scene element for the committed stage props.
 */
export function renderCommittedSpatialScene(committedProps: SpatialStageSceneProps): ReactNode {
  if (!committedProps.isSpatialSceneMounted) return null;

  if (committedProps.scope === 'galaxy') {
    const GalacticSceneComponent = getLoadedGalacticScene() ?? LazyGalacticSceneContent;
    return createElement(GalacticSceneComponent, {
      initialSelectedId: committedProps.centerId ?? null,
      centerCoordinates: committedProps.centerCoordinates,
      centerId: committedProps.centerId,
      cameraDistance: committedProps.cameraDistance,
      additionalEntities: committedProps.selectedEntities,
      onInspectSystem: committedProps.onInspect,
      onSelectSystem: committedProps.onSelect,
      onFocusChange: committedProps.onFocusChange,
    });
  }

  if (committedProps.scope === 'system' && committedProps.targetId) {
    const SystemSceneComponent = getLoadedSystemScene() ?? LazySystemSceneContent;
    return createElement(SystemSceneComponent, {
      key: committedProps.targetId,
      systemId: committedProps.targetId,
      centerId: committedProps.centerId,
      centerCoordinates: committedProps.centerCoordinates,
      onInspectPlanet: committedProps.onInspect,
      onSelectEntity: committedProps.onSelect,
    });
  }

  if (committedProps.scope === 'planet' && committedProps.targetId) {
    const PlanetarySceneComponent = getLoadedPlanetaryScene() ?? LazyPlanetarySceneContent;
    return createElement(PlanetarySceneComponent, {
      key: committedProps.targetId,
      planetId: committedProps.targetId,
      centerId: committedProps.centerId,
      centerCoordinates: committedProps.centerCoordinates,
      onInspectSatellite: committedProps.onInspect,
      onSelectEntity: committedProps.onSelect,
    });
  }

  return null;
}
