import { useState, useMemo } from 'react';
import {
  computeCeilingMaxCameraDistancePc,
  getDeviceTierBudget,
} from '../../../services/deviceTierService';

export function useGalacticCeilingDistance(): [number, (radius: number | null) => void] {
  const [ceilingApertureRadiusPc, setCeilingApertureRadiusPc] = useState<number | null>(null);
  const budget = useMemo(() => getDeviceTierBudget(), []);

  const maxSafeDistance = useMemo(
    () => computeCeilingMaxCameraDistancePc(budget, { ceilingApertureRadiusPc }),
    [budget, ceilingApertureRadiusPc],
  );

  return [maxSafeDistance, setCeilingApertureRadiusPc];
}
