import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';

export interface AuditDiagnostic {
  filePath: string;
  line: number;
  column: number;
  ruleId: string;
  severity: 'error' | 'warning';
  message: string;
  snippet: string;
  remediation: string;
}

const R3F_FILES_GLOB = ['src/components/canvas', 'src/views'];
const INVALID_R3F_TAGS = new Set(['threeline']);

/**
 * Checks whether a comment on the preceding line or current line suppresses the diagnostic.
 */
function isLineSuppressed(lines: string[], targetLine: number, ruleId: string): boolean {
  const prevLine = targetLine > 1 ? lines[targetLine - 2] : '';
  const currentLine = lines[targetLine - 1] || '';

  const checkComment = (text: string) => {
    const match = text.match(/\/\/\s*r3f-audit-disable(?:-next-line)?(?:\s+([\w-]+))?/);
    if (!match) return false;
    const specifiedRule = match[1];
    return !specifiedRule || specifiedRule === ruleId;
  };

  return checkComment(prevLine) || checkComment(currentLine);
}

/**
 * Audits a single source file for R3F and WebGL invariants.
 */
export function auditSourceFile(filePath: string, sourceText: string): AuditDiagnostic[] {
  const diagnostics: AuditDiagnostic[] = [];

  let ast: ReturnType<typeof parse>;
  try {
    ast = parse(sourceText, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const loc =
      err && typeof err === 'object' && 'loc' in err
        ? (err as { loc: { line?: number; column?: number } }).loc
        : undefined;
    diagnostics.push({
      filePath,
      line: loc?.line || 1,
      column: loc?.column || 1,
      ruleId: 'parse-error',
      severity: 'error',
      message: `Failed to parse file: ${message}`,
      snippet: '',
      remediation: 'Fix syntax error in file.',
    });
    return diagnostics;
  }

  const lines = sourceText.split('\n');

  function addDiagnostic(
    loc: { line: number; column: number } | undefined,
    ruleId: string,
    severity: 'error' | 'warning',
    message: string,
    remediation: string
  ) {
    if (!loc) return;
    if (isLineSuppressed(lines, loc.line, ruleId)) {
      return;
    }
    const snippet = (lines[loc.line - 1] || '').trim().slice(0, 80);
    diagnostics.push({
      filePath,
      line: loc.line,
      column: loc.column + 1,
      ruleId,
      severity,
      message,
      snippet,
      remediation,
    });
  }

  interface ASTNode {
    type?: string;
    loc?: { start: { line: number; column: number }; end?: { line: number; column: number } };
    callee?: ASTNode;
    arguments?: ASTNode[];
    body?: ASTNode;
    name?: string | (ASTNode & { name?: string; type?: string; loc?: { start: { line: number; column: number } } });
    property?: { name?: string; type?: string };
    [key: string]: unknown;
  }

  function simpleTraverse(node: unknown, visitor: (n: ASTNode) => void) {
    if (!node || typeof node !== 'object') return;
    const obj = node as ASTNode;
    visitor(obj);
    for (const key of Object.keys(obj)) {
      if (key === 'loc' || key === 'range' || key === 'comments') continue;
      const child = obj[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          simpleTraverse(item, visitor);
        }
      } else if (child && typeof child === 'object') {
        simpleTraverse(child, visitor);
      }
    }
  }

  simpleTraverse(ast, (node: ASTNode) => {
    // 1. Detect useFrame calls and inspect their hot-path callback bodies
    if (node.type === 'CallExpression') {
      const callee = node.callee;
      if (!callee) return;
      const callName: string =
        callee.type === 'Identifier' && typeof callee.name === 'string'
          ? callee.name
          : callee.type === 'MemberExpression' && typeof callee.property?.name === 'string'
          ? callee.property.name
          : '';

      if (callName === 'useFrame') {
        const callbackArg = node.arguments?.[0];
        if (
          callbackArg &&
          (callbackArg.type === 'ArrowFunctionExpression' ||
            callbackArg.type === 'FunctionExpression') &&
          callbackArg.body
        ) {
          auditUseFrameCallback(callbackArg.body);
        }
      }

      // 2. Detect whole-object store subscriptions: useThemeStore(state => state.tokens)
      if (
        callName === 'useThemeStore' ||
        callName === 'useStarmapStore' ||
        (callName && callName.endsWith('Store'))
      ) {
        let selectorArg = node.arguments?.[0];
        if (
          selectorArg &&
          selectorArg.type === 'CallExpression' &&
          selectorArg.callee?.type === 'Identifier' &&
          selectorArg.callee.name === 'useShallow'
        ) {
          selectorArg = selectorArg.arguments?.[0];
        }

        if (
          selectorArg &&
          (selectorArg.type === 'ArrowFunctionExpression' ||
            selectorArg.type === 'FunctionExpression')
        ) {
          const body = selectorArg.body;
          if (body && body.type === 'MemberExpression' && body.property?.type === 'Identifier') {
            if (body.property.name === 'tokens') {
              addDiagnostic(
                body.loc?.start,
                'atomic-store-selectors',
                'error',
                'Whole-object store subscription detected (`state.tokens`). Subscribing to broad state objects forces full component re-renders whenever any design token changes.',
                'Subscribe to discrete atomic tokens instead (e.g. `state => state.tokens.datumPlaneColor`).'
              );
            }
          }
        }
      }
    }

    // 3. Detect invalid JSX intrinsic tags (e.g. <threeLine>)
    if (node.type === 'JSXOpeningElement' || node.type === 'JSXSelfClosingElement') {
      const tagObj = typeof node.name === 'object' ? node.name : undefined;
      const tagNameStr = typeof node.name === 'string' ? node.name : tagObj?.name;
      if (tagObj && typeof tagNameStr === 'string') {
        const lower = tagNameStr.toLowerCase();
        if (INVALID_R3F_TAGS.has(lower)) {
          addDiagnostic(
            tagObj.loc?.start || node.loc?.start,
            'valid-r3f-intrinsics',
            'error',
            `Invalid React Three Fiber intrinsic element <${tagNameStr}> detected. R3F intrinsic tags map directly to lowercase Three.js classes.`,
            'Replace with `<line>` (maps to `THREE.Line`) or `<lineSegments>`.'
          );
        }
      }
    }
  });

  function auditUseFrameCallback(frameBody: ASTNode) {
    simpleTraverse(frameBody, (node: ASTNode) => {
      // Do not recurse into nested function definitions inside useFrame (e.g. event listeners)
      if (node !== frameBody && (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression')) {
        addDiagnostic(
          node.loc?.start,
          'no-alloc-in-use-frame',
          'error',
          'Closure or helper function defined inside `useFrame`. This recreates function allocations 60 times per second.',
          'Hoist helper functions to module scope or define outside the frame loop.'
        );
        return;
      }

      // Rule: No object literal allocations
      if (node.type === 'ObjectExpression') {
        addDiagnostic(
          node.loc?.start,
          'no-alloc-in-use-frame',
          'error',
          'Object literal `{ ... }` allocated inside high-frequency `useFrame` render loop. This causes continuous Garbage Collection pressure and frame drops.',
          'Pre-allocate a module-level or useRef scratch object and mutate its fields in-place.'
        );
      }

      // Rule: No array literal allocations
      if (node.type === 'ArrayExpression') {
        addDiagnostic(
          node.loc?.start,
          'no-alloc-in-use-frame',
          'error',
          'Array literal `[ ... ]` allocated inside `useFrame`. This creates transient GC allocations 60 times per second.',
          'Hoist static arrays to module scope or use pre-allocated Float32Array / array refs.'
        );
      }

      // Rule: No new object instantiations
      if (node.type === 'NewExpression') {
        const className =
          node.callee?.type === 'Identifier'
            ? node.callee.name
            : node.callee?.type === 'MemberExpression' && node.callee.property?.type === 'Identifier'
            ? node.callee.property.name
            : 'Object';
        addDiagnostic(
          node.loc?.start,
          'no-alloc-in-use-frame',
          'error',
          `Constructor invocation \`new ${className}()\` inside \`useFrame\`. Hot-path instantiations violate the zero-allocation 60fps budget.`,
          'Pre-allocate a scratch instance via useRef or module constant and mutate in-place (e.g. `.set()`, `.copy()`).'
        );
      }

      // Rule: No synchronous layout reads (property access)
      if (node.type === 'MemberExpression' && typeof node.property?.name === 'string') {
        const propName: string = node.property.name;
        if (['offsetWidth', 'offsetHeight', 'clientWidth', 'clientHeight', 'scrollWidth', 'scrollHeight'].includes(propName)) {
          addDiagnostic(
            node.loc?.start,
            'no-layout-in-use-frame',
            'error',
            `DOM layout measurement \`.${propName}\` inside \`useFrame\` forces synchronous reflow / layout thrashing.`,
            'Cache screen coordinates or project using 3D raycasting/unproject without querying DOM layout.'
          );
        }
      }

      // Rule: No iterators or clone calls
      if (node.type === 'CallExpression') {
        if (node.callee?.type === 'MemberExpression' && typeof node.callee.property?.name === 'string') {
          const methodName: string = node.callee.property.name;
          if (['map', 'forEach', 'filter', 'some', 'every', 'reduce'].includes(methodName)) {
            addDiagnostic(
              node.loc?.start,
              'no-alloc-in-use-frame',
              'error',
              `Array iterator callback \`.${methodName}()\` invoked inside \`useFrame\`. Iterators allocate closures on every frame.`,
              'Replace with an indexed `for` loop (`for (let i = 0; i < len; i++)`).'
            );
          } else if (methodName === 'clone') {
            addDiagnostic(
              node.loc?.start,
              'no-alloc-in-use-frame',
              'error',
              'Calling `.clone()` inside `useFrame` allocates a new instance on every frame.',
              'Copy into a pre-allocated scratch instance using `.copy()`, or read components directly.'
            );
          } else if (['getBoundingClientRect', 'offsetWidth', 'offsetHeight', 'getComputedStyle'].includes(methodName)) {
            addDiagnostic(
              node.loc?.start,
              'no-layout-in-use-frame',
              'error',
              `DOM layout measurement \`.${methodName}()\` inside \`useFrame\` forces synchronous reflow / layout thrashing.`,
              'Cache screen coordinates or project using 3D raycasting/unproject without querying DOM layout.'
            );
          }
        } else if (node.callee?.type === 'Identifier' && typeof node.callee.name === 'string') {
          const funcName: string = node.callee.name;
          if (funcName === 'getComputedStyle') {
            addDiagnostic(
              node.loc?.start,
              'no-layout-in-use-frame',
              'error',
              `DOM layout measurement \`${funcName}()\` inside \`useFrame\` forces synchronous reflow / layout thrashing.`,
              'Cache screen coordinates or project using 3D raycasting/unproject without querying DOM layout.'
            );
          } else if (/^set[A-Z]/.test(funcName)) {
            addDiagnostic(
              node.loc?.start,
              'no-setstate-in-use-frame',
              'error',
              `React state updater \`${funcName}()\` invoked inside \`useFrame\`. State updates trigger synchronous React reconciliation cycles during the WebGL draw loop.`,
              'Store per-frame animation and telemetry states in a mutable `useRef`.'
            );
          }
        }
      }
    });
  }

  return diagnostics;
}

/**
 * Recursively collects TypeScript/TSX files in target directory.
 */
function collectSourceFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist') {
        results = results.concat(collectSourceFiles(fullPath));
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      if (!entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

export const auditFile = auditSourceFile;

/**
 * Pure function: Audits target directories and returns structured diagnostics without exiting.
 */
export function runR3fAudit(targetDirs: string[] = R3F_FILES_GLOB): AuditDiagnostic[] {
  const diagnostics: AuditDiagnostic[] = [];
  const filesToScan: string[] = [];
  for (const targetDir of targetDirs) {
    if (fs.existsSync(targetDir) && fs.statSync(targetDir).isFile()) {
      filesToScan.push(targetDir);
    } else {
      filesToScan.push(...collectSourceFiles(targetDir));
    }
  }

  for (const file of filesToScan) {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('useFrame') && !content.includes('@react-three') && !content.includes('three')) {
      continue;
    }
    diagnostics.push(...auditSourceFile(file, content));
  }
  return diagnostics;
}

interface BaselineData {
  version: number;
  entries: Record<string, { count: number; audId: string }>;
}

function loadBaseline(baselinePath: string): BaselineData | null {
  if (!fs.existsSync(baselinePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as BaselineData;
  } catch {
    return null;
  }
}

/**
 * Main CLI entry point.
 */
export function runR3FAudit(): number {
  console.log('\n--- Running WebGL & React Three Fiber (R3F) Performance Audit ---');

  const diagnostics = runR3fAudit();
  const baselinePath = path.resolve('scripts/guards/baseline.json');
  const baseline = loadBaseline(baselinePath);

  // Group violations by ruleId::relPath
  const violationCounts = new Map<string, number>();
  for (const diag of diagnostics) {
    const rel = path.relative(process.cwd(), path.resolve(diag.filePath));
    const key = `${diag.ruleId}::${rel}`;
    violationCounts.set(key, (violationCounts.get(key) || 0) + 1);
  }

  let totalErrors = 0;
  let totalWarnings = 0;
  let unbaselinedErrors = 0;

  if (diagnostics.length > 0) {
    const byFile = new Map<string, AuditDiagnostic[]>();
    for (const diag of diagnostics) {
      const list = byFile.get(diag.filePath) || [];
      list.push(diag);
      byFile.set(diag.filePath, list);
    }

    for (const [file, diags] of byFile) {
      console.log(`\n📄 ${file}:`);
      for (const diag of diags) {
        const rel = path.relative(process.cwd(), path.resolve(diag.filePath));
        const key = `${diag.ruleId}::${rel}`;
        const baselineEntry = baseline?.entries[key];
        const isBaselined = baselineEntry !== undefined;

        const icon = isBaselined ? '⏳' : (diag.severity === 'error' ? '❌' : '⚠️');
        console.log(`  ${icon} Line ${diag.line}:${diag.column} [${diag.ruleId}]${isBaselined ? ` (Baselined: ${baselineEntry.audId})` : ''}`);
        console.log(`     Issue: ${diag.message}`);
        console.log(`     Code:  ${diag.snippet}`);
        console.log(`     Fix:   ${diag.remediation}`);

        if (diag.severity === 'error') {
          totalErrors++;
          if (!isBaselined) unbaselinedErrors++;
        } else {
          totalWarnings++;
        }
      }
    }
  }

  // Check if any baselined violation increased count
  if (baseline) {
    for (const [key, count] of violationCounts) {
      const baseEntry = baseline.entries[key];
      if (baseEntry && count > baseEntry.count) {
        console.log(`\n❌ Violation count regression: ${key} increased from ${baseEntry.count} to ${count}`);
        unbaselinedErrors++;
      }
    }
  }

  console.log('\n--- Audit Summary ---');
  console.log(`Total Violations:      ${diagnostics.length}`);
  console.log(`Unbaselined Errors:    ${unbaselinedErrors}`);

  if (unbaselinedErrors > 0) {
    console.log('\n❌ WebGL / R3F audit found unbaselined infractions. Resolve them or add `// r3f-audit-disable-next-line <rule-id>` if an exception is justified.\n');
    return 1;
  }

  console.log('\n✨ All WebGL & React Three Fiber invariants passed cleanly (within baseline).\n');
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const exitCode = runR3FAudit();
  process.exit(exitCode);
}
