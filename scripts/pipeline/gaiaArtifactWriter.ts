import fs from 'node:fs';
import path from 'node:path';
import type {
  GalacticStructureRecord,
  SectorPartitionManifest,
  SolarSystemBodyRecord,
  SystemManifest,
  SystemSummaryNode,
} from '../../src/types/astro';
import { LAYER_MANIFESTS } from '../../content/layers';
import { encodeBinarySector } from '../../src/utils/binarySectorCodec';
import {
  COMPACT_SCHEMA_VERSION,
  buildSearchIndices,
  buildShardedSummariesAndDetails,
} from '../../src/utils/compactDataCodec';
import {
  applyResolvedNamesToLayers,
  buildEntityAnnotationBuckets,
  buildLayerIndexManifest,
  buildSearchEntriesFromLayers,
  collectUnresolvedLayerTargets,
  encodeLayerManifest,
} from '../../src/utils/datasetLayerCodec';
import { DEFAULT_SECTOR_SIZE_PC, getSectorBounds } from '../../src/utils/astroMath';
import { loadAllGalacticStructures } from './galacticStructures';
import { resolveBuildTimestampIso } from './seedCatalogs';
import { loadAllSolarSystemBodies } from './solarBodies';
import type { BuildPipelineOptions } from './types';

export interface WritePipelineArtifactsParams {
  options?: BuildPipelineOptions;
  local10pcSystems: SystemSummaryNode[];
  referenceBrightSystems: SystemSummaryNode[];
  sectorMap: Map<string, SystemSummaryNode[]>;
  sectorManifestsMap: Map<string, SystemManifest[]>;
  cataloguedSummaries: SystemSummaryNode[];
  allSystemManifests: SystemManifest[];
  exoplanetHostSummaries: SystemSummaryNode[];
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
    options, local10pcSystems, referenceBrightSystems, sectorMap, sectorManifestsMap,
    cataloguedSummaries, allSystemManifests, exoplanetHostSummaries, starAliasesById,
    multiStarConsolidationResult,
  } = params;

  console.log('Writing partitions, catalogs, and multi-layer overlays...');
  const nowIso = resolveBuildTimestampIso();

  // 1. Write formal catalogs
  if (options?.catalogsDir) {
    const dir = path.resolve(options.catalogsDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const writeCat = (file: string, payload: unknown) =>
      fs.writeFileSync(path.join(dir, file), JSON.stringify(payload), 'utf-8');

    writeCat('solar-neighborhood-10pc.json', {
      header: {
        catalogId: 'solar-neighborhood-10pc', name: 'Solar Neighborhood 10-Parsec Census',
        description: 'Census of verified stellar systems within 10 parsecs of Sol from Gaia DR3 GCNS and RECONS ground truth',
        epoch: 'J2000', count: local10pcSystems.length, timestamp: nowIso,
      },
      systems: local10pcSystems,
    });
    writeCat('reference-bright-stars.json', {
      header: {
        catalogId: 'reference-bright-stars', name: 'Photometric Reference Bright Stars (V <= 6.5, <= 100 pc)',
        description: 'Naked-eye navigational reference stars within 100 pc enriched with official IAU proper names',
        epoch: 'J2000', count: referenceBrightSystems.length, timestamp: nowIso,
      },
      systems: referenceBrightSystems,
    });
  }

  // 2. Write spatial sector partitions (Binary .bin ONLY)
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

  // 3. Write detailed system manifests
  if (options?.systemsDir && sectorManifestsMap.size > 0) {
    const dir = path.resolve(options.systemsDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    for (const [sectorId, manifests] of sectorManifestsMap.entries()) {
      fs.writeFileSync(path.join(dir, `${sectorId}.json`), JSON.stringify(manifests), 'utf-8');
    }
  }

  // 4. Ingest and write Layer 3 Galactic Structures & Deep Sky
  let galacticCount = 0;
  let allStructures: GalacticStructureRecord[] = [];
  if (options?.overlaysDir || options?.detailsDir || options?.searchDir) {
    allStructures = loadAllGalacticStructures();
    galacticCount = allStructures.length;
  }

  if (options?.overlaysDir) {
    const dir = path.resolve(options.overlaysDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(path.join(dir, 'exoplanetary-systems.json'), JSON.stringify({
      overlayId: 'exoplanetary-systems', title: 'Exoplanetary Systems Index',
      totalSystems: exoplanetHostSummaries.length, timestamp: nowIso, systems: exoplanetHostSummaries,
    }), 'utf-8');

    fs.writeFileSync(path.join(dir, 'galactic-structures.json'), JSON.stringify({
      overlayId: 'galactic-structures', title: 'Local Galactic Structures, Clusters, Remnants & Deep Sky',
      count: allStructures.length, timestamp: nowIso, structures: allStructures,
    }), 'utf-8');
  }

  // 5. Ingest and write Layer 4 Solar System natural bodies & orbits
  let solarBodiesCount = 0;
  let allSolarBodies: SolarSystemBodyRecord[] = [];
  if (options?.solDir || options?.detailsDir || options?.searchDir || options?.overlaysDir) {
    const { primaryBodies, phaAsteroids, distantAsteroids, comets } = loadAllSolarSystemBodies();
    allSolarBodies = [...primaryBodies, ...phaAsteroids, ...distantAsteroids, ...comets];
    solarBodiesCount = allSolarBodies.length;

    if (options?.solDir) {
      const dir = path.resolve(options.solDir);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const writeSol = (file: string, datasetId: string, title: string, bodies: SolarSystemBodyRecord[]) => {
        fs.writeFileSync(path.join(dir, file), JSON.stringify({ datasetId, title, epoch: 'J2000', count: bodies.length, timestamp: nowIso, bodies }), 'utf-8');
      };

      writeSol('ephemeris-primary-bodies.json', 'sol-primary-bodies', 'Solar System Primary Bodies & Major Moons', primaryBodies);
      writeSol('orbital-elements-asteroids.json', 'sol-asteroids-distant', 'Solar System Centaurs, Trojans & Kuiper Belt Objects', distantAsteroids);
      writeSol('orbital-elements-neo.json', 'sol-minor-bodies-pha', 'Solar System Potentially Hazardous Asteroids (PHAs)', phaAsteroids);
      writeSol('orbital-elements-comets.json', 'sol-comets', 'Solar System Periodic & Historic Comets', comets);
    }
  }

  // 6. Write 36-bucket dictionary shards for summaries/ and details/
  if (options?.summariesDir || options?.detailsDir) {
    const { summariesByBucket, detailsByBucket } = buildShardedSummariesAndDetails({
      systems: cataloguedSummaries, manifests: allSystemManifests,
      structures: allStructures, solarBodies: allSolarBodies,
    });

    if (options.summariesDir) {
      const dir = path.resolve(options.summariesDir);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      for (const [bucket, env] of summariesByBucket.entries()) {
        fs.writeFileSync(path.join(dir, `${bucket}.json`), JSON.stringify(env), 'utf-8');
      }
    }

    if (options.detailsDir) {
      const dir = path.resolve(options.detailsDir);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      for (const [bucket, env] of detailsByBucket.entries()) {
        fs.writeFileSync(path.join(dir, `${bucket}.json`), JSON.stringify(env), 'utf-8');
      }
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

    const indices = buildSearchIndices({
      systems: cataloguedSummaries, manifests: allSystemManifests,
      structures: allStructures, solarBodies: allSolarBodies,
      starAliasesById, layerEntries,
    }, nowIso);

    const indexFiles: [string, unknown][] = [
      ['core.json', indices.core], ['full.json', indices.full],
      ['stars.json', indices.stars], ['planets.json', indices.planets],
      ['structures.json', indices.structures], ['minor-bodies.json', indices.minorBodies],
      ['layers.json', indices.layers],
    ];
    for (const [file, val] of indexFiles) fs.writeFileSync(path.join(dir, file), JSON.stringify(val), 'utf-8');
  }

  return { galacticCount, solarBodiesCount };
}
