import type { SpatialEntityDefinition } from '../../types/spatial';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import { resolveEntityMarkerKind } from './minimapMarkerHelpers';
import type {
  MinimapMarkerItem,
  MinimapOrientationSummary,
  MinimapScope,
  SceneCameraUrlState,
} from './detailsNavigationTypes';
import type {
  PlanetaryBodiesSummary,
  SystemBodiesSummary,
} from './detailsHierarchyTypes';

export const buildPlanetMinimapOrientation = (
  bodiesSummary: PlanetaryBodiesSummary | SystemBodiesSummary,
  focusedEntity: SpatialEntityDefinition | null | undefined,
  selectedEntities: readonly SpatialEntityDefinition[] = [],
  cameraState?: SceneCameraUrlState,
): MinimapOrientationSummary => {
  const scope: MinimapScope = 'planet';
  const primaryId = bodiesSummary.scope === 'planet' ? bodiesSummary.planetId : bodiesSummary.systemId;
  const primaryName = bodiesSummary.scope === 'planet' ? bodiesSummary.planetName : bodiesSummary.systemName;
  let anchorId = primaryId;
  let anchorName = primaryName;
  const systemId = bodiesSummary.systemId;
  const systemName = bodiesSummary.systemName;

  let parentSemiMajorAxisAu =
    bodiesSummary.scope === 'planet'
      ? bodiesSummary.planetDetail?.semiMajorAxisAu
      : undefined;
  let coordinatesPc: readonly [number, number, number] | undefined;

  if (cameraState?.center) {
    const centerSlug = toUrlSlug(cameraState.center);
    const matchedMoon =
      bodiesSummary.scope === 'planet'
        ? bodiesSummary.moons?.find(
            (m) => toUrlSlug(m.id) === centerSlug || toUrlSlug(m.name) === centerSlug,
          )
        : bodiesSummary.moonsAndDwarfPlanets?.find(
            (m) => toUrlSlug(m.id) === centerSlug || toUrlSlug(m.name) === centerSlug,
          );
    const matchedMinor = bodiesSummary.minorBodiesAndSpacecraft?.find(
      (m) => toUrlSlug(m.id) === centerSlug || toUrlSlug(m.name) === centerSlug,
    );
    const matchedFocused =
      focusedEntity &&
      (toUrlSlug(focusedEntity.id) === centerSlug ||
        toUrlSlug(focusedEntity.name) === centerSlug)
        ? focusedEntity
        : undefined;

    if (matchedMoon) {
      anchorId = matchedMoon.id;
      anchorName = matchedMoon.name;
    } else if (matchedMinor) {
      anchorId = matchedMinor.id;
      anchorName = matchedMinor.name;
    } else if (matchedFocused) {
      anchorId = matchedFocused.id;
      anchorName = matchedFocused.name;
    }
  }

  if (
    cameraState?.x !== undefined &&
    cameraState?.y !== undefined &&
    cameraState?.z !== undefined
  ) {
    coordinatesPc = [cameraState.x, cameraState.y, cameraState.z];
  }

  const moonsCount =
    bodiesSummary.scope === 'planet'
      ? (bodiesSummary.moons?.length ?? 0)
      : (bodiesSummary.moonsAndDwarfPlanets?.length ?? 0);
  const minorBodiesCount = bodiesSummary.minorBodiesAndSpacecraft?.length ?? 0;
  const orbitingBodyCount = moonsCount + minorBodiesCount;

  const anchorMarker: MinimapMarkerItem = {
    id: primaryId,
    name: primaryName,
    kind: bodiesSummary.scope === 'planet' ? 'planet' : 'system',
    role: 'anchor',
    href:
      bodiesSummary.scope === 'planet'
        ? `/planet/${primaryId}?focus=${primaryId}`
        : `/system/${primaryId}`,
    ...(parentSemiMajorAxisAu !== undefined ? { semiMajorAxisAu: parentSemiMajorAxisAu } : {}),
  };

  let focusedMarker: MinimapMarkerItem | null = null;
  if (focusedEntity) {
    focusedMarker = {
      id: focusedEntity.id,
      name: focusedEntity.name,
      kind: resolveEntityMarkerKind(focusedEntity),
      role: 'focused',
      href: `/planet/${primaryId}?focus=${focusedEntity.id}`,
    };
  }

  const selectedMarkers: MinimapMarkerItem[] = selectedEntities.map((e) => ({
    id: e.id,
    name: e.name,
    kind: resolveEntityMarkerKind(e),
    role: 'selected',
    href: `/planet/${primaryId}?focus=${e.id}`,
  }));

  const markers: MinimapMarkerItem[] = [
    anchorMarker,
    ...(focusedMarker && focusedMarker.id !== anchorMarker.id
      ? [focusedMarker]
      : []),
    ...selectedMarkers.filter(
      (m) => m.id !== anchorMarker.id && m.id !== focusedMarker?.id,
    ),
  ];

  return {
    scope,
    anchorId,
    anchorName,
    systemId,
    systemName,
    ...(coordinatesPc !== undefined ? { coordinatesPc } : {}),
    ...(parentSemiMajorAxisAu !== undefined ? { parentSemiMajorAxisAu } : {}),
    ...(cameraState?.az !== undefined ? { cameraAzimuthDeg: cameraState.az } : {}),
    ...(cameraState?.el !== undefined ? { cameraElevationDeg: cameraState.el } : {}),
    ...(cameraState?.dist !== undefined ? { cameraDistance: cameraState.dist } : {}),
    orbitingBodyCount,
    focusedMarker,
    selectedMarkers,
    markers,
  };
};
