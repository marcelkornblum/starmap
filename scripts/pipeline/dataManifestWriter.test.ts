import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  cleanStaleDataArtifacts,
  computeContentHash8,
  writeHashedDataManifest,
} from './dataManifestWriter';
import { COMPACT_SCHEMA_VERSION } from '../../src/utils/compactDataConstants';

describe('dataManifestWriter', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'starmap-manifest-writer-'));
  });

  afterEach(() => {
    if (tempRoot && fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('computes 8-char lowercase hex SHA-256 of exact file bytes', () => {
    const bytes = Buffer.from('{"v":1,"d":[]}');
    const expected = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 8);
    expect(computeContentHash8(bytes)).toBe(expected);
    expect(computeContentHash8(bytes)).toMatch(/^[0-9a-f]{8}$/);
  });

  it('content-hashes all active shards, renames them on disk, and emits deterministic manifest.json', () => {
    const writeFile = (rel: string, content: string) => {
      const full = path.join(tempRoot, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content, 'utf8');
      return Buffer.from(content, 'utf8');
    };

    const partBytes = writeFile('partitions/sector_+000_+000_+000.bin', 'binary-sector');
    const sumBytes = writeFile('summaries/0.json', '{"v":1,"i":"0","c":0,"d":{}}');
    const detBytes = writeFile('details/0.json', '{"v":1,"i":"0","c":0,"d":{}}');
    const searchBytes = writeFile('search/startup.json', '{"v":1,"i":"startup","n":"Startup","c":0,"t":"2026","d":[]}');
    const layerIdxBytes = writeFile('overlays/layers/index.json', '{"v":1,"i":"idx","n":"Idx","c":0,"d":[]}');
    const layerManBytes = writeFile('overlays/layers/canon-halo.json', '{"v":1,"i":"canon-halo"}');
    const layerByEntBytes = writeFile('overlays/layers/by-entity/0.json', '{"v":1,"i":"0","c":0,"d":{}}');
    const baseBytes = writeFile('reference-baselines.json', '{"version":1}');
    const guideBytes = writeFile('guide-examples.json', '{"version":1}');

    const manifest = writeHashedDataManifest(tempRoot, '2026-01-01T00:00:00.000Z');

    expect(manifest.v).toBe(COMPACT_SCHEMA_VERSION);
    expect(manifest.generatedAt).toBe('2026-01-01T00:00:00.000Z');

    const expectedMapping: Array<[string, string, Buffer]> = [
      ['partitions/sector_+000_+000_+000.bin', `partitions/sector_+000_+000_+000.${computeContentHash8(partBytes)}.bin`, partBytes],
      ['summaries/0.json', `summaries/0.${computeContentHash8(sumBytes)}.json`, sumBytes],
      ['details/0.json', `details/0.${computeContentHash8(detBytes)}.json`, detBytes],
      ['search/startup.json', `search/startup.${computeContentHash8(searchBytes)}.json`, searchBytes],
      ['overlays/layers/index.json', `overlays/layers/index.${computeContentHash8(layerIdxBytes)}.json`, layerIdxBytes],
      ['overlays/layers/canon-halo.json', `overlays/layers/canon-halo.${computeContentHash8(layerManBytes)}.json`, layerManBytes],
      ['overlays/layers/by-entity/0.json', `overlays/layers/by-entity/0.${computeContentHash8(layerByEntBytes)}.json`, layerByEntBytes],
      ['reference-baselines.json', `reference-baselines.${computeContentHash8(baseBytes)}.json`, baseBytes],
      ['guide-examples.json', `guide-examples.${computeContentHash8(guideBytes)}.json`, guideBytes],
    ];

    for (const [logical, hashed] of expectedMapping) {
      expect(manifest.files[logical]).toBe(hashed);
      expect(fs.existsSync(path.join(tempRoot, logical))).toBe(false);
      expect(fs.existsSync(path.join(tempRoot, hashed))).toBe(true);
    }

    const diskManifest = JSON.parse(
      fs.readFileSync(path.join(tempRoot, 'manifest.json'), 'utf8'),
    ) as typeof manifest;
    expect(diskManifest).toEqual(manifest);
  });

  it('cleanStaleDataArtifacts removes previous hashed files and legacy unreferenced paths before rebuild', () => {
    const mk = (rel: string) => {
      const full = path.join(tempRoot, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, 'stale', 'utf8');
    };

    mk('partitions/sector_+000_+000_+000.deadbeef.bin');
    mk('summaries/0.deadbeef.json');
    mk('details/0.deadbeef.json');
    mk('search/startup.deadbeef.json');
    mk('overlays/layers/index.deadbeef.json');
    mk('overlays/layers/by-entity/0.deadbeef.json');
    mk('reference-baselines.deadbeef.json');
    mk('guide-examples.deadbeef.json');
    mk('systems/sector_0.json');
    mk('sol/ephemeris.json');
    mk('catalogs/10pc.json');
    mk('search/full.json');
    mk('overlays/exoplanetary-systems.json');
    mk('overlays/galactic-structures.json');
    mk('README.md');

    cleanStaleDataArtifacts(tempRoot);

    expect(fs.existsSync(path.join(tempRoot, 'partitions/sector_+000_+000_+000.deadbeef.bin'))).toBe(false);
    expect(fs.existsSync(path.join(tempRoot, 'summaries/0.deadbeef.json'))).toBe(false);
    expect(fs.existsSync(path.join(tempRoot, 'details/0.deadbeef.json'))).toBe(false);
    expect(fs.existsSync(path.join(tempRoot, 'search/startup.deadbeef.json'))).toBe(false);
    expect(fs.existsSync(path.join(tempRoot, 'overlays/layers/index.deadbeef.json'))).toBe(false);
    expect(fs.existsSync(path.join(tempRoot, 'overlays/layers/by-entity/0.deadbeef.json'))).toBe(false);
    expect(fs.existsSync(path.join(tempRoot, 'reference-baselines.deadbeef.json'))).toBe(false);
    expect(fs.existsSync(path.join(tempRoot, 'guide-examples.deadbeef.json'))).toBe(false);
    expect(fs.existsSync(path.join(tempRoot, 'systems'))).toBe(false);
    expect(fs.existsSync(path.join(tempRoot, 'sol'))).toBe(false);
    expect(fs.existsSync(path.join(tempRoot, 'catalogs'))).toBe(false);
    expect(fs.existsSync(path.join(tempRoot, 'search/full.json'))).toBe(false);
    expect(fs.existsSync(path.join(tempRoot, 'overlays/exoplanetary-systems.json'))).toBe(false);
    expect(fs.existsSync(path.join(tempRoot, 'overlays/galactic-structures.json'))).toBe(false);
    expect(fs.existsSync(path.join(tempRoot, 'README.md'))).toBe(true);
  });
});
