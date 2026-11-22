/* ui-audit-disable-next-line missing-component-quad -- Internal R3F scene stage host extracted from CanvasWebGLHost; tested via CrossScaleStageHost.test.tsx */
import React, { Suspense, createElement, useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import type { SpatialEntityDefinition } from '../../canvas/entity/types';
import { useOptionalSpatialEntityStoreApi } from '../../canvas/entity/SpatialEntityContext';
import { isOrbitControlsLike } from '../../canvas/scenes/cameraControllerUtils';
import {
  clearPendingCrossScaleArrival,
  setPendingCrossScaleArrival,
} from '../../canvas/instrument/crossScaleArrivalState';
import {
  resetCrossScaleInstrumentFade,
  setCrossScaleInstrumentFade,
} from '../../canvas/instrument/crossScaleFadeState';
import { useCameraTransition } from '../../canvas/instrument/useCameraTransition';
import { prefersReducedMotion } from '../../../utils/reducedMotion';
import {
  CROSS_SCALE_STAGE_DURATION_SEC,
  computeCrossScaleDepartureFade,
  getCrossScaleTiltRad,
  getScaleRank,
  type SpatialScale,
} from '../../../utils/referenceFrameOrientation';
import {
  isMatchingSceneTarget,
  resolveDepartureTarget,
  snapshotPreDiveGalaxyCamera,
} from './crossScaleStageHelpers';
import {
  getLoadedGalacticScene,
  getLoadedPlanetaryScene,
  getLoadedSystemScene,
  LazyGalacticSceneContent,
  LazyPlanetarySceneContent,
  LazySystemSceneContent,
  preloadSceneEntry,
} from './sceneEntryLoader';

export interface CrossScaleStageHostProps {
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

interface InFlightCrossScaleTarget {
  readonly scope: SpatialScale;
  readonly targetId?: string;
  latestProps: CrossScaleStageHostProps;
}

/**
 * Coordinates sequential two-stage cross-scale choreography (Stage 1 departure tilt/zoom/fade
 * while preloading the target scene chunk, then atomic scene swap handing off Stage 2 arrival).
 */
export const CrossScaleStageHost: React.FC<CrossScaleStageHostProps> = React.memo((props) => {
  const [committedProps, setCommittedProps] = useState<CrossScaleStageHostProps>(props);
  const [isDeparting, setIsDeparting] = useState<boolean>(false);
  const transitionTokenRef = useRef<number>(0);
  const isDepartingRef = useRef<boolean>(false);
  const inFlightTargetRef = useRef<InFlightCrossScaleTarget | null>(null);
  const lastObservedTargetRef = useRef<{ scope: SpatialScale; targetId?: string } | null>(null);

  const camera = useThree((s) => s.camera);
  const rawControls = useThree((s) => s.controls);
  const invalidate = useThree((s) => s.invalidate);
  const get = useThree((s) => s.get);
  const outerStore = useOptionalSpatialEntityStoreApi();
  const { transitionToPose, cancelTransition } = useCameraTransition();

  const isUnmountedBoundary = !props.isSpatialSceneMounted || !committedProps.isSpatialSceneMounted;
  const isSameAsCommitted = isMatchingSceneTarget(
    props.scope,
    props.targetId,
    committedProps.scope,
    committedProps.targetId,
  );

  if (
    committedProps !== props &&
    !isDeparting &&
    (isUnmountedBoundary || isSameAsCommitted || prefersReducedMotion())
  ) {
    setCommittedProps(props);
  }

  useEffect(() => {
    return () => {
      transitionTokenRef.current += 1;
      isDepartingRef.current = false;
      inFlightTargetRef.current = null;
      clearPendingCrossScaleArrival();
      resetCrossScaleInstrumentFade();
    };
  }, []);

  useEffect(() => {
    const abortPendingDeparture = () => {
      transitionTokenRef.current += 1;
      isDepartingRef.current = false;
      setIsDeparting(false);
      inFlightTargetRef.current = null;
      clearPendingCrossScaleArrival();
      resetCrossScaleInstrumentFade();
      cancelTransition();
    };

    if (isUnmountedBoundary) {
      lastObservedTargetRef.current = props.isSpatialSceneMounted
        ? { scope: props.scope, targetId: props.targetId }
        : null;
      if (isDepartingRef.current) {
        abortPendingDeparture();
        setCommittedProps(props);
      }
      return;
    }

    const prevObserved = lastObservedTargetRef.current;
    const isTargetTransition =
      prevObserved !== null &&
      !isMatchingSceneTarget(
        props.scope,
        props.targetId,
        prevObserved.scope,
        prevObserved.targetId,
      );
    lastObservedTargetRef.current = { scope: props.scope, targetId: props.targetId };

    if (isTargetTransition && prefersReducedMotion()) {
      void preloadSceneEntry(props.scope);
    }

    if (isSameAsCommitted) {
      if (isDepartingRef.current) {
        abortPendingDeparture();
        setCommittedProps(props);
      }
      return;
    }

    if (
      isDepartingRef.current &&
      inFlightTargetRef.current &&
      isMatchingSceneTarget(
        props.scope,
        props.targetId,
        inFlightTargetRef.current.scope,
        inFlightTargetRef.current.targetId,
      )
    ) {
      inFlightTargetRef.current.latestProps = props;
      return;
    }

    const preloadPromise = preloadSceneEntry(props.scope);

    if (prefersReducedMotion()) {
      if (isDepartingRef.current) {
        abortPendingDeparture();
        setCommittedProps(props);
      }
      return;
    }

    const liveState = typeof get === 'function' ? get() : undefined;
    const activeCamera = liveState?.camera ?? camera;
    const rawLiveControls = liveState?.controls ?? rawControls;
    const activeControls = isOrbitControlsLike(rawLiveControls) ? rawLiveControls : undefined;

    if (!activeCamera?.position) {
      abortPendingDeparture();
      setCommittedProps(props);
      return;
    }

    const token = (transitionTokenRef.current += 1);

    if (committedProps.scope === 'galaxy' && !isDepartingRef.current) {
      snapshotPreDiveGalaxyCamera(
        activeCamera,
        activeControls,
        committedProps.centerCoordinates ?? [0, 0, 0],
      );
    }

    isDepartingRef.current = true;
    setIsDeparting(true);
    inFlightTargetRef.current = {
      scope: props.scope,
      targetId: props.targetId,
      latestProps: props,
    };

    const direction: 'in' | 'out' =
      getScaleRank(props.scope) > getScaleRank(committedProps.scope) ? 'in' : 'out';
    const frameTiltRad = getCrossScaleTiltRad(committedProps.scope, props.scope);
    const departureTarget = resolveDepartureTarget(
      direction,
      outerStore,
      props.targetId,
      committedProps.centerCoordinates,
      activeControls,
    );
    const currentDist = Math.hypot(
      activeCamera.position.x - departureTarget[0],
      activeCamera.position.y - departureTarget[1],
      activeCamera.position.z - departureTarget[2],
    );
    const targetDistance =
      direction === 'in'
        ? Math.max(0.8, currentDist * 0.22)
        : Math.max(4, currentDist * 2.2);

    transitionToPose(
      {
        target: departureTarget,
        distance: targetDistance,
        frameTiltRad,
      },
      {
        duration: CROSS_SCALE_STAGE_DURATION_SEC,
        orientationWindow: [0, 1],
        translationWindow: [0.4, 1],
        onProgress: (p) => {
          if (token !== transitionTokenRef.current) return;
          setCrossScaleInstrumentFade(computeCrossScaleDepartureFade(p));
          invalidate?.();
        },
        onComplete: () => {
          void preloadPromise.finally(() => {
            if (token !== transitionTokenRef.current) return;
            const finalProps = inFlightTargetRef.current?.latestProps ?? props;
            isDepartingRef.current = false;
            setIsDeparting(false);
            inFlightTargetRef.current = null;
            setCrossScaleInstrumentFade(0);
            setPendingCrossScaleArrival({
              direction,
              targetScope: finalProps.scope,
              durationSec: CROSS_SCALE_STAGE_DURATION_SEC,
            });
            setCommittedProps(finalProps);
            invalidate?.();
          });
        },
        onCancel: () => {
          if (token !== transitionTokenRef.current) return;
          const finalProps = inFlightTargetRef.current?.latestProps ?? props;
          isDepartingRef.current = false;
          setIsDeparting(false);
          inFlightTargetRef.current = null;
          clearPendingCrossScaleArrival();
          resetCrossScaleInstrumentFade();
          setCommittedProps(finalProps);
          invalidate?.();
        },
      },
    );
  }, [
    props,
    committedProps,
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

  const GalacticSceneComponent = getLoadedGalacticScene() ?? LazyGalacticSceneContent;
  const SystemSceneComponent = getLoadedSystemScene() ?? LazySystemSceneContent;
  const PlanetarySceneComponent = getLoadedPlanetaryScene() ?? LazyPlanetarySceneContent;

  return (
    <Suspense fallback={null}>
      {committedProps.isSpatialSceneMounted &&
        committedProps.scope === 'galaxy' &&
        createElement(GalacticSceneComponent, {
          initialSelectedId: committedProps.centerId ?? null,
          centerCoordinates: committedProps.centerCoordinates,
          centerId: committedProps.centerId,
          cameraDistance: committedProps.cameraDistance,
          additionalEntities: committedProps.selectedEntities,
          onInspectSystem: committedProps.onInspect,
          onSelectSystem: committedProps.onSelect,
          onFocusChange: committedProps.onFocusChange,
        })}
      {committedProps.isSpatialSceneMounted &&
        committedProps.scope === 'system' &&
        committedProps.targetId &&
        createElement(SystemSceneComponent, {
          key: committedProps.targetId,
          systemId: committedProps.targetId,
          centerId: committedProps.centerId,
          centerCoordinates: committedProps.centerCoordinates,
          onInspectPlanet: committedProps.onInspect,
          onSelectEntity: committedProps.onSelect,
        })}
      {committedProps.isSpatialSceneMounted &&
        committedProps.scope === 'planet' &&
        committedProps.targetId &&
        createElement(PlanetarySceneComponent, {
          key: committedProps.targetId,
          planetId: committedProps.targetId,
          centerId: committedProps.centerId,
          centerCoordinates: committedProps.centerCoordinates,
          onInspectSatellite: committedProps.onInspect,
          onSelectEntity: committedProps.onSelect,
        })}
    </Suspense>
  );
});

CrossScaleStageHost.displayName = 'CrossScaleStageHost';
