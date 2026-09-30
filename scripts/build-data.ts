import fs from 'node:fs';
import path from 'node:path';
import csv from 'csv-parser';
import type {
  StarmapNode,
  SystemSummaryNode,
  SectorPartitionManifest,
  CatalogManifestHeader,
} from '../src/types/astro';
import {
  equatorialToCartesian,
  parseKinematicVector,
  formatSectorId,
  getSectorBounds,
  DEFAULT_SECTOR_SIZE_PC,
} from '../src/utils/astroMath';

/**
 * Parses and harmonizes a raw CSV record from hygdata_v3 into a strict StarmapNode.
 * Attaches calculated Cartesian coordinates and 3D velocity vectors when present.
 * Returns null if the star record is invalid or missing distance coordinates.
 *
 * @param row Raw key-value mapping from CSV row
 * @returns Valid StarmapNode or null if skipped
 */
export function parseHygRow(row: Record<string, string>): StarmapNode | null {
  const id = parseInt(row.id, 10);
  if (isNaN(id)) {
    return null;
  }

  const dist = parseFloat(row.dist);
  const ra = parseFloat(row.ra);
  const dec = parseFloat(row.dec);

  // Skip rows with missing, NaN, or invalid coordinates (Sol at dist=0 is valid)
  if (isNaN(dist) || isNaN(ra) || isNaN(dec) || dist < 0) {
    return null;
  }

  // Derive human-readable primary display name
  const properName = row.proper && row.proper.trim().length > 0 ? row.proper.trim() : undefined;
  let name = properName;

  if (!name) {
    if (row.bf && row.bf.trim().length > 0) {
      name = row.bf.trim();
    } else if (row.bayer && row.con && row.bayer.trim().length > 0) {
      name = `${row.bayer.trim()} ${row.con.trim()}`;
    } else if (row.gl && row.gl.trim().length > 0) {
      name = row.gl.trim();
    } else if (row.hip && row.hip.trim().length > 0) {
      name = `HIP ${row.hip.trim()}`;
    } else if (row.hd && row.hd.trim().length > 0) {
      name = `HD ${row.hd.trim()}`;
    } else if (row.hr && row.hr.trim().length > 0) {
      name = `HR ${row.hr.trim()}`;
    } else {
      name = `HYG ${id}`;
    }
  }

  // Pre-calculate Cartesian XYZ coordinates using equatorialToCartesian utility
  const [x, y, z] = equatorialToCartesian(ra, dec, dist);

  // Parse astrometric and kinematic motion components if available
  const pmra = row.pmra && !isNaN(parseFloat(row.pmra)) ? parseFloat(row.pmra) : undefined;
  const pmdec = row.pmdec && !isNaN(parseFloat(row.pmdec)) ? parseFloat(row.pmdec) : undefined;
  const rv = row.rv && !isNaN(parseFloat(row.rv)) ? parseFloat(row.rv) : undefined;

  const rawVx = row.vx && !isNaN(parseFloat(row.vx)) ? parseFloat(row.vx) : undefined;
  const rawVy = row.vy && !isNaN(parseFloat(row.vy)) ? parseFloat(row.vy) : undefined;
  const rawVz = row.vz && !isNaN(parseFloat(row.vz)) ? parseFloat(row.vz) : undefined;

  const velocity = parseKinematicVector(rawVx, rawVy, rawVz, pmra, pmdec, rv);

  const hip = row.hip && row.hip.trim().length > 0 ? parseInt(row.hip, 10) : null;
  const hd = row.hd && row.hd.trim().length > 0 ? parseInt(row.hd, 10) : null;
  const hr = row.hr && row.hr.trim().length > 0 ? parseInt(row.hr, 10) : null;
  const flam = row.flam && row.flam.trim().length > 0 ? parseInt(row.flam, 10) : null;
  const gl = row.gl && row.gl.trim().length > 0 ? row.gl.trim() : null;
  const bayer = row.bayer && row.bayer.trim().length > 0 ? row.bayer.trim() : null;
  const con = row.con && row.con.trim().length > 0 ? row.con.trim() : null;
  const spect = row.spect && row.spect.trim().length > 0 ? row.spect.trim() : undefined;
  const ci = row.ci && row.ci.trim().length > 0 && !isNaN(parseFloat(row.ci)) ? parseFloat(row.ci) : null;
  const lum = row.lum && row.lum.trim().length > 0 && !isNaN(parseFloat(row.lum)) ? parseFloat(row.lum) : undefined;
  const mag = row.mag && !isNaN(parseFloat(row.mag)) ? parseFloat(row.mag) : 0;
  const absmag = row.absmag && !isNaN(parseFloat(row.absmag)) ? parseFloat(row.absmag) : 0;

  return {
    id,
    name,
    properName,
    hip,
    hd,
    hr,
    gl,
    bayer,
    flam,
    con,
    ra,
    dec,
    dist,
    mag,
    absmag,
    spect,
    ci,
    x,
    y,
    z,
    lum,
    velocity,
  };
}

/**
 * Transforms a StarmapNode into a collapsed SystemSummaryNode with spatial sector tags.
 *
 * @param star Source StarmapNode
 * @returns Collapsed SystemSummaryNode
 */
export function starNodeToSystemSummary(star: StarmapNode): SystemSummaryNode {
  const sectorId = formatSectorId(star.x, star.y, star.z);
  const tags: string[] = [];

  if (star.mag <= 6.5) {
    tags.push('NakedEye');
  }
  if (star.dist <= 10) {
    tags.push('SolarNeighborhood10pc');
  }
  if (star.name === 'Sol') {
    tags.push('HomeSystem');
  }

  return {
    id: String(star.id),
    name: star.name,
    properName: star.properName,
    x: star.x,
    y: star.y,
    z: star.z,
    dist: star.dist,
    velocity: star.velocity,
    mag: star.mag,
    absmag: star.absmag,
    spect: star.spect,
    ci: star.ci,
    starCount: 1,
    planetCount: star.name === 'Sol' ? 8 : 0,
    hasHabitableCandidate: star.name === 'Sol',
    sectorId,
    tags: tags.length > 0 ? tags : undefined,
  };
}

export interface BuildPipelineOptions {
  /** Optional directory path to emit formal catalogs */
  catalogsDir?: string;
  /** Optional directory path to emit spatial partition sectors */
  partitionsDir?: string;
  /** Maximum distance limit in parsecs for spatial sector partitioning (default: 100) */
  maxPartitionDistancePc?: number;
}

export interface PipelineSummary {
  totalRows: number;
  validStars: number;
  skippedRows: number;
  outputPath: string;
  kinematicCount: number;
  localVolume10pcCount?: number;
  referenceBrightCount?: number;
  sectorPartitionCount?: number;
}

/**
 * Formal catalog container payload matching CatalogManifestHeader.
 */
export interface CatalogPayload {
  header: CatalogManifestHeader;
  systems: SystemSummaryNode[];
}

/**
 * Streams raw HYG CSV dataset, harmonizes into StarmapNode records with 3D velocities,
 * streams base JSON output, and optionally emits formal catalogs and spatial partition sectors.
 *
 * @param inputCsvPath Absolute or relative path to raw CSV file
 * @param outputJsonPath Absolute or relative path to destination JSON file
 * @param options Optional configuration for formal catalogs and spatial partitioning
 * @returns Summary of processed records
 */
export async function buildStarDataPipeline(
  inputCsvPath: string,
  outputJsonPath: string,
  options?: BuildPipelineOptions,
): Promise<PipelineSummary> {
  const resolvedInput = path.resolve(inputCsvPath);
  const resolvedOutput = path.resolve(outputJsonPath);
  const maxPartitionDist = options?.maxPartitionDistancePc ?? 100;

  // Ensure base output directory exists
  const outDir = path.dirname(resolvedOutput);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    let totalRows = 0;
    let validStars = 0;
    let skippedRows = 0;
    let kinematicCount = 0;

    const local10pcSystems: SystemSummaryNode[] = [];
    const referenceBrightSystems: SystemSummaryNode[] = [];
    const sectorMap = new Map<string, SystemSummaryNode[]>();

    const readStream = fs.createReadStream(resolvedInput);
    const writeStream = fs.createWriteStream(resolvedOutput, { encoding: 'utf-8' });

    // Begin base JSON array
    writeStream.write('[');
    let isFirst = true;

    readStream
      .pipe(csv())
      .on('data', (row: Record<string, string>) => {
        totalRows++;
        const node = parseHygRow(row);
        if (!node) {
          skippedRows++;
          return;
        }

        if (node.velocity) {
          kinematicCount++;
        }

        // Collect into formal catalog sets if requested
        if (options?.catalogsDir || options?.partitionsDir) {
          const summary = starNodeToSystemSummary(node);

          if (node.dist <= 10) {
            local10pcSystems.push(summary);
          }
          if (node.mag <= 6.5 && node.dist <= maxPartitionDist) {
            referenceBrightSystems.push(summary);
          }

          if (options?.partitionsDir && node.dist <= maxPartitionDist) {
            const sectorId = summary.sectorId;
            let bucket = sectorMap.get(sectorId);
            if (!bucket) {
              bucket = [];
              sectorMap.set(sectorId, bucket);
            }
            bucket.push(summary);
          }
        }

        const serialized = JSON.stringify(node);
        if (!isFirst) {
          writeStream.write(',');
        } else {
          isFirst = false;
        }
        writeStream.write(serialized);
        validStars++;
      })
      .on('end', () => {
        writeStream.write(']');
        writeStream.end();
      })
      .on('error', (err) => {
        reject(err);
      });

    writeStream.on('finish', () => {
      const nowIso = new Date().toISOString();

      // Write formal catalogs if catalogsDir is provided
      if (options?.catalogsDir) {
        const resolvedCatalogs = path.resolve(options.catalogsDir);
        if (!fs.existsSync(resolvedCatalogs)) {
          fs.mkdirSync(resolvedCatalogs, { recursive: true });
        }

        const local10pcPayload: CatalogPayload = {
          header: {
            catalogId: 'solar-neighborhood-10pc',
            name: 'Solar Neighborhood 10-Parsec Census',
            description: 'Comprehensive census of verified stellar systems within 10 parsecs of Sol',
            epoch: 'J2000',
            count: local10pcSystems.length,
            timestamp: nowIso,
          },
          systems: local10pcSystems,
        };

        const brightStarsPayload: CatalogPayload = {
          header: {
            catalogId: 'reference-bright-stars',
            name: 'Photometric Reference Bright Stars (V <= 6.5, <= 100 pc)',
            description: 'Navigational and naked-eye reference stars within the 100-parsec volume',
            epoch: 'J2000',
            count: referenceBrightSystems.length,
            timestamp: nowIso,
          },
          systems: referenceBrightSystems,
        };

        fs.writeFileSync(
          path.join(resolvedCatalogs, 'solar-neighborhood-10pc.json'),
          JSON.stringify(local10pcPayload),
          'utf-8',
        );

        fs.writeFileSync(
          path.join(resolvedCatalogs, 'reference-bright-stars.json'),
          JSON.stringify(brightStarsPayload),
          'utf-8',
        );
      }

      // Write spatial sector partitions if partitionsDir is provided
      if (options?.partitionsDir) {
        const resolvedPartitions = path.resolve(options.partitionsDir);
        if (!fs.existsSync(resolvedPartitions)) {
          fs.mkdirSync(resolvedPartitions, { recursive: true });
        }

        for (const [sectorId, systems] of sectorMap.entries()) {
          const bounds = getSectorBounds(sectorId, DEFAULT_SECTOR_SIZE_PC) || {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 0, y: 0, z: 0 },
          };

          const partitionManifest: SectorPartitionManifest = {
            sectorId,
            bounds,
            count: systems.length,
            systems,
          };

          fs.writeFileSync(
            path.join(resolvedPartitions, `${sectorId}.json`),
            JSON.stringify(partitionManifest),
            'utf-8',
          );
        }
      }

      resolve({
        totalRows,
        validStars,
        skippedRows,
        outputPath: resolvedOutput,
        kinematicCount,
        localVolume10pcCount: options?.catalogsDir ? local10pcSystems.length : undefined,
        referenceBrightCount: options?.catalogsDir ? referenceBrightSystems.length : undefined,
        sectorPartitionCount: options?.partitionsDir ? sectorMap.size : undefined,
      });
    });

    writeStream.on('error', (err) => {
      reject(err);
    });
  });
}

// CLI entrypoint when executed directly via tsx
const isDirectExecution = process.argv[1]?.endsWith('build-data.ts');
if (isDirectExecution) {
  const inputCsv = process.env.INPUT_CSV || 'data/hygdata_v3.csv';
  const outputJson = process.env.OUTPUT_JSON || 'public/data/stars.json';
  const catalogsDir = process.env.CATALOGS_DIR || 'public/data/catalogs';
  const partitionsDir = process.env.PARTITIONS_DIR || 'public/data/partitions';

  console.log(`Starting Data Pipeline: Ingesting ${inputCsv}...`);
  const startTime = Date.now();

  buildStarDataPipeline(inputCsv, outputJson, {
    catalogsDir,
    partitionsDir,
    maxPartitionDistancePc: 100,
  })
    .then((summary) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`Pipeline complete in ${elapsed}s:`);
      console.log(`  - Total CSV rows read: ${summary.totalRows}`);
      console.log(`  - Valid stars exported: ${summary.validStars}`);
      console.log(`  - Stars with kinematic vectors: ${summary.kinematicCount}`);
      console.log(`  - Skipped invalid rows: ${summary.skippedRows}`);
      console.log(`  - Base output: ${summary.outputPath}`);
      if (summary.localVolume10pcCount !== undefined) {
        console.log(`  - Solar neighborhood (<= 10 pc): ${summary.localVolume10pcCount} systems`);
      }
      if (summary.referenceBrightCount !== undefined) {
        console.log(`  - Bright reference stars (V <= 6.5, <= 100 pc): ${summary.referenceBrightCount} systems`);
      }
      if (summary.sectorPartitionCount !== undefined) {
        console.log(`  - Spatial sectors generated: ${summary.sectorPartitionCount} partitions`);
      }
    })
    .catch((err) => {
      console.error('Data Pipeline failed:', err);
      process.exit(1);
    });
}
