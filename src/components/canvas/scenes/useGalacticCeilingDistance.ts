import { useState, useMemo, useSyncExternalStore } from 'react';
import {
  computeCeilingMaxCameraDistancePc,
  getDeviceTierBudget,
  subscribeDeviceTier,
  DEFAULT_DENSE_CATALOG_RADIUS_PC,
} from '../../../services/deviceTierService';
import { useCameraStore } from '../../../stores/useCameraStore';
import { STANDARD_CAMERA_DISTANCES } from '../cartography/cartographyCamera';
import { DEFAULT_GALACTIC_MIN_DISTANCE_PC } from '../instrument/instrumentDefaults';

export interface UseGalacticCeilingDistanceOptions {
  readonly viewportAspect?: number;
  readonly minDistancePc?: number;
}

export function useGalacticCeilingDistance(
  options?: UseGalacticCeilingDistanceOptions,
): [number, (radius: number | null) => void] {
  const [ceilingApertureRadiusPc, setCeilingApertureRadiusPc] = useState<number | null>(null);
  const budget = useSyncExternalStore(subscribeDeviceTier, getDeviceTierBudget, getDeviceTierBudget);
  const targetDistFromSolPc = useCameraStore(
    (s) => Math.round(Math.hypot(s.target[0], s.target[1], s.target[2]) * 2) / 2,
  );
  const viewportAspect = options?.viewportAspect;
  const minDistancePc = options?.minDistancePc ?? DEFAULT_GALACTIC_MIN_DISTANCE_PC;

  const maxSafeDistance = useMemo(
    () =>
      computeCeilingMaxCameraDistancePc(budget, {
        ceilingApertureRadiusPc,
        referenceCameraDistancePc: STANDARD_CAMERA_DISTANCES.galactic,
        minDistancePc,
        denseCatalogRadiusPc: DEFAULT_DENSE_CATALOG_RADIUS_PC,
        targetDistFromSolPc,
        viewportAspect,
      }),
    [budget, ceilingApertureRadiusPc, minDistancePc, targetDistFromSolPc, viewportAspect],
  );

  return [maxSafeDistance, setCeilingApertureRadiusPc];
}
