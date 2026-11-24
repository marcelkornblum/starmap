import { useState, useMemo, useSyncExternalStore } from 'react';
import {
  computeCeilingMaxCameraDistancePc,
  getDeviceTierBudget,
  subscribeDeviceTier,
} from '../../../services/deviceTierService';

export function useGalacticCeilingDistance(): [number, (radius: number | null) => void] {
  const [ceilingApertureRadiusPc, setCeilingApertureRadiusPc] = useState<number | null>(null);
  const budget = useSyncExternalStore(subscribeDeviceTier, getDeviceTierBudget, getDeviceTierBudget);

  const maxSafeDistance = useMemo(
    () => computeCeilingMaxCameraDistancePc(budget, { ceilingApertureRadiusPc }),
    [budget, ceilingApertureRadiusPc],
  );

  return [maxSafeDistance, setCeilingApertureRadiusPc];
}
