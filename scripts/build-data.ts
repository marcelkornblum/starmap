import fs from 'node:fs';
import path from 'node:path';
import csv from 'csv-parser';
import type {
  StarmapNode,
  SystemSummaryNode,
  SectorPartitionManifest,
  CatalogManifestHeader,
  ExoplanetRecord,
  SystemManifest,
} from '../src/types/astro';
import {
  equatorialToCartesian,
  parseKinematicVector,
  formatSectorId,
  getSectorBounds,
  DEFAULT_SECTOR_SIZE_PC,
} from '../src/utils/astroMath';
import {
  OFFICIAL_IAU_STAR_NAMES,
  RECONS_10PC_SUPPLEMENT,
  IAU_NAME_EXOWORLDS,
  AAVSO_VARIABLE_CATALOG,
  FULL_GALACTIC_STRUCTURES,
  FULL_SOLAR_SYSTEM_BODIES,
} from './fetch-sources';

/**
 * Parses and harmonizes a raw CSV record from hygdata_v3 into a strict StarmapNode.
 * Attaches calculated Cartesian coordinates, 3D velocity vectors, and official IAU proper names.
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

  const hip = row.hip && row.hip.trim().length > 0 ? parseInt(row.hip, 10) : null;
  const hd = row.hd && row.hd.trim().length > 0 ? parseInt(row.hd, 10) : null;

  // Derive human-readable primary display name
  let properName = row.proper && row.proper.trim().length > 0 ? row.proper.trim() : undefined;

  // Cross-reference official IAU Working Group on Star Names gazetteer
  if (!properName && hip && OFFICIAL_IAU_STAR_NAMES[`hip-${hip}`]) {
    properName = OFFICIAL_IAU_STAR_NAMES[`hip-${hip}`].properName;
  }

  let name = properName;

  if (!name) {
    if (row.bf && row.bf.trim().length > 0) {
      name = row.bf.trim();
    } else if (row.bayer && row.con && row.bayer.trim().length > 0) {
      name = `${row.bayer.trim()} ${row.con.trim()}`;
    } else if (row.gl && row.gl.trim().length > 0) {
      name = row.gl.trim();
    } else if (hip) {
      name = `HIP ${hip}`;
    } else if (hd) {
      name = `HD ${hd}`;
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
 * Loads and indexes exoplanets from the Open Exoplanet Catalogue CSV,
 * enriching with official IAU NameExoWorlds common designations.
 *
 * @param csvPath Path to raw OEC CSV file
 * @returns Map of host star keys to ExoplanetRecord arrays
 */
export function loadExoplanetCatalog(csvPath: string): Map<string, ExoplanetRecord[]> {
  const hostMap = new Map<string, ExoplanetRecord[]>();
  const resolved = path.resolve(csvPath);

  if (!fs.existsSync(resolved)) {
    return hostMap;
  }

  const content = fs.readFileSync(resolved, 'utf-8');
  const lines = content.split('\n');
  if (lines.length <= 1) return hostMap;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    const planetName = parts[0]?.trim();
    if (!planetName) continue;

    const lastSpace = planetName.lastIndexOf(' ');
    if (lastSpace === -1) continue;

    const hostName = planetName.substring(0, lastSpace).trim();
    const letter = planetName.substring(lastSpace + 1).trim();

    const semimajoraxis = parseFloat(parts[5]);
    const eccentricity = parseFloat(parts[6]);
    const periastron = parseFloat(parts[7]);
    const ascendingnode = parseFloat(parts[9]);
    const inclination = parseFloat(parts[10]);
    const temperature = parseFloat(parts[11]);
    const period = parseFloat(parts[4]);
    const mass = parseFloat(parts[2]);
    const radius = parseFloat(parts[3]);
    const discoverymethod = parts[13]?.trim() || undefined;
    const discoveryyear = parseInt(parts[14], 10);

    // Cross-match IAU NameExoWorlds official common nomenclature
    const iauMatch = IAU_NAME_EXOWORLDS[planetName];
    const displayName = iauMatch ? `${planetName} (${iauMatch.planetName})` : planetName;

    const planetRecord: ExoplanetRecord = {
      id: planetName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: displayName,
      letter,
      discoveryYear: !isNaN(discoveryyear) ? discoveryyear : undefined,
      discoveryMethod: discoverymethod,
      massMjup: !isNaN(mass) ? mass : undefined,
      radiusRjup: !isNaN(radius) ? radius : undefined,
      equilibriumTempK: !isNaN(temperature) ? temperature : undefined,
      orbit: {
        semiMajorAxis: !isNaN(semimajoraxis) ? semimajoraxis : 0,
        eccentricity: !isNaN(eccentricity) ? eccentricity : 0,
        inclination: !isNaN(inclination) ? inclination : 0,
        ascendingNode: !isNaN(ascendingnode) ? ascendingnode : 0,
        argumentOfPeriapsis: !isNaN(periastron) ? periastron : 0,
        meanAnomaly: 0,
        periodDays: !isNaN(period) ? period : 0,
      },
    };

    const keys = [
      hostName.toLowerCase(),
      hostName.toLowerCase().replace(/\s+/g, ''),
    ];

    // If host has an IAU NameExoWorlds star name, index by that too
    if (iauMatch) {
      keys.push(iauMatch.starName.toLowerCase());
      keys.push(iauMatch.starName.toLowerCase().replace(/\s+/g, ''));
    }

    for (const key of keys) {
      let bucket = hostMap.get(key);
      if (!bucket) {
        bucket = [];
        hostMap.set(key, bucket);
      }
      bucket.push(planetRecord);
    }
  }

  return hostMap;
}

/**
 * Cross-matches a stellar node against the indexed exoplanet catalog.
 *
 * @param star Source StarmapNode
 * @param hostMap Map of indexed exoplanets
 * @returns Array of matched ExoplanetRecords
 */
export function matchExoplanetsForStar(
  star: StarmapNode,
  hostMap: Map<string, ExoplanetRecord[]>,
): ExoplanetRecord[] {
  if (hostMap.size === 0) return [];

  const candidateKeys: string[] = [];

  if (star.properName) {
    candidateKeys.push(star.properName.toLowerCase());
    candidateKeys.push(star.properName.toLowerCase().replace(/\s+/g, ''));
  }
  if (star.name) {
    candidateKeys.push(star.name.toLowerCase());
    candidateKeys.push(star.name.toLowerCase().replace(/\s+/g, ''));
  }
  if (star.hd) {
    candidateKeys.push(`hd ${star.hd}`.toLowerCase());
    candidateKeys.push(`hd${star.hd}`.toLowerCase());
  }
  if (star.hip) {
    candidateKeys.push(`hip ${star.hip}`.toLowerCase());
    candidateKeys.push(`hip${star.hip}`.toLowerCase());
  }
  if (star.gl) {
    candidateKeys.push(star.gl.toLowerCase());
    candidateKeys.push(star.gl.toLowerCase().replace(/\s+/g, ''));
    candidateKeys.push(star.gl.toLowerCase().replace('gl ', 'gj '));
    candidateKeys.push(star.gl.toLowerCase().replace('gl ', 'gliese '));
  }

  for (const key of candidateKeys) {
    const matched = hostMap.get(key);
    if (matched && matched.length > 0) {
      const uniqueMap = new Map<string, ExoplanetRecord>();
      for (const p of matched) {
        uniqueMap.set(p.id, p);
      }
      return Array.from(uniqueMap.values());
    }
  }

  return [];
}

/**
 * Evaluates whether an exoplanetary system contains a plausible habitable zone candidate.
 *
 * @param planets List of exoplanet records
 * @param starLum Optional stellar luminosity in L☉
 * @returns Boolean flag indicating habitable zone candidacy
 */
export function checkHabitableCandidate(planets: ExoplanetRecord[], starLum?: number): boolean {
  for (const p of planets) {
    // 1. Direct equilibrium temperature range [200 K, 320 K]
    if (p.equilibriumTempK !== undefined && p.equilibriumTempK >= 200 && p.equilibriumTempK <= 320) {
      return true;
    }
    // 2. Insolation / habitable zone approximation based on stellar luminosity (AU)
    if (starLum !== undefined && starLum > 0 && p.orbit?.semiMajorAxis) {
      const hzInner = 0.75 * Math.sqrt(starLum);
      const hzOuter = 1.77 * Math.sqrt(starLum);
      if (p.orbit.semiMajorAxis >= hzInner && p.orbit.semiMajorAxis <= hzOuter) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Transforms a StarmapNode into a collapsed SystemSummaryNode with spatial sector tags,
 * variability flags, and attached exoplanetary metrics.
 *
 * @param star Source StarmapNode
 * @param planets Optional attached exoplanet records
 * @returns Collapsed SystemSummaryNode
 */
export function starNodeToSystemSummary(
  star: StarmapNode,
  planets: ExoplanetRecord[] = [],
): SystemSummaryNode {
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

  // Cross-reference variable star index
  if (star.properName && AAVSO_VARIABLE_CATALOG[star.properName]) {
    tags.push('VariableStar');
  } else if (AAVSO_VARIABLE_CATALOG[star.name]) {
    tags.push('VariableStar');
  }

  const isSol = star.name === 'Sol';
  const planetCount = isSol ? 8 : planets.length;
  const hasHabitable = isSol ? true : checkHabitableCandidate(planets, star.lum);

  if (planetCount > 0) {
    tags.push('ExoplanetHost');
  }
  if (hasHabitable) {
    tags.push('HabitableCandidate');
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
    planetCount,
    hasHabitableCandidate: hasHabitable,
    sectorId,
    tags: tags.length > 0 ? tags : undefined,
  };
}

export interface BuildPipelineOptions {
  /** Optional directory path to emit formal catalogs */
  catalogsDir?: string;
  /** Optional directory path to emit spatial partition sectors */
  partitionsDir?: string;
  /** Optional directory path to emit detailed system manifests */
  systemsDir?: string;
  /** Optional directory path to emit overlay indices */
  overlaysDir?: string;
  /** Optional directory path to emit Sol system ephemerides */
  solDir?: string;
  /** Optional path to raw exoplanet catalogue CSV */
  exoplanetsCsvPath?: string;
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
  exoplanetSystemCount?: number;
  totalExoplanetsAttached?: number;
  galacticStructuresCount?: number;
  solarSystemBodiesCount?: number;
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
 * merges RECONS ground truth, cross-matches exoplanets, emits formal catalogs,
 * sector partitions, and multi-layer overlays.
 *
 * @param inputCsvPath Absolute or relative path to raw CSV file
 * @param outputJsonPath Absolute or relative path to destination JSON file
 * @param options Optional configuration for formal catalogs, overlays, and partitions
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

  // Load Layer 2 Exoplanets if available
  const exoplanetCsv = options?.exoplanetsCsvPath || 'data/raw/open_exoplanet_catalogue.csv';
  const exoplanetHostMap = loadExoplanetCatalog(exoplanetCsv);

  return new Promise((resolve, reject) => {
    let totalRows = 0;
    let validStars = 0;
    let skippedRows = 0;
    let kinematicCount = 0;
    let exoplanetSystemCount = 0;
    let totalExoplanetsAttached = 0;

    const local10pcSystems: SystemSummaryNode[] = [];
    const referenceBrightSystems: SystemSummaryNode[] = [];
    const exoplanetHostSummaries: SystemSummaryNode[] = [];
    const sectorMap = new Map<string, SystemSummaryNode[]>();
    const sectorManifestsMap = new Map<string, SystemManifest[]>();

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

        // Match exoplanets for this star
        const matchedPlanets = matchExoplanetsForStar(node, exoplanetHostMap);
        if (matchedPlanets.length > 0) {
          exoplanetSystemCount++;
          totalExoplanetsAttached += matchedPlanets.length;
        }

        // Collect into formal catalog sets if requested
        if (options?.catalogsDir || options?.partitionsDir || options?.overlaysDir || options?.systemsDir) {
          const summary = starNodeToSystemSummary(node, matchedPlanets);

          if (node.dist <= 10) {
            local10pcSystems.push(summary);
          }
          if (node.mag <= 6.5 && node.dist <= maxPartitionDist) {
            referenceBrightSystems.push(summary);
          }
          if (summary.planetCount > 0) {
            exoplanetHostSummaries.push(summary);
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

          // Generate detailed system manifests for stars with exoplanets or Sol
          if (options?.systemsDir && (matchedPlanets.length > 0 || node.name === 'Sol')) {
            const sectorId = summary.sectorId;
            let manifestBucket = sectorManifestsMap.get(sectorId);
            if (!manifestBucket) {
              manifestBucket = [];
              sectorManifestsMap.set(sectorId, manifestBucket);
            }

            manifestBucket.push({
              id: String(node.id),
              name: node.name,
              properName: node.properName,
              x: node.x,
              y: node.y,
              z: node.z,
              dist: node.dist,
              velocity: node.velocity,
              sectorId,
              stars: [
                {
                  id: `${node.id}-A`,
                  name: node.name,
                  componentDesignation: 'A',
                  spectralType: node.spect || 'Unknown',
                  mag: node.mag,
                  absmag: node.absmag,
                  luminosityLsun: node.lum,
                },
              ],
              planets: matchedPlanets,
            });
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
        // Integrate RECONS 10-pc supplement (brown dwarfs & low-mass neighbors absent in HYG)
        for (const recons of RECONS_10PC_SUPPLEMENT) {
          const [rx, ry, rz] = equatorialToCartesian(recons.ra, recons.dec, recons.dist);
          const rSectorId = formatSectorId(rx, ry, rz);
          const matchedPlanets = matchExoplanetsForStar(
            { id: 990000, name: recons.name, ra: recons.ra, dec: recons.dec, dist: recons.dist, mag: recons.mag, absmag: recons.absmag, x: rx, y: ry, z: rz },
            exoplanetHostMap,
          );

          const rSummary: SystemSummaryNode = {
            id: recons.id,
            name: recons.name,
            properName: recons.properName,
            x: rx,
            y: ry,
            z: rz,
            dist: recons.dist,
            mag: recons.mag,
            absmag: recons.absmag,
            spect: recons.spect,
            starCount: recons.starCount,
            planetCount: matchedPlanets.length,
            hasHabitableCandidate: matchedPlanets.length > 0,
            sectorId: rSectorId,
            tags: ['SolarNeighborhood10pc', 'RECONSGroundTruth', ...(matchedPlanets.length > 0 ? ['ExoplanetHost'] : [])],
          };

          if (recons.dist <= 10) {
            local10pcSystems.push(rSummary);
          }

          if (options?.partitionsDir) {
            let bucket = sectorMap.get(rSectorId);
            if (!bucket) {
              bucket = [];
              sectorMap.set(rSectorId, bucket);
            }
            bucket.push(rSummary);
          }
        }

        writeStream.write(']');
        writeStream.end();
      })
      .on('error', (err) => {
        reject(err);
      });

    writeStream.on('finish', () => {
      const nowIso = new Date().toISOString();

      // 1. Write formal catalogs (solar-neighborhood-10pc, reference-bright-stars)
      if (options?.catalogsDir) {
        const resolvedCatalogs = path.resolve(options.catalogsDir);
        if (!fs.existsSync(resolvedCatalogs)) {
          fs.mkdirSync(resolvedCatalogs, { recursive: true });
        }

        const local10pcPayload: CatalogPayload = {
          header: {
            catalogId: 'solar-neighborhood-10pc',
            name: 'Solar Neighborhood 10-Parsec Census',
            description: 'Comprehensive census of verified stellar systems within 10 parsecs of Sol including RECONS ground truth',
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
            description: 'Navigational and naked-eye reference stars within the 100-parsec volume enriched with IAU official names',
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

      // 2. Write spatial sector partitions
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

      // 3. Write detailed system manifests
      if (options?.systemsDir && sectorManifestsMap.size > 0) {
        const resolvedSystems = path.resolve(options.systemsDir);
        if (!fs.existsSync(resolvedSystems)) {
          fs.mkdirSync(resolvedSystems, { recursive: true });
        }

        for (const [sectorId, manifests] of sectorManifestsMap.entries()) {
          fs.writeFileSync(
            path.join(resolvedSystems, `${sectorId}.json`),
            JSON.stringify(manifests),
            'utf-8',
          );
        }
      }

      // 4. Write Layer 2 Exoplanet & Layer 3 Galactic Structure Overlays
      if (options?.overlaysDir) {
        const resolvedOverlays = path.resolve(options.overlaysDir);
        if (!fs.existsSync(resolvedOverlays)) {
          fs.mkdirSync(resolvedOverlays, { recursive: true });
        }

        // Layer 2 Exoplanetary overlay index
        fs.writeFileSync(
          path.join(resolvedOverlays, 'exoplanetary-systems.json'),
          JSON.stringify({
            overlayId: 'exoplanetary-systems',
            title: 'Exoplanetary Systems Index',
            totalSystems: exoplanetHostSummaries.length,
            timestamp: nowIso,
            systems: exoplanetHostSummaries,
          }),
          'utf-8',
        );

        // Layer 3 Galactic structures overlay (Full 21 structures: clusters, remnants, pulsars, nebulae)
        fs.writeFileSync(
          path.join(resolvedOverlays, 'galactic-structures.json'),
          JSON.stringify({
            overlayId: 'galactic-structures',
            title: 'Local Galactic Structures, Clusters & Deep Sky',
            count: FULL_GALACTIC_STRUCTURES.length,
            timestamp: nowIso,
            structures: FULL_GALACTIC_STRUCTURES,
          }),
          'utf-8',
        );
      }

      // 5. Write Layer 4 Solar System bodies (Primary, Asteroids, Comets, NEOs)
      if (options?.solDir) {
        const resolvedSol = path.resolve(options.solDir);
        if (!fs.existsSync(resolvedSol)) {
          fs.mkdirSync(resolvedSol, { recursive: true });
        }

        const primaryBodies = FULL_SOLAR_SYSTEM_BODIES.filter(
          (b) => b.classification === 'Star' || b.classification === 'Planet' || b.classification === 'DwarfPlanet' || b.classification === 'Moon',
        );
        const asteroids = FULL_SOLAR_SYSTEM_BODIES.filter(
          (b) => b.classification === 'AsteroidMainBelt' || b.classification === 'AsteroidNEO',
        );
        const comets = FULL_SOLAR_SYSTEM_BODIES.filter(
          (b) => b.classification === 'Comet',
        );
        const neos = FULL_SOLAR_SYSTEM_BODIES.filter(
          (b) => b.classification === 'AsteroidNEO',
        );

        fs.writeFileSync(
          path.join(resolvedSol, 'ephemeris-primary-bodies.json'),
          JSON.stringify({
            datasetId: 'sol-primary-bodies',
            title: 'Solar System Primary Bodies & Major Moons',
            epoch: 'J2000',
            count: primaryBodies.length,
            timestamp: nowIso,
            bodies: primaryBodies,
          }),
          'utf-8',
        );

        fs.writeFileSync(
          path.join(resolvedSol, 'orbital-elements-asteroids.json'),
          JSON.stringify({
            datasetId: 'sol-asteroids',
            title: 'Solar System Asteroids, Trojans & Centaurs',
            epoch: 'J2000',
            count: asteroids.length,
            timestamp: nowIso,
            bodies: asteroids,
          }),
          'utf-8',
        );

        fs.writeFileSync(
          path.join(resolvedSol, 'orbital-elements-comets.json'),
          JSON.stringify({
            datasetId: 'sol-comets',
            title: 'Solar System Periodic & Historic Comets',
            epoch: 'J2000',
            count: comets.length,
            timestamp: nowIso,
            bodies: comets,
          }),
          'utf-8',
        );

        fs.writeFileSync(
          path.join(resolvedSol, 'orbital-elements-neo.json'),
          JSON.stringify({
            datasetId: 'sol-minor-bodies-neo',
            title: 'Solar System Near-Earth Objects & Hazardous Asteroids',
            epoch: 'J2000',
            count: neos.length,
            timestamp: nowIso,
            bodies: neos,
          }),
          'utf-8',
        );
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
        exoplanetSystemCount: exoplanetHostSummaries.length,
        totalExoplanetsAttached,
        galacticStructuresCount: options?.overlaysDir ? FULL_GALACTIC_STRUCTURES.length : undefined,
        solarSystemBodiesCount: options?.solDir ? FULL_SOLAR_SYSTEM_BODIES.length : undefined,
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
  const systemsDir = process.env.SYSTEMS_DIR || 'public/data/systems';
  const overlaysDir = process.env.OVERLAYS_DIR || 'public/data/overlays';
  const solDir = process.env.SOL_DIR || 'public/data/sol';

  console.log(`Starting Data Pipeline: Ingesting ${inputCsv}...`);
  const startTime = Date.now();

  buildStarDataPipeline(inputCsv, outputJson, {
    catalogsDir,
    partitionsDir,
    systemsDir,
    overlaysDir,
    solDir,
    maxPartitionDistancePc: 100,
  })
    .then((summary) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\nPipeline complete in ${elapsed}s:`);
      console.log(`  - Total CSV rows read: ${summary.totalRows}`);
      console.log(`  - Valid stars exported: ${summary.validStars}`);
      console.log(`  - Stars with kinematic vectors: ${summary.kinematicCount}`);
      console.log(`  - Skipped invalid rows: ${summary.skippedRows}`);
      console.log(`  - Base output: ${summary.outputPath}`);
      if (summary.localVolume10pcCount !== undefined) {
        console.log(`  - Layer 1 (<= 10 pc census): ${summary.localVolume10pcCount} systems (including RECONS ground truth)`);
      }
      if (summary.referenceBrightCount !== undefined) {
        console.log(`  - Layer 1 (Naked-eye V <= 6.5): ${summary.referenceBrightCount} systems`);
      }
      if (summary.sectorPartitionCount !== undefined) {
        console.log(`  - Spatial sectors generated: ${summary.sectorPartitionCount} partitions`);
      }
      if (summary.exoplanetSystemCount !== undefined) {
        console.log(`  - Layer 2 (Exoplanet host systems): ${summary.exoplanetSystemCount} systems (${summary.totalExoplanetsAttached} confirmed planets)`);
      }
      if (summary.galacticStructuresCount !== undefined) {
        console.log(`  - Layer 3 (Galactic deep sky structures): ${summary.galacticStructuresCount} objects (Clusters, SNRs, Pulsars, Nebulae)`);
      }
      if (summary.solarSystemBodiesCount !== undefined) {
        console.log(`  - Layer 4 (Sol system primary & minor bodies): ${summary.solarSystemBodiesCount} bodies (Planets, Moons, Asteroids, Comets)`);
      }
    })
    .catch((err) => {
      console.error('Data Pipeline failed:', err);
      process.exit(1);
    });
}
