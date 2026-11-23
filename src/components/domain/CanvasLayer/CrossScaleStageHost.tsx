/* ui-audit-disable-next-line missing-component-quad -- Internal R3F scene stage host extracted from CanvasWebGLHost; tested via CrossScaleStageHost.test.tsx */
import React, { Suspense, useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useIsomorphicLayoutEffect } from '../../../hooks/useIsomorphicLayoutEffect';
import { preloadTargetScaleEntry } from '../../../services/navigation/scalePreloader';
import { prefersReducedMotion } from '../../../utils/reducedMotion';
import type { SpatialScale } from '../../../utils/referenceFrameOrientation';
import { useOptionalSpatialEntityStoreApi } from '../../canvas/entity/SpatialEntityContext';
import { ORBIT_CONTROLS_PRIORITY } from '../../canvas/engineConfig';
import { TargetReferencePlanePreview } from '../../canvas/instrument/TargetReferencePlanePreview';
import { getCrossScaleSceneScale, setCrossScaleSceneScale } from '../../canvas/instrument/crossScaleVisualState';
import { useCameraTransition } from '../../canvas/instrument/useCameraTransition';
import { isOrbitControlsLike } from '../../canvas/scenes/cameraControllerUtils';
import { launchCrossScaleDeparture } from './crossScaleChoreography';
import { useCrossScaleReadySwap, useRequestedSpatialTarget } from './useCrossScaleReadySwap';
import {
  isMatchingSceneTarget,
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
  const pendingSwapScaleRef = useRef<number | null>(null);
  const sceneScaleGroupRef = useRef<THREE.Group>(null);
  const latestMirroredPropsRef = useRef<CrossScaleStageHostProps>(props);
  const { clearPendingReadySwap, flushPendingReadySwap, scheduleReadySwap } =
    useCrossScaleReadySwap();

  const { router, requestedScope, requestedTargetId } = useRequestedSpatialTarget(
    props.scope,
    props.targetId,
    props.isSpatialSceneMounted,
  );
  const camera = useThree((s) => s.camera);
  const rawControls = useThree((s) => s.controls);
  const invalidate = useThree((s) => s.invalidate);
  const get = useThree((s) => s.get);
  const outerStore = useOptionalSpatialEntityStoreApi();
  const { transitionToPose, cancelTransition } = useCameraTransition();

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
  const shouldMirrorLiveProps =
    !isDeparting && (isUnmountedBoundary || (isSameAsCommitted && doPropsMatchRequested));
  const activeStageProps = shouldMirrorLiveProps ? props : committedProps;

  useIsomorphicLayoutEffect(() => {
    if (shouldMirrorLiveProps) {
      latestMirroredPropsRef.current = props;
    }
  }, [shouldMirrorLiveProps, props]);

  useIsomorphicLayoutEffect(() => {
    if (pendingSwapScaleRef.current !== null) {
      setCrossScaleSceneScale(pendingSwapScaleRef.current);
      pendingSwapScaleRef.current = null;
    }
    const group = sceneScaleGroupRef.current;
    if (group?.scale) {
      group.scale.setScalar(getCrossScaleSceneScale());
    }
  }, [activeStageProps.scope, activeStageProps.targetId]);

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
      clearPendingReadySwap();
      isDepartingRef.current = false;
      inFlightTargetRef.current = null;
      resetAllCrossScaleVisualState();
    };
  }, [clearPendingReadySwap]);

  useEffect(() => {
    const baseProps = latestMirroredPropsRef.current;
    const commitProps = (nextProps: CrossScaleStageHostProps) => {
      latestMirroredPropsRef.current = nextProps;
      setCommittedProps(nextProps);
    };
    const detachBeat1Listener = () => {
      beat1CleanupRef.current?.();
      beat1CleanupRef.current = null;
    };
    const abortPendingDeparture = () => {
      transitionTokenRef.current += 1;
      detachBeat1Listener();
      clearPendingReadySwap();
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
        baseProps,
        doPropsMatchRequested,
        requestedScope,
        requestedTargetId,
      );

    if (isUnmountedBoundary) {
      if (isDepartingRef.current) {
        abortPendingDeparture();
        commitProps(props);
      } else if (committedProps.isSpatialSceneMounted !== props.isSpatialSceneMounted) {
        commitProps(props);
      }
      return;
    }

    if (isSameAsCommitted) {
      if (isDepartingRef.current) {
        abortPendingDeparture();
        if (doPropsMatchRequested) commitProps(props);
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
        flushPendingReadySwap();
      }
      return;
    }

    const preloadPromise = preloadTargetScaleEntry(requestedScope, requestedTargetId);

    if (prefersReducedMotion()) {
      const nextProps = resolveFinalProps();
      if (isDepartingRef.current) abortPendingDeparture();
      else resetAllCrossScaleVisualState();
      commitProps(nextProps);
      return;
    }

    const liveState = typeof get === 'function' ? get() : undefined;
    const activeCamera = liveState?.camera ?? camera;
    const rawLiveControls = liveState?.controls ?? rawControls;
    const activeControls = isOrbitControlsLike(rawLiveControls) ? rawLiveControls : undefined;

    if (!activeCamera?.position) {
      const nextProps = resolveFinalProps();
      abortPendingDeparture();
      commitProps(nextProps);
      return;
    }

    const wasDeparting = isDepartingRef.current;
    const token = (transitionTokenRef.current += 1);
    detachBeat1Listener();
    clearPendingReadySwap();
    if (wasDeparting) cancelTransition();

    if (baseProps.scope === 'galaxy' && !wasDeparting) {
      snapshotPreDiveGalaxyCamera(activeCamera, activeControls, baseProps.centerCoordinates ?? [0, 0, 0]);
    }

    if (committedProps !== baseProps) setCommittedProps(baseProps);
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
    const isTargetPropsReady = () =>
      !router || inFlightTargetRef.current?.latestProps !== undefined;

    launchCrossScaleDeparture({
      committedScope: baseProps.scope,
      committedTargetId: baseProps.targetId,
      committedCenterCoordinates: baseProps.centerCoordinates,
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
      isTargetPropsReady,
      scheduleReadySwap: (commitSwap) =>
        scheduleReadySwap(commitSwap, () => !isTargetPropsReady(), () => token === transitionTokenRef.current),
      onCommitFinal: (postCommitSceneScale) => {
        const finalProps = resolveFinalProps();
        inFlightTargetRef.current = null;
        pendingSwapScaleRef.current = postCommitSceneScale;
        commitProps(finalProps);
      },
      onAbortAndCommit: () => {
        if (token !== transitionTokenRef.current) return;
        detachBeat1Listener();
        clearPendingReadySwap();
        const finalProps = resolveFinalProps();
        clearDepartureRefs();
        inFlightTargetRef.current = null;
        resetAllCrossScaleVisualState();
        commitProps(finalProps);
        invalidate?.();
      },
    });
  }, [
    props, committedProps, router, requestedScope, requestedTargetId,
    doPropsMatchRequested, isUnmountedBoundary, isSameAsCommitted,
    camera, rawControls, invalidate, get, outerStore, transitionToPose,
    cancelTransition, clearPendingReadySwap, flushPendingReadySwap, scheduleReadySwap,
  ]);

  return (
    <>
      <TargetReferencePlanePreview />
      <group ref={sceneScaleGroupRef} name="cross-scale-scene-scale-group">
        <Suspense fallback={null}>{renderCommittedSpatialScene(activeStageProps)}</Suspense>
      </group>
    </>
  );
});

CrossScaleStageHost.displayName = 'CrossScaleStageHost';
