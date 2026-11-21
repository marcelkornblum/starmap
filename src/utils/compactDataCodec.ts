import type {
  CircumstellarDiskRecord,
  PlanetComposition,
  StellarClassification,
  StellarComponent,
  SystemManifest,
  SystemSummaryNode,
  SystemTag,
} from '../types/astro';
import type { SectorPartitionManifest } from '../types/astroCoordinates';
import type {
  GalacticStructureRecord,
  SolarSystemBodyRecord,
} from '../types/astroStructures';
import {
  BIT_TO_SYSTEM_TAG,
  CODE_TO_CONFIDENCE,
  CODE_TO_DISK_KIND,
  COMPACT_SCHEMA_VERSION,
} from './compactDataConstants';
import type {
  CompactCircumstellarDisk,
  CompactDetailRecord,
  CompactSectorPartition,
  CompactSummaryNode,
  CompactSystemManifest,
  ShardedBucketEnvelope,
} from './compactDataTypes';
import { formatSectorId } from './sectorMath';
import { resolveStarDisplayName } from './starNaming';
import { fnv1a32, getShardKeyFromHash } from './binarySectorCodec';
import {
  decodeExoplanet,
  decodeGalacticStructure,
  decodeSolarSystemBody,
} from './compactEntityDecoder';

export function getShardKey(id: string): string {
  return getShardKeyFromHash(fnv1a32(id));
}

function decodePlanetCensusMask(
  mask?: number,
): PlanetComposition[] | undefined {
  if (!mask) return undefined;
  const result: PlanetComposition[] = [];
  if (mask & 1) result.push('terrestrial');
  if (mask & 8) result.push('super-earth');
  if (mask & 4) result.push('gas-giant');
  if (mask & 2) result.push('ice-giant');
  return result.length > 0 ? result : undefined;
}

export function decodeTagsMask(mask?: number): SystemTag[] | undefined {
  if (!mask) return undefined;
  const tags: SystemTag[] = [];
  for (const [bit, tag] of BIT_TO_SYSTEM_TAG) {
    if (mask & bit) tags.push(tag);
  }
  return tags.length > 0 ? tags : undefined;
}

export function decodeSummaryNode(
  compact: CompactSummaryNode,
  fallbackId?: string,
  fallbackSectorId?: string,
): SystemSummaryNode {
  const id = String(compact.i ?? fallbackId ?? '');
  const [x, y, z] = compact.p;
  const dist = Math.round(Math.sqrt(x * x + y * y + z * z) * 1000) / 1000;
  const name = compact.n || resolveStarDisplayName({ fallbackId: id });
  const sectorId = compact.q ?? fallbackSectorId ?? formatSectorId(x, y, z);

  let planetCount = 0;
  let classification: StellarClassification | undefined;
  if (typeof compact.k === 'number') {
    planetCount = compact.k;
  } else if (typeof compact.k === 'string') {
    classification = compact.k;
  }
  if (compact.cl) {
    classification = compact.cl;
  }

  const result: SystemSummaryNode = {
    id,
    name,
    x,
    y,
    z,
    dist,
    mag: compact.m,
    absmag: compact.M,
    spect: compact.s ?? 'Unknown',
    starCount: compact.u ?? 1,
    planetCount,
    hasHabitableCandidate: compact.h === 1,
    sectorId,
    confidence: compact.C ? (CODE_TO_CONFIDENCE[compact.C] ?? 'confirmed') : 'confirmed',
  };

  if (compact.P) result.properName = compact.P;
  if (classification) result.classification = classification;
  if (compact.rt) result.reticleType = compact.rt;
  if (compact.c !== undefined) result.ci = compact.c;

  if (compact.v) {
    const [vx, vy, vz] = compact.v;
    result.velocity = { vx, vy, vz, speed: Math.round(Math.sqrt(vx * vx + vy * vy + vz * vz) * 100) / 100 };
  }

  const planetCensus = decodePlanetCensusMask(compact.e);
  if (planetCensus) result.planetCensus = planetCensus;
  if (compact.b) result.planetCompositionCounts = [compact.b[0], compact.b[1], compact.b[2], compact.b[3]];
  const tags = decodeTagsMask(compact.g);
  if (tags) result.tags = tags;
  if (compact.f && compact.f > 0) result.theoreticalFlags = compact.f;
  if (compact.H && compact.H > 0) result.hazardMask = compact.H;

  return result;
}

export function decodeSectorPartition(
  raw: CompactSectorPartition | SectorPartitionManifest,
): SectorPartitionManifest {
  if ('systems' in raw && Array.isArray(raw.systems)) return raw;
  const compact = raw as CompactSectorPartition;
  if (compact.v !== undefined && compact.v !== COMPACT_SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version: expected ${COMPACT_SCHEMA_VERSION}, got ${compact.v}`);
  }
  const systems: SystemSummaryNode[] = [];
  for (const [id, node] of Object.entries(compact.d)) {
    systems.push(decodeSummaryNode(node, id, compact.i));
  }
  return {
    sectorId: compact.i,
    bounds: {
      min: { x: compact.b[0], y: compact.b[1], z: compact.b[2] },
      max: { x: compact.b[3], y: compact.b[4], z: compact.b[5] },
    },
    count: compact.c,
    systems,
  };
}

export function decodeCircumstellarDisk(compact: CompactCircumstellarDisk): CircumstellarDiskRecord {
  const [innerRadiusAu, outerRadiusAu, semiMajorAxisAu] = compact.a;
  const result: CircumstellarDiskRecord = {
    id: compact.i,
    name: compact.n,
    kind: CODE_TO_DISK_KIND[compact.k] ?? 'debris-disk',
    innerRadiusAu,
    outerRadiusAu,
    semiMajorAxisAu,
    composition: compact.c,
    confidence: compact.C ? (CODE_TO_CONFIDENCE[compact.C] ?? 'confirmed') : 'confirmed',
  };
  if (compact.T !== undefined) result.tempK = compact.T;
  if (compact.rt) result.reticleType = compact.rt;
  return result;
}

export function decodeSystemManifest(
  compact: CompactSystemManifest,
  fallbackId?: string,
  fallbackSectorId?: string,
): SystemManifest {
  const id = compact.i ?? fallbackId ?? '';
  const [x, y, z] = compact.p;
  const dist = Math.round(Math.sqrt(x * x + y * y + z * z) * 1000) / 1000;
  const sectorId = compact.q ?? fallbackSectorId ?? formatSectorId(x, y, z);

  const stars: StellarComponent[] = compact.S.map((s) => {
    if (!s.rt) {
      throw new Error(
        `Stellar component "${s.i}" in system "${id}" is missing required precalculated field "rt" (reticleType).`,
      );
    }
    return {
      id: s.i,
      name: s.n,
      componentDesignation: s.d ?? 'A',
      spectralType: s.s,
      mag: s.m,
      absmag: s.M,
      luminosityLsun: s.l,
      massMsun: s.u,
      radiusRsun: s.r,
      effectiveTempK: s.T,
      reticleType: s.rt,
    };
  });

  const planets = compact.E.map(decodeExoplanet);
  if (planets.length > 0 && !compact.b) {
    throw new Error(
      `Planet-hosting system "${id}" is missing required precalculated field "b" (planetCompositionCounts).`,
    );
  }
  const planetCompositionCounts = compact.b;
  const hasHabitableCandidate = compact.h === 1 || planets.some((p) => Boolean(p.isHabitableCandidate));
  const tags = decodeTagsMask(compact.g);
  const disks = compact.D ? compact.D.map(decodeCircumstellarDisk) : undefined;

  const result: SystemManifest = {
    id,
    name: compact.n,
    properName: compact.P,
    x,
    y,
    z,
    dist,
    sectorId,
    stars,
    planets,
    ...(disks && disks.length > 0 ? { disks } : {}),
    ...(planetCompositionCounts ? { planetCompositionCounts } : {}),
    hasHabitableCandidate,
    ...(tags ? { tags } : {}),
    overviewText: compact.o,
    ...(compact.H && compact.H > 0 ? { hazardMask: compact.H } : {}),
  };

  if (compact.v) {
    const [vx, vy, vz] = compact.v;
    result.velocity = { vx, vy, vz, speed: Math.round(Math.sqrt(vx * vx + vy * vy + vz * vz) * 100) / 100 };
  }

  return result;
}

export function decodeSummaryBucket(
  envelope: ShardedBucketEnvelope<CompactSummaryNode>,
): Record<string, SystemSummaryNode> {
  if (envelope.v !== undefined && envelope.v !== COMPACT_SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version: expected ${COMPACT_SCHEMA_VERSION}, got ${envelope.v}`);
  }
  const result: Record<string, SystemSummaryNode> = {};
  for (const [id, node] of Object.entries(envelope.d)) {
    result[id] = decodeSummaryNode(node, id);
  }
  return result;
}

export function decodeDetailBucket(
  envelope: ShardedBucketEnvelope<CompactDetailRecord>,
): Record<string, SystemManifest | GalacticStructureRecord | SolarSystemBodyRecord> {
  if (envelope.v !== undefined && envelope.v !== COMPACT_SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version: expected ${COMPACT_SCHEMA_VERSION}, got ${envelope.v}`);
  }
  const result: Record<string, SystemManifest | GalacticStructureRecord | SolarSystemBodyRecord> = {};
  for (const [id, record] of Object.entries(envelope.d)) {
    if (record.t === 'sys') {
      result[id] = decodeSystemManifest(record, id);
    } else if (record.t === 'str') {
      result[id] = decodeGalacticStructure(record, id);
    } else if (record.t === 'sol') {
      result[id] = decodeSolarSystemBody(record, id);
    }
  }
  return result;
}
