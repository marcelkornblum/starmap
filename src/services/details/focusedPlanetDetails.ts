import type { SystemManifest } from '../../types/astro';
import type { SolarSystemBodyRecord } from '../../types/astroStructures';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import {
  computePlanetSurfaceGravityG,
  isPlanetTidallyLocked,
} from '../../utils/planetaryPhysics';
import type {
  EntityHazardItem,
  FocusedEntityDetailsBase,
  FocusedPlanetDetail,
  FocusedPlanetEntityDetails,
  PlanetCompositionClass,
} from './detailsEntityTypes';
import type { SystemElementBodyItem } from './detailsHierarchyTypes';

const DEFAULT_STAR_MASS_MSUN = 1.0;
const EARTH_ORBITAL_YEAR_DAYS = 365.25;
const EARTH_MASS_KG = 5.97237e24;
const EARTH_RADIUS_KM = 6371.0;
const ESI_REFERENCE_TEMP_K = 288;

export function buildFocusedPlanetDetails(
  baseDetails: FocusedEntityDetailsBase,
  matchedPlanetDetail: FocusedPlanetDetail | undefined,
  solarBodyRecord: SolarSystemBodyRecord | undefined,
  _matchedCorpusEntry: CompactSearchEntry | undefined,
  sysManifest: SystemManifest | undefined,
  planetComposition: PlanetCompositionClass,
  planetIsHabitable: boolean,
  orbitingBodies: readonly SystemElementBodyItem[],
  hazards: readonly EntityHazardItem[],
): FocusedPlanetEntityDetails {
  const fallbackSemiMajorAxis = solarBodyRecord?.orbit?.semiMajorAxis;
  const fallbackPeriodDays = solarBodyRecord?.orbit?.periodDays;
  const fallbackEccentricity = solarBodyRecord?.orbit?.eccentricity;
  const fallbackInclination = solarBodyRecord?.orbit?.inclination;

  const rawA = matchedPlanetDetail?.semiMajorAxisAu ?? fallbackSemiMajorAxis;
  const hasCataloguedA =
    typeof rawA === 'number' && Number.isFinite(rawA) && rawA > 0;
  const periodDays =
    matchedPlanetDetail?.periodDays ?? fallbackPeriodDays;

  let semiMajorAxisAu: number | undefined;
  let isTheoreticalOrbit = false;

  if (matchedPlanetDetail?.isTheoreticalOrbit) {
    semiMajorAxisAu = matchedPlanetDetail.semiMajorAxisAu;
    isTheoreticalOrbit = true;
  } else if (hasCataloguedA) {
    semiMajorAxisAu = rawA;
    isTheoreticalOrbit = false;
  } else if (
    typeof periodDays === 'number' &&
    Number.isFinite(periodDays) &&
    periodDays > 0
  ) {
    const starMass =
      typeof sysManifest?.stars?.[0]?.massMsun === 'number' &&
      Number.isFinite(sysManifest.stars[0].massMsun) &&
      sysManifest.stars[0].massMsun > 0
        ? sysManifest.stars[0].massMsun
        : DEFAULT_STAR_MASS_MSUN;
    const periodYears = periodDays / EARTH_ORBITAL_YEAR_DAYS;
    semiMajorAxisAu =
      Math.round(Math.cbrt(periodYears * periodYears * starMass) * 10000) /
      10000;
    isTheoreticalOrbit = true;
  }

  const eccentricity =
    matchedPlanetDetail?.eccentricity ?? fallbackEccentricity;
  const inclinationDeg =
    matchedPlanetDetail?.inclinationDeg ?? fallbackInclination;

  const surfaceGravityG =
    matchedPlanetDetail?.surfaceGravityG ??
    (solarBodyRecord && solarBodyRecord.massKg && solarBodyRecord.meanRadiusKm
      ? computePlanetSurfaceGravityG({
          massMearth: solarBodyRecord.massKg / EARTH_MASS_KG,
          radiusRearth: solarBodyRecord.meanRadiusKm / EARTH_RADIUS_KM,
        })
      : computePlanetSurfaceGravityG({
          massMearth: matchedPlanetDetail?.massMearth,
          radiusRearth: matchedPlanetDetail?.radiusRearth,
        }));

  const isTidallyLockedFlag =
    matchedPlanetDetail?.isTidallyLocked ??
    isPlanetTidallyLocked({
      periodDays,
      semiMajorAxisAu,
    });

  const esi =
    matchedPlanetDetail?.esi ??
    (matchedPlanetDetail?.radiusRearth && matchedPlanetDetail?.equilibriumTempK
      ? Math.round(
          Math.sqrt(
            Math.max(
              0,
              (1 - Math.abs((matchedPlanetDetail.radiusRearth - 1) / (matchedPlanetDetail.radiusRearth + 1))) *
                (1 - Math.abs((matchedPlanetDetail.equilibriumTempK - ESI_REFERENCE_TEMP_K) / (matchedPlanetDetail.equilibriumTempK + ESI_REFERENCE_TEMP_K))),
            ),
          ) * 100,
        ) / 100
      : undefined);

  return {
    ...baseDetails,
    focusedKind: 'planet',
    orbitingBodies,
    planetTelemetry: {
      composition: planetComposition,
      isHabitableCandidate: planetIsHabitable,
      ...(semiMajorAxisAu !== undefined ? { semiMajorAxisAu } : {}),
      ...(isTheoreticalOrbit ? { isTheoreticalOrbit: true } : {}),
      ...(periodDays !== undefined ? { periodDays } : {}),
      ...(eccentricity !== undefined ? { eccentricity } : {}),
      ...(inclinationDeg !== undefined ? { inclinationDeg } : {}),
      ...(matchedPlanetDetail?.massMearth !== undefined
        ? { massMearth: matchedPlanetDetail.massMearth }
        : {}),
      ...(matchedPlanetDetail?.radiusRearth !== undefined
        ? { radiusRearth: matchedPlanetDetail.radiusRearth }
        : {}),
      ...(matchedPlanetDetail?.equilibriumTempK !== undefined
        ? { equilibriumTempK: matchedPlanetDetail.equilibriumTempK }
        : {}),
      ...(esi !== undefined ? { esi } : {}),
      ...(surfaceGravityG !== undefined ? { surfaceGravityG } : {}),
      isTidallyLocked: isTidallyLockedFlag,
      ...(matchedPlanetDetail?.discoveryYear !== undefined
        ? { discoveryYear: matchedPlanetDetail.discoveryYear }
        : {}),
      ...(matchedPlanetDetail?.discoveryMethod
        ? { discoveryMethod: matchedPlanetDetail.discoveryMethod }
        : {}),
      hazardCount: hazards.length,
      hazards,
    },
  };
}
