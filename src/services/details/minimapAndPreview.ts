import type { SpatialEntityDefinition } from '../../components/canvas/entity/types';
import type { DecodedDetailRecord } from '../../data/detailsRepository';
import { toUrlSlug } from '../searchService';
import { toCoordinatesTuple } from './hazardsAndComposition';
import type {
  FocusedEntityDetails,
  FocusedPreviewSummary,
  MinimapMarkerItem,
  MinimapOrientationSummary,
  MinimapScope,
  OrbitalSchematicEntityKind,
  OrbitalSchematicSummary,
  PlanetaryBodiesSummary,
  PreviewMode,
  PreviewOrbitElement,
  SceneCameraUrlState,
  SystemBodiesSummary,
} from './types';

/**
 * Pure domain builder producing a `FocusedPreviewSummary` for the contextual 3D focus preview window (DEC-016).
 * Returns `null` when no entity is focused.
 */
export const buildFocusedPreviewSummary = (
  details: FocusedEntityDetails | null,
  entityDetail?: DecodedDetailRecord,
): FocusedPreviewSummary | null => {
  if (!details) {
    return null;
  }

  const { id: targetId, name: targetName, systemId, systemName, focusedKind } = details;

  let previewMode: PreviewMode;
  if (focusedKind === 'system' || focusedKind === 'star') {
    previewMode = 'system-orbits';
  } else if (focusedKind === 'planet') {
    previewMode = 'planetary-system';
  } else {
    previewMode = 'object-orbit';
  }

  const solarOrbit =
    entityDetail?.kind === 'solar-body' ? entityDetail.record.orbit : undefined;

  let primaryInclinationDeg: number | undefined;
  let primaryEccentricity: number | undefined;
  let primarySemiMajorAxisAu: number | undefined;

  if (focusedKind === 'planet') {
    primaryInclinationDeg =
      details.planetTelemetry?.inclinationDeg ?? solarOrbit?.inclination;
    primaryEccentricity =
      details.planetTelemetry?.eccentricity ?? solarOrbit?.eccentricity;
    primarySemiMajorAxisAu =
      details.planetTelemetry?.semiMajorAxisAu ?? solarOrbit?.semiMajorAxis;
  } else if (focusedKind === 'minor-body') {
    primaryInclinationDeg = solarOrbit?.inclination;
    primaryEccentricity = solarOrbit?.eccentricity;
    primarySemiMajorAxisAu = solarOrbit?.semiMajorAxis;
  }

  let orbitElements: PreviewOrbitElement[] = [];
  if (previewMode === 'system-orbits') {
    orbitElements = details.planets.map((p, index) => ({
      id: p.id,
      name: p.name,
      kind: 'planet',
      orbitRank: index + 1,
      ...(p.semiMajorAxisAu !== undefined ? { semiMajorAxisAu: p.semiMajorAxisAu } : {}),
      ...(p.inclinationDeg !== undefined ? { inclinationDeg: p.inclinationDeg } : {}),
      ...(p.eccentricity !== undefined ? { eccentricity: p.eccentricity } : {}),
      inHabitableZone: p.isHabitableCandidate,
    }));
  } else if (previewMode === 'planetary-system') {
    orbitElements = (details.orbitingBodies ?? []).map((b, index) => {
      const kind: OrbitalSchematicEntityKind =
        b.categoryLabel === 'Moon'
          ? 'moon'
          : b.categoryLabel === 'Spacecraft'
            ? 'spacecraft'
            : 'minor-body';
      return {
        id: b.id,
        name: b.name,
        kind,
        orbitRank: index + 1,
        inHabitableZone: false,
      };
    });
  }

  return {
    targetId,
    targetName,
    systemId,
    systemName,
    focusedKind,
    previewMode,
    ...(primaryInclinationDeg !== undefined ? { primaryInclinationDeg } : {}),
    ...(primaryEccentricity !== undefined ? { primaryEccentricity } : {}),
    ...(primarySemiMajorAxisAu !== undefined ? { primarySemiMajorAxisAu } : {}),
    orbitElements,
  };
};

/**
 * Pure type-safe helper function to resolve marker kind from an entity definition.
 */
const resolveEntityMarkerKind = (
  entity: { readonly classification?: string; readonly type?: string } | null | undefined,
): string => {
  if (!entity) return 'point';
  if (typeof entity.type === 'string' && entity.type.length > 0) return entity.type;
  if (typeof entity.classification === 'string' && entity.classification.length > 0) {
    return entity.classification;
  }
  return 'entity';
};

/**
 * Pure domain builder producing a `MinimapOrientationSummary` for the galactic reference frame (`GalaxyView`).
 * Orients around Sol as the galactic origin anchor [0, 0, 0] pc (DEC-017, DEC-021).
 */
export const buildGalaxyMinimapOrientation = (
  focusedEntity: SpatialEntityDefinition | null | undefined,
  selectedEntities: readonly SpatialEntityDefinition[] = [],
  focusedDetails: FocusedEntityDetails | null = null,
  cameraState?: SceneCameraUrlState,
  centerEntity?: SpatialEntityDefinition | null,
): MinimapOrientationSummary => {
  const scope: MinimapScope = 'galaxy';
  let anchorId = 'sol';
  let anchorName = 'Sol';
  const systemId = focusedDetails?.systemId ?? 'sol';
  const systemName = focusedDetails?.systemName ?? 'Sol';
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
    id: 'sol',
    name: 'Sol',
    kind: 'star',
    role: 'origin',
    href: '/galaxy?focus=sol',
    coordinatesPc: [0, 0, 0],
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
    anchorId !== 'sol' && anchorId !== focusedMarker?.id
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
        m.id !== 'sol' &&
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

/**
 * Pure domain builder producing a `MinimapOrientationSummary` for a stellar system frame (`SystemView`).
 * Orients around the host star / barycenter anchor or centered body (DEC-017, DEC-021).
 */
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

/**
 * Pure domain builder producing a `MinimapOrientationSummary` for a planetary frame (`PlanetView`).
 * Orients around the primary planet anchor or centered body (DEC-017, DEC-021).
 */
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
