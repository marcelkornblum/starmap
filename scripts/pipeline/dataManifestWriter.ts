import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { COMPACT_SCHEMA_VERSION } from '../../src/utils/compactDataConstants';

export interface DataManifestFile {
  readonly v: number;
  readonly generatedAt: string;
  readonly files: Record<string, string>;
}

const HASHED_FILENAME_REGEX = /\.[0-9a-f]{8}\.(bin|json)$/;
const LEGACY_36_BUCKET_REGEX = /^[0-9a-z](?:\.[0-9a-f]{8})?\.json$/;

const SHARD_SUBDIRS: ReadonlyArray<{ readonly relDir: string; readonly ext: '.bin' | '.json' }> = [
  { relDir: 'partitions', ext: '.bin' },
  { relDir: 'summaries', ext: '.json' },
  { relDir: 'details', ext: '.json' },
  { relDir: 'details/sectors', ext: '.json' },
  { relDir: 'details/sol-minor', ext: '.json' },
  { relDir: 'search', ext: '.json' },
  { relDir: 'overlays/layers', ext: '.json' },
  { relDir: 'overlays/layers/by-entity', ext: '.json' },
];

const ROOT_DATA_FILES = ['reference-baselines.json', 'guide-examples.json'] as const;

const LEGACY_PATHS_TO_REMOVE = [
  'systems',
  'sol',
  'catalogs',
  'search/full.json',
  'overlays/exoplanetary-systems.json',
  'overlays/galactic-structures.json',
] as const;

export function computeContentHash8(bytes: Buffer): string {
  return crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 8);
}

/**
 * Removes previously hashed shard files and stale legacy artefacts inside `dataDir`
 * before emitting fresh pipeline outputs.
 */
export function cleanStaleDataArtifacts(dataDir: string): void {
  const resolvedDir = path.resolve(dataDir);
  if (!fs.existsSync(resolvedDir)) {
    return;
  }

  for (const legacyRel of LEGACY_PATHS_TO_REMOVE) {
    const legacyAbs = path.join(resolvedDir, legacyRel);
    if (fs.existsSync(legacyAbs)) {
      fs.rmSync(legacyAbs, { recursive: true, force: true });
    }
  }

  for (const { relDir, ext } of SHARD_SUBDIRS) {
    const absDir = path.join(resolvedDir, relDir);
    if (!fs.existsSync(absDir)) continue;
    const isLegacy36Root = relDir === 'summaries' || relDir === 'details';
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (
        (entry.name.endsWith(ext) && HASHED_FILENAME_REGEX.test(entry.name)) ||
        (isLegacy36Root && LEGACY_36_BUCKET_REGEX.test(entry.name))
      ) {
        fs.unlinkSync(path.join(absDir, entry.name));
      }
    }
  }

  for (const entry of fs.readdirSync(resolvedDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (
      HASHED_FILENAME_REGEX.test(entry.name) &&
      (entry.name.startsWith('reference-baselines.') || entry.name.startsWith('guide-examples.'))
    ) {
      fs.unlinkSync(path.join(resolvedDir, entry.name));
    }
  }
}

function hashAndRenameFile(
  dataDir: string,
  relPosixPath: string,
  filesMap: Record<string, string>,
): void {
  const absPath = path.join(dataDir, relPosixPath);
  if (!fs.existsSync(absPath)) {
    return;
  }
  if (HASHED_FILENAME_REGEX.test(path.basename(relPosixPath))) {
    return;
  }

  const bytes = fs.readFileSync(absPath);
  const hash = computeContentHash8(bytes);
  const parsed = path.posix.parse(relPosixPath);
  const hashedName = `${parsed.name}.${hash}${parsed.ext}`;
  const hashedRelPosix = parsed.dir ? `${parsed.dir}/${hashedName}` : hashedName;
  const hashedAbsPath = path.join(dataDir, hashedRelPosix);

  fs.renameSync(absPath, hashedAbsPath);
  filesMap[relPosixPath] = hashedRelPosix;
}

/**
 * Hashes every active runtime shard in `dataDir`, renames each file on disk to
 * `<name>.<8-char-sha256>.<ext>`, and writes `public/data/manifest.json`.
 */
export function writeHashedDataManifest(
  dataDir: string,
  generatedAtIso: string,
): DataManifestFile {
  const resolvedDir = path.resolve(dataDir);
  const rawFiles: Record<string, string> = {};

  for (const { relDir, ext } of SHARD_SUBDIRS) {
    const absDir = path.join(resolvedDir, relDir);
    if (!fs.existsSync(absDir)) continue;
    const entries = fs
      .readdirSync(absDir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(ext)) continue;
      if (HASHED_FILENAME_REGEX.test(entry.name)) continue;
      const relPosix = `${relDir}/${entry.name}`;
      hashAndRenameFile(resolvedDir, relPosix, rawFiles);
    }
  }

  for (const rootFile of ROOT_DATA_FILES) {
    hashAndRenameFile(resolvedDir, rootFile, rawFiles);
  }

  const sortedFiles: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawFiles).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    sortedFiles[key] = value;
  }

  const manifest: DataManifestFile = {
    v: COMPACT_SCHEMA_VERSION,
    generatedAt: generatedAtIso,
    files: sortedFiles,
  };

  fs.writeFileSync(
    path.join(resolvedDir, 'manifest.json'),
    JSON.stringify(manifest),
    'utf-8',
  );

  return manifest;
}
