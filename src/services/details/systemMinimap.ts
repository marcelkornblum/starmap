import type { SpatialEntityDefinition } from '../../types/spatial';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import { resolveEntityMarkerKind } from './minimapMarkerHelpers';
import type { FocusedEntityDetails } from './detailsEntityTypes';
import type {
  MinimapMarkerItem,
  MinimapOrientationSummary,
  MinimapScope,
  SceneCameraUrlState,
} from './detailsNavigationTypes';
import type {
  PlanetaryBodiesSummary,
  SystemBodiesSummary,
  OrbitalSchematicSummary,
} from './detailsHierarchyTypes';

export const buildSystemMinimapOrientation = (
  bodiesSummary: SystemBodiesSummary | PlanetaryBodiesSummary,
  schematic: OrbitalSchematicSummary | null,
  systemDetails: FocusedEntityDetails | null,
  focusedEntity: SpatialEntityDefinition | null | undefined,
  selectedEntities: readonly SpatialEntityDefinition[] = [],
  cameraState?: SceneCameraUrlState,
): MinimapOrientationSummary => {
  const scope: MinimapScope = 'system';
  let anchorId = bodiesSummary.scope === 'system' ? bodiesSummary.systemId : bodiesSummary.planetId;
  let anchorName = bodiesSummary.scope === 'system' ? bodiesSummary.systemName : bodiesSummary.planetName;
  const systemId = bodiesSummary.systemId;
  const systemName = bodiesSummary.systemName;

  const sectorName = systemDetails?.sectorName;
  let coordinatesPc = systemDetails?.coordinatesPc;
  let parentSemiMajorAxisAu: number | undefined;

  if (cameraState?.center) {
    const centerSlug = toUrlSlug(cameraState.center);
    const matchedPlanet =
      bodiesSummary.scope === 'system'
        ? bodiesSummary.planets?.find(
            (p) => toUrlSlug(p.id) === centerSlug || toUrlSlug(p.name) === centerSlug,
          )
        : undefined;
    const matchedStar =
      bodiesSummary.scope === 'system'
        ? bodiesSummary.stars?.find(
            (s) => toUrlSlug(s.id) === centerSlug || toUrlSlug(s.name) === centerSlug,
          )
        : undefined;
    const matchedMoon =
      bodiesSummary.scope === 'system'
        ? bodiesSummary.moonsAndDwarfPlanets?.find(
            (m) => toUrlSlug(m.id) === centerSlug || toUrlSlug(m.name) === centerSlug,
          )
        : bodiesSummary.moons?.find(
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

    if (matchedPlanet) {
      anchorId = matchedPlanet.id;
      anchorName = matchedPlanet.name;
      if (matchedPlanet.semiMajorAxisAu !== undefined) {
        parentSemiMajorAxisAu = matchedPlanet.semiMajorAxisAu;
      }
    } else if (matchedStar) {
      anchorId = matchedStar.id;
      anchorName = matchedStar.name;
    } else if (matchedMoon) {
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

  const distanceFromOriginPc = coordinatesPc
    ? Number(Math.hypot(coordinatesPc[0], coordinatesPc[1], coordinatesPc[2]).toFixed(2))
    : undefined;

  const planetRadii = (bodiesSummary.scope === 'system' ? (bodiesSummary.planets ?? []) : [])
    .map((p) => p.semiMajorAxisAu)
    .filter((r): r is number => typeof r === 'number' && !Number.isNaN(r));
  const outerOrbitalRadiusAu =
    planetRadii.length > 0 ? Math.max(...planetRadii) : undefined;

  const habitableZoneAu = schematic?.habitableZoneAu;

  const planetsCount =
    bodiesSummary.scope === 'system' ? (bodiesSummary.planets?.length ?? 0) : 0;
  const moonsCount =
    bodiesSummary.scope === 'system'
      ? (bodiesSummary.moonsAndDwarfPlanets?.length ?? 0)
      : (bodiesSummary.moons?.length ?? 0);
  const minorBodiesCount = bodiesSummary.minorBodiesAndSpacecraft?.length ?? 0;
  const orbitingBodyCount = planetsCount + moonsCount + minorBodiesCount;

  const anchorMarker: MinimapMarkerItem = {
    id: bodiesSummary.systemId,
    name: bodiesSummary.systemName,
    kind: 'system',
    role: 'anchor',
    href: `/system/${bodiesSummary.systemId}`,
  };

  let focusedMarker: MinimapMarkerItem | null = null;
  if (focusedEntity) {
    const matchedPlanet =
      bodiesSummary.scope === 'system'
        ? bodiesSummary.planets?.find(
            (p) =>
              p.id === focusedEntity.id ||
              toUrlSlug(p.id) === toUrlSlug(focusedEntity.id) ||
              p.name.toLowerCase() === focusedEntity.name.toLowerCase(),
          )
        : undefined;
    focusedMarker = {
      id: focusedEntity.id,
      name: focusedEntity.name,
      kind: resolveEntityMarkerKind(focusedEntity),
      role: 'focused',
      href: `/system/${bodiesSummary.systemId}?focus=${focusedEntity.id}`,
      ...(matchedPlanet?.semiMajorAxisAu !== undefined
        ? { semiMajorAxisAu: matchedPlanet.semiMajorAxisAu }
        : {}),
    };
  }

  const selectedMarkers: MinimapMarkerItem[] = selectedEntities.map((e) => ({
    id: e.id,
    name: e.name,
    kind: resolveEntityMarkerKind(e),
    role: 'selected',
    href: `/system/${bodiesSummary.systemId}?focus=${e.id}`,
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
    ...(sectorName !== undefined ? { sectorName } : {}),
    ...(coordinatesPc !== undefined ? { coordinatesPc } : {}),
    ...(distanceFromOriginPc !== undefined ? { distanceFromOriginPc } : {}),
    ...(outerOrbitalRadiusAu !== undefined ? { outerOrbitalRadiusAu } : {}),
    ...(habitableZoneAu !== undefined ? { habitableZoneAu } : {}),
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
