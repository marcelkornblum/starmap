import type { DecodedDetailRecord } from '../../data/detailsRepository';
import type { FocusedEntityDetails } from './detailsEntityTypes';
import type {
  FocusedPreviewSummary,
  PreviewMode,
  PreviewOrbitElement,
} from './detailsNavigationTypes';
import type {
  OrbitalSchematicEntityKind,
  OrbitalSchematicSummary,
} from './detailsHierarchyTypes';

export const buildFocusedPreviewSummary = (
  details: FocusedEntityDetails | null,
  entityDetail?: DecodedDetailRecord,
  schematic?: OrbitalSchematicSummary | null,
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
  const solarBodyAxialTiltDeg =
    entityDetail?.kind === 'solar-body' ? entityDetail.record.axialTiltDeg : undefined;

  let primaryInclinationDeg: number | undefined;
  let primaryEccentricity: number | undefined;
  let primarySemiMajorAxisAu: number | undefined;

  if (focusedKind === 'system' || focusedKind === 'star') {
    primaryInclinationDeg = details.planeInclinationDeg ?? 0;
  } else if (focusedKind === 'planet') {
    primaryInclinationDeg =
      details.planetTelemetry?.axialTiltDeg ??
      solarBodyAxialTiltDeg ??
      details.planetTelemetry?.inclinationDeg ??
      solarOrbit?.inclination;
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
  if (schematic !== undefined) {
    if (schematic && (previewMode === 'system-orbits' || previewMode === 'planetary-system')) {
      const visibleRows = schematic.hasMinorToggle
        ? schematic.rows.filter((row) => row.tier === 'primary')
        : schematic.rows;
      const planetById = new Map(details.planets.map((planet) => [planet.id, planet]));
      orbitElements = visibleRows.map((row, index) => {
        const matchedPlanet = planetById.get(row.id);
        return {
          id: row.id,
          name: row.name,
          kind: row.kind,
          symbolType: row.reticleType,
          orbitRank: index + 1,
          ...(Number.isFinite(row.sortDistanceAu)
            ? { semiMajorAxisAu: row.sortDistanceAu }
            : {}),
          ...(matchedPlanet?.inclinationDeg !== undefined
            ? { inclinationDeg: matchedPlanet.inclinationDeg }
            : {}),
          ...(matchedPlanet?.eccentricity !== undefined
            ? { eccentricity: matchedPlanet.eccentricity }
            : {}),
          inHabitableZone: row.inHabitableZone,
        };
      });
    }
  } else if (previewMode === 'system-orbits') {
    orbitElements = details.planets.map((p, index) => ({
      id: p.id,
      name: p.name,
      kind: 'planet',
      symbolType: p.composition,
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
      const symbolType =
        b.categoryKey ??
        (kind === 'moon' ? 'moon' : kind === 'spacecraft' ? 'spacecraft' : 'asteroid');
      return {
        id: b.id,
        name: b.name,
        kind,
        symbolType,
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
    ...(details.systemDetailsHref ? { detailsHref: details.systemDetailsHref } : {}),
    reticleType: details.reticleType,
    ...(primaryInclinationDeg !== undefined ? { primaryInclinationDeg } : {}),
    ...(primaryEccentricity !== undefined ? { primaryEccentricity } : {}),
    ...(primarySemiMajorAxisAu !== undefined ? { primarySemiMajorAxisAu } : {}),
    orbitElements,
  };
};
