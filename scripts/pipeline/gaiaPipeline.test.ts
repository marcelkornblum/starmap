import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import type { StarmapNode } from '../../src/types/astro';
import { decodeBinarySector, BINARY_SECTOR_MAGIC } from '../../src/utils/binarySectorCodec';
import { buildStarDataPipeline } from './gaiaPipeline';

function makeGcnsLine(f: {
  sourceId: string;
  ra: number;
  dec: number;
  plx: number;
  ePlx?: number;
  pmra?: number;
  pmdec?: number;
  gmag?: number;
  bpmag?: number;
  rpmag?: number;
  rv?: number;
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

describe('Data Pipeline - buildStarDataPipeline (Streaming & Active Shards)', () => {
  let tempRoot: string;
  let tempGcnsGzPath: string;
  let tempJsonPath: string;
  let tempDataDir: string;
  let tempPartitionsDir: string;
  let tempSummariesDir: string;
  let tempDetailsDir: string;
  let tempSearchDir: string;
  let tempOverlaysDir: string;

  const line1 = makeGcnsLine({
    sourceId: '123456789012345678',
    ra: 15.0,
    dec: 10.0,
    plx: 768.0,
    ePlx: 0.1,
    pmra: 10.0,
    pmdec: -20.0,
    gmag: 0.5,
    bpmag: 1.0,
    rpmag: 0.2,
    rv: -22.0,
  });
  const line2 = makeGcnsLine({
    sourceId: '987654321098765432',
    ra: 30.0,
    dec: 20.0,
    plx: 20.0,
    ePlx: 0.2,
    pmra: 0.0,
    pmdec: 0.0,
    gmag: 12.0,
    bpmag: 13.0,
    rpmag: 11.0,
    rv: 0.0,
  });

  beforeAll(() => {
    process.env.SOURCE_DATE_EPOCH = '2026-01-01T00:00:00.000Z';
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'starmap-gaia-pipeline-'));
    tempGcnsGzPath = path.join(tempRoot, 'sample_gcns.dat.gz');
    tempJsonPath = path.join(tempRoot, 'sample_output.json');
    tempDataDir = path.join(tempRoot, 'data');
    tempPartitionsDir = path.join(tempDataDir, 'partitions');
    tempSummariesDir = path.join(tempDataDir, 'summaries');
    tempDetailsDir = path.join(tempDataDir, 'details');
    tempSearchDir = path.join(tempDataDir, 'search');
    tempOverlaysDir = path.join(tempDataDir, 'overlays');
    fs.writeFileSync(tempGcnsGzPath, zlib.gzipSync(`${line1}\n${line2}\n`));
  });

  afterAll(() => {
    delete process.env.SOURCE_DATE_EPOCH;
    if (tempRoot && fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('ingests gzipped GCNS fixture and produces active shards without unreferenced legacy outputs', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const summary = await buildStarDataPipeline(tempGcnsGzPath, tempJsonPath, {
        partitionsDir: tempPartitionsDir,
        summariesDir: tempSummariesDir,
        detailsDir: tempDetailsDir,
        searchDir: tempSearchDir,
        overlaysDir: tempOverlaysDir,
        maxPartitionDistancePc: 100,
      });

      expect(summary.validStars).toBeGreaterThanOrEqual(3);
      expect(fs.existsSync(tempJsonPath)).toBe(true);
      const parsed: StarmapNode[] = JSON.parse(fs.readFileSync(tempJsonPath, 'utf-8'));
      expect(parsed[0].name).toBe('Sol');

      const originSectorBinPath = path.join(tempPartitionsDir, 'sector_+000_+000_+000.bin');
      expect(fs.existsSync(originSectorBinPath)).toBe(true);
      const originSectorJsonPath = path.join(tempPartitionsDir, 'sector_+000_+000_+000.json');
      expect(fs.existsSync(originSectorJsonPath)).toBe(false);

      const binBuffer = fs.readFileSync(originSectorBinPath);
      const decoded = decodeBinarySector(
        binBuffer.buffer.slice(binBuffer.byteOffset, binBuffer.byteOffset + binBuffer.byteLength) as ArrayBuffer,
      );
      expect(decoded.header.magic).toBe(BINARY_SECTOR_MAGIC);
      expect(decoded.header.version).toBe(1);
      expect(decoded.header.count).toBeGreaterThan(0);

      // Unreferenced legacy outputs must NOT be emitted
      expect(fs.existsSync(path.join(tempDataDir, 'catalogs'))).toBe(false);
      expect(fs.existsSync(path.join(tempDataDir, 'systems'))).toBe(false);
      expect(fs.existsSync(path.join(tempDataDir, 'sol'))).toBe(false);
      expect(fs.existsSync(path.join(tempSearchDir, 'full.json'))).toBe(false);
      expect(fs.existsSync(path.join(tempOverlaysDir, 'exoplanetary-systems.json'))).toBe(false);
      expect(fs.existsSync(path.join(tempOverlaysDir, 'galactic-structures.json'))).toBe(false);

      // Active outputs are emitted deterministically
      const coreSearchPath = path.join(tempSearchDir, 'core.json');
      const firstRunContent = fs.readFileSync(coreSearchPath, 'utf-8');
      const firstRunData = JSON.parse(firstRunContent) as { t: string; v: number };
      expect(firstRunData.v).toBe(1);
      expect(firstRunData.t).toBe('2026-01-01T00:00:00.000Z');

      await buildStarDataPipeline(tempGcnsGzPath, tempJsonPath, {
        partitionsDir: tempPartitionsDir,
        summariesDir: tempSummariesDir,
        detailsDir: tempDetailsDir,
        searchDir: tempSearchDir,
        overlaysDir: tempOverlaysDir,
        maxPartitionDistancePc: 100,
      });
      const secondRunContent = fs.readFileSync(coreSearchPath, 'utf-8');
      expect(secondRunContent).toBe(firstRunContent);
    } finally {
      warnSpy.mockRestore();
    }
  }, 60000);

  it('rounds [x, y, z] with round3 before formatSectorId so boundary coordinates never drift across a 25 pc sector', async () => {
    const boundaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'starmap-gaia-boundary-'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // Positive boundary: dist = 1000 / 40.0006 = 24.999625... -> round3(rawX) = 25 -> sector_+025_+000_+000
      const posBoundary = makeGcnsLine({
        sourceId: '111111111111111111',
        ra: 0.0,
        dec: 0.0,
        plx: 40.0006,
        ePlx: 0.05,
        gmag: 3.0,
      });
      // Negative boundary: ra=180 deg, dist = 1000 / 39.9994 = 25.000375... -> rawX = -25.000375 -> round3 = -25 -> sector_-025_+000_+000
      const negBoundary = makeGcnsLine({
        sourceId: '222222222222222222',
        ra: 180.0,
        dec: 0.0,
        plx: 39.9994,
        ePlx: 0.05,
        gmag: 3.0,
      });

      const gcnsPath = path.join(boundaryRoot, 'boundary_gcns.dat.gz');
      const jsonPath = path.join(boundaryRoot, 'stars.json');
      const dataDir = path.join(boundaryRoot, 'data');
      const partitionsDir = path.join(dataDir, 'partitions');
      fs.writeFileSync(gcnsPath, zlib.gzipSync(`${posBoundary}\n${negBoundary}\n`));

      await buildStarDataPipeline(gcnsPath, jsonPath, {
        partitionsDir,
        summariesDir: path.join(dataDir, 'summaries'),
        detailsDir: path.join(dataDir, 'details'),
        searchDir: path.join(dataDir, 'search'),
        overlaysDir: path.join(dataDir, 'overlays'),
        maxPartitionDistancePc: 100,
      });

      const posBinPath = path.join(partitionsDir, 'sector_+025_+000_+000.bin');
      expect(fs.existsSync(posBinPath)).toBe(true);
      const posBuf = fs.readFileSync(posBinPath);
      const posDecoded = decodeBinarySector(
        posBuf.buffer.slice(posBuf.byteOffset, posBuf.byteOffset + posBuf.byteLength) as ArrayBuffer,
      );
      expect(posDecoded.header.count).toBeGreaterThan(0);

      const negBinPath = path.join(partitionsDir, 'sector_-025_+000_+000.bin');
      expect(fs.existsSync(negBinPath)).toBe(true);
      const negBuf = fs.readFileSync(negBinPath);
      const negDecoded = decodeBinarySector(
        negBuf.buffer.slice(negBuf.byteOffset, negBuf.byteOffset + negBuf.byteLength) as ArrayBuffer,
      );
      expect(negDecoded.header.count).toBeGreaterThan(0);

      const starsSearch = JSON.parse(
        fs.readFileSync(path.join(dataDir, 'search/stars.json'), 'utf8'),
      ) as { d: Array<{ i: string; p?: [number, number, number] }> };
      expect(starsSearch.d.find((e) => e.i === 'gaia-111111111111111111')?.p).toEqual([25, 0, 0]);
      expect(starsSearch.d.find((e) => e.i === 'gaia-222222222222222222')?.p).toEqual([-25, 0, 0]);
    } finally {
      warnSpy.mockRestore();
      fs.rmSync(boundaryRoot, { recursive: true, force: true });
    }
  }, 60000);

  it('Task 2.1: emits standalone distant confirmed exoplanet hosts (>100 pc) without duplicating matched hosts or unconfirmed candidates', async () => {
    const exoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'starmap-gaia-exo-hosts-'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // GCNS has one star within 100 pc matching HD 154857 via HYG
      const gcnsLine = makeGcnsLine({
        sourceId: '555555555555555555',
        ra: 256.5,
        dec: -56.6,
        plx: 15.57, // ~64.2 pc
        ePlx: 0.05,
        gmag: 7.25,
      });
      const gcnsPath = path.join(exoRoot, 'gcns.dat.gz');
      fs.writeFileSync(gcnsPath, zlib.gzipSync(`${gcnsLine}\n`));

      const hygPath = path.join(exoRoot, 'hyg.csv');
      fs.writeFileSync(
        hygPath,
        [
          'id,hip,hd,hr,gl,bf,proper,ra,dec,dist,pmra,pmdec,rv,mag,absmag,spect,ci,x,y,z,vx,vy,vz,rarad,decrad,pmrarad,pmdecrad,bayer,flam,con,comp,comp_primary,base,lum,var,var_min,var_max',
          '84069,84069,154857,,,,,17.1,-56.6,64.2,0,0,0,7.25,3.2,G5V,0.68,20,40,-30,0,0,0,0,0,0,0,,,Ara,1,84069,,1.5,,,',
        ].join('\n'),
        'utf-8',
      );

      const nasaPath = path.join(exoRoot, 'nasa.csv');
      fs.writeFileSync(
        nasaPath,
        [
          'pl_name,hostname,sy_snum,sy_pnum,discoverymethod,disc_year,pl_orbper,pl_orbsmax,pl_bmasse,pl_rade,pl_eqt,pl_insol,sy_dist,ra,dec,st_spectype,st_teff,st_rad,st_mass,st_lum,sy_vmag',
          'HD 154857 b,HD 154857,1,1,Radial Velocity,2004,408.6,1.291,712,12.0,336,1.0,64.2,256.5,-56.6,G5V,5600,1.5,1.1,0.2,7.25',
          'Kepler-186 f,Kepler-186,1,5,Transit,2014,129.944,0.432,1.4,1.17,250,0.29,178.5,298.6527,43.955,M1V,3755,0.52,0.54,-1.26,14.62',
          'Kepler-62 f,Kepler-62,1,5,Transit,2013,267.291,0.718,2.8,1.41,250,0.41,300.5,283.2127,45.3498,K2V,4925,0.64,0.69,-0.68,13.97',
          'Teff Fallback Host b,Teff Fallback Host,1,1,Transit,2022,12.0,0.08,3.2,1.3,600,20,310.0,120.0,15.0,,5800,1.0,1.0,0.0,',
        ].join('\n'),
        'utf-8',
      );

      const euPath = path.join(exoRoot, 'eu.csv');
      fs.writeFileSync(
        euPath,
        [
          'name,planet_status,mass,radius,orbital_period,semi_major_axis,eccentricity,inclination,discovered,detection_type,ra,dec,star_distance,mag_v,star_sp_type,star_teff,star_name',
          'Unconfirmed Distant b,Candidate,1.0,1.0,10.0,0.1,0.0,89,2024,Primary Transit,110.0,20.0,450.0,13.5,G2V,5800,Unconfirmed Distant',
        ].join('\n'),
        'utf-8',
      );

      const jsonPath = path.join(exoRoot, 'stars.json');
      const dataDir = path.join(exoRoot, 'data');

      await buildStarDataPipeline(gcnsPath, jsonPath, {
        partitionsDir: path.join(dataDir, 'partitions'),
        summariesDir: path.join(dataDir, 'summaries'),
        detailsDir: path.join(dataDir, 'details'),
        searchDir: path.join(dataDir, 'search'),
        overlaysDir: path.join(dataDir, 'overlays'),
        maxPartitionDistancePc: 100,
        hygCsvPath: hygPath,
        oecCsvPath: '',
        nasaCsvPath: nasaPath,
        euCsvPath: euPath,
        iauCsvPath: '',
      });

      const starsSearch = JSON.parse(
        fs.readFileSync(path.join(dataDir, 'search/stars.json'), 'utf8'),
      ) as { d: Array<{ i: string; n: string; p?: [number, number, number] }> };

      // Kepler-62 (absent from GCNS/HYG/RECONS) emitted as deterministic exo-kepler-62
      const kepler62Entry = starsSearch.d.find((e) => e.i === 'exo-kepler-62');
      expect(kepler62Entry).toBeDefined();
      expect(kepler62Entry?.n).toBe('Kepler-62');

      // Teff Fallback Host emitted with mag fallback 14.0 and Teff-derived spectral class
      const teffEntry = starsSearch.d.find((e) => e.i === 'exo-teff-fallback-host');
      expect(teffEntry).toBeDefined();

      // Matched HD 154857 and RECONS Kepler-186 must NOT be duplicated as exo-*
      expect(starsSearch.d.find((e) => e.i === 'exo-hd-154857')).toBeUndefined();
      expect(starsSearch.d.find((e) => e.i === 'exo-kepler-186')).toBeUndefined();

      // Unconfirmed candidate host must NOT be emitted
      expect(starsSearch.d.find((e) => e.i === 'exo-unconfirmed-distant')).toBeUndefined();

      // Verify full SystemManifest written into details routing + sector shard for exo-kepler-62
      const routing = JSON.parse(
        fs.readFileSync(path.join(dataDir, 'details/routing.json'), 'utf8'),
      ) as { k: string[]; d: Record<string, number> };
      const keplerSectorIdx = routing.d['exo-kepler-62'];
      expect(keplerSectorIdx).toBeDefined();
      const keplerSector = keplerSectorIdx !== undefined ? routing.k[keplerSectorIdx] : undefined;
      expect(keplerSector).toBeDefined();

      const sectorDetails = JSON.parse(
        fs.readFileSync(path.join(dataDir, `details/sectors/${keplerSector}.json`), 'utf8'),
      ) as { d: Record<string, { n: string; S: Array<{ s: string; m: number }>; E: unknown[]; h?: number; b?: number[] }> };
      const keplerManifest = sectorDetails.d['exo-kepler-62'];
      expect(keplerManifest).toBeDefined();
      expect(keplerManifest?.S[0]?.s).toBe('K2V');
      expect(keplerManifest?.S[0]?.m).toBeCloseTo(13.97, 2);
      expect(keplerManifest?.E).toHaveLength(1);
      expect(keplerManifest?.h).toBe(1);
      expect(keplerManifest?.b).toEqual([0, 1, 0, 0]);

      // Verify Teff Fallback Host manifest uses mag fallback 14.0 and Teff-derived spectral class 'G'
      const teffSectorIdx = routing.d['exo-teff-fallback-host'];
      const teffSector = teffSectorIdx !== undefined ? routing.k[teffSectorIdx] : undefined;
      expect(teffSector).toBeDefined();
      const teffSectorDetails = JSON.parse(
        fs.readFileSync(path.join(dataDir, `details/sectors/${teffSector}.json`), 'utf8'),
      ) as { d: Record<string, { S: Array<{ s: string; m: number }> }> };
      expect(teffSectorDetails.d['exo-teff-fallback-host']?.S[0]?.s).toBe('G');
      expect(teffSectorDetails.d['exo-teff-fallback-host']?.S[0]?.m).toBeCloseTo(14.0, 2);
    } finally {
      warnSpy.mockRestore();
      fs.rmSync(exoRoot, { recursive: true, force: true });
    }
  }, 60000);

  it('Task 2.2: rejects HYG >= 10000 pc sentinels (even with official IAU match) while ingesting valid distant notable HYG stars and faint HYG exoplanet hosts', async () => {
    const hygRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'starmap-gaia-hyg-distant-'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const gcnsPath = path.join(hygRoot, 'empty_gcns.dat.gz');
      fs.writeFileSync(gcnsPath, zlib.gzipSync(''));

      const hygPath = path.join(hygRoot, 'hyg_distant.csv');
      fs.writeFileSync(
        hygPath,
        [
          'id,hip,hd,hr,gl,bf,proper,ra,dec,dist,pmra,pmdec,rv,mag,absmag,spect,ci,x,y,z,vx,vy,vz,rarad,decrad,pmrarad,pmdecrad,bayer,flam,con,comp,comp_primary,base,lum,var,var_min,var_max',
          // Sentinel 100000 pc row WITH official IAU match (hip-32349 = Sirius) -> MUST be rejected
          '90001,32349,,,,,,6.75,-16.7,100000,0,0,0,1.5,-10.0,A1V,0.0,0,0,0,0,0,0,0,0,0,0,,,CMa,1,90001,,100,,,',
          // Valid distant bright/notable HYG star at 250 pc, mag 3.2 -> MUST be ingested
          '90002,88888,,,,,Distant Beacon,10.0,20.0,250,0,0,0,3.2,-3.8,B8V,-0.1,0,0,0,0,0,0,0,0,0,0,,,Leo,1,90002,,50,,,',
          // Faint distant HYG star at 180 pc, mag 11.2 that IS an exoplanet host (HIP 77777) -> MUST be ingested
          '90003,77777,,,,,,12.0,30.0,180,0,0,0,11.2,4.9,K0V,0.8,0,0,0,0,0,0,0,0,0,0,,,,1,90003,,0.6,,,',
          // Faint distant HYG star at 180 pc, mag 11.2 WITHOUT exoplanets/notable flags -> MUST be skipped
          '90004,66666,,,,,,14.0,-20.0,180,0,0,0,11.2,4.9,G2V,0.65,0,0,0,0,0,0,0,0,0,0,,,,1,90004,,1.0,,,',
        ].join('\n'),
        'utf-8',
      );

      const nasaPath = path.join(hygRoot, 'nasa.csv');
      fs.writeFileSync(
        nasaPath,
        [
          'pl_name,hostname,sy_snum,sy_pnum,discoverymethod,disc_year,pl_orbper,pl_orbsmax,pl_bmasse,pl_rade,pl_eqt,pl_insol,sy_dist,ra,dec,st_spectype,st_teff,st_rad,st_mass,st_lum,sy_vmag',
          'HIP 77777 b,HIP 77777,1,1,Radial Velocity,2021,50.0,0.25,15.0,3.5,450,5.0,180.0,180.0,30.0,K0V,5100,0.85,0.85,-0.22,11.2',
        ].join('\n'),
        'utf-8',
      );

      const jsonPath = path.join(hygRoot, 'stars.json');
      const dataDir = path.join(hygRoot, 'data');

      await buildStarDataPipeline(gcnsPath, jsonPath, {
        partitionsDir: path.join(dataDir, 'partitions'),
        summariesDir: path.join(dataDir, 'summaries'),
        detailsDir: path.join(dataDir, 'details'),
        searchDir: path.join(dataDir, 'search'),
        overlaysDir: path.join(dataDir, 'overlays'),
        maxPartitionDistancePc: 100,
        hygCsvPath: hygPath,
        oecCsvPath: '',
        nasaCsvPath: nasaPath,
        euCsvPath: '',
        iauCsvPath: '',
      });

      const starsJson = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as StarmapNode[];
      expect(starsJson.some((s) => s.dist >= 10000)).toBe(false);
      expect(starsJson.some((s) => s.name === 'Distant Beacon')).toBe(true);
      expect(starsJson.some((s) => s.hip === 77777)).toBe(true);
      expect(starsJson.some((s) => s.hip === 66666)).toBe(false);

      const starsSearch = JSON.parse(
        fs.readFileSync(path.join(dataDir, 'search/stars.json'), 'utf8'),
      ) as { d: Array<{ i: string; n: string }> };
      expect(starsSearch.d.some((e) => e.i === 'hip-32349')).toBe(false);
      expect(starsSearch.d.some((e) => e.i === 'hip-88888')).toBe(true);
      expect(starsSearch.d.some((e) => e.i === 'hip-77777')).toBe(true);
      // Faint HYG exoplanet host must NOT be duplicated as exo-hip-77777
      expect(starsSearch.d.some((e) => e.i === 'exo-hip-77777')).toBe(false);
    } finally {
      warnSpy.mockRestore();
      fs.rmSync(hygRoot, { recursive: true, force: true });
    }
  }, 60000);
});
