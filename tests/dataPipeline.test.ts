import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {
  parseHygRow,
  buildStarDataPipeline,
  starNodeToSystemSummary,
  loadExoplanetCatalog,
  matchExoplanetsForStar,
  checkHabitableCandidate,
  buildSolSystemManifest,
  loadAllGalacticStructures,
  type CatalogPayload,
} from '../scripts/build-data';
import { DATA_SOURCES_REGISTRY, getDataSource, getDataSourcesByLayer } from '../scripts/sources.config';
import type { StarmapNode, ExoplanetRecord } from '../src/types/astro';
import { decodeBinarySector, BINARY_SECTOR_MAGIC } from '../src/utils/binarySectorCodec';

function makeGcnsLine(f: {
  sourceId: string; ra: number; dec: number; plx: number; ePlx?: number;
  pmra?: number; pmdec?: number; gmag?: number; bpmag?: number; rpmag?: number; rv?: number;
}): string {
  const chars = Array.from({ length: 220 }, () => ' ');
  const setStr = (start: number, end: number, val: string) => {
    for (let i = 0; i < val.length && start + i < end; i++) chars[start + i] = val[i]!;
  };
  setStr(2, 21, f.sourceId.padEnd(19));
  setStr(22, 36, f.ra.toFixed(8).padStart(14));
  setStr(45, 59, f.dec.toFixed(8).padStart(14));
  setStr(68, 77, f.plx.toFixed(4).padStart(9));
  if (f.ePlx !== undefined) setStr(78, 85, f.ePlx.toFixed(3).padStart(7));
  if (f.pmra !== undefined) setStr(86, 95, f.pmra.toFixed(3).padStart(9));
  if (f.pmdec !== undefined) setStr(104, 113, f.pmdec.toFixed(3).padStart(9));
  if (f.gmag !== undefined) setStr(122, 130, f.gmag.toFixed(3).padStart(8));
  if (f.bpmag !== undefined) setStr(141, 149, f.bpmag.toFixed(3).padStart(8));
  if (f.rpmag !== undefined) setStr(160, 168, f.rpmag.toFixed(3).padStart(8));
  if (f.rv !== undefined) setStr(198, 206, f.rv.toFixed(2).padStart(8));
  return chars.join('');
}

describe('Data Pipeline - parseHygRow', () => {
  it('correctly maps Sol at origin', () => {
    const node = parseHygRow({
      id: '0', proper: 'Sol', ra: '0.0', dec: '0.0', dist: '0.0', mag: '-26.7', absmag: '4.85', spect: 'G2V', ci: '0.656', lum: '1',
    });
    expect(node?.name).toBe('Sol');
    expect(node?.dist).toBe(0);
    expect(node?.spect).toBe('G2V');
  });

  it('correctly maps Sirius with proper name and kinematics', () => {
    const node = parseHygRow({
      id: '32263', hip: '32349', proper: 'Sirius', ra: '6.752481', dec: '-16.716116', dist: '2.6371',
      mag: '-1.44', absmag: '1.454', spect: 'A0m', lum: '22.8', vx: '-0.00000414', vy: '0.00002073', vz: '-0.0000109', rv: '-7.6',
    });
    expect(node?.properName).toBe('Sirius');
    expect(node?.velocity?.speed).toBeCloseTo(23.25, 1);
  });

  it('skips invalid rows and resolves naming fallbacks', () => {
    expect(parseHygRow({ id: 'abc', ra: '1', dec: '1', dist: '10' })).toBeNull();
    expect(parseHygRow({ id: '1', ra: 'NaN', dec: '1', dist: '10' })).toBeNull();
    const n = parseHygRow({ id: '2', ra: '0', dec: '0', dist: '10', bayer: 'Bet', con: 'Ori' });
    expect(n?.name).toBe('Bet Ori');
  });
});

describe('Data Pipeline - starNodeToSystemSummary', () => {
  it('collapses star into SystemSummaryNode with sector ID and tags', () => {
    const star: StarmapNode = {
      id: 0, name: 'Sol', properName: 'Sol', ra: 0, dec: 0, dist: 0, mag: -26.7, absmag: 4.85,
      spect: 'G2V', ci: 0.656, x: 0, y: 0, z: 0, velocity: { vx: 0, vy: 0, vz: 0, speed: 0 },
    };
    const summary = starNodeToSystemSummary(star);
    expect(summary.id).toBe('0');
    expect(summary.sectorId).toBe('sector_+000_+000_+000');
    expect(summary.tags).toContain('HomeSystem');
    expect(summary.planetCount).toBe(8);
  });
});

describe('Data Pipeline - buildStarDataPipeline (Streaming & Catalogs)', () => {
  const tempGcnsGzPath = path.resolve('tests/fixtures/sample_gcns.dat.gz');
  const tempJsonPath = path.resolve('tests/fixtures/sample_output.json');
  const tempCatalogsDir = path.resolve('tests/fixtures/catalogs');
  const tempPartitionsDir = path.resolve('tests/fixtures/partitions');

  const line1 = makeGcnsLine({
    sourceId: '123456789012345678', ra: 15.0, dec: 10.0, plx: 768.0, ePlx: 0.1,
    pmra: 10.0, pmdec: -20.0, gmag: 0.5, bpmag: 1.0, rpmag: 0.2, rv: -22.0,
  });
  const line2 = makeGcnsLine({
    sourceId: '987654321098765432', ra: 30.0, dec: 20.0, plx: 20.0, ePlx: 0.2,
    pmra: 0.0, pmdec: 0.0, gmag: 12.0, bpmag: 13.0, rpmag: 11.0, rv: 0.0,
  });

  beforeAll(() => {
    process.env.SOURCE_DATE_EPOCH = '2026-01-01T00:00:00.000Z';
    fs.mkdirSync(path.dirname(tempGcnsGzPath), { recursive: true });
    fs.writeFileSync(tempGcnsGzPath, zlib.gzipSync(`${line1}\n${line2}\n`));
  });

  afterAll(() => {
    delete process.env.SOURCE_DATE_EPOCH;
    if (fs.existsSync(tempGcnsGzPath)) fs.unlinkSync(tempGcnsGzPath);
    if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
    if (fs.existsSync(tempCatalogsDir)) fs.rmSync(tempCatalogsDir, { recursive: true, force: true });
    if (fs.existsSync(tempPartitionsDir)) fs.rmSync(tempPartitionsDir, { recursive: true, force: true });
  });

  it('ingests gzipped GCNS fixture and produces stars.json, binary sector, and deterministic catalogs', async () => {
    const summary = await buildStarDataPipeline(tempGcnsGzPath, tempJsonPath, {
      catalogsDir: tempCatalogsDir,
      partitionsDir: tempPartitionsDir,
      maxPartitionDistancePc: 100,
    });

    expect(summary.validStars).toBeGreaterThanOrEqual(3); // Sol + 2 GCNS + RECONS
    expect(fs.existsSync(tempJsonPath)).toBe(true);
    const parsed: StarmapNode[] = JSON.parse(fs.readFileSync(tempJsonPath, 'utf-8'));
    expect(parsed[0].name).toBe('Sol');

    // AUD-047 / DEC-R027: Binary sector .bin ONLY, no .json partition
    const originSectorBinPath = path.join(tempPartitionsDir, 'sector_+000_+000_+000.bin');
    expect(fs.existsSync(originSectorBinPath)).toBe(true);
    const originSectorJsonPath = path.join(tempPartitionsDir, 'sector_+000_+000_+000.json');
    expect(fs.existsSync(originSectorJsonPath)).toBe(false);

    // AUD-048: Binary sector header version === 1
    const binBuffer = fs.readFileSync(originSectorBinPath);
    const decoded = decodeBinarySector(binBuffer.buffer.slice(binBuffer.byteOffset, binBuffer.byteOffset + binBuffer.byteLength) as ArrayBuffer);
    expect(decoded.header.magic).toBe(BINARY_SECTOR_MAGIC);
    expect(decoded.header.version).toBe(1);
    expect(decoded.header.count).toBeGreaterThan(0);

    // AUD-040 / DEC-R028: Deterministic output across runs
    const cat10pcPath = path.join(tempCatalogsDir, 'solar-neighborhood-10pc.json');
    const firstRunContent = fs.readFileSync(cat10pcPath, 'utf-8');
    const firstRunData: CatalogPayload = JSON.parse(firstRunContent);
    expect(firstRunData.header.timestamp).toBe('2026-01-01T00:00:00.000Z');

    await buildStarDataPipeline(tempGcnsGzPath, tempJsonPath, {
      catalogsDir: tempCatalogsDir,
      partitionsDir: tempPartitionsDir,
      maxPartitionDistancePc: 100,
    });
    const secondRunContent = fs.readFileSync(cat10pcPath, 'utf-8');
    expect(secondRunContent).toBe(firstRunContent);
  }, 20000);
});

describe('Sol System Manifest & Satellites (AUD-051, DEC-R029)', () => {
  it('attaches satellites and reticleType to solar system bodies', () => {
    const sol = buildSolSystemManifest();
    expect(sol.id).toBe('sol');
    expect(sol.planets.length).toBeGreaterThanOrEqual(8);

    const earth = sol.planets.find((p) => p.id === 'earth');
    expect(earth?.reticleType).toBeDefined();
    expect(earth?.satellites?.some((s) => s.id === 'moon')).toBe(true);

    const jupiter = sol.planets.find((p) => p.id === 'jupiter');
    expect(jupiter?.reticleType).toBeDefined();
    const moonIds = jupiter?.satellites?.map((s) => s.id) ?? [];
    expect(moonIds).toContain('io');
    expect(moonIds).toContain('europa');
    expect(moonIds).toContain('ganymede');
    expect(moonIds).toContain('callisto');
  });
});

describe('Galactic Structures & Distance Verification (AUD-044, AUD-051, DEC-R026)', () => {
  it('produces real measured distances and populates reticleType without placeholder values', () => {
    const structures = loadAllGalacticStructures();
    expect(structures.length).toBeGreaterThan(0);
    for (const s of structures) {
      expect(s.dist).toBeGreaterThan(0);
      expect(s.reticleType).toBeDefined();
    }
    const bulkSnrPlaceholders = structures.filter((s) => s.id.startsWith('snr-') && s.dist === 1500);
    expect(bulkSnrPlaceholders.length).toBe(0);
    const bulkBarnardPlaceholders = structures.filter((s) => s.id.startsWith('barnard-') && s.dist === 300);
    expect(bulkBarnardPlaceholders.length).toBe(0);
  });
});

describe('Declarative Data Sources Registry', () => {
  it('defines all four agreed astronomical layers with valid metadata across 23 sources', () => {
    expect(DATA_SOURCES_REGISTRY.sources.length).toBe(23);
    const layers = new Set(DATA_SOURCES_REGISTRY.sources.map((s) => s.layer));
    expect(layers).toContain('stellar-neighborhood');
    expect(layers).toContain('exoplanetary-systems');
    expect(layers).toContain('galactic-structures');
    expect(layers).toContain('solar-system-bodies');
  });

  it('supports helper lookups by ID and Layer', () => {
    const hyg = getDataSource('stellar-hyg-database');
    expect(hyg?.status).toBe('integrated');
    const exoSources = getDataSourcesByLayer('exoplanetary-systems');
    expect(exoSources.length).toBeGreaterThanOrEqual(5);
  });
});

describe('Exoplanet Harmonization & Cross-Matching', () => {
  it('evaluates habitable candidates by equilibrium temperature or stellar insolation', () => {
    const habitablePlanet: ExoplanetRecord = { id: 'test-planet-b', name: 'Test b', letter: 'b', equilibriumTempK: 250 };
    const scorchingPlanet: ExoplanetRecord = { id: 'test-planet-c', name: 'Test c', letter: 'c', equilibriumTempK: 1500 };
    expect(checkHabitableCandidate([habitablePlanet])).toBe(true);
    expect(checkHabitableCandidate([scorchingPlanet])).toBe(false);
  });

  it('cross-matches exoplanets against stellar nodes using normalized keys', () => {
    const hostMap = new Map<string, ExoplanetRecord[]>();
    const samplePlanet: ExoplanetRecord = { id: 'hd-154857-b', name: 'HD 154857 b', letter: 'b', discoveryYear: 2004 };
    hostMap.set('hd154857', [samplePlanet]);

    const starNode: StarmapNode = {
      id: 12345, name: 'HD 154857', hd: 154857, ra: 17.1, dec: -56.6, dist: 64.2, mag: 7.25, absmag: 3.2, x: 20, y: 40, z: -30,
    };
    const matched = matchExoplanetsForStar(starNode, hostMap);
    expect(matched).toHaveLength(1);
    expect(matched[0].name).toBe('HD 154857 b');

    const summary = starNodeToSystemSummary(starNode, matched);
    expect(summary.planetCount).toBe(1);
    expect(summary.tags).toContain('ExoplanetHost');
  });

  it('loads and indexes exoplanets from raw CSV using normalized keys', () => {
    const tempExoCsv = path.resolve('tests/fixtures/sample_exo.csv');
    const content =
      'name,binaryflag,mass,radius,period,semimajoraxis,eccentricity,periastron,longitude,ascendingnode,inclination,temperature\n' +
      'HD 154857 b,0,2.24,,408.6,1.291,0.46,57,,,,,336.0\n';
    fs.writeFileSync(tempExoCsv, content, 'utf-8');

    const hostMap = loadExoplanetCatalog(tempExoCsv);
    expect(hostMap.has('hd154857')).toBe(true);
    const planets = hostMap.get('hd154857');
    expect(planets).toHaveLength(1);
    expect(planets?.[0].name).toBe('HD 154857 b');

    if (fs.existsSync(tempExoCsv)) fs.unlinkSync(tempExoCsv);
  });
});
