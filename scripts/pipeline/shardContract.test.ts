import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertSchemaVersion,
  decodeDetailBucket,
  decodeSummaryBucket,
  getShardKey,
} from '../../src/utils/compactDataCodec';
import { COMPACT_SCHEMA_VERSION } from '../../src/utils/compactDataConstants';
import type {
  CompactDetailRecord,
  CompactSummaryNode,
  DetailsRoutingIndex,
  ShardedBucketEnvelope,
} from '../../src/utils/compactDataTypes';
import { formatSectorId } from '../../src/utils/sectorMath';
import type {
  GuideExamplesDataset,
  ReferenceBaselinesDataset,
} from '../../src/types/guideData';
import { computeContentHash8, type DataManifestFile } from './dataManifestWriter';

const DATA_DIR = path.resolve(process.cwd(), 'public/data');
const MANIFEST_PATH = path.join(DATA_DIR, 'manifest.json');
const LEGACY_36_BUCKET_REGEX = /^[0-9a-z](?:\.[0-9a-f]{8})?\.json$/;

function loadDataManifest(): DataManifestFile {
  expect(fs.existsSync(MANIFEST_PATH)).toBe(true);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as DataManifestFile;
  assertSchemaVersion(manifest, COMPACT_SCHEMA_VERSION, 'data manifest');
  return manifest;
}

function resolveManifestDiskPath(manifest: DataManifestFile, logicalRel: string): string {
  const mapped = manifest.files[logicalRel];
  expect(mapped, `Missing manifest entry for "${logicalRel}"`).toBeDefined();
  return path.join(DATA_DIR, mapped!);
}

describe('Precalculated Hybrid Shard Contract (H2 / M10 / M16 / P-03)', () => {
  it('validates manifest.json, verifies every shard SHA-256 hash, and asserts zero legacy 36-bucket files', () => {
    const manifest = loadDataManifest();
    const entries = Object.entries(manifest.files);
    expect(entries.length).toBeGreaterThan(0);

    for (const [logical, hashed] of entries) {
      const fullPath = path.join(DATA_DIR, hashed);
      expect(fs.existsSync(fullPath), `Manifest file missing on disk: ${hashed} (for ${logical})`).toBe(true);
      const hashMatch = /\.([0-9a-f]{8})\.(bin|json)$/.exec(hashed);
      expect(hashMatch, `Manifest target "${hashed}" must contain 8-char hex content hash`).not.toBeNull();
      const actualHash = computeContentHash8(fs.readFileSync(fullPath));
      expect(hashMatch![1]).toBe(actualHash);
    }

    for (const subDir of ['summaries', 'details']) {
      const files = fs.readdirSync(path.join(DATA_DIR, subDir));
      const legacyFiles = files.filter((f) => LEGACY_36_BUCKET_REGEX.test(f));
      expect(legacyFiles, `Legacy 36-bucket files found in ${subDir}/`).toEqual([]);
    }
  });

  it('decodes every spatial summary shard strictly with valid precalculated fields and zero sector boundary drift', () => {
    const manifest = loadDataManifest();
    const summaryKeys = Object.keys(manifest.files).filter(
      (k) => k.startsWith('summaries/') && k.endsWith('.json'),
    );
    expect(summaryKeys.length).toBeGreaterThan(0);
    let summaryCount = 0;

    for (const logicalKey of summaryKeys) {
      const sectorId = logicalKey.slice('summaries/'.length, -'.json'.length);
      expect(sectorId.startsWith('sector_')).toBe(true);

      const filePath = resolveManifestDiskPath(manifest, logicalKey);
      const raw = JSON.parse(
        fs.readFileSync(filePath, 'utf8'),
      ) as ShardedBucketEnvelope<CompactSummaryNode>;

      const decoded = decodeSummaryBucket(raw);
      for (const node of Object.values(decoded)) {
        summaryCount++;
        expect(node.sectorId).toBe(sectorId);
        expect(formatSectorId(node.x, node.y, node.z)).toBe(sectorId);
        expect(node.reticleType).toBeDefined();
        if (node.planetCount > 0) {
          expect(node.planetCompositionCounts).toBeDefined();
          expect(node.planetCompositionCounts).toHaveLength(4);
        }
      }
    }

    expect(summaryCount).toBeGreaterThan(0);
  });

  it('decodes every hybrid detail shard strictly with required composition, reticleType, counts, and routing.json', () => {
    const manifest = loadDataManifest();
    const detailKeys = Object.keys(manifest.files).filter(
      (k) =>
        k === 'details/sol-primary.json' ||
        k === 'details/structures.json' ||
        (k.startsWith('details/sectors/') && k.endsWith('.json')) ||
        (k.startsWith('details/sol-minor/') && k.endsWith('.json')),
    );
    expect(detailKeys.length).toBeGreaterThan(0);

    let systemCount = 0;
    let exoplanetCount = 0;
    let solarPlanetCount = 0;
    let structureCount = 0;
    let minorBodyCount = 0;

    for (const logicalKey of detailKeys) {
      const filePath = resolveManifestDiskPath(manifest, logicalKey);
      const raw = JSON.parse(
        fs.readFileSync(filePath, 'utf8'),
      ) as ShardedBucketEnvelope<CompactDetailRecord>;

      for (const [id, rec] of Object.entries(raw.d)) {
        if (rec.t === 'sys') {
          for (const star of rec.S) {
            expect(star.rt, `System ${id} star ${star.i} missing rt`).toBeDefined();
          }
          if (rec.E.length > 0) {
            expect(rec.b, `Planet-hosting system ${id} missing b`).toHaveLength(4);
          }
          for (const planet of rec.E) {
            expect(planet.c, `Exoplanet ${planet.i} missing c`).toBeDefined();
            expect(planet.rt, `Exoplanet ${planet.i} missing rt`).toBeDefined();
          }
        } else if (rec.t === 'sol') {
          expect(rec.rt, `Solar body ${id} missing rt`).toBeDefined();
          if (rec.k === 2) {
            expect(rec.u, `Solar planet ${id} missing u`).toBeDefined();
            expect(rec.u).not.toBe('sub-neptune');
          }
        }
      }

      const decoded = decodeDetailBucket(raw);
      for (const record of Object.values(decoded)) {
        if ('stars' in record) {
          systemCount++;
          expect(formatSectorId(record.x, record.y, record.z)).toBe(record.sectorId);
          for (const star of record.stars) {
            expect(star.reticleType).toBeDefined();
          }
          if (record.planets.length > 0) {
            expect(record.planetCompositionCounts).toBeDefined();
          }
          for (const planet of record.planets) {
            exoplanetCount++;
            expect(planet.composition).toBeDefined();
            expect(planet.reticleType).toBeDefined();
          }
        } else if ('meanRadiusKm' in record) {
          if (logicalKey.startsWith('details/sol-minor/')) minorBodyCount++;
          if (record.classification === 'Planet') {
            solarPlanetCount++;
            expect(record.composition).toBeDefined();
            expect(record.composition).not.toBe('sub-neptune');
            expect(record.reticleType).toBeDefined();
          }
        } else if ('type' in record) {
          structureCount++;
        }
      }
    }

    expect(systemCount).toBeGreaterThan(0);
    expect(exoplanetCount).toBeGreaterThan(0);
    expect(solarPlanetCount).toBe(8);
    expect(structureCount).toBeGreaterThan(0);
    expect(minorBodyCount).toBeGreaterThan(0);

    // Verify details/routing.json contract and Sol / sol-A separation
    const routingPath = resolveManifestDiskPath(manifest, 'details/routing.json');
    const routing = JSON.parse(fs.readFileSync(routingPath, 'utf8')) as DetailsRoutingIndex;
    assertSchemaVersion(routing, COMPACT_SCHEMA_VERSION, 'details routing index');

    expect(routing.k).toEqual([...routing.k].sort());
    expect(new Set(routing.k).size).toBe(routing.k.length);

    for (const [id, sectorIdx] of Object.entries(routing.s)) {
      const sectorId = routing.k[sectorIdx];
      expect(sectorId, `Invalid summary routing index for "${id}"`).toBeDefined();
      expect(manifest.files[`summaries/${sectorId}.json`]).toBeDefined();
    }

    for (const [id, code] of Object.entries(routing.d)) {
      if (code === -1) {
        expect(manifest.files['details/sol-primary.json']).toBeDefined();
      } else if (code === -2) {
        expect(manifest.files['details/structures.json']).toBeDefined();
      } else if (code === -3) {
        expect(manifest.files[`details/sol-minor/${getShardKey(id)}.json`]).toBeDefined();
      } else {
        const sectorId = routing.k[code];
        expect(sectorId, `Invalid detail routing code ${code} for "${id}"`).toBeDefined();
        expect(manifest.files[`details/sectors/${sectorId}.json`]).toBeDefined();
      }
    }

    expect(routing.k[routing.d['sol']!]).toBe('sector_+000_+000_+000');
    expect(routing.d['sol-A']).toBe(-1);
  });

  it('emits valid reference-baselines.json and guide-examples.json datasets', () => {
    const manifest = loadDataManifest();
    const baselinesPath = resolveManifestDiskPath(manifest, 'reference-baselines.json');
    const examplesPath = resolveManifestDiskPath(manifest, 'guide-examples.json');
    expect(fs.existsSync(baselinesPath)).toBe(true);
    expect(fs.existsSync(examplesPath)).toBe(true);

    const baselines = JSON.parse(
      fs.readFileSync(baselinesPath, 'utf8'),
    ) as ReferenceBaselinesDataset;
    expect(baselines.targets.sol.id).toBe('sol');
    expect(baselines.targets.sol.effectiveTempK.unit).toBe('K');
    expect(baselines.targets.earth.id).toBe('earth');
    expect(baselines.targets.earth.periodDays.unit).toBe('d');
    expect(Object.keys(baselines.metrics)).toHaveLength(13);

    const examples = JSON.parse(
      fs.readFileSync(examplesPath, 'utf8'),
    ) as GuideExamplesDataset;
    expect(Object.keys(examples.sections.starTypes)).toHaveLength(9);
    expect(Object.keys(examples.sections.planetTypes)).toHaveLength(4);
    expect(Object.keys(examples.sections.metricTypes)).toHaveLength(13);
    expect(Object.keys(examples.sections.hazardTypes)).toHaveLength(8);

    for (const [section, entries] of Object.entries(examples.sections)) {
      for (const [entryId, items] of Object.entries(entries)) {
        expect(items.length, `${section}.${entryId} should have examples`).toBeGreaterThan(0);
        for (const item of items) {
          expect(item.id.length).toBeGreaterThan(0);
          expect(item.name.length).toBeGreaterThan(0);
          expect(item.href.startsWith('/')).toBe(true);
          expect(item.note.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
