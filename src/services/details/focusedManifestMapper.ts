import type { SystemManifest } from '../../types/astro';
import { buildMetricGuideHref } from '../../content/guide';
import {
  classifyExoplanetComposition,
  isExoplanetHabitableCandidate,
} from './detailsComposition';
import { decodePlanetHazards, formatDiskKindLabel } from './detailsHazards';
import { buildSystemElementFocusHref } from './detailsNavigation';
import type {
  FocusedDiskDetail,
  FocusedPlanetDetail,
  FocusedStarDetail,
} from './detailsEntityTypes';

const DEFAULT_STELLAR_MASS_MSUN = 1.0;
const EARTH_ORBITAL_YEAR_DAYS = 365.25;

export const mapManifestToStarsAndPlanets = (
  manifest: SystemManifest,
  systemNameOrId: string,
): {
  readonly stars: readonly FocusedStarDetail[];
  readonly planets: readonly FocusedPlanetDetail[];
  readonly disks: readonly FocusedDiskDetail[];
} => {
  const stars: FocusedStarDetail[] = manifest.stars.map((s) => ({
    id: s.id,
    name: s.name,
    href: buildSystemElementFocusHref(systemNameOrId, s.name || s.id),
    componentDesignation: s.componentDesignation ?? 'A',
    spectralType: s.spectralType,
    mag: s.mag,
    absmag: s.absmag,
    ...(s.massMsun !== undefined ? { massMsun: s.massMsun } : {}),
    ...(s.radiusRsun !== undefined ? { radiusRsun: s.radiusRsun } : {}),
    ...(s.luminosityLsun !== undefined
      ? { luminosityLsun: s.luminosityLsun }
      : {}),
    ...(s.effectiveTempK !== undefined
      ? { effectiveTempK: s.effectiveTempK }
      : {}),
  }));

  const sortedPlanets = [...manifest.planets].sort((a, b) => {
    const aA =
      typeof a.orbit?.semiMajorAxis === 'number' &&
      Number.isFinite(a.orbit.semiMajorAxis) &&
      a.orbit.semiMajorAxis > 0
        ? a.orbit.semiMajorAxis
        : Number.POSITIVE_INFINITY;
    const bA =
      typeof b.orbit?.semiMajorAxis === 'number' &&
      Number.isFinite(b.orbit.semiMajorAxis) &&
      b.orbit.semiMajorAxis > 0
        ? b.orbit.semiMajorAxis
        : Number.POSITIVE_INFINITY;
    return aA - bA;
  });

  const planets: FocusedPlanetDetail[] = sortedPlanets.map((p) => {
    const composition = classifyExoplanetComposition(p);
    const cataloguedA = p.orbit?.semiMajorAxis;
    const hasCataloguedA =
      typeof cataloguedA === 'number' &&
      Number.isFinite(cataloguedA) &&
      cataloguedA > 0;
    const periodDays = p.orbit?.periodDays;

    let semiMajorAxisAu: number | undefined;
    let isTheoreticalOrbit = false;

    if (hasCataloguedA) {
      semiMajorAxisAu = cataloguedA;
    } else if (
      typeof periodDays === 'number' &&
      Number.isFinite(periodDays) &&
      periodDays > 0
    ) {
      const starMass =
        typeof manifest.stars[0]?.massMsun === 'number' &&
        Number.isFinite(manifest.stars[0].massMsun) &&
        manifest.stars[0].massMsun > 0
          ? manifest.stars[0].massMsun
          : DEFAULT_STELLAR_MASS_MSUN;
      const periodYears = periodDays / EARTH_ORBITAL_YEAR_DAYS;
      semiMajorAxisAu =
        Math.round(Math.cbrt(periodYears * periodYears * starMass) * 10000) /
        10000;
      isTheoreticalOrbit = true;
    }

    const surfaceGravityG = p.surfaceGravityG;
    const isTidallyLocked = p.isTidallyLocked ?? false;
    const hazards = decodePlanetHazards(p.hazardMask ?? 0);

    return {
      id: p.id,
      name: p.name,
      href: buildSystemElementFocusHref(systemNameOrId, p.name || p.id),
      ...(p.letter ? { letter: p.letter } : {}),
      composition,
      ...(semiMajorAxisAu !== undefined ? { semiMajorAxisAu } : {}),
      ...(isTheoreticalOrbit ? { isTheoreticalOrbit: true } : {}),
      ...(p.orbit?.periodDays !== undefined
        ? { periodDays: p.orbit.periodDays }
        : {}),
      ...(p.orbit?.eccentricity !== undefined
        ? { eccentricity: p.orbit.eccentricity }
        : {}),
      ...(p.orbit?.inclination !== undefined
        ? { inclinationDeg: p.orbit.inclination }
        : {}),
      ...(p.axialTiltDeg !== undefined
        ? { axialTiltDeg: p.axialTiltDeg }
        : {}),
      ...(p.massMearth !== undefined ? { massMearth: p.massMearth } : {}),
      ...(p.radiusRearth !== undefined ? { radiusRearth: p.radiusRearth } : {}),
      ...(p.equilibriumTempK !== undefined
        ? { equilibriumTempK: p.equilibriumTempK }
        : {}),
      ...(p.esi !== undefined ? { esi: p.esi } : {}),
      ...(surfaceGravityG !== undefined ? { surfaceGravityG } : {}),
      ...(isTidallyLocked ? { isTidallyLocked } : {}),
      ...(p.discoveryYear !== undefined
        ? { discoveryYear: p.discoveryYear }
        : {}),
      ...(p.discoveryMethod ? { discoveryMethod: p.discoveryMethod } : {}),
      ...(p.rings && p.rings.length > 0 ? { rings: p.rings } : {}),
      isHabitableCandidate: isExoplanetHabitableCandidate(p),
      hazardCount: hazards.length,
      hazards,
    };
  });

  const disks: FocusedDiskDetail[] = (manifest.disks ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    kind: d.kind,
    kindLabel: formatDiskKindLabel(d.kind),
    href: buildSystemElementFocusHref(systemNameOrId, d.name || d.id),
    innerRadiusAu: d.innerRadiusAu,
    outerRadiusAu: d.outerRadiusAu,
    semiMajorAxisAu:
      d.semiMajorAxisAu ?? (d.innerRadiusAu + d.outerRadiusAu) / 2,
    ...(d.tempK !== undefined ? { tempK: d.tempK } : {}),
    composition: d.composition,
    ...(d.confidence ? { confidence: d.confidence } : {}),
    guideHref: buildMetricGuideHref('semi-major-axis'),
  }));

  return { stars, planets, disks };
};
