import type { SpatialEntityDefinition } from '../../types/spatial';
import { DEFAULT_ORIGIN_TARGETS } from '../../config/referenceTargets';
import { getCachedReferenceBaselines } from '../../data/referenceBaselinesRepository';
import { formatSlugFallbackTitle } from '../../utils/starNaming';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import { toCoordinatesTuple } from './detailsHazards';
import { resolveEntityMarkerKind } from './minimapMarkerHelpers';
import type { FocusedEntityDetails } from './detailsEntityTypes';
import type {
  MinimapMarkerItem,
  MinimapOrientationSummary,
  MinimapScope,
  SceneCameraUrlState,
} from './detailsNavigationTypes';

export const buildGalaxyMinimapOrientation = (
  focusedEntity: SpatialEntityDefinition | null | undefined,
  selectedEntities: readonly SpatialEntityDefinition[] = [],
  focusedDetails: FocusedEntityDetails | null = null,
  cameraState?: SceneCameraUrlState,
  centerEntity?: SpatialEntityDefinition | null,
): MinimapOrientationSummary => {
  const scope: MinimapScope = 'galaxy';
  const originName =
    getCachedReferenceBaselines()?.targets.sol.name ??
    formatSlugFallbackTitle(DEFAULT_ORIGIN_TARGETS.interstellarOriginId);
  let anchorId = DEFAULT_ORIGIN_TARGETS.interstellarOriginId;
  let anchorName = originName;
  const systemId = focusedDetails?.systemId ?? DEFAULT_ORIGIN_TARGETS.interstellarOriginId;
  const systemName = focusedDetails?.systemName ?? originName;
  const sectorName = focusedDetails?.sectorName ?? '0,0,0';

  let coordinatesPc: readonly [number, number, number] =
    focusedDetails?.coordinatesPc ??
    (focusedEntity ? toCoordinatesTuple(focusedEntity.position) : [0, 0, 0]);

  if (centerEntity) {
    anchorId = centerEntity.id;
    anchorName = centerEntity.name;
    coordinatesPc = toCoordinatesTuple(centerEntity.position);
  } else if (
    cameraState?.center &&
    focusedEntity &&
    (toUrlSlug(cameraState.center) === toUrlSlug(focusedEntity.id) ||
      toUrlSlug(cameraState.center) === toUrlSlug(focusedEntity.name))
  ) {
    anchorId = focusedEntity.id;
    anchorName = focusedEntity.name;
    coordinatesPc = toCoordinatesTuple(focusedEntity.position);
  } else if (
    cameraState?.x !== undefined &&
    cameraState?.y !== undefined &&
    cameraState?.z !== undefined
  ) {
    anchorId = cameraState.center ?? 'custom';
    anchorName = cameraState.center ?? 'Custom Coordinates';
    coordinatesPc = [cameraState.x, cameraState.y, cameraState.z];
  }

  const distanceFromOriginPc = Number(
    Math.hypot(coordinatesPc[0], coordinatesPc[1], coordinatesPc[2]).toFixed(2),
  );

  const originMarker: MinimapMarkerItem = {
    id: DEFAULT_ORIGIN_TARGETS.interstellarOriginId,
    name: originName,
    kind: 'star',
    role: 'origin',
    href: `/galaxy?focus=${DEFAULT_ORIGIN_TARGETS.interstellarOriginId}`,
    coordinatesPc: DEFAULT_ORIGIN_TARGETS.galacticOriginCoordinates,
    distanceFromOriginPc: 0,
  };

  let focusedMarker: MinimapMarkerItem | null = null;
  if (focusedEntity) {
    const coords = toCoordinatesTuple(focusedEntity.position);
    focusedMarker = {
      id: focusedEntity.id,
      name: focusedEntity.name,
      kind: resolveEntityMarkerKind(focusedEntity),
      role: 'focused',
      href: `/galaxy?focus=${focusedEntity.id}`,
      coordinatesPc: coords,
      distanceFromOriginPc: Number(
        Math.hypot(coords[0], coords[1], coords[2]).toFixed(2),
      ),
    };
  }

  const anchorMarker: MinimapMarkerItem | null =
    anchorId !== originMarker.id && anchorId !== focusedMarker?.id
      ? {
          id: anchorId,
          name: anchorName,
          kind: resolveEntityMarkerKind(centerEntity),
          role: 'anchor',
          href: `/galaxy?focus=${anchorId}`,
          coordinatesPc,
          distanceFromOriginPc,
        }
      : null;

  const selectedMarkers: MinimapMarkerItem[] = selectedEntities.map((e) => {
    const coords = toCoordinatesTuple(e.position);
    return {
      id: e.id,
      name: e.name,
      kind: resolveEntityMarkerKind(e),
      role: 'selected',
      href: `/galaxy?focus=${e.id}`,
      coordinatesPc: coords,
      distanceFromOriginPc: Number(
        Math.hypot(coords[0], coords[1], coords[2]).toFixed(2),
      ),
    };
  });

  const markers: MinimapMarkerItem[] = [
    originMarker,
    ...(anchorMarker ? [anchorMarker] : []),
    ...(focusedMarker ? [focusedMarker] : []),
    ...selectedMarkers.filter(
      (m) =>
        m.id !== focusedMarker?.id &&
        m.id !== originMarker.id &&
        m.id !== anchorMarker?.id,
    ),
  ];

  return {
    scope,
    anchorId,
    anchorName,
    systemId,
    systemName,
    sectorName,
    coordinatesPc,
    distanceFromOriginPc,
    ...(cameraState?.az !== undefined ? { cameraAzimuthDeg: cameraState.az } : {}),
    ...(cameraState?.el !== undefined ? { cameraElevationDeg: cameraState.el } : {}),
    ...(cameraState?.dist !== undefined ? { cameraDistance: cameraState.dist } : {}),
    focusedMarker,
    selectedMarkers,
    markers,
  };
};
