import type {
  CelestialSymbolType,
  PlanetComposition,
  StellarClassification,
  SystemSummaryNode,
} from '../types/astro';
import type { GalacticStructureRecord, SolarSystemBodyRecord } from '../types/astroStructures';
import {
  DEFAULT_STRUCTURE_DESCRIPTIONS,
  resolveDefaultStructureDescription,
} from './compactDataConstants';
import {
  classifyPlanetPhysical,
  computePlanetSurfaceGravityG,
  isPlanetTidallyLocked,
} from './planetaryPhysics';
import { computePlanetHazardMask } from './astroHazards';

export { DEFAULT_STRUCTURE_DESCRIPTIONS, resolveDefaultStructureDescription };

export function resolveStellarClassificationFromSpectrum(
  spect?: string,
): StellarClassification {
  if (!spect) {
    return 'star';
  }
  const clean = spect.trim();
  if (/black[\s-]*hole/i.test(clean)) {
    return 'black-hole';
  }
  if (/^PSR/i.test(clean) || /neutron|pulsar/i.test(clean)) {
    return 'neutron-star';
  }
  const isMountWilsonDwarfPrefix = /^d[OBAFGKMLTY]/i.test(clean) && clean.startsWith('d');
  if (!isMountWilsonDwarfPrefix && /^D/i.test(clean)) {
    return 'white-dwarf';
  }
  if (/^[LTY]/i.test(clean)) {
    return 'brown-dwarf';
  }
  return 'star';
}

export function resolveStellarReticleType(
  classification: StellarClassification,
  isMultiStar = false,
): CelestialSymbolType {
  switch (classification) {
    case 'black-hole':
      return 'black-hole';
    case 'neutron-star':
      return 'pulsar';
    case 'white-dwarf':
      return 'white-dwarf';
    case 'brown-dwarf':
      return 'brown-dwarf';
    case 'star':
    default:
      return isMultiStar ? 'multiple-system' : 'stellar-system';
  }
}

export function resolvePlanetReticleType(
  composition?: PlanetComposition,
  isDwarfPlanet = false,
): CelestialSymbolType {
  if (isDwarfPlanet) {
    return 'dwarf-planet';
  }
  switch (composition) {
    case 'gas-giant':
      return 'gas-giant';
    case 'ice-giant':
      return 'ice-giant';
    case 'super-earth':
      return 'super-earth';
    case 'terrestrial':
    default:
      return 'terrestrial';
  }
}

export function resolveStructureReticleType(
  type: GalacticStructureRecord['type'] | string,
): CelestialSymbolType {
  switch (type) {
    case 'Pulsar':
      return 'pulsar';
    case 'BlackHole':
      return 'black-hole';
    case 'SupernovaRemnant':
      return 'supernova-remnant';
    case 'PlanetaryNebula':
    case 'EmissionNebula':
    case 'ReflectionNebula':
    case 'DarkNebula':
      return 'nebula';
    default:
      return 'stellar-cluster';
  }
}

export function resolveMinorBodyReticleType(
  classification: SolarSystemBodyRecord['classification'] | string,
  beltZone?: 'belt' | 'kuiper',
): CelestialSymbolType {
  switch (classification) {
    case 'DwarfPlanet':
      return 'dwarf-planet';
    case 'Comet':
      return 'comet';
    case 'Spacecraft':
      return 'spacecraft';
    case 'AsteroidBelt':
      return 'asteroid-belt';
    case 'OortCloud':
      return 'oort-cloud';
    default:
      return beltZone === 'kuiper' ? 'kuiper-belt-object' : 'asteroid';
  }
}

export function precalculateSolarSystemBodyFlags(
  body: SolarSystemBodyRecord,
): SolarSystemBodyRecord {
  const targetStarId =
    body.targetStarId ??
    (body.classification === 'Star' ? `${body.id}-A` : body.id);

  const sma = body.orbit?.semiMajorAxis;

  const isHabitableCandidate =
    body.isHabitableCandidate ??
    (body.classification === 'Planet' &&
      sma !== undefined &&
      sma >= 0.75 &&
      sma <= 1.77);

  const beltZone =
    body.beltZone ??
    (sma !== undefined && sma >= 2.0 && sma <= 3.5
      ? 'belt'
      : sma !== undefined && sma >= 30
        ? 'kuiper'
        : body.classification === 'AsteroidMainBelt'
          ? 'belt'
          : body.classification === 'AsteroidDistant'
            ? 'kuiper'
            : undefined);

  const isCoreSearch =
    body.isCoreSearch ??
    (!body.id.startsWith('pha-') &&
      !body.id.startsWith('distant-') &&
      !body.id.startsWith('comet-'));

  let composition = body.composition;
  let surfaceGravityG = body.surfaceGravityG;
  let isTidallyLocked = body.isTidallyLocked;
  let hazardMask = body.hazardMask;

  if (body.classification === 'Planet') {
    const mEarth =
      body.massKg !== undefined ? body.massKg / 5.97237e24 : undefined;
    const rEarth = body.meanRadiusKm > 0 ? body.meanRadiusKm / 6371.0 : undefined;
    if (!composition) {
      composition = classifyPlanetPhysical({
        massMearth: mEarth,
        radiusRearth: rEarth,
        classification: body.tags?.join(' '),
      });
    }
    if (surfaceGravityG === undefined) {
      surfaceGravityG = computePlanetSurfaceGravityG({
        massMearth: mEarth,
        radiusRearth: rEarth,
      });
    }
    if (isTidallyLocked === undefined) {
      isTidallyLocked = isPlanetTidallyLocked({
        periodDays: body.orbit?.periodDays,
        semiMajorAxisAu: sma,
      });
    }
    if (hazardMask === undefined) {
      hazardMask = computePlanetHazardMask({
        surfaceGravityG,
        periodDays: body.orbit?.periodDays,
        semiMajorAxisAu: sma,
        eccentricity: body.orbit?.eccentricity,
      });
    }
  }

  let reticleType = body.reticleType;
  if (!reticleType) {
    if (body.classification === 'Star') {
      reticleType = 'star';
    } else if (body.classification === 'Planet') {
      reticleType = resolvePlanetReticleType(composition, false);
    } else if (body.classification === 'Moon') {
      reticleType = 'moon';
    } else if (body.tags?.includes('Spacecraft')) {
      reticleType = 'spacecraft';
    } else {
      reticleType = resolveMinorBodyReticleType(body.classification, beltZone);
    }
  }

  return {
    ...body,
    targetStarId,
    isHabitableCandidate,
    beltZone,
    isCoreSearch,
    composition,
    reticleType,
    ...(surfaceGravityG !== undefined ? { surfaceGravityG } : {}),
    ...(isTidallyLocked !== undefined ? { isTidallyLocked } : {}),
    ...(hazardMask !== undefined && hazardMask > 0 ? { hazardMask } : {}),
  };
}

export function isSearchableStarSystem(sys: SystemSummaryNode): boolean {
  const rawGaiaSuffix = sys.id.startsWith('gaia-') ? sys.id.slice(5) : undefined;
  const isUnnamedGaia =
    rawGaiaSuffix !== undefined && sys.name === `Gaia DR3 ${rawGaiaSuffix}`;
  if (isUnnamedGaia && sys.planetCount === 0 && sys.dist > 10 && sys.mag > 6.5) {
    return false;
  }
  return true;
}

export function isCoreSearchStarSystem(sys: SystemSummaryNode): boolean {
  return (
    sys.dist <= 10 ||
    sys.mag <= 6.5 ||
    sys.planetCount > 0 ||
    Boolean(sys.properName) ||
    (!sys.name.startsWith('HIP ') &&
      !sys.name.startsWith('HD ') &&
      !sys.name.startsWith('Gaia '))
  );
}

export function isCoreSearchMinorBody(body: SolarSystemBodyRecord): boolean {
  if (body.isCoreSearch !== undefined) {
    return body.isCoreSearch;
  }
  return !body.id.startsWith('pha-') && !body.id.startsWith('distant-') && !body.id.startsWith('comet-');
}

export function isCoreSearchStructure(struct: GalacticStructureRecord): boolean {
  const isCuratedStructure =
    !struct.id.startsWith('cluster-') &&
    !struct.id.startsWith('globular-') &&
    !struct.id.startsWith('snr-') &&
    !struct.id.startsWith('pulsar-') &&
    !struct.id.startsWith('barnard-') &&
    !struct.id.startsWith('ngc-');

  return (
    isCuratedStructure ||
    struct.type === 'DeepSkyLandmark' ||
    struct.designations.some((d) => d.startsWith('M ') || /^M\d+$/i.test(d)) ||
    struct.dist <= 200
  );
}
