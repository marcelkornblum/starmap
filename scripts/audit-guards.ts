import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';

export interface GuardViolation {
  ruleId: string;
  filePath: string;
  line: number;
  column: number;
  message: string;
  snippet?: string;
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

const TELEMETRY_TOKEN_SET = new Set([
  'mass',
  'radius',
  'sma',
  'eccentricity',
  'inclination',
  'period',
  'teff',
  'temp',
  'luminosity',
  'distance',
  'dist',
  'parallax',
  'metallicity',
  'age',
  'gravity',
  'density',
  'insolation',
  'albedo',
]);

export function isTelemetryIdentifier(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower.includes('semimajoraxis')) return true;
  const tokens = name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()
    .split(/_+/);
  return tokens.some((tok) => TELEMETRY_TOKEN_SET.has(tok));
}

/**
 * G-literals: Checks source for entity literal mentions and suspicious numeric fallbacks.
 */
export function auditLiteralsContent(filePath: string, content: string, catalog: EntityCatalog): GuardViolation[] {
  const normPath = filePath.replace(/\\/g, '/');
  if (normPath.includes('src/content/') || normPath.includes('src/config/')) return [];
  const violations: GuardViolation[] = [];

  let ast: ReturnType<typeof parse>;
  try {
    ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const loc =
      err && typeof err === 'object' && 'loc' in err
        ? (err as { loc?: { line?: number; column?: number } }).loc
        : undefined;
    violations.push({
      filePath,
      line: loc?.line ?? 1,
      column: (loc?.column ?? 0) + 1,
      ruleId: 'parse-error',
      message: `Failed to parse file for G-literals check: ${message}`,
    });
    return violations;
  }

  const lines = content.split('\n');
  const isTargetForNumericFallback =
    normPath.includes('src/services/') ||
    normPath.includes('src/components/canvas/') ||
    normPath.includes('src/views/');

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
      // Wire-Envelope .t Discriminator Exemption
      let isWireDiscriminator = false;
      if (
        parent &&
        parent.type === 'BinaryExpression' &&
        (parent.operator === '===' || parent.operator === '!==')
      ) {
        const other = parent.left === node ? parent.right : parent.left;
        if (
          other &&
          (other.type === 'MemberExpression' || other.type === 'OptionalMemberExpression') &&
          !other.computed
        ) {
          const prop = other.property as ASTNode | undefined;
          if (prop?.type === 'Identifier' && prop.name === 't') {
            isWireDiscriminator = true;
          }
        }
      }

      if (!isWireDiscriminator) {
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
    }

    // 2. Suspicious non-zero numeric fallback check (?? <num> / || <num>)
    if (isTargetForNumericFallback && node.type === 'LogicalExpression') {
      const op = node.operator;
      if (op === '??' || op === '||') {
        const right = node.right;
        let numVal: number | null = null;
        if (right && right.type === 'NumericLiteral' && typeof right.value === 'number') {
          numVal = right.value;
        } else if (
          right &&
          right.type === 'UnaryExpression' &&
          right.operator === '-'
        ) {
          const arg = right.argument as ASTNode | undefined;
          if (arg?.type === 'NumericLiteral' && typeof arg.value === 'number') {
            numVal = -arg.value;
          }
        }

        if (numVal !== null && numVal !== 0) {
          let shouldFlag = true;
          if (numVal === 1 || numVal === -1) {
            let hasTelemetry = false;
            if (node.left) {
              traverseAst(node.left, (childNode) => {
                if (childNode.type === 'Identifier' && typeof childNode.name === 'string') {
                  if (isTelemetryIdentifier(childNode.name)) {
                    hasTelemetry = true;
                  }
                }
              });
            }
            if (!hasTelemetry) {
              shouldFlag = false;
            }
          }

          if (shouldFlag) {
            const loc = right?.loc?.start;
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
                  message: `Suspicious non-zero numeric fallback "${op} ${numVal}". Entity telemetry and properties must not invent fallback numbers.`,
                  snippet: (lines[loc.line - 1] || '').trim(),
                });
              }
            }
          }
        }
      }
    }
  });

  return violations;
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
 * Runs G-literals domain guard across runtime source files in src/.
 */
export function runAllGuards(projectRoot = process.cwd()): GuardViolation[] {
  const allViolations: GuardViolation[] = [];
  const catalog = loadEntityCatalog(projectRoot);

  const srcDir = path.join(projectRoot, 'src');
  const srcFiles = collectAllSourceFiles(srcDir, ['.ts', '.tsx']);

  for (const file of srcFiles) {
    if (file.includes('.test.') || file.includes('.stories.')) continue;
    const content = fs.readFileSync(file, 'utf8');
    allViolations.push(...auditLiteralsContent(file, content, catalog));
  }

  return allViolations;
}

/**
 * Evaluates G-literals guard suite and returns a process exit code (0 = pass, 1 = fail).
 */
export function runGuardsAudit(projectRoot = process.cwd()): number {
  console.log('\n--- Running Starmap Domain Literal Guard Suite (G-literals) ---');

  const violations = runAllGuards(projectRoot);

  if (violations.length > 0) {
    console.error(`\n❌ Guard verification failed with ${violations.length} violation(s):`);
    for (const v of violations.slice(0, 50)) {
      const rel = path.relative(projectRoot, path.resolve(v.filePath)).replace(/\\/g, '/');
      console.error(`  - ${rel}:${v.line}:${v.column} [${v.ruleId}] ${v.message}`);
    }
    if (violations.length > 50) {
      console.error(`  ... and ${violations.length - 50} more violation(s).`);
    }
    return 1;
  }

  console.log('\n✨ All domain literal guards (G-literals) passed cleanly.');
  return 0;
}

/**
 * Fail-closed CLI runner.
 */
export function main(): void {
  try {
    const exitCode = runGuardsAudit();
    process.exit(exitCode);
  } catch (err: unknown) {
    console.error('\n❌ Guard suite aborted due to unexpected error:', err);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
