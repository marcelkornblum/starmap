import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parse } from '@babel/parser';
import { runUiAudit } from './audit-ui';
import { runR3fAudit } from './audit-r3f';

export interface GuardViolation {
  ruleId: string;
  filePath: string;
  line: number;
  column: number;
  message: string;
  snippet?: string;
}

export interface GuardBaselineEntry {
  count: number;
  audId: string;
}

export interface GuardBaseline {
  version: number;
  entries: Record<string, GuardBaselineEntry>;
}

export interface EntityCatalog {
  entityIds: Set<string>;
  entityNames: Set<string>;
}

// Common generic UI/CSS/astronomical words to exclude from literal matching
const GENERIC_EXCLUSION_WORDS = new Set([
  'name', 'type', 'id', 'system', 'systems', 'planet', 'planets', 'star', 'stars',
  'moon', 'moons', 'galaxy', 'galaxies', 'core', 'belt', 'ring', 'rings', 'disk', 'disks',
  'cluster', 'group', 'orbit', 'orbits', 'view', 'guide', 'search', 'filter', 'sort',
  'light', 'dark', 'auto', 'none', 'default', 'small', 'medium', 'large', 'sm', 'md', 'lg',
  'px', 'rem', 'em', 'deg', 'rad', 'au', 'pc', 'ly', 'km', 'm', 's', 'kg', 'k', 'ms', 'fps',
  'width', 'height', 'top', 'bottom', 'left', 'right', 'center', 'middle', 'start', 'end',
  'row', 'column', 'flex', 'grid', 'block', 'inline', 'relative', 'absolute', 'fixed', 'sticky',
  'hidden', 'visible', 'pointer', 'grab', 'grabbing', 'button', 'input', 'select', 'label',
  'title', 'text', 'color', 'background', 'border', 'padding', 'margin', 'gap', 'opacity',
  'status', 'variant', 'nominal', 'caution', 'critical', 'active', 'passive', 'selected',
  'focused', 'hover', 'focus', 'click', 'change', 'keydown', 'keyup', 'keypress', 'touch',
  'wheel', 'scroll', 'resize', 'body', 'bodies', 'node', 'nodes', 'child', 'children',
]);

/**
 * Loads entity IDs and names from public/data search shards.
 */
export function loadEntityCatalog(projectRoot = process.cwd()): EntityCatalog {
  const entityIds = new Set<string>();
  const entityNames = new Set<string>();

  const searchFiles = [
    path.join(projectRoot, 'public/data/search/core.json'),
    path.join(projectRoot, 'public/data/search/stars.json'),
    path.join(projectRoot, 'public/data/search/planets.json'),
  ];

  for (const file of searchFiles) {
    if (!fs.existsSync(file)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(data.d)) {
        for (const item of data.d) {
          if (item.i && typeof item.i === 'string') {
            const id = item.i.toLowerCase();
            if (!GENERIC_EXCLUSION_WORDS.has(id) && id.length >= 3) {
              entityIds.add(id);
            }
          }
          if (item.n && typeof item.n === 'string') {
            const name = item.n.trim();
            if (!GENERIC_EXCLUSION_WORDS.has(name.toLowerCase()) && name.length >= 3) {
              entityNames.add(name);
            }
          }
        }
      }
    } catch {
      // Ignore JSON parse errors in individual shards
    }
  }

  // Ensure key benchmark celestial names are always included
  ['sol', 'earth', 'luna', 'mars', 'venus', 'jupiter', 'saturn', 'tau-ceti', 'proxima-centauri'].forEach((id) =>
    entityIds.add(id)
  );
  ['Sol', 'Earth', 'Luna', 'Mars', 'Venus', 'Jupiter', 'Saturn', 'Tau Ceti', 'Proxima Centauri'].forEach((name) =>
    entityNames.add(name)
  );

  return { entityIds, entityNames };
}

interface ASTNode {
  type?: string;
  loc?: { start: { line: number; column: number }; end?: { line: number; column: number } };
  value?: unknown;
  operator?: string;
  left?: ASTNode;
  right?: ASTNode;
  quasis?: { value?: { raw?: string } }[];
  expressions?: unknown[];
  source?: { value?: string };
  specifiers?: { type?: string; local?: { name?: string }; imported?: { name?: string } }[];
  importKind?: string;
  [key: string]: unknown;
}

function traverseAst(node: unknown, visitor: (n: ASTNode, parent?: ASTNode) => void, parent?: ASTNode) {
  if (!node || typeof node !== 'object') return;
  const obj = node as ASTNode;
  visitor(obj, parent);
  for (const key of Object.keys(obj)) {
    if (key === 'loc' || key === 'range' || key === 'comments') continue;
    const child = obj[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        traverseAst(item, visitor, obj);
      }
    } else if (child && typeof child === 'object') {
      traverseAst(child, visitor, obj);
    }
  }
}

/**
 * Checks suppression comment and enforces required reason (-- <reason>).
 */
function checkSuppression(lines: string[], targetLine: number, ruleId: string): { suppressed: boolean; invalidComment?: string } {
  const prevLine = targetLine > 1 ? lines[targetLine - 2] : '';
  const currentLine = lines[targetLine - 1] || '';

  const check = (text: string) => {
    const match = text.match(/(?:\/\/|\/\*)\s*guard-disable(?:-next-line)?(?:\s+([\w-]+))?(.*)/);
    if (!match) return null;
    const specifiedRule = match[1];
    const rest = match[2]?.trim() || '';

    if (specifiedRule && specifiedRule !== ruleId) {
      return null;
    }

    // Require '-- <reason>'
    const reasonMatch = rest.match(/^--\s+(\S+.*)/);
    if (!reasonMatch) {
      return { suppressed: false, invalid: true };
    }
    return { suppressed: true, invalid: false };
  };

  const resPrev = check(prevLine);
  if (resPrev) {
    if (resPrev.invalid) return { suppressed: false, invalidComment: prevLine.trim() };
    if (resPrev.suppressed) return { suppressed: true };
  }

  const resCurr = check(currentLine);
  if (resCurr) {
    if (resCurr.invalid) return { suppressed: false, invalidComment: currentLine.trim() };
    if (resCurr.suppressed) return { suppressed: true };
  }

  return { suppressed: false };
}

/**
 * G-literals: Checks source for entity literal mentions and suspicious numeric fallbacks.
 */
export function auditLiteralsContent(filePath: string, content: string, catalog: EntityCatalog): GuardViolation[] {
  const violations: GuardViolation[] = [];

  let ast: ReturnType<typeof parse>;
  try {
    ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });
  } catch {
    return violations;
  }

  const lines = content.split('\n');
  const isTargetForNumericFallback =
    filePath.includes('src/services/') ||
    filePath.includes('src/components/canvas/') ||
    filePath.includes('src/views/');

  traverseAst(ast, (node: ASTNode, parent?: ASTNode) => {
    // Skip string literals that are the source of an import or export
    if (
      parent &&
      (parent.type === 'ImportDeclaration' ||
        parent.type === 'ExportNamedDeclaration' ||
        parent.type === 'ExportAllDeclaration' ||
        parent.type === 'ImportExpression') &&
      parent.source === node
    ) {
      return;
    }

    // 1. Literal Entity IDs and Display Names (StringLiteral and 0-expression TemplateLiteral)
    let val: string | null = null;
    if (node.type === 'StringLiteral' && typeof node.value === 'string') {
      val = node.value.trim();
    } else if (
      node.type === 'TemplateLiteral' &&
      (!node.expressions || node.expressions.length === 0) &&
      Array.isArray(node.quasis) &&
      node.quasis.length === 1
    ) {
      const q = node.quasis[0] as { value?: { cooked?: string; raw?: string } };
      val = (q.value?.cooked ?? q.value?.raw ?? '').trim();
    }

    if (val !== null) {
      const valLower = val.toLowerCase();
      const matchesEntity = catalog.entityIds.has(valLower) || catalog.entityNames.has(val);
      if (matchesEntity) {
        const loc = node.loc?.start;
        if (loc) {
          const supp = checkSuppression(lines, loc.line, 'G-literals');
          if (supp.invalidComment) {
            violations.push({
              filePath,
              line: loc.line,
              column: loc.column + 1,
              ruleId: 'G-literals',
              message: `Suppression comment "${supp.invalidComment}" without a required reason (-- <reason>) is forbidden.`,
              snippet: (lines[loc.line - 1] || '').trim(),
            });
          } else if (!supp.suppressed) {
            violations.push({
              filePath,
              line: loc.line,
              column: loc.column + 1,
              ruleId: 'G-literals',
              message: `Hardcoded celestial entity literal "${val}" found in runtime code. Read from build-time data or precalculated shards.`,
              snippet: (lines[loc.line - 1] || '').trim(),
            });
          }
        }
      }
    }

    // 2. Suspicious non-zero numeric fallback check (?? <num> / || <num>)
    if (isTargetForNumericFallback && node.type === 'LogicalExpression') {
      const op = node.operator;
      if (op === '??' || op === '||') {
        const right = node.right;
        if (right && right.type === 'NumericLiteral' && typeof right.value === 'number' && right.value !== 0) {
          const loc = right.loc?.start;
          if (loc) {
            const supp = checkSuppression(lines, loc.line, 'G-literals');
            if (supp.invalidComment) {
              violations.push({
                filePath,
                line: loc.line,
                column: loc.column + 1,
                ruleId: 'G-literals',
                message: `Suppression comment without a required reason (-- <reason>) is forbidden.`,
                snippet: (lines[loc.line - 1] || '').trim(),
              });
            } else if (!supp.suppressed) {
              violations.push({
                filePath,
                line: loc.line,
                column: loc.column + 1,
                ruleId: 'G-literals',
                message: `Suspicious non-zero numeric fallback "${op} ${right.value}". Entity telemetry and properties must not invent fallback numbers.`,
                snippet: (lines[loc.line - 1] || '').trim(),
              });
            }
          }
        }
      }
    }
  });

  return violations;
}

// Layer rank hierarchy
const LAYER_HIERARCHY: { name: string; prefix: string; rank: number }[] = [
  { name: 'types', prefix: 'src/types', rank: 0 },
  { name: 'utils', prefix: 'src/utils', rank: 1 },
  { name: 'data', prefix: 'src/data', rank: 2 },
  { name: 'services', prefix: 'src/services', rank: 3 },
  { name: 'stores', prefix: 'src/stores', rank: 4 },
  { name: 'hooks', prefix: 'src/hooks', rank: 5 },
  { name: 'components/interface', prefix: 'src/components/interface', rank: 6 },
  { name: 'components/canvas', prefix: 'src/components/canvas', rank: 7 },
  { name: 'components/domain', prefix: 'src/components/domain', rank: 8 },
  { name: 'components/search', prefix: 'src/components/search', rank: 8 },
  { name: 'views', prefix: 'src/views', rank: 9 },
  { name: 'router', prefix: 'src/router', rank: 10 },
  { name: 'router', prefix: 'src/App.tsx', rank: 10 },
  { name: 'router', prefix: 'src/main.tsx', rank: 10 },
];

function getLayer(filePath: string): { name: string; rank: number } | null {
  const norm = filePath.replace(/\\/g, '/');
  if (norm.includes('src/components/prototypes') || norm.includes('src/prototypes')) {
    return { name: 'prototypes', rank: 99 };
  }
  for (const layer of LAYER_HIERARCHY) {
    if (norm.includes(layer.prefix)) {
      return { name: layer.name, rank: layer.rank };
    }
  }
  return null;
}

/**
 * G-imports: Audits file for layer boundary violations.
 */
export function auditImportsContent(filePath: string, content: string, projectRoot = process.cwd()): GuardViolation[] {
  const violations: GuardViolation[] = [];

  let ast: ReturnType<typeof parse>;
  try {
    ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });
  } catch {
    return violations;
  }

  const sourceLayer = getLayer(filePath);
  if (!sourceLayer) return violations;

  const lines = content.split('\n');
  const fileDir = path.dirname(path.resolve(projectRoot, filePath));

  traverseAst(ast, (node: ASTNode) => {
    if (node.type === 'ImportDeclaration' || node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') {
      const sourceVal = node.source?.value;
      if (!sourceVal || typeof sourceVal !== 'string') return;

      // Only check relative or workspace-local imports
      if (!sourceVal.startsWith('.') && !sourceVal.startsWith('/')) return;

      const resolvedPath = path.resolve(fileDir, sourceVal);
      const relTarget = path.relative(projectRoot, resolvedPath).replace(/\\/g, '/');
      const targetLayer = getLayer(relTarget);
      if (!targetLayer) return;

      const loc = node.loc?.start;
      if (!loc) return;

      const supp = checkSuppression(lines, loc.line, 'G-imports');
      if (supp.invalidComment) {
        violations.push({
          filePath,
          line: loc.line,
          column: loc.column + 1,
          ruleId: 'G-imports',
          message: `Suppression comment "${supp.invalidComment}" without a required reason (-- <reason>) is forbidden.`,
          snippet: (lines[loc.line - 1] || '').trim(),
        });
        return;
      }
      if (supp.suppressed) return;

      // 1. Prototypes isolation rule
      if (targetLayer.name === 'prototypes' && sourceLayer.name !== 'prototypes') {
        violations.push({
          filePath,
          line: loc.line,
          column: loc.column + 1,
          ruleId: 'G-imports',
          message: `Prototypes is isolated; file cannot import from prototypes: "${sourceVal}"`,
          snippet: (lines[loc.line - 1] || '').trim(),
        });
        return;
      }

      // 2. components/interface cannot import data, services, or stores
      if (sourceLayer.name === 'components/interface') {
        if (targetLayer.name === 'data' || targetLayer.name === 'services' || targetLayer.name === 'stores') {
          violations.push({
            filePath,
            line: loc.line,
            column: loc.column + 1,
            ruleId: 'G-imports',
            message: `Layer "components/interface" cannot import from "${targetLayer.name}": "${sourceVal}"`,
            snippet: (lines[loc.line - 1] || '').trim(),
          });
          return;
        }
      }

      // 3. Upward layer forbidden
      if (targetLayer.rank > sourceLayer.rank) {
        violations.push({
          filePath,
          line: loc.line,
          column: loc.column + 1,
          ruleId: 'G-imports',
          message: `Layer "${sourceLayer.name}" cannot import from higher layer "${targetLayer.name}": "${sourceVal}"`,
          snippet: (lines[loc.line - 1] || '').trim(),
        });
      }
    }
  });

  return violations;
}

/**
 * G-size: File size check.
 */
export function auditFileSize(filePath: string, lineCount: number): GuardViolation[] {
  const norm = filePath.replace(/\\/g, '/');
  if (norm.includes('.test.') || norm.includes('.stories.')) return [];

  if (norm.includes('src/components/') || norm.includes('src/views/')) {
    if (lineCount > 300) {
      return [
        {
          ruleId: 'G-size',
          filePath,
          line: 1,
          column: 1,
          message: `Component or view file exceeds 300 lines ceiling (${lineCount} lines). Decompose into sub-components.`,
        },
      ];
    }
  }

  if (norm.includes('src/services/') || norm.includes('src/utils/')) {
    if (lineCount > 500) {
      return [
        {
          ruleId: 'G-size',
          filePath,
          line: 1,
          column: 1,
          message: `Service or util module exceeds 500 lines ceiling (${lineCount} lines). Decompose into focused modules.`,
        },
      ];
    }
  }

  return [];
}

/**
 * Infers an appropriate AUD-NNN tag for a violation key.
 */
function inferAudId(key: string): string {
  if (key.startsWith('missing-component-quad::')) return 'AUD-122';
  if (key.startsWith('hardcoded-css-token::') || key.startsWith('missing-layer-blocks::') || key.startsWith('hardcoded-hex-color::') || key.startsWith('forbidden-outer-margin::')) {
    return 'AUD-121';
  }
  if (key.startsWith('forbidden-raw-element::')) return 'AUD-123';
  if (key.startsWith('forbidden-dynamic-classname::')) return 'AUD-125';
  if (key.startsWith('forbidden-inline-style::')) {
    return key.includes('EntityLabel') ? 'AUD-113' : 'AUD-121';
  }
  if (key.startsWith('file-size-exceeded::') || key.startsWith('G-size::') || key.startsWith('eslint(max-lines)::')) {
    return 'AUD-120';
  }
  if (key.startsWith('no-layout-in-use-frame::')) return 'AUD-104';
  if (key.startsWith('no-alloc-in-use-frame::')) return 'AUD-106';
  if (key.startsWith('no-setstate-in-use-frame::')) return 'AUD-108';
  if (key.startsWith('atomic-store-selectors::')) {
    return key.includes('SceneBridge') ? 'AUD-101' : 'AUD-003';
  }
  if (key.startsWith('no-material-memo-color-deps::')) return 'AUD-103';
  if (key.startsWith('no-inline-jsx-geometry::')) return 'AUD-102';
  if (key.startsWith('import(no-cycle)::') || key.startsWith('G-imports-cycle::')) return 'AUD-032';
  if (key.includes('only-export-components')) return 'AUD-129';
  if (key.includes('react(refs)') || key.includes('react(immutability)')) return 'AUD-105';
  if (key.includes('react(globals)')) return 'AUD-145';

  if (key.startsWith('eslint(no-restricted-imports)::')) {
    if (key.includes('searchRepository')) return 'AUD-031';
    if (key.includes('useCanvasStageStore')) return 'AUD-034';
    if (key.includes('SpectralBadge')) return 'AUD-035';
    if (key.includes('PaletteShowcase') || key.includes('prototypes')) return 'AUD-036';
    return 'AUD-030';
  }

  if (key.startsWith('G-literals::')) {
    if (key.includes('guideCatalog')) return 'AUD-045';
    if (key.includes('guideService')) return 'AUD-060';
    if (key.includes('journeyService')) return 'AUD-061';
    if (key.includes('details/')) return 'AUD-062';
    if (key.includes('PlanetScene')) return 'AUD-063';
    if (key.includes('GalaxyScene')) return 'AUD-064';
    if (key.includes('CanvasLayer') || key.includes('SystemScene')) return 'AUD-072';
    return 'AUD-020';
  }

  if (key.startsWith('G-imports::')) {
    if (key.includes('searchRepository')) return 'AUD-031';
    if (key.includes('useCanvasStageStore')) return 'AUD-034';
    if (key.includes('SpectralBadge')) return 'AUD-035';
    if (key.includes('PaletteShowcase') || key.includes('prototypes')) return 'AUD-036';
    return 'AUD-030';
  }

  return 'AUD-004';
}

/**
 * Baseline comparison and ratcheting logic (DEC-R010).
 */
export function compareBaseline(
  violations: GuardViolation[],
  baseline: GuardBaseline,
  options: { update?: boolean; initBaseline?: boolean } = {}
): {
  success: boolean;
  unbaselinedErrors: { key: string; message: string }[];
  updatedBaseline?: GuardBaseline;
} {
  const unbaselinedErrors: { key: string; message: string }[] = [];
  const actualCounts = new Map<string, number>();

  for (const v of violations) {
    const rel = path.relative(process.cwd(), path.resolve(v.filePath)).replace(/\\/g, '/');
    const key = `${v.ruleId}::${rel}`;
    actualCounts.set(key, (actualCounts.get(key) || 0) + 1);
  }

  // If initBaseline: build fresh baseline from actual counts
  if (options.initBaseline) {
    const newEntries: Record<string, GuardBaselineEntry> = {};
    for (const [key, count] of actualCounts) {
      newEntries[key] = {
        count,
        audId: inferAudId(key),
      };
    }
    return {
      success: true,
      unbaselinedErrors: [],
      updatedBaseline: { version: 1, entries: newEntries },
    };
  }

  // Validate baseline AUD tags
  for (const [key, entry] of Object.entries(baseline.entries)) {
    if (!entry.audId || !/^AUD-\d{3}$/.test(entry.audId)) {
      unbaselinedErrors.push({
        key,
        message: `Baseline entry "${key}" is missing a valid AUD-NNN tag (found "${entry.audId}").`,
      });
    }
  }

  // Normal comparison mode
  if (!options.update) {
    // 1. Check for unbaselined violations
    for (const [key, count] of actualCounts) {
      const baseEntry = baseline.entries[key];
      if (!baseEntry) {
        unbaselinedErrors.push({
          key,
          message: `Unbaselined violation: "${key}" (${count} violation${count === 1 ? '' : 's'}).`,
        });
      } else if (count > baseEntry.count) {
        unbaselinedErrors.push({
          key,
          message: `Violation count regression: "${key}" increased from ${baseEntry.count} to ${count}.`,
        });
      }
    }

    return {
      success: unbaselinedErrors.length === 0,
      unbaselinedErrors,
    };
  }

  // Update mode: ratchets downward only, prunes 0 counts
  const updatedEntries: Record<string, GuardBaselineEntry> = {};

  // Check that no new entries or count increases exist
  for (const [key, count] of actualCounts) {
    const baseEntry = baseline.entries[key];
    if (!baseEntry) {
      unbaselinedErrors.push({
        key,
        message: `Cannot add new entry in update mode without --init-baseline: "${key}".`,
      });
    } else if (count > baseEntry.count) {
      unbaselinedErrors.push({
        key,
        message: `Cannot increase baseline count in update mode: "${key}" increased from ${baseEntry.count} to ${count}.`,
      });
    } else {
      updatedEntries[key] = {
        count, // ratcheted down to actualCount
        audId: baseEntry.audId,
      };
    }
  }

  return {
    success: unbaselinedErrors.length === 0,
    unbaselinedErrors,
    updatedBaseline: { version: 1, entries: updatedEntries },
  };
}

/**
 * Collects all source files in directory matching extensions.
 */
function collectAllSourceFiles(dir: string, exts: string[]): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        results = results.concat(collectAllSourceFiles(full, exts));
      }
    } else if (entry.isFile()) {
      if (exts.some((ext) => entry.name.endsWith(ext))) {
        results.push(full);
      }
    }
  }
  return results;
}

/**
 * Detects import cycles using DFS over the source dependency graph.
 */
export function detectImportCycles(srcFiles: string[], projectRoot: string): GuardViolation[] {
  const violations: GuardViolation[] = [];
  const graph = new Map<string, string[]>();

  for (const file of srcFiles) {
    if (file.includes('.test.') || file.includes('.stories.')) continue;
    const content = fs.readFileSync(file, 'utf8');
    const imports: string[] = [];

    try {
      const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });
      traverseAst(ast, (node: ASTNode) => {
        if (
          node.type === 'ImportDeclaration' ||
          node.type === 'ExportNamedDeclaration' ||
          node.type === 'ExportAllDeclaration'
        ) {
          if (node.importKind === 'type' || node.exportKind === 'type') return;
          const imp = node.source?.value;
          if (!imp || typeof imp !== 'string' || !imp.startsWith('.')) return;
          const resolved = path.resolve(path.dirname(file), imp);
          for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
            const cand = resolved + ext;
            if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
              imports.push(cand);
              break;
            }
          }
        }
      });
    } catch {
      // Ignore unparseable files
    }
    graph.set(file, imports);
  }

  // DFS cycle detection
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string, stack: string[]) {
    visited.add(node);
    inStack.add(node);
    stack.push(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, stack);
      } else if (inStack.has(neighbor)) {
        // Cycle detected
        const cycleStart = stack.indexOf(neighbor);
        const cyclePath = stack.slice(cycleStart).concat(neighbor);
        violations.push({
          ruleId: 'G-imports-cycle',
          filePath: node,
          line: 1,
          column: 1,
          message: `Import cycle detected: ${cyclePath.map((p) => path.relative(projectRoot, p)).join(' -> ')}`,
        });
      }
    }

    stack.pop();
    inStack.delete(node);
  }

  for (const file of graph.keys()) {
    if (!visited.has(file)) {
      dfs(file, []);
    }
  }

  return violations;
}

/**
 * Runs full structural guard suite.
 */
export function runAllGuards(projectRoot = process.cwd()): GuardViolation[] {
  const allViolations: GuardViolation[] = [];
  const catalog = loadEntityCatalog(projectRoot);

  const srcDir = path.join(projectRoot, 'src');
  const srcFiles = collectAllSourceFiles(srcDir, ['.ts', '.tsx']);

  // 1. G-literals & G-imports & G-size
  for (const file of srcFiles) {
    if (file.includes('.test.') || file.includes('.stories.')) continue;
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    // G-size
    allViolations.push(...auditFileSize(file, lines.length));

    // G-literals
    allViolations.push(...auditLiteralsContent(file, content, catalog));

    // G-imports
    allViolations.push(...auditImportsContent(file, content, projectRoot));
  }

  // 2. G-imports-cycle
  allViolations.push(...detectImportCycles(srcFiles, projectRoot));

  // 3. G-ui (from audit-ui)
  const uiDiags = runUiAudit();
  for (const d of uiDiags) {
    allViolations.push({
      ruleId: d.ruleId,
      filePath: d.filePath,
      line: d.line,
      column: d.column,
      message: d.message,
      snippet: d.snippet,
    });
  }

  // 4. G-r3f (from audit-r3f)
  const r3fDiags = runR3fAudit();
  for (const d of r3fDiags) {
    allViolations.push({
      ruleId: d.ruleId,
      filePath: d.filePath,
      line: d.line,
      column: d.column,
      message: d.message,
      snippet: d.snippet,
    });
  }

  // 5. G-lint-warnings (from oxlint)
  let oxlintOutput: string | null = null;
  try {
    oxlintOutput = execFileSync('npx', ['--no-install', 'oxlint', '--format', 'json'], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'stdout' in err) {
      const stdout = (err as { stdout?: string | Buffer }).stdout;
      if (stdout) {
        oxlintOutput = typeof stdout === 'string' ? stdout : stdout.toString('utf8');
      }
    }
  }

  if (oxlintOutput) {
    try {
      const parsed: unknown = JSON.parse(oxlintOutput);
      if (parsed && typeof parsed === 'object' && 'diagnostics' in parsed && Array.isArray((parsed as { diagnostics: unknown[] }).diagnostics)) {
        for (const diag of (parsed as { diagnostics: Array<{ severity?: string; code?: string; filename?: string; message?: string; labels?: Array<{ span?: { line?: number; column?: number } }> }> }).diagnostics) {
          if (
            diag &&
            (diag.severity === 'warning' ||
              diag.severity === 'error' ||
              diag.severity === 'deny' ||
              diag.severity === 'warn')
          ) {
            const ruleCode = diag.code || 'oxlint-warning';
            allViolations.push({
              ruleId: ruleCode,
              filePath: diag.filename || 'unknown',
              line: diag.labels?.[0]?.span?.line || 1,
              column: diag.labels?.[0]?.span?.column || 1,
              message: diag.message || '',
            });
          }
        }
      }
    } catch {
      // Ignore oxlint failure in runner if tool unavailable or stdout not json
    }
  }

  return allViolations;
}

export function isGuardBaseline(val: unknown): val is GuardBaseline {
  if (!val || typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  if (typeof obj.version !== 'number') return false;
  if (!obj.entries || typeof obj.entries !== 'object' || Array.isArray(obj.entries)) return false;
  const entries = obj.entries as Record<string, unknown>;
  for (const [k, v] of Object.entries(entries)) {
    if (typeof k !== 'string') return false;
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
    const entry = v as Record<string, unknown>;
    if (typeof entry.count !== 'number' || typeof entry.audId !== 'string') return false;
  }
  return true;
}

/**
 * CLI runner.
 */
export function main(): void {
  const args = process.argv.slice(2);
  const isUpdate = args.includes('--update');
  const isInit = args.includes('--init-baseline');
  const baselinePath = path.resolve('scripts/guards/baseline.json');

  console.log('\n--- Running Starmap Structural & Domain Guard Suite ---');

  const violations = runAllGuards();

  let baseline: GuardBaseline = { version: 1, entries: {} };
  if (fs.existsSync(baselinePath)) {
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
      if (isGuardBaseline(parsed)) {
        baseline = parsed;
      } else {
        console.error(`Invalid baseline.json schema.`);
      }
    } catch (e) {
      console.error(`Failed to read baseline.json:`, e);
    }
  }

  const result = compareBaseline(violations, baseline, { update: isUpdate, initBaseline: isInit });

  if (isInit || (isUpdate && result.updatedBaseline)) {
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(baselinePath, JSON.stringify(result.updatedBaseline, null, 2) + '\n');
    console.log(`\n💾 Saved updated baseline to ${baselinePath} (${Object.keys(result.updatedBaseline?.entries || {}).length} entries).`);
  }

  if (!result.success) {
    console.error(`\n❌ Guard verification failed with ${result.unbaselinedErrors.length} unbaselined error(s):`);
    for (const err of result.unbaselinedErrors.slice(0, 50)) {
      console.error(`  - ${err.message}`);
    }
    if (result.unbaselinedErrors.length > 50) {
      console.error(`  ... and ${result.unbaselinedErrors.length - 50} more errors.`);
    }
    process.exit(1);
  }

  console.log(`\n✨ All structural guards passed cleanly within committed baseline (${violations.length} baselined violations).`);
  process.exit(0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
