import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = path.resolve(process.cwd(), 'src');
const FORBIDDEN_MODULES = new Set([
  path.resolve(SRC_ROOT, 'utils/planetaryPhysics.ts'),
  path.resolve(SRC_ROOT, 'utils/astroHazards.ts'),
  path.resolve(SRC_ROOT, 'utils/astroPrecalculation.ts'),
]);

const ALLOWED_EXACT_IMPORTERS = new Set([
  path.resolve(SRC_ROOT, 'utils/astroHazards.ts'),
  path.resolve(SRC_ROOT, 'utils/astroPrecalculation.ts'),
]);

function collectRuntimeFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectRuntimeFiles(fullPath, out);
    } else if (
      entry.isFile() &&
      /\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.test.tsx') &&
      !entry.name.endsWith('.stories.ts') &&
      !entry.name.endsWith('.stories.tsx')
    ) {
      out.push(fullPath);
    }
  }
  return out;
}

function extractImportSpecifiers(content: string): string[] {
  const specs: string[] = [];
  const regex = /(?:import|export)\s+(?:type\s+)?(?:[^'"`]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  for (const match of content.matchAll(regex)) {
    if (match[1]) specs.push(match[1]);
  }
  return specs;
}

describe('Runtime Purity Guard (H2)', () => {
  it('verifies zero non-test runtime files under src/ import planetaryPhysics, astroHazards, or astroPrecalculation', () => {
    const runtimeFiles = collectRuntimeFiles(SRC_ROOT);
    const violations: string[] = [];

    for (const filePath of runtimeFiles) {
      if (ALLOWED_EXACT_IMPORTERS.has(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf8');
      const specifiers = extractImportSpecifiers(content);

      for (const spec of specifiers) {
        if (!spec.startsWith('.')) continue;
        const resolvedBase = path.resolve(path.dirname(filePath), spec);
        const candidates = [
          resolvedBase,
          `${resolvedBase}.ts`,
          `${resolvedBase}.tsx`,
          path.join(resolvedBase, 'index.ts'),
        ];
        if (candidates.some((cand) => FORBIDDEN_MODULES.has(cand))) {
          violations.push(`${path.relative(process.cwd(), filePath)} imports ${spec}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
