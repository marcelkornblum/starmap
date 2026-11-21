import type {
  PlanetComposition,
  SystemManifest,
  SystemSummaryNode,
  SystemTag,
} from '../../src/types/astro';
import type { SectorPartitionManifest } from '../../src/types/astroCoordinates';
import type {
  GalacticStructureRecord,
  SolarSystemBodyRecord,
} from '../../src/types/astroStructures';
import {
  COMPACT_SCHEMA_VERSION,
  CONFIDENCE_TO_CODE,
  PLANET_CENSUS_BITS,
  SYSTEM_TAG_BITS,
} from '../../src/utils/compactDataConstants';
import { getShardKey } from '../../src/utils/compactDataCodec';
import { formatSectorId } from '../../src/utils/sectorMath';
import type {
  CompactDetailRecord,
  CompactSectorPartition,
  CompactStellarComponent,
  CompactSummaryNode,
  CompactSystemManifest,
  DetailsRoutingIndex,
  ShardedBucketEnvelope,
} from '../../src/utils/compactDataTypes';
import {
  computePlanetCompositionCounts,
  isPlanetHabitableCandidate,
} from '../../src/utils/planetaryPhysics';
import {
  precalculateSolarSystemBodyFlags,
  resolveStellarClassificationFromSpectrum,
  resolveStellarReticleType,
} from '../../src/utils/astroPrecalculation';
import {
  encodeCircumstellarDisk,
  encodeExoplanet,
  encodeGalacticStructure,
  encodeSolarSystemBody,
} from './compactEntityEncoder';

export function encodePlanetCensusMask(
  census?: PlanetComposition[],
): number | undefined {
  if (!census || census.length === 0) return undefined;
  let mask = 0;
  for (const cat of census) {
    mask |= PLANET_CENSUS_BITS[cat] || 0;
  }
  return mask > 0 ? mask : undefined;
}

export function encodeTagsMask(tags?: readonly SystemTag[]): number | undefined {
  if (!tags || tags.length === 0) return undefined;
  let mask = 0;
  for (const tag of tags) {
    mask |= SYSTEM_TAG_BITS[tag] || 0;
  }
  return mask > 0 ? mask : undefined;
}

export function encodeSummaryNode(
  node: SystemSummaryNode,
  options?: { omitId?: boolean; omitSectorId?: boolean },
): CompactSummaryNode {
  const rawGaiaSuffix = node.id.startsWith('gaia-') ? node.id.slice(5) : undefined;
  const isDefaultGaiaName =
    rawGaiaSuffix !== undefined && node.name === `Gaia DR3 ${rawGaiaSuffix}`;

  const compact: CompactSummaryNode = {
    p: [node.x, node.y, node.z],
    m: node.mag,
    M: node.absmag,
  };

  if (!options?.omitId) compact.i = node.id;
  if (!isDefaultGaiaName && node.name) compact.n = node.name;
  if (node.properName) compact.P = node.properName;
  if (node.velocity && (node.velocity.vx !== 0 || node.velocity.vy !== 0 || node.velocity.vz !== 0)) {
    compact.v = [node.velocity.vx, node.velocity.vy, node.velocity.vz];
  }
  if (node.spect && node.spect !== 'Unknown') compact.s = node.spect;
  if (node.ci !== null && node.ci !== undefined) compact.c = node.ci;
  if (node.starCount > 1) compact.u = node.starCount;

  if (node.classification && node.classification !== 'star') {
    if (node.planetCount > 0) {
      compact.k = node.planetCount;
      compact.cl = node.classification;
    } else {
      compact.k = node.classification;
    }
  } else if (node.planetCount > 0) {
    compact.k = node.planetCount;
  }

  if (node.reticleType) compact.rt = node.reticleType;
  const censusMask = encodePlanetCensusMask(node.planetCensus);
  if (censusMask !== undefined) compact.e = censusMask;

  if (
    node.planetCompositionCounts &&
    ((node.planetCompositionCounts[0] ?? 0) > 0 ||
      (node.planetCompositionCounts[1] ?? 0) > 0 ||
      (node.planetCompositionCounts[2] ?? 0) > 0 ||
      (node.planetCompositionCounts[3] !== undefined && node.planetCompositionCounts[3] > 0))
  ) {
    compact.b = node.planetCompositionCounts;
  }

  if (node.hasHabitableCandidate) compact.h = 1;
  const tagsMask = encodeTagsMask(node.tags);
  if (tagsMask !== undefined) compact.g = tagsMask;
  if (!options?.omitSectorId && node.sectorId) compact.q = node.sectorId;

  if (node.confidence && node.confidence !== 'confirmed') {
    const code = CONFIDENCE_TO_CODE[node.confidence];
    if (code !== 1) compact.C = code;
  }
  if (node.theoreticalFlags && node.theoreticalFlags > 0) compact.f = node.theoreticalFlags;
  if (node.hazardMask && node.hazardMask > 0) compact.H = node.hazardMask;

  return compact;
}

export function encodeSectorPartition(manifest: SectorPartitionManifest): CompactSectorPartition {
  const dict: Record<string, CompactSummaryNode> = {};
  for (const sys of manifest.systems) {
    dict[sys.id] = encodeSummaryNode(sys, { omitId: true, omitSectorId: true });
  }
  return {
    v: COMPACT_SCHEMA_VERSION,
    i: manifest.sectorId,
    b: [
      manifest.bounds.min.x,
      manifest.bounds.min.y,
      manifest.bounds.min.z,
      manifest.bounds.max.x,
      manifest.bounds.max.y,
      manifest.bounds.max.z,
    ],
    c: manifest.count,
    d: dict,
  };
}

export function encodeSystemManifest(
  sys: SystemManifest,
  options?: { omitId?: boolean; omitSectorId?: boolean },
): CompactSystemManifest {
  const compact: CompactSystemManifest = {
    n: sys.name,
    p: [sys.x, sys.y, sys.z],
    S: sys.stars.map((s) => {
      const comp: CompactStellarComponent = {
        i: s.id,
        n: s.name,
        s: s.spectralType,
        m: s.mag,
        M: s.absmag,
        rt:
          s.reticleType ??
          resolveStellarReticleType(
            resolveStellarClassificationFromSpectrum(s.spectralType),
            false,
          ),
      };
      if (s.componentDesignation && s.componentDesignation !== 'A') comp.d = s.componentDesignation;
      if (s.luminosityLsun !== undefined) comp.l = s.luminosityLsun;
      if (s.massMsun !== undefined) comp.u = s.massMsun;
      if (s.radiusRsun !== undefined) comp.r = s.radiusRsun;
      if (s.effectiveTempK !== undefined) comp.T = s.effectiveTempK;
      return comp;
    }),
    E: sys.planets.map(encodeExoplanet),
  };

  if (!options?.omitId) compact.i = sys.id;
  if (sys.properName && sys.properName !== sys.name) compact.P = sys.properName;
  if (sys.velocity && (sys.velocity.vx !== 0 || sys.velocity.vy !== 0 || sys.velocity.vz !== 0)) {
    compact.v = [sys.velocity.vx, sys.velocity.vy, sys.velocity.vz];
  }
  if (!options?.omitSectorId && sys.sectorId) compact.q = sys.sectorId;

  const counts = sys.planetCompositionCounts ?? computePlanetCompositionCounts(sys.planets);
  if (
    counts &&
    (sys.planets.length > 0 ||
      (counts[0] ?? 0) > 0 ||
      (counts[1] ?? 0) > 0 ||
      (counts[2] ?? 0) > 0 ||
      (counts[3] !== undefined && counts[3] > 0))
  ) {
    compact.b = counts;
  }

  const hasHz =
    sys.hasHabitableCandidate ??
    sys.planets.some(
      (p) =>
        p.isHabitableCandidate ??
        isPlanetHabitableCandidate(
          {
            equilibriumTempK: p.equilibriumTempK,
            esi: p.esi,
            semiMajorAxis: p.orbit?.semiMajorAxis,
          },
          sys.stars[0]?.luminosityLsun,
        ),
    );
  if (hasHz) compact.h = 1;

  const tagsMask = encodeTagsMask(sys.tags);
  if (tagsMask !== undefined) compact.g = tagsMask;
  if (sys.overviewText) compact.o = sys.overviewText;
  if (sys.hazardMask && sys.hazardMask > 0) compact.H = sys.hazardMask;
  if (sys.disks && sys.disks.length > 0) compact.D = sys.disks.map(encodeCircumstellarDisk);

  return compact;
}

export interface HybridShardedDataOutput {
  summariesBySector: Map<string, ShardedBucketEnvelope<CompactSummaryNode>>;
  detailSectorsBySector: Map<string, ShardedBucketEnvelope<CompactDetailRecord>>;
  solPrimary: ShardedBucketEnvelope<CompactDetailRecord>;
  solMinorByBucket: Map<string, ShardedBucketEnvelope<CompactDetailRecord>>;
  structures: ShardedBucketEnvelope<CompactDetailRecord>;
  routing: DetailsRoutingIndex;
}

const MINOR_BODY_INFERRED_PREFIXES = ['pha-', 'distant-', 'comet-'] as const;

function hasInferredMinorBodyPrefix(id: string): boolean {
  return MINOR_BODY_INFERRED_PREFIXES.some((prefix) => id.startsWith(prefix));
}

export function buildHybridSummariesAndDetails(input: {
  systems: SystemSummaryNode[];
  manifests: SystemManifest[];
  structures: GalacticStructureRecord[];
  primarySolarBodies: SolarSystemBodyRecord[];
  minorSolarBodies: SolarSystemBodyRecord[];
}): HybridShardedDataOutput {
  const summariesBySector = new Map<string, ShardedBucketEnvelope<CompactSummaryNode>>();
  const detailSectorsBySector = new Map<string, ShardedBucketEnvelope<CompactDetailRecord>>();
  const solMinorByBucket = new Map<string, ShardedBucketEnvelope<CompactDetailRecord>>();

  const solPrimary: ShardedBucketEnvelope<CompactDetailRecord> = {
    v: COMPACT_SCHEMA_VERSION,
    i: 'sol-primary',
    c: 0,
    d: {},
  };
  const structures: ShardedBucketEnvelope<CompactDetailRecord> = {
    v: COMPACT_SCHEMA_VERSION,
    i: 'structures',
    c: 0,
    d: {},
  };

  const summarySectorById = new Map<string, string>();
  const detailSectorById = new Map<string, string>();
  const referencedSectors = new Set<string>();

  for (const sys of input.systems) {
    const sectorId = sys.sectorId || formatSectorId(sys.x, sys.y, sys.z);
    let env = summariesBySector.get(sectorId);
    if (!env) {
      env = { v: COMPACT_SCHEMA_VERSION, i: sectorId, c: 0, d: {} };
      summariesBySector.set(sectorId, env);
    }
    env.d[sys.id] = encodeSummaryNode(sys, { omitId: true, omitSectorId: true });
    env.c++;
    summarySectorById.set(sys.id, sectorId);
    referencedSectors.add(sectorId);
  }

  for (const manifest of input.manifests) {
    const sectorId = manifest.sectorId || formatSectorId(manifest.x, manifest.y, manifest.z);
    let env = detailSectorsBySector.get(sectorId);
    if (!env) {
      env = { v: COMPACT_SCHEMA_VERSION, i: sectorId, c: 0, d: {} };
      detailSectorsBySector.set(sectorId, env);
    }
    env.d[manifest.id] = {
      t: 'sys',
      ...encodeSystemManifest(manifest, { omitId: true, omitSectorId: true }),
    };
    env.c++;
    detailSectorById.set(manifest.id, sectorId);
    referencedSectors.add(sectorId);
  }

  const sectorKeys = Array.from(referencedSectors).sort();
  const sectorToIdx = new Map<string, number>();
  sectorKeys.forEach((sid, idx) => {
    sectorToIdx.set(sid, idx);
  });

  const routingSummaryMap: Record<string, number> = {};
  for (const [id, sectorId] of summarySectorById.entries()) {
    const idx = sectorToIdx.get(sectorId);
    if (idx !== undefined) {
      routingSummaryMap[id] = idx;
    }
  }

  const routingDetailMap: Record<string, number> = {};
  for (const [id, sectorId] of detailSectorById.entries()) {
    const idx = sectorToIdx.get(sectorId);
    if (idx !== undefined) {
      routingDetailMap[id] = idx;
    }
  }

  for (const rawBody of input.primarySolarBodies) {
    const body =
      rawBody.reticleType !== undefined && rawBody.targetStarId !== undefined
        ? rawBody
        : precalculateSolarSystemBodyFlags(rawBody);
    const targetId = body.targetStarId ?? body.id;
    solPrimary.d[targetId] = { t: 'sol', ...encodeSolarSystemBody(body, { omitId: true }) };
    solPrimary.c++;
    routingDetailMap[targetId] = -1;
  }

  for (const struct of input.structures) {
    structures.d[struct.id] = { t: 'str', ...encodeGalacticStructure(struct, { omitId: true }) };
    structures.c++;
    routingDetailMap[struct.id] = -2;
  }

  for (const rawBody of input.minorSolarBodies) {
    const body =
      rawBody.reticleType !== undefined && rawBody.targetStarId !== undefined
        ? rawBody
        : precalculateSolarSystemBodyFlags(rawBody);
    const targetId = body.targetStarId ?? body.id;
    const bucketKey = getShardKey(targetId);
    let env = solMinorByBucket.get(bucketKey);
    if (!env) {
      env = { v: COMPACT_SCHEMA_VERSION, i: bucketKey, c: 0, d: {} };
      solMinorByBucket.set(bucketKey, env);
    }
    env.d[targetId] = { t: 'sol', ...encodeSolarSystemBody(body, { omitId: true }) };
    env.c++;
    if (!hasInferredMinorBodyPrefix(targetId)) {
      routingDetailMap[targetId] = -3;
    }
  }

  return {
    summariesBySector,
    detailSectorsBySector,
    solPrimary,
    solMinorByBucket,
    structures,
    routing: {
      v: COMPACT_SCHEMA_VERSION,
      k: sectorKeys,
      s: routingSummaryMap,
      d: routingDetailMap,
    },
  };
}
