import { useEffect, useMemo, useState } from 'react';
import { useSpatialEntityStoreApi } from '../components/canvas/entity/SpatialEntityContext';
import type { SpatialEntityDefinition } from '../types/spatial';
import { resolveGalacticInstrumentAperture } from '../services/details/galacticAperture';
import type {
  GalacticInstrumentApertureResult,
  SceneCameraUrlState,
} from '../services/details/detailsNavigationTypes';
import type { CompactSearchEntry } from '../utils/compactDataTypes';

export interface UseGalaxyApertureParams {
  readonly cameraState: SceneCameraUrlState;
  readonly apertureCorpus: readonly CompactSearchEntry[];
  readonly focusedEntity: SpatialEntityDefinition | null;
  readonly centerEntity: SpatialEntityDefinition | null;
  readonly urlFocusSlug: string | null;
}

export interface UseGalaxyApertureResult {
  readonly liveApertureRadius: number | null;
  readonly liveApertureCenter: readonly [number, number, number] | null;
  readonly instrumentAperture: GalacticInstrumentApertureResult;
}

interface LiveApertureState {
  readonly radius: number | null;
  readonly center: readonly [number, number, number] | null;
}

function quantiseRadius(rawRadius: number | null | undefined): number | null {
  if (rawRadius === null || rawRadius === undefined) {
    return null;
  }
  return Math.round(rawRadius * 2) / 2;
}

function quantiseCenter(
  rawCenter: readonly [number, number, number] | null | undefined,
): readonly [number, number, number] | null {
  if (!rawCenter) {
    return null;
  }
  return [
    Math.round(rawCenter[0] * 10) / 10,
    Math.round(rawCenter[1] * 10) / 10,
    Math.round(rawCenter[2] * 10) / 10,
  ] as const;
}

function areCentersEqual(
  a: readonly [number, number, number] | null,
  b: readonly [number, number, number] | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

export function useGalaxyAperture({
  cameraState,
  apertureCorpus,
  focusedEntity,
  centerEntity,
  urlFocusSlug,
}: UseGalaxyApertureParams): UseGalaxyApertureResult {
  const storeApi = useSpatialEntityStoreApi();

  const [liveAperture, setLiveAperture] = useState<LiveApertureState>(() => {
    const state = storeApi.getState();
    return {
      radius: quantiseRadius(state.apertureRadius),
      center: quantiseCenter(state.apertureCenter),
    };
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const initialRaw = storeApi.getState();
    const initialRadius = quantiseRadius(initialRaw.apertureRadius);
    const initialCenter = quantiseCenter(initialRaw.apertureCenter);
    let committedState: LiveApertureState = {
      radius: initialRadius,
      center: initialCenter,
    };
    let lastCommitTime =
      committedState.radius !== null || committedState.center !== null
        ? Date.now()
        : 0;
    let pendingState: LiveApertureState | null = null;

    const commit = (next: LiveApertureState) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      pendingState = null;
      lastCommitTime = Date.now();
      committedState = next;
      setLiveAperture(next);
    };

    const unsubscribe = storeApi.subscribe((state) => {
      const targetState = pendingState ?? committedState;

      let qRadius: number | null;
      if (
        targetState.radius !== null &&
        state.apertureRadius !== null &&
        state.apertureRadius !== undefined &&
        Math.abs(state.apertureRadius - targetState.radius) < 0.35
      ) {
        qRadius = targetState.radius;
      } else {
        qRadius = quantiseRadius(state.apertureRadius);
      }

      let qCenter: readonly [number, number, number] | null;
      if (
        targetState.center !== null &&
        state.apertureCenter !== null &&
        state.apertureCenter !== undefined &&
        Math.abs(state.apertureCenter[0] - targetState.center[0]) < 0.08 &&
        Math.abs(state.apertureCenter[1] - targetState.center[1]) < 0.08 &&
        Math.abs(state.apertureCenter[2] - targetState.center[2]) < 0.08
      ) {
        qCenter = targetState.center;
      } else {
        qCenter = quantiseCenter(state.apertureCenter);
      }

      if (
        targetState.radius === qRadius &&
        areCentersEqual(targetState.center, qCenter)
      ) {
        return;
      }

      const nextState: LiveApertureState = { radius: qRadius, center: qCenter };
      const isInitialHydration =
        (committedState.radius === null && qRadius !== null) ||
        (committedState.center === null && qCenter !== null);

      const now = Date.now();
      const elapsed = now - lastCommitTime;

      if (isInitialHydration || elapsed >= 100) {
        commit(nextState);
      } else {
        pendingState = nextState;
        if (!timer) {
          const remaining = Math.max(0, 100 - elapsed);
          timer = setTimeout(() => {
            if (pendingState) {
              commit(pendingState);
            }
          }, remaining);
        }
      }
    });

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      unsubscribe();
    };
  }, [storeApi]);

  const liveApertureRadius = liveAperture.radius;
  const liveApertureCenter = liveAperture.center;

  const instrumentAperture = useMemo(
    () =>
      resolveGalacticInstrumentAperture({
        cameraState,
        corpus: apertureCorpus,
        focusedEntity,
        centerEntity,
        urlSystemSlug: urlFocusSlug,
        liveApertureCenterPc: liveApertureCenter,
        liveApertureRadiusPc: liveApertureRadius,
      }),
    [
      cameraState,
      apertureCorpus,
      focusedEntity,
      centerEntity,
      urlFocusSlug,
      liveApertureCenter,
      liveApertureRadius,
    ],
  );

  return {
    liveApertureRadius,
    liveApertureCenter,
    instrumentAperture,
  };
}
