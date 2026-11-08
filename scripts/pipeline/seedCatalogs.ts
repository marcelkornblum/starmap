import fs from 'node:fs';
import path from 'node:path';

const SEED_DIR = path.resolve(process.cwd(), 'data/seed');

function loadSeedJson<T>(filename: string): T {
  const filePath = path.join(SEED_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content) as T;
}

export interface IauStarNameEntry {
  properName: string;
  hip?: number;
  hd?: number;
  aliases?: string[];
}

export interface ReconsSystemEntry {
  id: string;
  name: string;
  properName: string;
  ra: number;
  dec: number;
  dist: number;
  mag: number;
  absmag: number;
  spect: string;
  starCount: number;
  aliases?: string[];
  description?: string;
}

export interface NameExoWorldEntry {
  starName: string;
  planetName: string;
  culturalOrigin: string;
}

export interface AavsoVariableEntry {
  varType: string;
  periodDays?: number;
  minMag?: number;
  maxMag?: number;
}

export interface GalacticStructureEntry {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  z: number;
  dist: number;
  radiusPc?: number;
  ageMyr?: number;
  memberCount?: number;
  designations: string[];
  description: string;
}

export interface SolarSystemBodyEntry {
  id: string;
  name: string;
  classification: string;
  parentBodyId?: string;
  meanRadiusKm: number;
  massKg: number;
  gm: number;
  albedo: number;
  rotationalPeriodHours: number;
  orbit?: {
    semiMajorAxis: number;
    eccentricity: number;
    inclination: number;
    ascendingNode: number;
    argumentOfPeriapsis: number;
    meanAnomaly: number;
    periodDays: number;
    epoch: string;
  };
  tags?: string[];
}

export interface CircumstellarDiskEntry {
  id: string;
  name: string;
  kind: 'asteroid-belt' | 'kuiper-belt' | 'debris-disk';
  innerRadiusAu: number;
  outerRadiusAu: number;
  semiMajorAxisAu: number;
  tempK?: number;
  composition: string;
}

export interface SystemAliasesData {
  diskHostAliases: Record<string, string[]>;
  specialSystemNameMap: Record<string, string>;
}

export interface BuildEpochData {
  generatedAt: string;
}

export const OFFICIAL_IAU_STAR_NAMES: Record<string, IauStarNameEntry> =
  loadSeedJson<Record<string, IauStarNameEntry>>('iau-star-names.json');

export const RECONS_10PC_SUPPLEMENT: ReconsSystemEntry[] =
  loadSeedJson<ReconsSystemEntry[]>('recons-10pc.json');

export const IAU_NAME_EXOWORLDS: Record<string, NameExoWorldEntry> =
  loadSeedJson<Record<string, NameExoWorldEntry>>('name-exoworlds.json');

export const AAVSO_VARIABLE_CATALOG: Record<string, AavsoVariableEntry> =
  loadSeedJson<Record<string, AavsoVariableEntry>>('aavso-variables.json');

export const FULL_GALACTIC_STRUCTURES: GalacticStructureEntry[] =
  loadSeedJson<GalacticStructureEntry[]>('galactic-structures.json');

export const FULL_SOLAR_SYSTEM_BODIES: SolarSystemBodyEntry[] =
  loadSeedJson<SolarSystemBodyEntry[]>('solar-system-bodies.json');

export const CIRCUMSTELLAR_DISKS_CATALOG: Record<string, CircumstellarDiskEntry[]> =
  loadSeedJson<Record<string, CircumstellarDiskEntry[]>>('circumstellar-disks.json');

const systemAliasesData = loadSeedJson<SystemAliasesData>('system-aliases.json');
export const DISK_HOST_ALIASES: Record<string, string[]> = systemAliasesData.diskHostAliases;
export const SPECIAL_SYSTEM_NAME_MAP: Record<string, string> = systemAliasesData.specialSystemNameMap;

export const CONSTELLATION_NAMES_RAW: string[] =
  loadSeedJson<string[]>('constellations.json');

const DEFAULT_EPOCH_FALLBACK = '2026-01-01T00:00:00.000Z';

/**
 * Resolves the deterministic build timestamp in ISO 8601 format.
 * Priority: overrideEpoch > process.env.SOURCE_DATE_EPOCH > data/seed/build-epoch.json > fallback.
 */
export function resolveBuildTimestampIso(overrideEpoch?: string): string {
  if (overrideEpoch && overrideEpoch.trim().length > 0) {
    return overrideEpoch.trim();
  }

  const envEpoch = process.env.SOURCE_DATE_EPOCH?.trim();
  if (envEpoch) {
    if (/^\d+$/.test(envEpoch)) {
      const unixSec = Number.parseInt(envEpoch, 10);
      return new Date(unixSec * 1000).toISOString();
    }
    const parsed = new Date(envEpoch);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  try {
    const epochData = loadSeedJson<BuildEpochData>('build-epoch.json');
    if (epochData.generatedAt && epochData.generatedAt.trim().length > 0) {
      return epochData.generatedAt.trim();
    }
  } catch {
    // If reading fails, fall through to default
  }

  return DEFAULT_EPOCH_FALLBACK;
}

/**
 * Writes the specified ISO timestamp to build-epoch.json (or optional custom path).
 */
export function writeBuildEpochIso(
  isoTimestamp: string = new Date().toISOString(),
  filePath?: string,
): string {
  const targetPath = filePath ?? path.join(SEED_DIR, 'build-epoch.json');
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const payload: BuildEpochData = { generatedAt: isoTimestamp };
  fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  return isoTimestamp;
}
