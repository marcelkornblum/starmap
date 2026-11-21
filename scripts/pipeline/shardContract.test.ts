import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  decodeDetailBucket,
  decodeSummaryBucket,
} from '../../src/utils/compactDataCodec';
import type {
  CompactDetailRecord,
  CompactSummaryNode,
  ShardedBucketEnvelope,
} from '../../src/utils/compactDataTypes';
import { ALL_36_BUCKETS } from '../../src/utils/compactDataConstants';
import type {
  GuideExamplesDataset,
  ReferenceBaselinesDataset,
} from '../../src/types/guideData';

const SUMMARIES_DIR = path.resolve(process.cwd(), 'public/data/summaries');
const DETAILS_DIR = path.resolve(process.cwd(), 'public/data/details');
const DATA_DIR = path.resolve(process.cwd(), 'public/data');

describe('Precalculated Shard Contract (H2 / M10)', () => {
  it('decodes every summary shard strictly with valid precalculated fields', () => {
    expect(fs.existsSync(SUMMARIES_DIR)).toBe(true);
    let summaryCount = 0;

    for (const bucket of ALL_36_BUCKETS) {
      const filePath = path.join(SUMMARIES_DIR, `${bucket}.json`);
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
    expect(fs.existsSync(DETAILS_DIR)).toBe(true);
    let systemCount = 0;
    let exoplanetCount = 0;
    let solarPlanetCount = 0;

    for (const bucket of ALL_36_BUCKETS) {
      const filePath = path.join(DETAILS_DIR, `${bucket}.json`);
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
    const baselinesPath = path.join(DATA_DIR, 'reference-baselines.json');
    const examplesPath = path.join(DATA_DIR, 'guide-examples.json');
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
