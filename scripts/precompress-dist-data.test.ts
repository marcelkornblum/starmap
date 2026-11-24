import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import { precompressDistData } from './precompress-dist-data';

const TEST_ROOT = '/tmp/starmap-precompress-test';
const tempDirs: string[] = [];

function createTempDir(): string {
  fs.mkdirSync(TEST_ROOT, { recursive: true });
  const dir = fs.mkdtempSync(path.join(TEST_ROOT, 'case-'));
  tempDirs.push(dir);
  return dir;
}

function writeFileRelative(root: string, relPath: string, content: string | Buffer): string {
  const absPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content);
  return absPath;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('scripts/precompress-dist-data', () => {
  it('compresses .json and .bin files recursively, writes valid .br sidecars, and preserves originals', () => {
    const dir = createTempDir();
    const manifestPayload = JSON.stringify({
      version: 1,
      items: Array.from({ length: 50 }, (_, index) => ({ id: `star-${index}`, mag: index * 0.1 })),
    });
    const binaryPayload = Buffer.from(Uint8Array.from({ length: 512 }, (_, index) => index % 16));

    const manifestPath = writeFileRelative(dir, 'manifest.json', manifestPayload);
    const sectorJsonPath = writeFileRelative(
      dir,
      'summaries/sector_0_0_0.json',
      JSON.stringify({ stars: ['Alpha', 'Beta', 'Gamma'] }),
    );
    const partitionBinPath = writeFileRelative(dir, 'partitions/sector_0_0_0.bin', binaryPayload);
    const readmePath = writeFileRelative(dir, 'README.md', 'Uncompressed documentation');

    const summary = precompressDistData({ distDataDir: dir });

    expect(summary.filesCompressed).toBe(3);
    expect(summary.rawBytes).toBe(
      Buffer.byteLength(manifestPayload) +
        fs.statSync(sectorJsonPath).size +
        binaryPayload.byteLength,
    );
    expect(summary.compressedBytes).toBeGreaterThan(0);
    expect(summary.savedBytes).toBe(summary.rawBytes - summary.compressedBytes);

    // Originals remain intact
    expect(fs.readFileSync(manifestPath, 'utf8')).toBe(manifestPayload);
    expect(fs.readFileSync(partitionBinPath)).toEqual(binaryPayload);
    expect(fs.readFileSync(readmePath, 'utf8')).toBe('Uncompressed documentation');

    // Non-.json/.bin files are not compressed
    expect(fs.existsSync(`${readmePath}.br`)).toBe(false);

    // .br sidecars decompress byte-for-byte
    const manifestBr = fs.readFileSync(`${manifestPath}.br`);
    expect(zlib.brotliDecompressSync(manifestBr).toString('utf8')).toBe(manifestPayload);

    const sectorBr = fs.readFileSync(`${sectorJsonPath}.br`);
    expect(zlib.brotliDecompressSync(sectorBr)).toEqual(fs.readFileSync(sectorJsonPath));

    const binBr = fs.readFileSync(`${partitionBinPath}.br`);
    expect(zlib.brotliDecompressSync(binBr)).toEqual(binaryPayload);
  });

  it('skips existing .br files and never creates .br.br double-compressed sidecars', () => {
    const dir = createTempDir();
    const jsonPath = writeFileRelative(dir, 'catalog.json', JSON.stringify({ ok: true, count: 42 }));
    const existingBrPath = writeFileRelative(dir, 'stale.json.br', Buffer.from('preexisting-br'));

    const summary = precompressDistData({ distDataDir: dir, quality: 4 });

    expect(summary.filesCompressed).toBe(1);
    expect(fs.existsSync(`${jsonPath}.br`)).toBe(true);
    expect(fs.existsSync(`${existingBrPath}.br`)).toBe(false);
    expect(fs.readFileSync(existingBrPath)).toEqual(Buffer.from('preexisting-br'));
  });

  it('throws a clear error when distDataDir does not exist', () => {
    const missingDir = path.join(TEST_ROOT, 'does-not-exist-12345');

    expect(() => precompressDistData({ distDataDir: missingDir })).toThrow(
      /does not exist/i,
    );
  });
});
