import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { SpatialViewport } from '../viewport/SpatialViewport';
import { GALACTIC_FRAME } from '../../../config/referenceFrames';
import { STANDARD_CAMERA_DISTANCES } from '../cartography/cartographyCamera';
import { SectorPointCloud, type SpatialEntityDefinition } from '../entity';
import { useActiveStarsStore } from '../../../stores/useActiveStarsStore';
import {
  getApertureActiveCutoffForViewportWidth,
  getDeviceTierBudget,
  subscribeDeviceTier,
} from '../../../services/deviceTierService';
import type { SystemSummaryNode } from '../../../types/astro';
import {
  GALAXY_SCENE_MAX_STREAMED_ENTITIES,
  buildStreamedEntitiesIndex,
  mergeGalaxyEntities,
} from './galaxyEntityMerge';

export { GALAXY_SCENE_MAX_STREAMED_ENTITIES };

export interface GalaxySceneProps {
  additionalEntities?: readonly SpatialEntityDefinition[];
  initialSelectedId?: string | null;
  onInspectSystem?: (systemId: string) => void;
  onSelectSystem?: (systemId: string | null) => void;
  onFocusChange?: (systemId: string | null) => void;
  debugHitarea?: boolean;
  onCeilingApertureRadiusChange?: (radiusPc: number | null) => void;
  minCameraDistance?: number;
  maxCameraDistance?: number;
}

interface GalaxyHydrationSnapshot {
  readonly streamedSummaries: readonly SystemSummaryNode[];
  readonly hasHydrated: boolean;
  readonly focusPointPc: readonly [number, number, number];
}

const getDeviceTierSnapshot = (): string =>
  `${getDeviceTierBudget().tier}:${getApertureActiveCutoffForViewportWidth()}`;

/**
 * GalaxyScene: Canonical production scene for Milky Way top-level galactic cartography.
 * Renders streamed 3D sector point cloud and nearest stellar nodes mapped into GALACTIC_FRAME.
 */
export const GalaxyScene: React.FC<GalaxySceneProps> = React.memo(({
  additionalEntities,
  initialSelectedId,
  onInspectSystem,
  onSelectSystem,
  onFocusChange,
  debugHitarea = false,
  onCeilingApertureRadiusChange,
  minCameraDistance,
  maxCameraDistance,
}) => {
  const [hydrationState, setHydrationState] = useState<GalaxyHydrationSnapshot>(() => ({
    streamedSummaries: [],
    hasHydrated: useActiveStarsStore.getState().isHydrated,
    focusPointPc: [0, 0, 0],
  }));
  const { streamedSummaries, hasHydrated, focusPointPc } = hydrationState;
  const tierSnapshot = useSyncExternalStore(
    subscribeDeviceTier,
    getDeviceTierSnapshot,
    getDeviceTierSnapshot,
  );
  const budget = useMemo(() => {
    void tierSnapshot;
    return getDeviceTierBudget();
  }, [tierSnapshot]);
  const activeCutoff = useMemo(() => {
    void tierSnapshot;
    return getApertureActiveCutoffForViewportWidth();
  }, [tierSnapshot]);

  const lastCeilingRadiusRef = useRef<number | null>(null);
  const hasReceivedFirstSummariesRef = useRef(false);
  const prevStreamedEntitiesRef = useRef<SpatialEntityDefinition[]>([]);

  const handleHydratedSummariesChange = useCallback(
    (summaries: readonly SystemSummaryNode[], nextFocusPointPc?: readonly [number, number, number]) => {
      const applyUpdates = () => {
        useActiveStarsStore.getState().setSummaries(summaries);
        setHydrationState((prev) => {
          const summariesUnchanged =
            prev.streamedSummaries.length === summaries.length &&
            prev.streamedSummaries.every((s, idx) => s.id === summaries[idx]?.id);
          const focusUnchanged = !nextFocusPointPc || (
            prev.focusPointPc[0] === nextFocusPointPc[0] &&
            prev.focusPointPc[1] === nextFocusPointPc[1] &&
            prev.focusPointPc[2] === nextFocusPointPc[2]
          );

          if (prev.hasHydrated && summariesUnchanged && focusUnchanged) return prev;

          return {
            hasHydrated: true,
            streamedSummaries: summariesUnchanged ? prev.streamedSummaries : summaries,
            focusPointPc: focusUnchanged ? prev.focusPointPc : [nextFocusPointPc[0], nextFocusPointPc[1], nextFocusPointPc[2]],
          };
        });
      };
      if (!hasReceivedFirstSummariesRef.current || import.meta.env.MODE === 'test') {
        hasReceivedFirstSummariesRef.current = true;
        applyUpdates();
      } else {
        React.startTransition(applyUpdates);
      }
    },
    [],
  );

  useEffect(() => () => { useActiveStarsStore.getState().clear(); }, []);

  useEffect(() => {
    let nextRadius: number | null = null;
    if (streamedSummaries.length >= budget.maxActiveEntities) {
      const boundary = streamedSummaries[budget.maxActiveEntities - 1];
      if (boundary) {
        nextRadius = Math.round(
          Math.hypot(
            boundary.x - focusPointPc[0],
            boundary.y - focusPointPc[1],
            boundary.z - focusPointPc[2],
          ),
        );
      }
    }
    if (lastCeilingRadiusRef.current !== nextRadius) {
      lastCeilingRadiusRef.current = nextRadius;
      onCeilingApertureRadiusChange?.(nextRadius);
    }
  }, [streamedSummaries, focusPointPc, budget.maxActiveEntities, onCeilingApertureRadiusChange]);

  const streamedIndex = useMemo(
    () =>
      buildStreamedEntitiesIndex(
        streamedSummaries,
        hasHydrated,
        budget.maxActiveEntities,
        activeCutoff,
        prevStreamedEntitiesRef,
      ),
    [streamedSummaries, hasHydrated, budget.maxActiveEntities, activeCutoff],
  );

  const entities = useMemo<SpatialEntityDefinition[]>(
    () =>
      mergeGalaxyEntities(
        additionalEntities,
        streamedIndex,
        streamedSummaries,
        focusPointPc,
        budget.maxActiveEntities,
      ),
    [additionalEntities, streamedIndex, streamedSummaries, focusPointPc, budget.maxActiveEntities],
  );

  const sectorPointCloudElement = useMemo(
    () => <SectorPointCloud onHydratedSummariesChange={handleHydratedSummariesChange} />,
    [handleHydratedSummariesChange],
  );

  return (
    <SpatialViewport
      frame={GALACTIC_FRAME}
      entities={entities}
      cameraDistance={STANDARD_CAMERA_DISTANCES.galactic}
      minCameraDistance={minCameraDistance}
      maxCameraDistance={maxCameraDistance}
      initialSelectedId={initialSelectedId}
      onInspect={onInspectSystem}
      onSelect={onSelectSystem}
      onFocusChange={onFocusChange}
      debugHitarea={debugHitarea}
    >
      {sectorPointCloudElement}
    </SpatialViewport>
  );
});

GalaxyScene.displayName = 'GalaxyScene';
