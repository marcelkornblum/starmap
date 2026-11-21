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
});
