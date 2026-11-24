import fs from 'node:fs';
import path from 'node:path';
import type {
  SystemManifest,
  SystemSummaryNode,
} from '../../src/types/astro';
import type { SectorPartitionManifest } from '../../src/types/astroCoordinates';
import type {
  GalacticStructureRecord,
  SolarSystemBodyRecord,
} from '../../src/types/astroStructures';
import { LAYER_MANIFESTS } from '../../content/layers';
import { encodeBinarySector } from '../../src/utils/binarySectorCodec';
import { COMPACT_SCHEMA_VERSION } from '../../src/utils/compactDataConstants';
import { buildHybridSummariesAndDetails } from './compactDataEncoder';
import { buildSearchIndices } from './searchIndexBuilder';
import {
  buildEntityAnnotationBuckets,
  buildLayerIndexManifest,
  encodeLayerManifest,
} from './datasetLayerEncoder';
import {
  applyResolvedNamesToLayers,
  buildSearchEntriesFromLayers,
  collectUnresolvedLayerTargets,
} from './datasetLayerSearchBuilder';
import { DEFAULT_SECTOR_SIZE_PC, getSectorBounds } from '../../src/utils/sectorMath';
import { loadAllGalacticStructures } from './galacticStructures';
import { resolveBuildTimestampIso } from './seedCatalogs';
import { loadAllSolarSystemBodies } from './solarBodies';
import { buildSolSystemManifest } from './solAndSummary';
import { writeGuideAndBaselinesArtifacts } from './guideAndBaselinesEmitter';
import {
  cleanStaleDataArtifacts,
  writeHashedDataManifest,
} from './dataManifestWriter';
import type { BuildPipelineOptions } from './types';

export interface WritePipelineArtifactsParams {
  options?: BuildPipelineOptions;
  sectorMap: Map<string, SystemSummaryNode[]>;
  cataloguedSummaries: SystemSummaryNode[];
  allSystemManifests: SystemManifest[];
  starAliasesById: Map<string, string[]>;
  multiStarConsolidationResult?: {
    consolidatedCount: number;
    totalSystemsReduced: number;
    absorbedIdToPrimary: Map<string, { id: string; name: string }>;
  };
}

export function writePipelineArtifacts(params: WritePipelineArtifactsParams): {
  galacticCount: number;
  solarBodiesCount: number;
} {
  const {
    options, sectorMap, cataloguedSummaries, allSystemManifests, starAliasesById,
    multiStarConsolidationResult,
  } = params;

  console.log('Writing partitions, shards, and multi-layer overlays...');
  const nowIso = resolveBuildTimestampIso();

  if (options?.dataDir) {
    cleanStaleDataArtifacts(path.resolve(options.dataDir));
  }

  // 1. Write spatial sector partitions (Binary .bin ONLY)
  if (options?.partitionsDir) {
    const dir = path.resolve(options.partitionsDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    for (const entry of fs.readdirSync(dir)) {
      if (entry.endsWith('.json')) fs.unlinkSync(path.join(dir, entry));
    }

    for (const [sectorId, systems] of sectorMap.entries()) {
      const bounds = getSectorBounds(sectorId, DEFAULT_SECTOR_SIZE_PC) || {
        min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 },
      };
      const manifest: SectorPartitionManifest = { sectorId, bounds, count: systems.length, systems };
      fs.writeFileSync(path.join(dir, `${sectorId}.bin`), encodeBinarySector(manifest));
    }
  }

  // 2. Ingest Layer 3 Galactic Structures & Deep Sky in memory
  let galacticCount = 0;
  let allStructures: GalacticStructureRecord[] = [];
  if (options?.overlaysDir || options?.detailsDir || options?.searchDir || options?.dataDir) {
    allStructures = loadAllGalacticStructures(options);
    galacticCount = allStructures.length;
  }

  // 3. Ingest Layer 4 Solar System natural bodies & orbits in memory
  let solarBodiesCount = 0;
  let primarySolarBodies: SolarSystemBodyRecord[] = [];
  let minorSolarBodies: SolarSystemBodyRecord[] = [];
  let allSolarBodies: SolarSystemBodyRecord[] = [];
  if (options?.detailsDir || options?.searchDir || options?.overlaysDir || options?.dataDir) {
    const { primaryBodies, phaAsteroids, distantAsteroids, comets } = loadAllSolarSystemBodies(options);
    primarySolarBodies = primaryBodies;
    minorSolarBodies = [...phaAsteroids, ...distantAsteroids, ...comets];
    allSolarBodies = [...primarySolarBodies, ...minorSolarBodies];
    solarBodiesCount = allSolarBodies.length;
  }

  // 4. Write hybrid spatial + domain shards for summaries/ and details/
  if (options?.summariesDir || options?.detailsDir) {
    const hybrid = buildHybridSummariesAndDetails({
      systems: cataloguedSummaries,
      manifests: allSystemManifests,
      structures: allStructures,
      primarySolarBodies,
      minorSolarBodies,
    });

    if (options.summariesDir) {
      const dir = path.resolve(options.summariesDir);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          fs.unlinkSync(path.join(dir, entry.name));
        }
      }
      for (const [sectorId, env] of hybrid.summariesBySector.entries()) {
        fs.writeFileSync(path.join(dir, `${sectorId}.json`), JSON.stringify(env), 'utf-8');
      }
    }

    if (options.detailsDir) {
      const dir = path.resolve(options.detailsDir);
      const sectorsDir = path.join(dir, 'sectors');
      const minorDir = path.join(dir, 'sol-minor');
      fs.mkdirSync(sectorsDir, { recursive: true });
      fs.mkdirSync(minorDir, { recursive: true });

      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          fs.unlinkSync(path.join(dir, entry.name));
        }
      }
      for (const subDir of [sectorsDir, minorDir]) {
        for (const entry of fs.readdirSync(subDir, { withFileTypes: true })) {
          if (entry.isFile() && entry.name.endsWith('.json')) {
            fs.unlinkSync(path.join(subDir, entry.name));
          }
        }
      }

      for (const [sectorId, env] of hybrid.detailSectorsBySector.entries()) {
        fs.writeFileSync(path.join(sectorsDir, `${sectorId}.json`), JSON.stringify(env), 'utf-8');
      }
      fs.writeFileSync(path.join(dir, 'sol-primary.json'), JSON.stringify(hybrid.solPrimary), 'utf-8');
      for (const [bucket, env] of hybrid.solMinorByBucket.entries()) {
        fs.writeFileSync(path.join(minorDir, `${bucket}.json`), JSON.stringify(env), 'utf-8');
      }
      fs.writeFileSync(path.join(dir, 'structures.json'), JSON.stringify(hybrid.structures), 'utf-8');
      fs.writeFileSync(path.join(dir, 'routing.json'), JSON.stringify(hybrid.routing), 'utf-8');
    }
  }

  // 6.5 Write Dataset Layer Shards & By-Entity Annotations
  const realNames = new Map<string, string>();
  for (const sys of cataloguedSummaries) realNames.set(sys.id, sys.name);
  for (const man of allSystemManifests) for (const pl of man.planets) realNames.set(pl.id, pl.name);
  for (const st of allStructures) realNames.set(st.id, st.name);
  for (const body of allSolarBodies) realNames.set(body.id, body.name);
  if (multiStarConsolidationResult) {
    for (const [absorbedId, prim] of multiStarConsolidationResult.absorbedIdToPrimary.entries()) {
      realNames.set(absorbedId, prim.name);
    }
  }

  const layersWithResolvedNames = applyResolvedNamesToLayers(LAYER_MANIFESTS, realNames);
  const unresolvedTargets = collectUnresolvedLayerTargets(LAYER_MANIFESTS, realNames);
  if (unresolvedTargets.length > 0) {
    console.warn(`[layers] Warning: ${unresolvedTargets.length} layer entries have neither inUniverseName nor a resolved real-sky name:`, unresolvedTargets);
  }

  if (options?.overlaysDir) {
    const layersDir = path.join(path.resolve(options.overlaysDir), 'layers');
    if (!fs.existsSync(layersDir)) fs.mkdirSync(layersDir, { recursive: true });
    fs.writeFileSync(path.join(layersDir, 'index.json'), JSON.stringify(buildLayerIndexManifest(layersWithResolvedNames)), 'utf-8');
    for (const layer of layersWithResolvedNames) {
      fs.writeFileSync(path.join(layersDir, `${layer.layerId}.json`), JSON.stringify(encodeLayerManifest(layer)), 'utf-8');
    }

    const byEntityDir = path.join(layersDir, 'by-entity');
    if (!fs.existsSync(byEntityDir)) fs.mkdirSync(byEntityDir, { recursive: true });
    const annotationBuckets = buildEntityAnnotationBuckets(layersWithResolvedNames);
    for (let bucketIndex = 0; bucketIndex < 36; bucketIndex++) {
      const bucket = bucketIndex.toString(36);
      const entities = annotationBuckets[bucket] ?? {};
      fs.writeFileSync(path.join(byEntityDir, `${bucket}.json`), JSON.stringify({ v: COMPACT_SCHEMA_VERSION, i: bucket, c: Object.keys(entities).length, d: entities }), 'utf-8');
    }
  }

  // 7. Write Dual-Tier & Category-Sharded Search Indices
  if (options?.searchDir) {
    const dir = path.resolve(options.searchDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const coordsById = new Map<string, [number, number, number]>();
    for (const sys of cataloguedSummaries) coordsById.set(sys.id, [sys.x, sys.y, sys.z]);
    for (const man of allSystemManifests) for (const pl of man.planets) coordsById.set(pl.id, [man.x, man.y, man.z]);
    for (const st of allStructures) coordsById.set(st.id, [st.x, st.y, st.z]);
    const layerEntries = buildSearchEntriesFromLayers(layersWithResolvedNames, coordsById, realNames);
    const referencedLayerIds = new Set<string>();
    for (const layer of layersWithResolvedNames) {
      for (const entry of Object.values(layer.entries)) {
        referencedLayerIds.add(entry.targetId);
        if (entry.systemId) referencedLayerIds.add(entry.systemId);
        if (entry.parentBodyId) referencedLayerIds.add(entry.parentBodyId);
      }
    }

    const indices = buildSearchIndices({
      systems: cataloguedSummaries, manifests: allSystemManifests,
      structures: allStructures, solarBodies: allSolarBodies,
      starAliasesById, layerEntries, referencedLayerIds,
    }, nowIso);

    const indexFiles: [string, unknown][] = [
      ['startup.json', indices.startup],
      ['core.json', indices.core],
      ['stars.json', indices.stars], ['planets.json', indices.planets],
      ['structures.json', indices.structures], ['minor-bodies.json', indices.minorBodies],
      ['layers.json', indices.layers],
    ];
    for (const [file, val] of indexFiles) fs.writeFileSync(path.join(dir, file), JSON.stringify(val), 'utf-8');
  }

  // 8. Write reference-baselines.json and guide-examples.json, then content-hash active shards into manifest.json
  if (options?.dataDir) {
    const resolvedDataDir = path.resolve(options.dataDir);
    const solManifest =
      allSystemManifests.find((m) => m.id === 'sol') ?? buildSolSystemManifest();
    writeGuideAndBaselinesArtifacts({
      outDir: resolvedDataDir,
      solManifest,
      solarBodies: allSolarBodies,
      allSummaries: cataloguedSummaries,
      systemManifests: allSystemManifests,
      generatedAt: nowIso,
    });
    writeHashedDataManifest(resolvedDataDir, nowIso);
  }

  return { galacticCount, solarBodiesCount };
}
