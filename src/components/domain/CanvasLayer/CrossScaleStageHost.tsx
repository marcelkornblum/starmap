/* ui-audit-disable-next-line missing-component-quad -- Internal R3F scene stage host extracted from CanvasWebGLHost; tested via CrossScaleStageHost.test.tsx */
import React, { Suspense, useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useOptionalRouter, useSpaLocation } from '../../../hooks/useSpaLocation';
import { prefersReducedMotion } from '../../../utils/reducedMotion';
import type { SpatialScale } from '../../../utils/referenceFrameOrientation';
import { parseSpatialRouteTarget } from '../../../utils/spatialRoute';
import { useOptionalSpatialEntityStoreApi } from '../../canvas/entity/SpatialEntityContext';
import { ORBIT_CONTROLS_PRIORITY } from '../../canvas/engineConfig';
import { TargetReferencePlanePreview } from '../../canvas/instrument/TargetReferencePlanePreview';
import { getCrossScaleSceneScale } from '../../canvas/instrument/crossScaleVisualState';
import { useCameraTransition } from '../../canvas/instrument/useCameraTransition';
import { isOrbitControlsLike } from '../../canvas/scenes/cameraControllerUtils';
import { launchCrossScaleDeparture } from './crossScaleChoreography';
import {
  isMatchingSceneTarget,
  preloadTargetScaleEntry,
  renderCommittedSpatialScene,
  resetAllCrossScaleVisualState,
  resolveStageSwapProps,
  snapshotPreDiveGalaxyCamera,
  type SpatialStageSceneProps,
} from './crossScaleStageHelpers';

export type CrossScaleStageHostProps = SpatialStageSceneProps;

interface InFlightCrossScaleTarget {
  readonly scope: SpatialScale;
  readonly targetId?: string;
  latestProps?: CrossScaleStageHostProps;
}

/**
 * Coordinates zero-lag route-driven 3-beat cross-scale choreography (plane preview expand,
 * Stage 1 departure tilt/zoom/fade while preloading target chunk & data, and atomic swap).
 */
export const CrossScaleStageHost: React.FC<CrossScaleStageHostProps> = React.memo((props) => {
  const [committedProps, setCommittedProps] = useState<CrossScaleStageHostProps>(props);
  const [isDeparting, setIsDeparting] = useState<boolean>(false);
  const transitionTokenRef = useRef<number>(0);
  const isDepartingRef = useRef<boolean>(false);
  const inFlightTargetRef = useRef<InFlightCrossScaleTarget | null>(null);
  const beat1CleanupRef = useRef<(() => void) | null>(null);
  const sceneScaleGroupRef = useRef<THREE.Group>(null);

  const router = useOptionalRouter();
  const location = useSpaLocation();
  const camera = useThree((s) => s.camera);
  const rawControls = useThree((s) => s.controls);
  const invalidate = useThree((s) => s.invalidate);
  const get = useThree((s) => s.get);
  const outerStore = useOptionalSpatialEntityStoreApi();
  const { transitionToPose, cancelTransition } = useCameraTransition();

  const routeTarget =
    router && props.isSpatialSceneMounted ? parseSpatialRouteTarget(location.pathname) : null;
  const requestedScope = routeTarget?.scope ?? props.scope;
  const requestedTargetId = routeTarget ? routeTarget.targetId : props.targetId;

  const isUnmountedBoundary = !props.isSpatialSceneMounted || !committedProps.isSpatialSceneMounted;
  const isSameAsCommitted = isMatchingSceneTarget(
    requestedScope,
    requestedTargetId,
    committedProps.scope,
    committedProps.targetId,
  );
  const doPropsMatchRequested = isMatchingSceneTarget(
    props.scope,
    props.targetId,
    requestedScope,
    requestedTargetId,
  );

  if (
    committedProps !== props &&
    !isDeparting &&
    (isUnmountedBoundary || (isSameAsCommitted && doPropsMatchRequested))
  ) {
    setCommittedProps(props);
  }

  useFrame(() => {
    const group = sceneScaleGroupRef.current;
    if (!group?.scale) return;
    const s = getCrossScaleSceneScale();
    if (Math.abs(group.scale.x - s) > 1e-4) {
      group.scale.setScalar(s);
    }
  }, ORBIT_CONTROLS_PRIORITY);

  useEffect(() => {
    return () => {
      transitionTokenRef.current += 1;
      beat1CleanupRef.current?.();
      beat1CleanupRef.current = null;
      isDepartingRef.current = false;
      inFlightTargetRef.current = null;
      resetAllCrossScaleVisualState();
    };
  }, []);

  useEffect(() => {
    const detachBeat1Listener = () => {
      beat1CleanupRef.current?.();
      beat1CleanupRef.current = null;
    };

    const abortPendingDeparture = () => {
      transitionTokenRef.current += 1;
      detachBeat1Listener();
      isDepartingRef.current = false;
      setIsDeparting(false);
      inFlightTargetRef.current = null;
      cancelTransition();
      resetAllCrossScaleVisualState();
    };

    const resolveFinalProps = (): CrossScaleStageHostProps =>
      resolveStageSwapProps(
        inFlightTargetRef.current?.latestProps,
        props,
        committedProps,
        doPropsMatchRequested,
        requestedScope,
        requestedTargetId,
      );

    if (isUnmountedBoundary) {
      if (isDepartingRef.current) {
        abortPendingDeparture();
        setCommittedProps(props);
      }
      return;
    }

    if (isSameAsCommitted) {
      if (isDepartingRef.current) {
        abortPendingDeparture();
        if (doPropsMatchRequested) setCommittedProps(props);
      }
      return;
    }

    if (
      isDepartingRef.current &&
      inFlightTargetRef.current &&
      isMatchingSceneTarget(
        requestedScope,
        requestedTargetId,
        inFlightTargetRef.current.scope,
        inFlightTargetRef.current.targetId,
      )
    ) {
      if (doPropsMatchRequested) {
        inFlightTargetRef.current.latestProps = props;
      }
      return;
    }

    const preloadPromise = preloadTargetScaleEntry(requestedScope, requestedTargetId);

    if (prefersReducedMotion()) {
      const nextProps = resolveFinalProps();
      if (isDepartingRef.current) {
        abortPendingDeparture();
      } else {
        resetAllCrossScaleVisualState();
      }
      setCommittedProps(nextProps);
      return;
    }

    const liveState = typeof get === 'function' ? get() : undefined;
    const activeCamera = liveState?.camera ?? camera;
    const rawLiveControls = liveState?.controls ?? rawControls;
    const activeControls = isOrbitControlsLike(rawLiveControls) ? rawLiveControls : undefined;

    if (!activeCamera?.position) {
      const nextProps = resolveFinalProps();
      abortPendingDeparture();
      setCommittedProps(nextProps);
      return;
    }

    const wasDeparting = isDepartingRef.current;
    const token = (transitionTokenRef.current += 1);
    detachBeat1Listener();
    if (wasDeparting) {
      cancelTransition();
    }

    if (committedProps.scope === 'galaxy' && !wasDeparting) {
      snapshotPreDiveGalaxyCamera(
        activeCamera,
        activeControls,
        committedProps.centerCoordinates ?? [0, 0, 0],
      );
    }

    isDepartingRef.current = true;
    setIsDeparting(true);
    inFlightTargetRef.current = {
      scope: requestedScope,
      targetId: requestedTargetId,
      latestProps: doPropsMatchRequested ? props : undefined,
    };

    const clearDepartureRefs = () => {
      isDepartingRef.current = false;
      setIsDeparting(false);
    };

    launchCrossScaleDeparture({
      committedScope: committedProps.scope,
      committedTargetId: committedProps.targetId,
      committedCenterCoordinates: committedProps.centerCoordinates,
      requestedScope,
      requestedTargetId,
      activeCamera,
      activeControls,
      outerStore,
      preloadPromise,
      transitionToPose,
      invalidate,
      isTokenCurrent: () => token === transitionTokenRef.current,
      detachBeat1Listener,
      setBeat1Cleanup: (cleanup) => {
        beat1CleanupRef.current = cleanup;
      },
      resolveFinalScope: () => resolveFinalProps().scope,
      onBeforeSwap: clearDepartureRefs,
      onCommitFinal: () => {
        const finalProps = resolveFinalProps();
        inFlightTargetRef.current = null;
        setCommittedProps(finalProps);
      },
      onAbortAndCommit: () => {
        if (token !== transitionTokenRef.current) return;
        detachBeat1Listener();
        const finalProps = resolveFinalProps();
        clearDepartureRefs();
        inFlightTargetRef.current = null;
        resetAllCrossScaleVisualState();
        setCommittedProps(finalProps);
        invalidate?.();
      },
    });
  }, [
    props,
    committedProps,
    requestedScope,
    requestedTargetId,
    doPropsMatchRequested,
    isUnmountedBoundary,
    isSameAsCommitted,
    camera,
    rawControls,
    invalidate,
    get,
    outerStore,
    transitionToPose,
    cancelTransition,
  ]);

  return (
    <>
      <TargetReferencePlanePreview />
      <group ref={sceneScaleGroupRef} name="cross-scale-scene-scale-group">
        <Suspense fallback={null}>{renderCommittedSpatialScene(committedProps)}</Suspense>
      </group>
    </>
  );
});

CrossScaleStageHost.displayName = 'CrossScaleStageHost';
