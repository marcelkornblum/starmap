import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  parseHygRow,
  buildStarDataPipeline,
  starNodeToSystemSummary,
  loadExoplanetCatalog,
  matchExoplanetsForStar,
  checkHabitableCandidate,
  type CatalogPayload,
} from '../scripts/build-data';
import { DATA_SOURCES_REGISTRY, getDataSource, getDataSourcesByLayer } from '../scripts/sources.config';
import type { StarmapNode, SectorPartitionManifest, ExoplanetRecord } from '../src/types/astro';

describe('Data Pipeline - parseHygRow', () => {
  it('correctly maps Sol at origin', () => {
    const rawRow: Record<string, string> = {
      id: '0',
      proper: 'Sol',
      ra: '0.000000',
      dec: '0.000000',
      dist: '0.0000',
      mag: '-26.700',
      absmag: '4.850',
      spect: 'G2V',
      ci: '0.656',
      lum: '1',
    };

    const node = parseHygRow(rawRow);
    expect(node).not.toBeNull();
    expect(node?.id).toBe(0);
    expect(node?.name).toBe('Sol');
    expect(node?.dist).toBe(0);
    expect(node?.x).toBe(0);
    expect(node?.y).toBe(0);
    expect(node?.z).toBe(0);
    expect(node?.spect).toBe('G2V');
    expect(node?.lum).toBe(1);
  });

  it('correctly maps Sirius with proper name and calculated coordinates', () => {
    const rawRow: Record<string, string> = {
      id: '32263',
      hip: '32349',
      hd: '48915',
      hr: '2491',
      gl: 'Gl 244A',
      bf: '9Alp CMa',
      proper: 'Sirius',
      ra: '6.752481',
      dec: '-16.716116',
      dist: '2.6371',
      mag: '-1.440',
      absmag: '1.454',
      spect: 'A0m...',
      ci: '0.009',
      bayer: 'Alp',
      flam: '9',
      con: 'CMa',
      lum: '22.8244',
    };

    const node = parseHygRow(rawRow);
    expect(node).not.toBeNull();
    expect(node?.name).toBe('Sirius');
    expect(node?.properName).toBe('Sirius');
    expect(node?.hip).toBe(32349);
    expect(node?.hd).toBe(48915);
    expect(node?.hr).toBe(2491);
    expect(node?.con).toBe('CMa');
    expect(node?.bayer).toBe('Alp');
    expect(node?.flam).toBe(9);
    expect(node?.x).toBeCloseTo(-0.494, 2);
    expect(node?.y).toBeCloseTo(2.477, 2);
    expect(node?.z).toBeCloseTo(-0.758, 2);
  });

  it('skips rows with missing or NaN coordinates or invalid ID', () => {
    expect(parseHygRow({ id: 'abc', ra: '1', dec: '1', dist: '10' })).toBeNull();
    expect(parseHygRow({ id: '1', ra: 'NaN', dec: '1', dist: '10' })).toBeNull();
    expect(parseHygRow({ id: '1', ra: '1', dec: 'NaN', dist: '10' })).toBeNull();
    expect(parseHygRow({ id: '1', ra: '1', dec: '1', dist: 'NaN' })).toBeNull();
    expect(parseHygRow({ id: '1', ra: '1', dec: '1', dist: '-5' })).toBeNull();
  });

  it('falls back through naming hierarchy when proper name is omitted', () => {
    // 1. bf designation
    const n1 = parseHygRow({ id: '1', ra: '0', dec: '0', dist: '10', bf: '1Alp UMi' });
    expect(n1?.name).toBe('1Alp UMi');

    // 2. bayer + con
    const n2 = parseHygRow({ id: '2', ra: '0', dec: '0', dist: '10', bayer: 'Bet', con: 'Ori' });
    expect(n2?.name).toBe('Bet Ori');

    // 3. gl
    const n3 = parseHygRow({ id: '3', ra: '0', dec: '0', dist: '10', gl: 'Gl 551' });
    expect(n3?.name).toBe('Gl 551');

    // 4. hip
    const n4 = parseHygRow({ id: '4', ra: '0', dec: '0', dist: '10', hip: '12345' });
    expect(n4?.name).toBe('HIP 12345');

    // 5. fallback HYG id
    const n5 = parseHygRow({ id: '999', ra: '0', dec: '0', dist: '10' });
    expect(n5?.name).toBe('HYG 999');
  });

  it('correctly maps 3D velocity vector when kinematic columns are present', () => {
    const rawRow: Record<string, string> = {
      id: '32263',
      proper: 'Sirius',
      ra: '6.752481',
      dec: '-16.716116',
      dist: '2.6371',
      mag: '-1.440',
      absmag: '1.454',
      vx: '-0.00000414',
      vy: '0.00002073',
      vz: '-0.00001090',
      rv: '-7.6',
      pmra: '-546.01',
      pmdec: '-1223.07',
    };

    const node = parseHygRow(rawRow);
    expect(node).not.toBeNull();
    expect(node?.velocity).toBeDefined();
    expect(node?.velocity?.speed).toBeCloseTo(23.25, 1);
    expect(node?.velocity?.radialVelocity).toBe(-7.6);
    expect(node?.velocity?.pmra).toBe(-546.01);
    expect(node?.velocity?.pmdec).toBe(-1223.07);
  });
});

describe('Data Pipeline - starNodeToSystemSummary', () => {
  it('collapses star into SystemSummaryNode with sector ID and tags', () => {
    const star: StarmapNode = {
      id: 0,
      name: 'Sol',
      properName: 'Sol',
      ra: 0,
      dec: 0,
      dist: 0,
      mag: -26.7,
      absmag: 4.85,
      spect: 'G2V',
      ci: 0.656,
      x: 0,
      y: 0,
      z: 0,
      velocity: {
        vx: 0,
        vy: 0,
        vz: 0,
        speed: 0,
      },
    };

    const summary = starNodeToSystemSummary(star);
    expect(summary.id).toBe('0');
    expect(summary.name).toBe('Sol');
    expect(summary.dist).toBe(0);
    expect(summary.sectorId).toBe('sector_+000_+000_+000');
    expect(summary.tags).toContain('HomeSystem');
    expect(summary.tags).toContain('SolarNeighborhood10pc');
    expect(summary.tags).toContain('NakedEye');
    expect(summary.planetCount).toBe(8);
    expect(summary.hasHabitableCandidate).toBe(true);
  });
});

describe('Data Pipeline - buildStarDataPipeline (Streaming & Catalogs)', () => {
  const tempCsvPath = path.resolve('tests/fixtures/sample_test.csv');
  const tempJsonPath = path.resolve('tests/fixtures/sample_output.json');
  const tempCatalogsDir = path.resolve('tests/fixtures/catalogs');
  const tempPartitionsDir = path.resolve('tests/fixtures/partitions');

  afterAll(() => {
    if (fs.existsSync(tempCsvPath)) fs.unlinkSync(tempCsvPath);
    if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
    if (fs.existsSync(tempCatalogsDir)) fs.rmSync(tempCatalogsDir, { recursive: true, force: true });
    if (fs.existsSync(tempPartitionsDir)) fs.rmSync(tempPartitionsDir, { recursive: true, force: true });
  });

  it('streams CSV input and produces valid minified JSON array', async () => {
    const csvContent =
      'id,proper,ra,dec,dist,mag,absmag,spect,ci,lum,vx,vy,vz,rv\n' +
      '0,Sol,0.0,0.0,0.0,-26.7,4.85,G2V,0.656,1.0,0.0,0.0,0.0,0.0\n' +
      '1,,1.0,10.0,50.0,6.0,2.0,A0,0.1,5.0,-0.00001,0.00002,-0.00001,15.0\n' +
      '2,InvalidStar,1.0,10.0,NaN,5.0,2.0,M0,1.2,0.5,,,,\n';

    fs.writeFileSync(tempCsvPath, csvContent, 'utf-8');

    const summary = await buildStarDataPipeline(tempCsvPath, tempJsonPath);

    expect(summary.totalRows).toBe(3);
    expect(summary.validStars).toBe(2);
    expect(summary.skippedRows).toBe(1);
    expect(summary.kinematicCount).toBe(2);

    const generated = fs.readFileSync(tempJsonPath, 'utf-8');
    const parsed: StarmapNode[] = JSON.parse(generated);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe('Sol');
    expect(parsed[0].velocity?.speed).toBe(0);
    expect(parsed[1].name).toBe('HYG 1');
    expect(parsed[1].velocity?.radialVelocity).toBe(15.0);
  });

  it('generates formal catalogs and spatial partition sectors when options are provided', async () => {
    const csvContent =
      'id,proper,ra,dec,dist,mag,absmag,spect,ci,lum,vx,vy,vz,rv\n' +
      '0,Sol,0.0,0.0,0.0,-26.7,4.85,G2V,0.656,1.0,0.0,0.0,0.0,0.0\n' +
      '1,AlphaCen,1.0,10.0,1.3,0.0,4.3,G2V,0.7,1.5,0.00001,0.0,0.0,-22.0\n' +
      '2,DistantFaint,2.0,20.0,50.0,12.0,8.0,M0,1.2,0.1,0.0,0.0,0.0,0.0\n';

    fs.writeFileSync(tempCsvPath, csvContent, 'utf-8');

    const summary = await buildStarDataPipeline(tempCsvPath, tempJsonPath, {
      catalogsDir: tempCatalogsDir,
      partitionsDir: tempPartitionsDir,
      maxPartitionDistancePc: 100,
    });

    expect(summary.validStars).toBe(3);
    // Sol & AlphaCen from CSV + 3 RECONS supplement systems
    expect(summary.localVolume10pcCount).toBe(5);
    expect(summary.referenceBrightCount).toBe(2); // Sol & AlphaCen (mag <= 6.5)

    // Verify 10pc formal catalog
    const cat10pcPath = path.join(tempCatalogsDir, 'solar-neighborhood-10pc.json');
    expect(fs.existsSync(cat10pcPath)).toBe(true);
    const cat10pc: CatalogPayload = JSON.parse(fs.readFileSync(cat10pcPath, 'utf-8'));
    expect(cat10pc.header.catalogId).toBe('solar-neighborhood-10pc');
    expect(cat10pc.systems).toHaveLength(5);

    // Verify reference bright stars formal catalog
    const brightPath = path.join(tempCatalogsDir, 'reference-bright-stars.json');
    expect(fs.existsSync(brightPath)).toBe(true);
    const brightCat: CatalogPayload = JSON.parse(fs.readFileSync(brightPath, 'utf-8'));
    expect(brightCat.header.catalogId).toBe('reference-bright-stars');
    expect(brightCat.systems).toHaveLength(2);

    // Verify sector partitions
    const originSectorPath = path.join(tempPartitionsDir, 'sector_+000_+000_+000.json');
    expect(fs.existsSync(originSectorPath)).toBe(true);
    const originSector: SectorPartitionManifest = JSON.parse(fs.readFileSync(originSectorPath, 'utf-8'));
    expect(originSector.sectorId).toBe('sector_+000_+000_+000');
    expect(originSector.count).toBeGreaterThanOrEqual(2);
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

    for (const source of DATA_SOURCES_REGISTRY.sources) {
      expect(source.id).toBeTruthy();
      expect(source.name).toBeTruthy();
      expect(source.authority).toBeTruthy();
      expect(source.localCachePath).toBeTruthy();
      expect(source.status).toBeTruthy();
      expect(source.contributions.length).toBeGreaterThan(0);
      expect(source.targetArtifacts.length).toBeGreaterThan(0);
    }
  });

  it('supports helper lookups by ID and Layer', () => {
    const hyg = getDataSource('stellar-hyg-database');
    expect(hyg).toBeDefined();
    expect(hyg?.layer).toBe('stellar-neighborhood');
    expect(hyg?.status).toBe('integrated');

    const exoSources = getDataSourcesByLayer('exoplanetary-systems');
    expect(exoSources.length).toBeGreaterThanOrEqual(5);
    expect(exoSources.some((s) => s.id === 'exoplanet-oec')).toBe(true);

    const integratedSources = DATA_SOURCES_REGISTRY.sources.filter((s) => s.status === 'integrated');
    expect(integratedSources.length).toBeGreaterThanOrEqual(4);
  });
});

describe('Exoplanet Harmonization & Cross-Matching', () => {
  it('evaluates habitable candidates by equilibrium temperature or stellar insolation', () => {
    const habitablePlanet: ExoplanetRecord = {
      id: 'test-planet-b',
      name: 'Test b',
      letter: 'b',
      equilibriumTempK: 250,
      orbit: {
        semiMajorAxis: 1.0,
        eccentricity: 0.01,
        inclination: 0,
        ascendingNode: 0,
        argumentOfPeriapsis: 0,
        meanAnomaly: 0,
        periodDays: 365,
      },
    };

    const scorchingPlanet: ExoplanetRecord = {
      id: 'test-planet-c',
      name: 'Test c',
      letter: 'c',
      equilibriumTempK: 1500,
    };

    expect(checkHabitableCandidate([habitablePlanet])).toBe(true);
    expect(checkHabitableCandidate([scorchingPlanet])).toBe(false);
  });

  it('cross-matches exoplanets against stellar nodes using HD, HIP, and proper names', () => {
    const hostMap = new Map<string, ExoplanetRecord[]>();
    const samplePlanet: ExoplanetRecord = {
      id: 'hd-154857-b',
      name: 'HD 154857 b',
      letter: 'b',
      discoveryYear: 2004,
    };
    hostMap.set('hd 154857', [samplePlanet]);

    const starNode: StarmapNode = {
      id: 12345,
      name: 'HD 154857',
      hd: 154857,
      ra: 17.1,
      dec: -56.6,
      dist: 64.2,
      mag: 7.25,
      absmag: 3.2,
      x: 20,
      y: 40,
      z: -30,
    };

    const matched = matchExoplanetsForStar(starNode, hostMap);
    expect(matched).toHaveLength(1);
    expect(matched[0].name).toBe('HD 154857 b');

    const summary = starNodeToSystemSummary(starNode, matched);
    expect(summary.planetCount).toBe(1);
    expect(summary.tags).toContain('ExoplanetHost');
  });

  it('loads and indexes exoplanets from raw CSV', () => {
    const tempExoCsv = path.resolve('tests/fixtures/sample_exo.csv');
    const content =
      'name,binaryflag,mass,radius,period,semimajoraxis,eccentricity,periastron,longitude,ascendingnode,inclination,temperature\n' +
      'HD 154857 b,0,2.24,,408.6,1.291,0.46,57,,,,,336.0\n';
    fs.writeFileSync(tempExoCsv, content, 'utf-8');

    const hostMap = loadExoplanetCatalog(tempExoCsv);
    expect(hostMap.has('hd 154857')).toBe(true);
    const planets = hostMap.get('hd 154857');
    expect(planets).toHaveLength(1);
    expect(planets?.[0].name).toBe('HD 154857 b');

    if (fs.existsSync(tempExoCsv)) fs.unlinkSync(tempExoCsv);
  });
});
