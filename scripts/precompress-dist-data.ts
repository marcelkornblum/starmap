import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

export interface PrecompressOptions {
  readonly distDataDir?: string;
  readonly quality?: number;
}

export interface PrecompressSummary {
  readonly filesCompressed: number;
  readonly rawBytes: number;
  readonly compressedBytes: number;
  readonly savedBytes: number;
}

const DEFAULT_DIST_DATA_DIR = path.resolve('dist/data');
const DEFAULT_BROTLI_QUALITY = 6;
const COMPRESSIBLE_EXTENSIONS = new Set(['.json', '.bin']);

function collectCompressibleFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectCompressibleFiles(fullPath));
      continue;
    }
    if (!entry.isFile() || entry.name.endsWith('.br')) {
      continue;
    }
    if (COMPRESSIBLE_EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Recursively precompresses `.json` and `.bin` data artefacts into `.br`
 * sidecar files while preserving the original uncompressed files.
 */
export function precompressDistData(options: PrecompressOptions = {}): PrecompressSummary {
  const distDataDir = path.resolve(options.distDataDir ?? DEFAULT_DIST_DATA_DIR);
  const quality = options.quality ?? DEFAULT_BROTLI_QUALITY;

  if (!fs.existsSync(distDataDir) || !fs.statSync(distDataDir).isDirectory()) {
    throw new Error(`distDataDir does not exist or is not a directory: ${distDataDir}`);
  }

  const targetFiles = collectCompressibleFiles(distDataDir);
  let filesCompressed = 0;
  let rawBytes = 0;
  let compressedBytes = 0;

  for (const filePath of targetFiles) {
    const rawBuffer = fs.readFileSync(filePath);
    const compressedBuffer = zlib.brotliCompressSync(rawBuffer, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: quality,
      },
    });
    fs.writeFileSync(`${filePath}.br`, compressedBuffer);

    filesCompressed += 1;
    rawBytes += rawBuffer.byteLength;
    compressedBytes += compressedBuffer.byteLength;
  }

  return {
    filesCompressed,
    rawBytes,
    compressedBytes,
    savedBytes: rawBytes - compressedBytes,
  };
}

/**
 * CLI entrypoint for `npm run data:precompress`.
 */
export function main(): void {
  try {
    const summary = precompressDistData();
    console.log(
      `Precompressed ${summary.filesCompressed} file(s): ${summary.rawBytes} B -> ${summary.compressedBytes} B (saved ${summary.savedBytes} B)`,
    );
  } catch (err: unknown) {
    console.error('Failed to precompress dist/data:', err);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
