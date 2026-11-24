import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { executeCatalogSearch } from '../src/services/search/searchExecution';
import type { GuideExamplesDataset, ReferenceBaselinesDataset } from '../src/types/guideData';
import {
  assertSchemaVersion,
  decodeDetailBucket,
  decodeSummaryBucket,
  getShardKey,
} from '../src/utils/compactDataCodec';
import { COMPACT_SCHEMA_VERSION } from '../src/utils/compactDataConstants';
import type {
  CompactDetailRecord,
  CompactSearchEntry,
  CompactSummaryNode,
  DetailsRoutingIndex,
  ShardedBucketEnvelope,
} from '../src/utils/compactDataTypes';
import { formatSectorId } from '../src/utils/sectorMath';
import { auditDataManifestAndBudgets, loadBudgetsConfig } from './audit-budgets';
import { buildFixtureData, parseBuildFixtureArgs } from './build-fixture-data';
import { computeContentHash8, type DataManifestFile } from './pipeline/dataManifestWriter';

const SEARCH_TRIGGERS = [
  // Category 1: Hard Sci-Fi Novels, Films, TV & Games
  'Project Hail Mary', 'Tau Ceti', 'Adrian', '40 Eridani', 'Erid', 'Keid', 'Star Trek',
  'Vulcan', 'NiVar', 'Axanar', 'Wolf 359', 'Andoria', 'Tellar', '61 Cygni', 'Risa',
  'Three-Body Problem', 'Trisolaris', 'Alpha Centauri', 'Avatar', 'Pandora', 'Polyphemus',
  'Halo', 'Reach', 'Harvest', 'Dune', 'Arrakis', 'Caladan', 'Giedi Prime', 'The Expanse',
  'Bobiverse', 'Rana', 'Revelation Space', 'Resurgam', 'Yellowstone', "Sky's Edge",
  'Alien', 'LV-426', 'Zeta Reticuli', 'Contact', 'Vega',
  // Category 2: Breaking Exoplanet News, JWST Targets & IAU NameExoWorlds
  'Proxima Centauri', 'Proxima Centauri b', "Barnard's Star", "Barnard's Star b",
  'Lalande 21185', 'Gl 411', 'Epsilon Eridani', 'Epsilon Eridani b', 'Ran', 'AEgir',
  'Lacaille 9352', 'GJ 887 b', 'Ross 128', 'Ross 128 b', 'Epsilon Indi', 'Eps Ind Ab',
  'GJ 1061', "Luyten's Star", 'GJ 273', "Teegarden's Star", "Teegarden's Star b",
  'HD 20794', 'HD 20794 d', '82 G. Eridani', 'TRAPPIST-1', 'TRAPPIST-1 e',
  'LHS 475', 'LHS 475 b', '55 Cancri', '55 Cancri e', 'Copernicus', 'Janssen',
  'GJ 1214', 'GJ 1214 b', 'LHS 1140', 'LHS 1140 b', '51 Pegasi', '51 Pegasi b',
  'Helvetios', 'Dimidium', 'Beta Pictoris', 'Beta Pictoris b', 'HD 189733 b',
  'TOI-700', 'TOI-700 d', 'K2-18', 'K2-18 b', 'HR 8799', 'HD 209458 b', 'Osiris',
  'Kepler-186 f', 'Kepler-452 b', 'WASP-39 b', 'WASP-96 b', 'PSR B1257+12',
  // Category 3: Interstellar Missions, Spacecraft & SETI Benchmarks
  'Voyager', 'Voyager 1', 'Gliese 445', 'Gl 445', 'Voyager 2', 'Ross 248', 'GJ 905',
  'Pioneer 10', 'Pioneer 11', 'New Horizons', 'JWST', 'Breakthrough Starshot',
  'Project Daedalus', 'Project Longshot', 'Project Ozma', 'Arecibo', 'M13',
  'Hercules Cluster', 'Wow! Signal', "Tabby's Star", 'Epsilon Indi Ab',
  // Category 3: Benchmark Exoplanet Systems
  'Proxima Centauri c', 'Proxima Centauri d', 'Lalande 21185 b', 'Gliese 667 C c',
  'Gliese 581 c', 'Gliese 12 b', 'Wolf 1061 c', 'Luyten b',
  // Category 4: Benchmark Bright Stars, Local Neighborhood & Structures
  'Sirius', 'Luyten 726-8', 'Ross 154', 'EZ Aquarii', 'Procyon', 'Struve 2398',
  'Groombridge 34', 'DX Cancri', 'YZ Ceti', "Kapteyn's Star", 'Lacaille 8760',
  "Van Maanen's Star", 'Canopus', 'Arcturus', 'Capella', 'Aldebaran', 'Spica',
  'Fomalhaut', 'Regulus', 'Achernar', 'Betelgeuse', 'Rigel', 'Antares', 'Deneb',
  'Polaris', 'Pleiades', 'M45', 'Seven Sisters', 'Hyades', 'Praesepe',
  'Beehive Cluster', 'M44', 'Orion Nebula', 'M42', 'Crab Nebula', 'M1',
  'Ring Nebula', 'M57', 'Dumbbell Nebula', 'M27', 'Eagle Nebula', 'M16',
  'Lagoon Nebula', 'M8', 'Carina Nebula', 'NGC 3372', 'Veil Nebula', 'Helix Nebula',
  'Omega Centauri', 'Vela Supernova Remnant', 'Vela Pulsar', 'Geminga',
  'Local Interstellar Cloud',
  // Category 5: Local Solar System Benchmarks
  'Sol', 'Sun', 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus',
  'Neptune', 'Moon', 'Luna', 'Pluto', 'Ceres', 'Haumea', 'Makemake', 'Eris', 'Sedna',
  'Quaoar', 'Orcus', 'Gonggong', 'Io', 'Europa', 'Ganymede', 'Callisto', 'Phobos',
  'Deimos', 'Titan', 'Enceladus', 'Triton', 'Charon', 'Mimas', 'Tethys', 'Dione',
  'Rhea', 'Iapetus', 'Phoebe', 'Miranda', 'Ariel', 'Umbriel', 'Titania', 'Oberon',
  '4 Vesta', '2 Pallas', '10 Hygiea', '16 Psyche', '624 Hektor', '433 Eros',
  '99942 Apophis', '101955 Bennu', '162173 Ryugu', '25143 Itokawa', '65803 Didymos',
  '2060 Chiron', '486958 Arrokoth', '1P/Halley', '2P/Encke',
  '67P/Churyumov-Gerasimenko', 'Oumuamua', '2I/Borisov', '3I/ATLAS',
] as const;

describe('buildFixtureData - Compact Deterministic Pipeline Fixture', () => {
  let tempProjectRoot: string;
  let dataDir: string;
  let manifest: DataManifestFile;

  beforeAll(async () => {
    tempProjectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'starmap-fixture-test-'));
    dataDir = path.join(tempProjectRoot, 'public/data');
    const summary = await buildFixtureData({ dataDir });
    expect(summary).not.toBeNull();
    manifest = JSON.parse(fs.readFileSync(path.join(dataDir, 'manifest.json'), 'utf8')) as DataManifestFile;
  }, 30000);

  afterAll(() => {
    if (tempProjectRoot && fs.existsSync(tempProjectRoot)) {
      fs.rmSync(tempProjectRoot, { recursive: true, force: true });
    }
  });

  it('passes auditDataManifestAndBudgets without writing stars.json or touching data/raw/', () => {
    const budgets = loadBudgetsConfig().data;
    const audit = auditDataManifestAndBudgets(tempProjectRoot, budgets);
    expect(audit.violations).toEqual([]);
    expect(audit.ok).toBe(true);
    expect(fs.existsSync(path.join(tempProjectRoot, 'data/stars.json'))).toBe(false);
  });

  it('skips rebuild when ifMissing is true and manifest.json already exists', async () => {
    const skipped = await buildFixtureData({ dataDir, ifMissing: true });
    expect(skipped).toBeNull();
  });

  it('resolves every Archetype 1 search trigger in core.json', () => {
    const coreRel = manifest.files['search/core.json'];
    expect(coreRel).toBeDefined();
    const coreEnvelope = JSON.parse(
      fs.readFileSync(path.join(dataDir, coreRel!), 'utf8'),
    ) as { d: CompactSearchEntry[] };
    const missing: string[] = [];
    for (const term of SEARCH_TRIGGERS) {
      const res = executeCatalogSearch(coreEnvelope.d, { query: term, filter: 'all' });
      if (res.totalMatches === 0) missing.push(term);
    }
    expect(missing).toEqual([]);
  });

  it('satisfies all shardContract invariants (9 star types, 4 planet types, 13 metrics, 8 hazards, minor bodies, sentinel filtering)', () => {
    assertSchemaVersion(manifest, COMPACT_SCHEMA_VERSION, 'fixture data manifest');
    for (const [logical, hashed] of Object.entries(manifest.files)) {
      const fullPath = path.join(dataDir, hashed);
      expect(fs.existsSync(fullPath), `Missing ${logical} -> ${hashed}`).toBe(true);
      const hashMatch = /\.([0-9a-f]{8})\.(bin|json)$/.exec(hashed);
      expect(hashMatch).not.toBeNull();
      expect(hashMatch![1]).toBe(computeContentHash8(fs.readFileSync(fullPath)));
    }

    const summaryKeys = Object.keys(manifest.files).filter(
      (k) => k.startsWith('summaries/') && k.endsWith('.json'),
    );
    expect(summaryKeys.length).toBeGreaterThan(0);
    for (const logicalKey of summaryKeys) {
      const sectorId = logicalKey.slice('summaries/'.length, -'.json'.length);
      const raw = JSON.parse(
        fs.readFileSync(path.join(dataDir, manifest.files[logicalKey]!), 'utf8'),
      ) as ShardedBucketEnvelope<CompactSummaryNode>;
      const decoded = decodeSummaryBucket(raw);
      for (const node of Object.values(decoded)) {
        expect(node.dist).toBeLessThan(10000);
        expect(node.sectorId).toBe(sectorId);
        expect(formatSectorId(node.x, node.y, node.z)).toBe(sectorId);
      }
    }

    const detailKeys = Object.keys(manifest.files).filter(
      (k) =>
        k === 'details/sol-primary.json' ||
        k === 'details/structures.json' ||
        (k.startsWith('details/sectors/') && k.endsWith('.json')) ||
        (k.startsWith('details/sol-minor/') && k.endsWith('.json')),
    );
    let systemCount = 0;
    let exoplanetCount = 0;
    let solarPlanetCount = 0;
    let structureCount = 0;
    let minorBodyCount = 0;

    for (const logicalKey of detailKeys) {
      const raw = JSON.parse(
        fs.readFileSync(path.join(dataDir, manifest.files[logicalKey]!), 'utf8'),
      ) as ShardedBucketEnvelope<CompactDetailRecord>;
      const decoded = decodeDetailBucket(raw);
      for (const record of Object.values(decoded)) {
        if ('stars' in record) {
          systemCount++;
          exoplanetCount += record.planets.length;
        } else if ('meanRadiusKm' in record) {
          if (logicalKey.startsWith('details/sol-minor/')) minorBodyCount++;
          if (record.classification === 'Planet') solarPlanetCount++;
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

    const routing = JSON.parse(
      fs.readFileSync(path.join(dataDir, manifest.files['details/routing.json']!), 'utf8'),
    ) as DetailsRoutingIndex;
    expect(routing.k[routing.d['sol']!]).toBe('sector_+000_+000_+000');
    expect(routing.d['sol-A']).toBe(-1);
    for (const [id, code] of Object.entries(routing.d)) {
      if (code === -3) {
        expect(manifest.files[`details/sol-minor/${getShardKey(id)}.json`]).toBeDefined();
      }
    }

    const baselines = JSON.parse(
      fs.readFileSync(path.join(dataDir, manifest.files['reference-baselines.json']!), 'utf8'),
    ) as ReferenceBaselinesDataset;
    expect(Object.keys(baselines.metrics)).toHaveLength(13);

    const examples = JSON.parse(
      fs.readFileSync(path.join(dataDir, manifest.files['guide-examples.json']!), 'utf8'),
    ) as GuideExamplesDataset;
    expect(Object.keys(examples.sections.starTypes)).toHaveLength(9);
    expect(Object.keys(examples.sections.planetTypes)).toHaveLength(4);
    expect(Object.keys(examples.sections.metricTypes)).toHaveLength(13);
    expect(Object.keys(examples.sections.hazardTypes)).toHaveLength(8);
  });

  it('guards --data-dir CLI parsing against missing or flag-like values', () => {
    expect(parseBuildFixtureArgs([])).toEqual({ dataDir: undefined, ifMissing: false });
    expect(parseBuildFixtureArgs(['--if-missing', '--data-dir', '/tmp/custom-data'])).toEqual({
      dataDir: '/tmp/custom-data',
      ifMissing: true,
    });
    expect(() => parseBuildFixtureArgs(['--data-dir'])).toThrow(/--data-dir/);
    expect(() => parseBuildFixtureArgs(['--data-dir', '--if-missing'])).toThrow(/--data-dir/);
  });
});
