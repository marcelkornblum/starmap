import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSpatialEntityStore } from '../components/canvas/entity/SpatialEntityContext';
import type { SpatialEntityDefinition } from '../components/canvas/entity/SpatialEntityStore';
import {
  resolveGalacticInstrumentAperture,
  type GalacticInstrumentApertureResult,
  type SceneCameraUrlState,
} from '../services/detailsService';
import type { CompactSearchEntry } from '../utils/compactDataCodec';

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

export function useGalaxyAperture({
  cameraState,
  apertureCorpus,
  focusedEntity,
  centerEntity,
  urlFocusSlug,
}: UseGalaxyApertureParams): UseGalaxyApertureResult {
  const liveApertureRadius = useSpatialEntityStore((state) => {
    const raw = state.apertureRadius;
    if (raw === null || raw === undefined) {
      return null;
    }
    return Math.round(raw * 2) / 2;
  });

  const liveApertureCenter = useSpatialEntityStore(
    useShallow((state) => {
      const raw = state.apertureCenter;
      if (!raw) return null;
      return [
        Math.round(raw[0] * 10) / 10,
        Math.round(raw[1] * 10) / 10,
        Math.round(raw[2] * 10) / 10,
      ] as const;
    }),
  );

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
