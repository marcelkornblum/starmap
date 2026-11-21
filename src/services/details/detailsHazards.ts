import type { SpatialEntityDefinition } from '../../types/spatial';
import type {
  CircumstellarDiskKind,
  CircumstellarDiskRecord,
} from '../../types/astro';
import {
  PLANET_HAZARD_BITS,
  SYSTEM_HAZARD_BITS,
} from '../../utils/compactDataConstants';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { isArtificialSpacecraftEntry } from '../search/searchCorpusHelpers';
import type {
  EntityHazardItem,
  FocusedDiskDetail,
} from './detailsEntityTypes';

export function decodeSystemHazards(mask?: number): readonly EntityHazardItem[] {
  if (!mask || mask <= 0) return [];
  const hazards: EntityHazardItem[] = [];

  if (mask & SYSTEM_HAZARD_BITS.FLARE_STAR) {
    hazards.push({
      code: 'flare-star',
      label: 'Stellar flare activity',
      severity: 'warning',
      description: 'Active stellar chromosphere flare events producing ultraviolet and X-ray radiation spikes.',
    });
  }

  if (mask & SYSTEM_HAZARD_BITS.IONISING_RADIATION) {
    hazards.push({
      code: 'ionising-radiation',
      label: 'Hard ionising radiation',
      severity: 'critical',
      description: 'High-energy ionizing flux from high-temperature stellar surface or degenerate remnant.',
    });
  }

  if (mask & SYSTEM_HAZARD_BITS.VARIABLE_FLUX) {
    hazards.push({
      code: 'variable-flux',
      label: 'Variable stellar flux',
      severity: 'warning',
      description: 'Significant bolometric luminosity fluctuations across periodic stellar cycles.',
    });
  }

  return hazards;
}

export function decodePlanetHazards(mask?: number): readonly EntityHazardItem[] {
  if (!mask || mask <= 0) return [];
  const hazards: EntityHazardItem[] = [];

  if (mask & PLANET_HAZARD_BITS.EXTREME_HEAT) {
    hazards.push({
      code: 'extreme-heat',
      label: 'Extreme thermal flux',
      severity: 'critical',
      description: 'Surface equilibrium temperature exceeds 373 K (boiling point of water at 1 atm).',
    });
  }

  if (mask & PLANET_HAZARD_BITS.CRYOGENIC_COLD) {
    hazards.push({
      code: 'cryogenic-cold',
      label: 'Cryogenic surface temperature',
      severity: 'warning',
      description: 'Surface equilibrium temperature drops below 180 K, freezing volatile compounds.',
    });
  }

  if (mask & PLANET_HAZARD_BITS.HIGH_GRAVITY) {
    hazards.push({
      code: 'high-gravity',
      label: 'High surface gravity',
      severity: 'warning',
      description: 'Surface gravitational acceleration exceeds 1.2 g Earth standard.',
    });
  }

  if (mask & PLANET_HAZARD_BITS.TIDAL_LOCKING) {
    hazards.push({
      code: 'tidal-locking',
      label: 'Tidally locked (synchronous)',
      severity: 'warning',
      description: 'Rotational period synchronised with orbital period, creating permanent day/night hemispheres.',
    });
  }

  if (mask & PLANET_HAZARD_BITS.HIGH_ECCENTRICITY) {
    hazards.push({
      code: 'high-eccentricity',
      label: 'High orbital eccentricity',
      severity: 'warning',
      description: 'Orbital eccentricity exceeds 0.20, driving severe seasonal climate variability.',
    });
  }

  return hazards;
}

export function formatDiskKindLabel(kind: CircumstellarDiskKind): string {
  switch (kind) {
    case 'asteroid-belt':
      return 'Asteroid Belt';
    case 'kuiper-belt':
      return 'Kuiper Belt';
    case 'debris-disk':
      return 'Debris Disk';
    default:
      return 'Circumstellar Disk';
  }
}

export const isDwarfPlanetInDisk = (
  entry: CompactSearchEntry | undefined,
  disk: CircumstellarDiskRecord | FocusedDiskDetail,
  semiMajorAxisAu?: number,
): boolean => {
  if (entry?.e === 'belt' && disk.kind === 'asteroid-belt') return true;
  if (entry?.e === 'kuiper' && disk.kind === 'kuiper-belt') return true;

  const a = semiMajorAxisAu ?? entry?.A;
  if (a !== undefined && Number.isFinite(a)) {
    return a >= disk.innerRadiusAu && a <= disk.outerRadiusAu;
  }
  return false;
};

export const toCoordinatesTuple = (
  pos: SpatialEntityDefinition['position'] | undefined,
): readonly [number, number, number] => {
  if (Array.isArray(pos)) {
    const x = Number.isFinite(pos[0]) ? pos[0] : 0;
    const y = Number.isFinite(pos[1]) ? pos[1] : 0;
    const z = Number.isFinite(pos[2]) ? pos[2] : 0;
    return [x, y, z];
  }
  if (pos && typeof pos === 'object') {
    const x = Number.isFinite(pos.x) ? pos.x : 0;
    const y = Number.isFinite(pos.y) ? pos.y : 0;
    const z = Number.isFinite(pos.z) ? pos.z : 0;
    return [x, y, z];
  }
  return [0, 0, 0];
};

export const resolveMinorBodyCategoryLabel = (entry?: CompactSearchEntry): string => {
  switch (entry?.k) {
    case 3:
      return 'Moon';
    case 4:
      return 'Dwarf Planet';
    case 6:
      return isArtificialSpacecraftEntry(entry)
        ? 'Spacecraft'
        : 'Asteroid / Minor Body';
    default:
      return 'Celestial Body';
  }
};
