import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { parse } from '@babel/parser';

export interface SuppressionBudgets {
  readonly guardDisable: number;
  readonly r3fAuditDisable: number;
  readonly uiAuditDisable: number;
  readonly eslintDisable: number;
  readonly oxlintDisable: number;
  readonly tsIgnoreOrExpectError: number;
}

export interface DataBudgets {
  readonly maxTotalBytes: number;
  readonly maxStartupSearchBytes: number;
  readonly forbidOrphanFiles: boolean;
  readonly allowedNonManifestFiles?: readonly string[];
}

export interface BundleBudgets {
  readonly maxEntryJsGzipBytes: number;
  readonly maxEntryCssGzipBytes: number;
  readonly forbidEntryChunkReferences: readonly string[];
}

export interface BudgetsConfig {
  readonly suppressions: SuppressionBudgets;
  readonly data: DataBudgets;
  readonly bundle: BundleBudgets;
}

export interface SuppressionAuditResult {
  readonly ok: boolean;
  readonly counts: SuppressionBudgets;
  readonly locations: Readonly<Record<keyof SuppressionBudgets, readonly string[]>>;
  readonly violations: readonly string[];
}

export interface DataAuditResult {
  readonly ok: boolean;
  readonly totalBytes: number;
  readonly startupSearchBytes: number;
  readonly fileCount: number;
  readonly violations: readonly string[];
}

export interface BundleAuditResult {
  readonly ok: boolean;
  readonly entryJsPath: string;
  readonly entryJsGzipBytes: number;
  readonly entryCssPath: string;
  readonly entryCssGzipBytes: number;
  readonly violations: readonly string[];
}

const BUDGETS_CONFIG_REL_PATH = 'scripts/guards/budgets.json';

const SUPPRESSION_PATTERNS: ReadonlyArray<{
  readonly key: keyof SuppressionBudgets;
  readonly label: string;
  readonly regex: RegExp;
}> = [
  { key: 'guardDisable', label: 'guard-disable', regex: /\bguard-disable(?:-next-line)?\b/g },
  {
    key: 'r3fAuditDisable',
    label: 'r3f-audit-disable',
    regex: /\br3f-audit-disable(?:-next-line)?\b/g,
  },
  {
    key: 'uiAuditDisable',
    label: 'ui-audit-disable',
    regex: /\bui-audit-disable(?:-next-line)?\b/g,
  },
  {
    key: 'eslintDisable',
    label: 'eslint-disable',
    regex: /\beslint-disable(?:-next-line|-line)?\b/g,
  },
  {
    key: 'oxlintDisable',
    label: 'oxlint-disable',
    regex: /\boxlint-disable(?:-next-line|-line)?\b/g,
  },
  {
    key: 'tsIgnoreOrExpectError',
    label: '@ts-ignore/@ts-expect-error',
    regex: /@ts-(?:ignore|expect-error)\b/g,
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toPosixRelative(root: string, targetPath: string): string {
  return path.relative(root, targetPath).replace(/\\/g, '/');
}

function collectFilesRecursive(
  dir: string,
  predicate: (fullPath: string, name: string) => boolean,
): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const results: string[] = [];
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
        continue;
      }
      results.push(...collectFilesRecursive(fullPath, predicate));
    } else if (entry.isFile() && predicate(fullPath, entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Loads and validates `scripts/guards/budgets.json` from `projectRoot`.
 */
export function loadBudgetsConfig(projectRoot = process.cwd()): BudgetsConfig {
  const configPath = path.join(projectRoot, BUDGETS_CONFIG_REL_PATH);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing budgets config at ${BUDGETS_CONFIG_REL_PATH}`);
  }
  const parsed: unknown = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  if (
    !isRecord(parsed) ||
    !isRecord(parsed.suppressions) ||
    !isRecord(parsed.data) ||
    !isRecord(parsed.bundle)
  ) {
    throw new Error(`Invalid budgets config structure in ${BUDGETS_CONFIG_REL_PATH}`);
  }
  return parsed as unknown as BudgetsConfig;
}

/**
 * Audits non-test, non-story `.ts`, `.tsx`, and `.css` files under `src/`
 * against suppression comment ceilings.
 */
export function auditSuppressionRatchet(
  projectRoot: string,
  budgets: SuppressionBudgets,
): SuppressionAuditResult {
  const srcDir = path.join(projectRoot, 'src');
  const files = collectFilesRecursive(srcDir, (_fullPath, name) => {
    if (name.includes('.test.') || name.includes('.stories.')) {
      return false;
    }
    return name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.css');
  });

  const mutableLocations: Record<keyof SuppressionBudgets, string[]> = {
    guardDisable: [],
    r3fAuditDisable: [],
    uiAuditDisable: [],
    eslintDisable: [],
    oxlintDisable: [],
    tsIgnoreOrExpectError: [],
  };

  for (const file of files) {
    const relPath = toPosixRelative(projectRoot, file);
    const lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      for (const { key, regex } of SUPPRESSION_PATTERNS) {
        regex.lastIndex = 0;
        let match = regex.exec(line);
        while (match !== null) {
          mutableLocations[key].push(`${relPath}:${i + 1}`);
          match = regex.exec(line);
        }
      }
    }
  }

  const counts: SuppressionBudgets = {
    guardDisable: mutableLocations.guardDisable.length,
    r3fAuditDisable: mutableLocations.r3fAuditDisable.length,
    uiAuditDisable: mutableLocations.uiAuditDisable.length,
    eslintDisable: mutableLocations.eslintDisable.length,
    oxlintDisable: mutableLocations.oxlintDisable.length,
    tsIgnoreOrExpectError: mutableLocations.tsIgnoreOrExpectError.length,
  };

  const violations: string[] = [];
  for (const { key, label } of SUPPRESSION_PATTERNS) {
    const count = counts[key];
    const ceiling = budgets[key];
    if (count > ceiling) {
      violations.push(
        `Suppression ceiling exceeded for ${label}: ${count} > ${ceiling} (${mutableLocations[key].join(', ')})`,
      );
    }
  }

  return {
    ok: violations.length === 0,
    counts,
    locations: mutableLocations,
    violations,
  };
}

/**
 * Validates `public/data/manifest.json`, checks for missing or orphan shards,
 * and enforces total data directory and startup search shard byte budgets.
 */
export function auditDataManifestAndBudgets(
  projectRoot: string,
  budgets: DataBudgets,
): DataAuditResult {
  const dataDir = path.join(projectRoot, 'public/data');
  const manifestPath = path.join(dataDir, 'manifest.json');
  const violations: string[] = [];

  if (!fs.existsSync(manifestPath)) {
    return {
      ok: false,
      totalBytes: 0,
      startupSearchBytes: 0,
      fileCount: 0,
      violations: ['Missing public/data/manifest.json'],
    };
  }

  let parsedManifest: unknown;
  try {
    parsedManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      totalBytes: 0,
      startupSearchBytes: 0,
      fileCount: 0,
      violations: [`Invalid JSON in public/data/manifest.json: ${message}`],
    };
  }

  if (!isRecord(parsedManifest) || !isRecord(parsedManifest.files)) {
    return {
      ok: false,
      totalBytes: 0,
      startupSearchBytes: 0,
      fileCount: 0,
      violations: ['Invalid public/data/manifest.json: missing "files" map'],
    };
  }

  const filesMap = parsedManifest.files;
  const referencedRelPaths = new Set<string>();

  for (const [logicalKey, rawTarget] of Object.entries(filesMap)) {
    if (typeof rawTarget !== 'string' || rawTarget.length === 0) {
      violations.push(`Invalid manifest target for "${logicalKey}": expected non-empty string`);
      continue;
    }
    const normalized = rawTarget.replace(/\\/g, '/').replace(/^\/+/, '');
    const resolvedTarget = path.resolve(dataDir, normalized);
    const resolvedDataDir = path.resolve(dataDir);
    if (
      resolvedTarget !== resolvedDataDir &&
      !resolvedTarget.startsWith(`${resolvedDataDir}${path.sep}`)
    ) {
      violations.push(`Manifest entry "${logicalKey}" escapes public/data/: ${rawTarget}`);
      continue;
    }
    referencedRelPaths.add(normalized);
    if (!fs.existsSync(resolvedTarget) || !fs.statSync(resolvedTarget).isFile()) {
      violations.push(`Manifest entry "${logicalKey}" points to missing file: ${normalized}`);
    }
  }

  const diskFiles = collectFilesRecursive(dataDir, () => true);
  const allowedNonManifestSet = new Set(
    (budgets.allowedNonManifestFiles ?? []).map((entry) =>
      entry.replace(/\\/g, '/').replace(/^\/+/, ''),
    ),
  );
  let totalBytes = 0;

  for (const absFile of diskFiles) {
    const stat = fs.statSync(absFile);
    totalBytes += stat.size;
    const relPosix = toPosixRelative(dataDir, absFile);
    if (relPosix === 'manifest.json' || allowedNonManifestSet.has(relPosix)) {
      continue;
    }
    if (budgets.forbidOrphanFiles && !referencedRelPaths.has(relPosix)) {
      violations.push(`Orphan file in public/data/ not referenced by manifest.json: ${relPosix}`);
    }
  }

  if (totalBytes > budgets.maxTotalBytes) {
    violations.push(
      `Total public/data/ size ${totalBytes} bytes exceeds maxTotalBytes (${budgets.maxTotalBytes} bytes)`,
    );
  }

  const startupTarget = filesMap['search/startup.json'] ?? filesMap['search/startup'];
  let startupSearchBytes = 0;
  if (typeof startupTarget !== 'string' || startupTarget.length === 0) {
    violations.push('Manifest missing startup search shard entry ("search/startup.json")');
  } else {
    const startupAbs = path.join(dataDir, startupTarget);
    if (!fs.existsSync(startupAbs) || !fs.statSync(startupAbs).isFile()) {
      violations.push(`Startup search shard missing on disk: ${startupTarget}`);
    } else {
      startupSearchBytes = fs.statSync(startupAbs).size;
      if (startupSearchBytes > budgets.maxStartupSearchBytes) {
        violations.push(
          `Startup search shard ${startupTarget} is ${startupSearchBytes} bytes, exceeding maxStartupSearchBytes (${budgets.maxStartupSearchBytes} bytes)`,
        );
      }
    }
  }

  return {
    ok: violations.length === 0,
    totalBytes,
    startupSearchBytes,
    fileCount: referencedRelPaths.size,
    violations,
  };
}

function parseHtmlAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z0-9:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match = attrRegex.exec(tag);
  while (match !== null) {
    const name = match[1]?.toLowerCase();
    if (name) {
      const value = match[2] ?? match[3] ?? match[4] ?? '';
      attrs[name] = value;
    }
    match = attrRegex.exec(tag);
  }
  return attrs;
}

function resolveDistAssetPath(distDir: string, rawUrl: string): string | null {
  const cleanUrl = rawUrl.split(/[?#]/)[0]?.trim() ?? '';
  if (!cleanUrl) {
    return null;
  }
  const strippedLeading = cleanUrl.replace(/^\/+/, '').replace(/^\.\//, '');
  const candidates = [strippedLeading];
  if (strippedLeading.startsWith('starmap/')) {
    candidates.push(strippedLeading.slice('starmap/'.length));
  }

  const resolvedDistDir = path.resolve(distDir);
  for (const candidate of candidates) {
    const abs = path.resolve(distDir, candidate);
    if (!abs.startsWith(`${resolvedDistDir}${path.sep}`)) {
      continue;
    }
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      return abs;
    }
  }
  return null;
}

function extractStaticModuleSpecifiers(jsContent: string): string[] {
  const ast = parse(jsContent, { sourceType: 'module' });
  const specifiers: string[] = [];

  for (const statement of ast.program.body) {
    if (
      statement.type === 'ImportDeclaration' ||
      statement.type === 'ExportAllDeclaration'
    ) {
      specifiers.push(statement.source.value);
    } else if (statement.type === 'ExportNamedDeclaration' && statement.source) {
      specifiers.push(statement.source.value);
    }
  }

  return specifiers;
}

/**
 * Audits `dist/index.html` and entry JS/CSS bundles against gzip size budgets
 * and entry-chunk isolation rules (`vendor-three`, `vendor-r3f`).
 */
export function auditBundleBudgets(
  projectRoot: string,
  budgets: BundleBudgets,
): BundleAuditResult {
  const distDir = path.join(projectRoot, 'dist');
  const indexHtmlPath = path.join(distDir, 'index.html');
  const violations: string[] = [];

  if (!fs.existsSync(indexHtmlPath)) {
    return {
      ok: false,
      entryJsPath: '',
      entryJsGzipBytes: 0,
      entryCssPath: '',
      entryCssGzipBytes: 0,
      violations: ['Missing dist/index.html (run npm run build first)'],
    };
  }

  const html = fs.readFileSync(indexHtmlPath, 'utf-8');

  let entryScriptSrc = '';
  const scriptRegex = /<script\b([^>]*)>/gi;
  let scriptMatch = scriptRegex.exec(html);
  while (scriptMatch !== null) {
    const attrs = parseHtmlAttributes(scriptMatch[1] ?? '');
    if (attrs.type === 'module' && attrs.src) {
      entryScriptSrc = attrs.src;
      break;
    }
    scriptMatch = scriptRegex.exec(html);
  }

  let entryCssHref = '';
  const linkRegex = /<link\b([^>]*)>/gi;
  let linkMatch = linkRegex.exec(html);
  while (linkMatch !== null) {
    const attrs = parseHtmlAttributes(linkMatch[1] ?? '');
    if (attrs.rel === 'stylesheet' && attrs.href) {
      entryCssHref = attrs.href;
      break;
    }
    linkMatch = linkRegex.exec(html);
  }

  let entryJsPath = '';
  let entryJsGzipBytes = 0;
  let entryJsContent = '';
  if (!entryScriptSrc) {
    violations.push('Could not locate <script type="module" src="..."> in dist/index.html');
  } else {
    const absJs = resolveDistAssetPath(distDir, entryScriptSrc);
    if (!absJs) {
      violations.push(`Entry JS asset not found on disk for src="${entryScriptSrc}"`);
    } else {
      entryJsPath = toPosixRelative(projectRoot, absJs);
      const jsBuffer = fs.readFileSync(absJs);
      entryJsGzipBytes = gzipSync(jsBuffer).byteLength;
      entryJsContent = jsBuffer.toString('utf-8');
      if (entryJsGzipBytes > budgets.maxEntryJsGzipBytes) {
        violations.push(
          `Entry JS gzip size ${entryJsGzipBytes} bytes (${entryJsPath}) exceeds maxEntryJsGzipBytes (${budgets.maxEntryJsGzipBytes} bytes)`,
        );
      }
    }
  }

  let entryCssPath = '';
  let entryCssGzipBytes = 0;
  if (!entryCssHref) {
    violations.push('Could not locate <link rel="stylesheet" href="..."> in dist/index.html');
  } else {
    const absCss = resolveDistAssetPath(distDir, entryCssHref);
    if (!absCss) {
      violations.push(`Entry CSS asset not found on disk for href="${entryCssHref}"`);
    } else {
      entryCssPath = toPosixRelative(projectRoot, absCss);
      const cssBuffer = fs.readFileSync(absCss);
      entryCssGzipBytes = gzipSync(cssBuffer).byteLength;
      if (entryCssGzipBytes > budgets.maxEntryCssGzipBytes) {
        violations.push(
          `Entry CSS gzip size ${entryCssGzipBytes} bytes (${entryCssPath}) exceeds maxEntryCssGzipBytes (${budgets.maxEntryCssGzipBytes} bytes)`,
        );
      }
    }
  }

  let staticSpecifiers: string[] = [];
  if (entryJsContent) {
    try {
      staticSpecifiers = extractStaticModuleSpecifiers(entryJsContent);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      violations.push(`Failed to parse entry JS (${entryJsPath}) for static imports: ${message}`);
    }
  }

  for (const forbidden of budgets.forbidEntryChunkReferences) {
    if (html.includes(forbidden)) {
      violations.push(
        `dist/index.html references forbidden chunk prefix "${forbidden}" (breaks lazy 3D isolation)`,
      );
    }
    const matchingSpecifier = staticSpecifiers.find((specifier) => specifier.includes(forbidden));
    if (matchingSpecifier) {
      violations.push(
        `Entry JS (${entryJsPath}) statically imports forbidden chunk prefix "${forbidden}" via "${matchingSpecifier}" (breaks lazy 3D isolation)`,
      );
    }
  }

  return {
    ok: violations.length === 0,
    entryJsPath,
    entryJsGzipBytes,
    entryCssPath,
    entryCssGzipBytes,
    violations,
  };
}

/**
 * Runs offline budget audits (suppressions + data manifest) and optionally
 * built bundle audits (`--bundle`). Returns exit code 0 on pass, 1 on fail.
 */
export function runBudgetsAudit(options?: {
  readonly projectRoot?: string;
  readonly bundle?: boolean;
}): number {
  const projectRoot = options?.projectRoot ?? process.cwd();
  const bundleMode = options?.bundle ?? false;
  const budgets = loadBudgetsConfig(projectRoot);

  console.log(
    bundleMode
      ? '\n--- Running Starmap Bundle Budget Audit ---'
      : '\n--- Running Starmap Suppression & Data Budget Audit ---',
  );

  const violations: string[] = [];

  if (!bundleMode) {
    const suppressionResult = auditSuppressionRatchet(projectRoot, budgets.suppressions);
    console.log(
      `Suppressions: guard=${suppressionResult.counts.guardDisable}/${budgets.suppressions.guardDisable}, r3f=${suppressionResult.counts.r3fAuditDisable}/${budgets.suppressions.r3fAuditDisable}, ui=${suppressionResult.counts.uiAuditDisable}/${budgets.suppressions.uiAuditDisable}, eslint=${suppressionResult.counts.eslintDisable}/${budgets.suppressions.eslintDisable}, oxlint=${suppressionResult.counts.oxlintDisable}/${budgets.suppressions.oxlintDisable}, ts=${suppressionResult.counts.tsIgnoreOrExpectError}/${budgets.suppressions.tsIgnoreOrExpectError}`,
    );
    violations.push(...suppressionResult.violations);

    const dataResult = auditDataManifestAndBudgets(projectRoot, budgets.data);
    console.log(
      `Data Manifest: files=${dataResult.fileCount}, total=${dataResult.totalBytes} B (max ${budgets.data.maxTotalBytes} B), search/startup=${dataResult.startupSearchBytes} B (max ${budgets.data.maxStartupSearchBytes} B)`,
    );
    violations.push(...dataResult.violations);
  } else {
    const bundleResult = auditBundleBudgets(projectRoot, budgets.bundle);
    console.log(
      `Bundle Entry: js=${bundleResult.entryJsPath || 'N/A'} (${bundleResult.entryJsGzipBytes} B gzip, max ${budgets.bundle.maxEntryJsGzipBytes} B), css=${bundleResult.entryCssPath || 'N/A'} (${bundleResult.entryCssGzipBytes} B gzip, max ${budgets.bundle.maxEntryCssGzipBytes} B)`,
    );
    violations.push(...bundleResult.violations);
  }

  if (violations.length > 0) {
    console.error(`\n❌ Budget audit failed with ${violations.length} violation(s):`);
    for (const violation of violations) {
      console.error(`  - ${violation}`);
    }
    return 1;
  }

  console.log('\n✨ All budget checks passed cleanly.');
  return 0;
}

/**
 * Fail-closed CLI runner.
 */
export function main(argv = process.argv.slice(2)): void {
  try {
    const bundle = argv.includes('--bundle');
    const exitCode = runBudgetsAudit({ bundle });
    process.exit(exitCode);
  } catch (err: unknown) {
    console.error('\n❌ Budget audit aborted due to unexpected error:', err);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
