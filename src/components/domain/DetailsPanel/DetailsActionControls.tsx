import { memo, useCallback, useSyncExternalStore } from 'react';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useCanvasStageStore } from '../../../stores/useCanvasStageStore';
import { toUrlSlug } from '../../../utils/datasetLayerSlugs';
import { parseSpatialRouteTarget } from '../../../utils/spatialRoute';
import { useOptionalSpatialEntityStoreApi } from '../../canvas/entity/SpatialEntityContext';
import { Button, Cluster } from '../../interface';

const CENTER_TOLERANCE = 1e-2;
const NOOP_UNSUBSCRIBE = () => {};
const EMPTY_POSITION_SNAPSHOT = () => undefined;

export interface DetailsActionControlsProps {
  readonly id: string;
  readonly directionsHref: string;
  readonly centerHref?: string;
  readonly systemDetailsHref?: string;
  readonly coordinatesPc?: readonly [number, number, number];
}

function extractTuple(
  pos:
    | readonly [number, number, number]
    | { readonly x: number; readonly y: number; readonly z: number }
    | undefined,
): readonly [number, number, number] | undefined {
  if (!pos) return undefined;
  if ('x' in pos) {
    return [pos.x, pos.y, pos.z];
  }
  return [pos[0], pos[1], pos[2]];
}

function resolveFallbackEntityCoordinates(
  id: string,
  centerHref: string | undefined,
  coordinatesPc: readonly [number, number, number] | undefined,
): readonly [number, number, number] | undefined {
  if (!centerHref) return undefined;
  const parsed = parseSpatialRouteTarget(centerHref);
  if (!parsed) return undefined;
  if (
    (parsed.scope === 'system' || parsed.scope === 'planet') &&
    parsed.targetId &&
    toUrlSlug(id) === toUrlSlug(parsed.targetId)
  ) {
    return [0, 0, 0];
  }
  if (parsed.scope === 'galaxy' && coordinatesPc) {
    return coordinatesPc;
  }
  return undefined;
}

export const DetailsActionControls = memo(function DetailsActionControls({
  id,
  directionsHref,
  centerHref,
  systemDetailsHref,
  coordinatesPc,
}: DetailsActionControlsProps) {
  const activeSceneStore = useCanvasStageStore((s) => s.activeSceneStore);
  const outerStore = useOptionalSpatialEntityStoreApi();
  const effectiveEntityStore = activeSceneStore ?? outerStore;

  const subscribeStore = useCallback(
    (onStoreChange: () => void) => {
      if (!effectiveEntityStore) return NOOP_UNSUBSCRIBE;
      let prevEntities = effectiveEntityStore.getState().entities;
      return effectiveEntityStore.subscribe(() => {
        const nextEntities = effectiveEntityStore.getState().entities;
        if (nextEntities !== prevEntities) {
          prevEntities = nextEntities;
          onStoreChange();
        }
      });
    },
    [effectiveEntityStore],
  );
  const getStorePositionSnapshot = useCallback(() => {
    if (!effectiveEntityStore) return undefined;
    const state = effectiveEntityStore.getState();
    const slug = toUrlSlug(id);
    const resolvedId =
      state.resolveEntityId(id) ??
      (slug ? state.resolveEntityId(slug) : null) ??
      id;
    const direct = state.entities[resolvedId]?.position;
    if (direct) return direct;
    if (slug) {
      for (const entity of Object.values(state.entities)) {
        if (toUrlSlug(entity.id) === slug || toUrlSlug(entity.name) === slug) {
          return entity.position;
        }
      }
    }
    return undefined;
  }, [effectiveEntityStore, id]);

  const storePosition = useSyncExternalStore(
    subscribeStore,
    getStorePositionSnapshot,
    EMPTY_POSITION_SNAPSHOT,
  );

  const entityPosition =
    extractTuple(storePosition) ??
    resolveFallbackEntityCoordinates(id, centerHref, coordinatesPc);

  const isOffCenter = useCameraStore((s) => {
    if (!entityPosition) return true;
    return (
      Math.hypot(
        s.target[0] - entityPosition[0],
        s.target[1] - entityPosition[1],
        s.target[2] - entityPosition[2],
      ) > CENTER_TOLERANCE
    );
  });

  const shouldRenderCenter = Boolean(centerHref) && isOffCenter;

  return (
    <Cluster gap="default" data-testid="details-cta-group">
      {systemDetailsHref ? (
        <Button
          href={systemDetailsHref}
          variant="default"
          data-testid="details-button-system-details"
        >
          Details
        </Button>
      ) : null}
      {shouldRenderCenter && centerHref ? (
        <Button
          href={centerHref}
          variant="default"
          data-testid="details-button-center"
        >
          Centre
        </Button>
      ) : null}
      <Button
        href={directionsHref}
        variant="primary"
        data-testid="details-button-directions"
      >
        Directions
      </Button>
    </Cluster>
  );
});

DetailsActionControls.displayName = 'DetailsActionControls';
