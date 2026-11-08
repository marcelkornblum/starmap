import type {
  CelestialSymbolType,
  GalacticStructureRecord,
  SolarSystemBodyRecord,
  SystemSummaryNode,
} from '../types/astro';
import { classifyPlanetPhysical } from './astroMath';

export const DEFAULT_STRUCTURE_DESCRIPTIONS: Record<number, string> = {
  1: 'Galactic open star cluster cataloged in Cantat-Gaudin Gaia survey.',
  2: 'Milky Way halo globular cluster from Harris (2010) catalog.',
  3: "Galactic supernova remnant from Green's SNR Catalogue.",
  4: 'Rotation-powered pulsar from ATNF Pulsar Database.',
  9: 'Dark absorption cloud cataloged by E. E. Barnard.',
  10: 'Deep sky landmark cataloged in OpenNGC.',
};

const STRUCTURE_TYPE_TO_CODE: Record<GalacticStructureRecord['type'], number> = {
  OpenCluster: 1,
  GlobularCluster: 2,
  SupernovaRemnant: 3,
  Pulsar: 4,
  PlanetaryNebula: 5,
  InterstellarMedium: 6,
  MovingGroup: 7,
  EmissionNebula: 8,
  DarkNebula: 9,
  DeepSkyLandmark: 10,
};

export function resolveDefaultStructureDescription(
  type: GalacticStructureRecord['type'],
): string {
  const code = STRUCTURE_TYPE_TO_CODE[type];
  return (
    (code !== undefined ? DEFAULT_STRUCTURE_DESCRIPTIONS[code] : undefined) ??
    'Galactic deep-sky structure.'
  );
}

export function resolveStellarClassificationFromSpectrum(
  spect?: string,
): 'star' | 'white-dwarf' | 'brown-dwarf' | 'neutron-star' | 'black-hole' {
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
  if (/^D/i.test(clean)) {
    return 'white-dwarf';
  }
  if (/^[LTY]/i.test(clean)) {
    return 'brown-dwarf';
  }
  return 'star';
}

export function resolveStellarReticleType(
  classification: 'star' | 'white-dwarf' | 'brown-dwarf' | 'neutron-star' | 'black-hole',
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
  composition?: 'terrestrial' | 'super-earth' | 'sub-neptune' | 'gas-giant',
  isDwarfPlanet = false,
): CelestialSymbolType {
  if (isDwarfPlanet) {
    return 'dwarf-planet';
  }
  switch (composition) {
    case 'gas-giant':
      return 'gas-giant';
    case 'sub-neptune':
      return 'sub-neptune';
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
    (body.id === 'sol' && body.classification === 'Star' ? 'sol-A' : body.id);

  const sma = body.orbit?.semiMajorAxis;

  const parentId = body.parentBodyId ?? (body as { parentId?: string }).parentId;
  const isHabitableCandidate =
    body.isHabitableCandidate ??
    (parentId === 'sol' &&
      body.classification === 'Planet' &&
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
  if (!composition && body.classification === 'Planet') {
    const mEarth =
      body.massKg !== undefined ? body.massKg / 5.97237e24 : undefined;
    const rEarth = body.meanRadiusKm > 0 ? body.meanRadiusKm / 6371.0 : undefined;
    const physical = classifyPlanetPhysical({
      massMearth: mEarth,
      radiusRearth: rEarth,
      classification: body.tags?.join(' '),
    });
    composition = physical === 'ice-giant' ? 'sub-neptune' : physical;
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
  return (
    !body.id.startsWith('pha-') &&
    !body.id.startsWith('distant-') &&
    !body.id.startsWith('comet-')
  );
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
