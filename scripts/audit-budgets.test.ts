import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  auditBundleBudgets,
  auditDataManifestAndBudgets,
  auditSuppressionRatchet,
  loadBudgetsConfig,
  runBudgetsAudit,
  type BundleBudgets,
  type DataBudgets,
  type SuppressionBudgets,
} from './audit-budgets';

const tempDirs: string[] = [];

function createTempProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'starmap-budgets-test-'));
  tempDirs.push(dir);
  return dir;
}

function writeFileRelative(root: string, relPath: string, content: string | Buffer): void {
  const absPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content);
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('scripts/audit-budgets', () => {
  describe('auditSuppressionRatchet', () => {
    const baseCeilings: SuppressionBudgets = {
      guardDisable: 0,
      r3fAuditDisable: 0,
      uiAuditDisable: 1,
      eslintDisable: 1,
      oxlintDisable: 0,
      tsIgnoreOrExpectError: 0,
    };

    it('passes when suppressions are within ceilings and ignores test and story files', () => {
      const root = createTempProject();
      writeFileRelative(
        root,
        'src/components/Sample.tsx',
        '// eslint-disable-next-line react-hooks/exhaustive-deps\nexport const Sample = () => null;\n',
      );
      writeFileRelative(
        root,
        'src/components/Sample.module.css',
        '/* ui-audit-disable-next-line hardcoded-css-token -- Breakpoint */\n.root { color: inherit; }\n',
      );
      writeFileRelative(
        root,
        'src/components/Sample.test.tsx',
        '// @ts-expect-error test mock\n// guard-disable-next-line G-literals -- test\n',
      );
      writeFileRelative(
        root,
        'src/components/Sample.stories.tsx',
        '// r3f-audit-disable-next-line no-alloc-in-use-frame -- story\n// oxlint-disable-next-line max-lines\n',
      );

      const result = auditSuppressionRatchet(root, baseCeilings);

      expect(result.ok).toBe(true);
      expect(result.violations).toEqual([]);
      expect(result.counts).toEqual({
        guardDisable: 0,
        r3fAuditDisable: 0,
        uiAuditDisable: 1,
        eslintDisable: 1,
        oxlintDisable: 0,
        tsIgnoreOrExpectError: 0,
      });
    });

    it('fails with exact file:line locations when any category exceeds its ceiling', () => {
      const root = createTempProject();
      writeFileRelative(
        root,
        'src/services/a.ts',
        'const x = 1;\n// guard-disable-next-line G-literals -- reason\n// @ts-ignore legacy\n',
      );
      writeFileRelative(
        root,
        'src/components/b.tsx',
        '// r3f-audit-disable-next-line no-alloc -- reason\n// oxlint-disable-next-line max-lines\n// eslint-disable-next-line no-console\n// eslint-disable-next-line no-alert\n',
      );

      const result = auditSuppressionRatchet(root, baseCeilings);

      expect(result.ok).toBe(false);
      expect(result.counts.guardDisable).toBe(1);
      expect(result.counts.r3fAuditDisable).toBe(1);
      expect(result.counts.oxlintDisable).toBe(1);
      expect(result.counts.tsIgnoreOrExpectError).toBe(1);
      expect(result.counts.eslintDisable).toBe(2);
      expect(result.violations.some((v) => v.includes('src/services/a.ts:2'))).toBe(true);
      expect(result.violations.some((v) => v.includes('src/services/a.ts:3'))).toBe(true);
      expect(result.violations.some((v) => v.includes('src/components/b.tsx:1'))).toBe(true);
      expect(result.violations.some((v) => v.includes('src/components/b.tsx:2'))).toBe(true);
      expect(result.violations.some((v) => v.includes('src/components/b.tsx:3'))).toBe(true);
      expect(result.violations.some((v) => v.includes('src/components/b.tsx:4'))).toBe(true);
    });
  });

  describe('auditDataManifestAndBudgets', () => {
    const baseDataBudgets: DataBudgets = {
      maxTotalBytes: 2048,
      maxStartupSearchBytes: 512,
      forbidOrphanFiles: true,
      allowedNonManifestFiles: ['.gitkeep', 'README.md'],
    };

    it('passes when all manifest shards exist, no orphans exist, and sizes are within budget', () => {
      const root = createTempProject();
      writeFileRelative(root, 'public/data/search/startup.11111111.json', '{"items":[]}');
      writeFileRelative(root, 'public/data/details/routing.22222222.json', '{"v":1}');
      writeFileRelative(
        root,
        'public/data/manifest.json',
        JSON.stringify({
          v: 1,
          generatedAt: '2026-01-01T00:00:00.000Z',
          files: {
            'search/startup.json': 'search/startup.11111111.json',
            'details/routing.json': 'details/routing.22222222.json',
          },
        }),
      );

      const result = auditDataManifestAndBudgets(root, baseDataBudgets);

      expect(result.ok).toBe(true);
      expect(result.violations).toEqual([]);
      expect(result.fileCount).toBe(2);
      expect(result.startupSearchBytes).toBe('{"items":[]}'.length);
      expect(result.totalBytes).toBeGreaterThan(0);
    });

    it('fails when a manifest-referenced file is missing on disk', () => {
      const root = createTempProject();
      writeFileRelative(root, 'public/data/search/startup.11111111.json', '{}');
      writeFileRelative(
        root,
        'public/data/manifest.json',
        JSON.stringify({
          v: 1,
          generatedAt: '2026-01-01T00:00:00.000Z',
          files: {
            'search/startup.json': 'search/startup.11111111.json',
            'details/missing.json': 'details/missing.deadbeef.json',
          },
        }),
      );

      const result = auditDataManifestAndBudgets(root, baseDataBudgets);

      expect(result.ok).toBe(false);
      expect(result.violations.some((v) => v.includes('details/missing.deadbeef.json'))).toBe(true);
    });

    it('allows files listed in allowedNonManifestFiles while still failing on other unreferenced files', () => {
      const root = createTempProject();
      writeFileRelative(root, 'public/data/.gitkeep', '# placeholder\n');
      writeFileRelative(root, 'public/data/README.md', '# data docs\n');
      writeFileRelative(root, 'public/data/search/startup.11111111.json', '{}');
      writeFileRelative(
        root,
        'public/data/manifest.json',
        JSON.stringify({
          v: 1,
          generatedAt: '2026-01-01T00:00:00.000Z',
          files: {
            'search/startup.json': 'search/startup.11111111.json',
          },
        }),
      );

      const allowedOnlyResult = auditDataManifestAndBudgets(root, baseDataBudgets);
      expect(allowedOnlyResult.ok).toBe(true);
      expect(allowedOnlyResult.violations).toEqual([]);

      writeFileRelative(root, 'public/data/partitions/stale.bin', Buffer.from([1, 2, 3]));
      const withStaleShardResult = auditDataManifestAndBudgets(root, baseDataBudgets);
      expect(withStaleShardResult.ok).toBe(false);
      expect(
        withStaleShardResult.violations.some((v) => v.includes('partitions/stale.bin')),
      ).toBe(true);
    });

    it('fails when an orphan file exists under public/data and forbidOrphanFiles is true', () => {
      const root = createTempProject();
      writeFileRelative(root, 'public/data/search/startup.11111111.json', '{}');
      writeFileRelative(root, 'public/data/orphan/stale.json', '{}');
      writeFileRelative(
        root,
        'public/data/manifest.json',
        JSON.stringify({
          v: 1,
          generatedAt: '2026-01-01T00:00:00.000Z',
          files: {
            'search/startup.json': 'search/startup.11111111.json',
          },
        }),
      );

      const strictResult = auditDataManifestAndBudgets(root, baseDataBudgets);
      expect(strictResult.ok).toBe(false);
      expect(strictResult.violations.some((v) => v.includes('orphan/stale.json'))).toBe(true);

      const permissiveResult = auditDataManifestAndBudgets(root, {
        ...baseDataBudgets,
        forbidOrphanFiles: false,
      });
      expect(permissiveResult.ok).toBe(true);
    });

    it('fails when total byte size or startup search shard size exceeds budget', () => {
      const root = createTempProject();
      writeFileRelative(root, 'public/data/search/startup.11111111.json', 'x'.repeat(600));
      writeFileRelative(root, 'public/data/partitions/chunk.22222222.bin', Buffer.alloc(1600, 1));
      writeFileRelative(
        root,
        'public/data/manifest.json',
        JSON.stringify({
          v: 1,
          generatedAt: '2026-01-01T00:00:00.000Z',
          files: {
            'search/startup.json': 'search/startup.11111111.json',
            'partitions/chunk.bin': 'partitions/chunk.22222222.bin',
          },
        }),
      );

      const result = auditDataManifestAndBudgets(root, baseDataBudgets);

      expect(result.ok).toBe(false);
      expect(result.violations.some((v) => v.includes('Startup search shard'))).toBe(true);
      expect(result.violations.some((v) => v.includes('Total public/data/ size'))).toBe(true);
    });

    it('fails when manifest.json is missing', () => {
      const root = createTempProject();
      const result = auditDataManifestAndBudgets(root, baseDataBudgets);
      expect(result.ok).toBe(false);
      expect(result.violations.some((v) => v.includes('manifest.json'))).toBe(true);
    });
  });

  describe('auditBundleBudgets', () => {
    const baseBundleBudgets: BundleBudgets = {
      maxEntryJsGzipBytes: 2048,
      maxEntryCssGzipBytes: 1024,
      forbidEntryChunkReferences: ['vendor-three', 'vendor-r3f'],
    };

    it('passes for both / and /starmap/ base paths when gzip budgets and chunk isolation hold', () => {
      for (const basePath of ['/', '/starmap/']) {
        const root = createTempProject();
        writeFileRelative(
          root,
          'dist/index.html',
          `<!doctype html>
<html>
  <head>
    <script type="module" crossorigin src="${basePath}assets/index-123456.js"></script>
    <link rel="stylesheet" crossorigin href="${basePath}assets/index-654321.css">
  </head>
  <body></body>
</html>`,
        );
        writeFileRelative(root, 'dist/assets/index-123456.js', 'console.log("starmap boot");');
        writeFileRelative(root, 'dist/assets/index-654321.css', ':root { color-scheme: dark; }');

        const result = auditBundleBudgets(root, baseBundleBudgets);

        expect(result.ok).toBe(true);
        expect(result.violations).toEqual([]);
        expect(result.entryJsGzipBytes).toBeGreaterThan(0);
        expect(result.entryCssGzipBytes).toBeGreaterThan(0);
      }
    });

    it('fails when entry JS or CSS gzip size exceeds budget', () => {
      const root = createTempProject();
      // High-entropy random-looking pseudo-data via deterministic LCG so gzip doesn't compress it tiny
      let state = 1337;
      const bytes = Buffer.alloc(4096);
      for (let i = 0; i < bytes.length; i++) {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        bytes[i] = 33 + (state % 90);
      }
      const cssBytes = Buffer.alloc(2048);
      for (let i = 0; i < cssBytes.length; i++) {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        cssBytes[i] = 33 + (state % 90);
      }

      writeFileRelative(
        root,
        'dist/index.html',
        '<!doctype html><html><head><script type="module" src="/assets/index-1.js"></script><link rel="stylesheet" href="/assets/index-1.css"></head></html>',
      );
      writeFileRelative(root, 'dist/assets/index-1.js', bytes);
      writeFileRelative(root, 'dist/assets/index-1.css', cssBytes);

      const result = auditBundleBudgets(root, baseBundleBudgets);

      expect(result.ok).toBe(false);
      expect(result.violations.some((v) => v.includes('Entry JS gzip size'))).toBe(true);
      expect(result.violations.some((v) => v.includes('Entry CSS gzip size'))).toBe(true);
    });

    it('allows Vite lazy __vite__mapDeps table mentioning vendor chunks when no static import or HTML preload exists', () => {
      const root = createTempProject();
      writeFileRelative(
        root,
        'dist/index.html',
        `<!doctype html>
<html>
  <head>
    <script type="module" src="/starmap/assets/index-1.js"></script>
    <link rel="modulepreload" href="/starmap/assets/vendor-react-1.js">
    <link rel="stylesheet" href="/starmap/assets/index-1.css">
  </head>
</html>`,
      );
      writeFileRelative(
        root,
        'dist/assets/index-1.js',
        `const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/CanvasWebGLHost-1.js","assets/vendor-three-abc.js","assets/vendor-r3f-xyz.js"])))=>i.map(i=>d[i]);
import { jsx } from "./vendor-react-1.js";
export const boot = () => [jsx, __vite__mapDeps];`,
      );
      writeFileRelative(root, 'dist/assets/index-1.css', 'body { margin: 0; }');

      const result = auditBundleBudgets(root, baseBundleBudgets);

      expect(result.ok).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('fails when entry JS statically imports a forbidden chunk', () => {
      const root = createTempProject();
      writeFileRelative(
        root,
        'dist/index.html',
        `<!doctype html>
<html>
  <head>
    <script type="module" src="/starmap/assets/index-1.js"></script>
    <link rel="stylesheet" href="/starmap/assets/index-1.css">
  </head>
</html>`,
      );
      writeFileRelative(
        root,
        'dist/assets/index-1.js',
        'import "./vendor-three-abc.js"; console.log("boot");',
      );
      writeFileRelative(root, 'dist/assets/index-1.css', 'body { margin: 0; }');

      const result = auditBundleBudgets(root, baseBundleBudgets);

      expect(result.ok).toBe(false);
      expect(result.violations.some((v) => v.includes('Entry JS') && v.includes('vendor-three'))).toBe(
        true,
      );
    });

    it('fails when dist/index.html modulepreload references a forbidden chunk', () => {
      const root = createTempProject();
      writeFileRelative(
        root,
        'dist/index.html',
        `<!doctype html>
<html>
  <head>
    <script type="module" src="/assets/index-1.js"></script>
    <link rel="modulepreload" href="/assets/vendor-r3f-abc.js">
    <link rel="stylesheet" href="/assets/index-1.css">
  </head>
</html>`,
      );
      writeFileRelative(root, 'dist/assets/index-1.js', 'console.log("boot");');
      writeFileRelative(root, 'dist/assets/index-1.css', 'body { margin: 0; }');

      const result = auditBundleBudgets(root, baseBundleBudgets);

      expect(result.ok).toBe(false);
      expect(
        result.violations.some((v) => v.includes('dist/index.html') && v.includes('vendor-r3f')),
      ).toBe(true);
    });

    it('fails when dist/index.html is missing', () => {
      const root = createTempProject();
      const result = auditBundleBudgets(root, baseBundleBudgets);
      expect(result.ok).toBe(false);
      expect(result.violations.some((v) => v.includes('dist/index.html'))).toBe(true);
    });
  });

  describe('loadBudgetsConfig and runBudgetsAudit', () => {
    it('loads scripts/guards/budgets.json and returns 0/1 from runBudgetsAudit', () => {
      const repoConfig = loadBudgetsConfig(process.cwd());
      expect(repoConfig.suppressions.uiAuditDisable).toBe(4);
      expect(repoConfig.suppressions.eslintDisable).toBe(5);
      expect(repoConfig.data.forbidOrphanFiles).toBe(true);
      expect(repoConfig.data.allowedNonManifestFiles).toEqual(['.gitkeep', 'README.md']);
      expect(repoConfig.bundle.forbidEntryChunkReferences).toEqual(['vendor-three', 'vendor-r3f']);

      const tempRoot = createTempProject();
      writeFileRelative(
        tempRoot,
        'scripts/guards/budgets.json',
        JSON.stringify({
          suppressions: {
            guardDisable: 0,
            r3fAuditDisable: 0,
            uiAuditDisable: 0,
            eslintDisable: 0,
            oxlintDisable: 0,
            tsIgnoreOrExpectError: 0,
          },
          data: {
            maxTotalBytes: 1024,
            maxStartupSearchBytes: 512,
            forbidOrphanFiles: true,
          },
          bundle: {
            maxEntryJsGzipBytes: 1024,
            maxEntryCssGzipBytes: 1024,
            forbidEntryChunkReferences: ['vendor-three', 'vendor-r3f'],
          },
        }),
      );
      writeFileRelative(tempRoot, 'src/index.ts', 'export const ok = true;\n');
      writeFileRelative(tempRoot, 'public/data/search/startup.11111111.json', '{}');
      writeFileRelative(
        tempRoot,
        'public/data/manifest.json',
        JSON.stringify({
          v: 1,
          generatedAt: '2026-01-01T00:00:00.000Z',
          files: {
            'search/startup.json': 'search/startup.11111111.json',
          },
        }),
      );

      expect(runBudgetsAudit({ projectRoot: tempRoot, bundle: false })).toBe(0);
      expect(runBudgetsAudit({ projectRoot: tempRoot, bundle: true })).toBe(1);
    });
  });
});
