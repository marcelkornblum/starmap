import { useState, useMemo, useSyncExternalStore } from 'react';
import {
  computeGalacticCeilingDistancePc,
  getDeviceTierBudget,
  subscribeDeviceTier,
} from '../../../services/deviceTierService';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useUIStore } from '../../../stores/useUIStore';
import { STANDARD_CAMERA_DISTANCES } from '../cartography/cartographyCamera';
import { hasPendingCrossScaleArrival } from '../instrument/crossScaleArrivalState';
import { DEFAULT_GALACTIC_MIN_DISTANCE_PC } from '../instrument/instrumentDefaults';

export interface UseGalacticCeilingDistanceOptions {
  readonly viewportAspect?: number;
  readonly minDistancePc?: number;
  readonly targetCoords?: readonly [number, number, number];
}

function quantiseDistancePc(coords: readonly [number, number, number]): number {
  return Math.round(Math.hypot(coords[0], coords[1], coords[2]) * 2) / 2;
}

export function useGalacticCeilingDistance(
  options?: UseGalacticCeilingDistanceOptions,
): [number, (radius: number | null) => void] {
  const [ceilingApertureRadiusPc, setCeilingApertureRadiusPc] = useState<number | null>(null);
  const budget = useSyncExternalStore(subscribeDeviceTier, getDeviceTierBudget, getDeviceTierBudget);
  const isTransitioning = useUIStore((s) => s.isCameraTransitioning);
  const savedTarget = useCameraStore((s) => s.savedGalaxyCamera?.target);
  const liveTargetDistFromSolPc = useCameraStore((s) => quantiseDistancePc(s.target));

  const fallbackTarget = savedTarget ?? options?.targetCoords;
  const targetDistFromSolPc =
    isTransitioning || hasPendingCrossScaleArrival()
      ? fallbackTarget
        ? quantiseDistancePc(fallbackTarget)
        : 0
      : liveTargetDistFromSolPc;

  const viewportAspect = options?.viewportAspect;
  const minDistancePc = options?.minDistancePc ?? DEFAULT_GALACTIC_MIN_DISTANCE_PC;

  const maxSafeDistance = useMemo(
    () =>
      computeGalacticCeilingDistancePc(budget, {
        ceilingApertureRadiusPc,
        referenceCameraDistancePc: STANDARD_CAMERA_DISTANCES.galactic,
        minDistancePc,
        targetDistFromSolPc,
        viewportAspect,
      }),
    [budget, ceilingApertureRadiusPc, minDistancePc, targetDistFromSolPc, viewportAspect],
  );

  return [maxSafeDistance, setCeilingApertureRadiusPc];
}
