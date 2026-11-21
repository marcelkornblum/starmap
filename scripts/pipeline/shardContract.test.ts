import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertSchemaVersion,
  decodeDetailBucket,
  decodeSummaryBucket,
} from '../../src/utils/compactDataCodec';
import { COMPACT_SCHEMA_VERSION, ALL_36_BUCKETS } from '../../src/utils/compactDataConstants';
import type {
  CompactDetailRecord,
  CompactSummaryNode,
  ShardedBucketEnvelope,
} from '../../src/utils/compactDataTypes';
import type {
  GuideExamplesDataset,
  ReferenceBaselinesDataset,
} from '../../src/types/guideData';
import { computeContentHash8, type DataManifestFile } from './dataManifestWriter';

const DATA_DIR = path.resolve(process.cwd(), 'public/data');
const MANIFEST_PATH = path.join(DATA_DIR, 'manifest.json');

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

describe('Precalculated Shard Contract (H2 / M10 / M16)', () => {
  it('validates manifest.json and verifies every shard exists on disk with matching SHA-256 filename hash', () => {
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
  });

  it('decodes every summary shard strictly with valid precalculated fields', () => {
    const manifest = loadDataManifest();
    let summaryCount = 0;

    for (const bucket of ALL_36_BUCKETS) {
      const filePath = resolveManifestDiskPath(manifest, `summaries/${bucket}.json`);
      expect(fs.existsSync(filePath)).toBe(true);
      const raw = JSON.parse(
        fs.readFileSync(filePath, 'utf8'),
      ) as ShardedBucketEnvelope<CompactSummaryNode>;

      const decoded = decodeSummaryBucket(raw);
      for (const node of Object.values(decoded)) {
        summaryCount++;
        expect(node.reticleType).toBeDefined();
        if (node.planetCount > 0) {
          expect(node.planetCompositionCounts).toBeDefined();
          expect(node.planetCompositionCounts).toHaveLength(4);
        }
      }
    }

    expect(summaryCount).toBeGreaterThan(0);
  });

  it('decodes every detail shard strictly with required composition, reticleType, and counts', () => {
    const manifest = loadDataManifest();
    let systemCount = 0;
    let exoplanetCount = 0;
    let solarPlanetCount = 0;

    for (const bucket of ALL_36_BUCKETS) {
      const filePath = resolveManifestDiskPath(manifest, `details/${bucket}.json`);
      expect(fs.existsSync(filePath)).toBe(true);
      const raw = JSON.parse(
        fs.readFileSync(filePath, 'utf8'),
      ) as ShardedBucketEnvelope<CompactDetailRecord>;

      // Verify raw wire invariants on system manifests and solar bodies before decoding
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
        } else if ('meanRadiusKm' in record && record.classification === 'Planet') {
          solarPlanetCount++;
          expect(record.composition).toBeDefined();
          expect(record.composition).not.toBe('sub-neptune');
          expect(record.reticleType).toBeDefined();
        }
      }
    }

    expect(systemCount).toBeGreaterThan(0);
    expect(exoplanetCount).toBeGreaterThan(0);
    expect(solarPlanetCount).toBe(8);
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
