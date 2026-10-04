import fs from 'node:fs';
import path from 'node:path';
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
function isLineSuppressed(sourceText: string, targetLine: number, ruleId: string): boolean {
  const lines = sourceText.split('\n');
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
    loc: { line: number; column: number },
    ruleId: string,
    severity: 'error' | 'warning',
    message: string,
    remediation: string
  ) {
    if (isLineSuppressed(sourceText, loc.line, ruleId)) {
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

  function simpleTraverse(node: unknown, visitor: (n: any) => void) {
    if (!node || typeof node !== 'object') return;
    visitor(node);
    const obj = node as Record<string, unknown>;
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

  simpleTraverse(ast, (node: any) => {
    // 1. Detect useFrame calls and inspect their hot-path callback bodies
    if (node.type === 'CallExpression') {
      const callee = node.callee;
      const callName =
        callee.type === 'Identifier'
          ? callee.name
          : callee.type === 'MemberExpression' && callee.property?.type === 'Identifier'
          ? callee.property.name
          : '';

      if (callName === 'useFrame') {
        const callbackArg = node.arguments[0];
        if (
          callbackArg &&
          (callbackArg.type === 'ArrowFunctionExpression' ||
            callbackArg.type === 'FunctionExpression')
        ) {
          auditUseFrameCallback(callbackArg.body);
        }
      }

      // 2. Detect whole-object store subscriptions: useThemeStore(state => state.tokens)
      if (
        callName === 'useThemeStore' ||
        callName === 'useStarmapStore' ||
        callName.endsWith('Store')
      ) {
        let selectorArg = node.arguments[0];
        if (
          selectorArg &&
          selectorArg.type === 'CallExpression' &&
          selectorArg.callee?.type === 'Identifier' &&
          selectorArg.callee.name === 'useShallow'
        ) {
          selectorArg = selectorArg.arguments[0];
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
                body.loc.start,
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
      if (node.name?.type === 'JSXIdentifier') {
        const tagName = node.name.name.toLowerCase();
        if (INVALID_R3F_TAGS.has(tagName)) {
          addDiagnostic(
            node.name.loc.start,
            'valid-r3f-intrinsics',
            'error',
            `Invalid React Three Fiber intrinsic element <${node.name.name}> detected. R3F intrinsic tags map directly to lowercase Three.js classes.`,
            'Replace with `<line>` (maps to `THREE.Line`) or `<lineSegments>`.'
          );
        }
      }
    }
  });

  function auditUseFrameCallback(frameBody: any) {
    simpleTraverse(frameBody, (node: any) => {
      // Do not recurse into nested function definitions inside useFrame (e.g. event listeners)
      if (node !== frameBody && (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression')) {
        addDiagnostic(
          node.loc.start,
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
          node.loc.start,
          'no-alloc-in-use-frame',
          'error',
          'Object literal `{ ... }` allocated inside high-frequency `useFrame` render loop. This causes continuous Garbage Collection pressure and frame drops.',
          'Pre-allocate a module-level or useRef scratch object and mutate its fields in-place.'
        );
      }

      // Rule: No array literal allocations
      if (node.type === 'ArrayExpression') {
        addDiagnostic(
          node.loc.start,
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
          node.loc.start,
          'no-alloc-in-use-frame',
          'error',
          `Constructor invocation \`new ${className}()\` inside \`useFrame\`. Hot-path instantiations violate the zero-allocation 60fps budget.`,
          'Pre-allocate a scratch instance via useRef or module constant and mutate in-place (e.g. `.set()`, `.copy()`).'
        );
      }

      // Rule: No iterators or clone calls
      if (node.type === 'CallExpression') {
        if (node.callee?.type === 'MemberExpression' && node.callee.property?.type === 'Identifier') {
          const methodName = node.callee.property.name;
          if (['map', 'forEach', 'filter', 'some', 'every', 'reduce'].includes(methodName)) {
            addDiagnostic(
              node.loc.start,
              'no-alloc-in-use-frame',
              'error',
              `Array iterator callback \`.${methodName}()\` invoked inside \`useFrame\`. Iterators allocate closures on every frame.`,
              'Replace with an indexed `for` loop (`for (let i = 0; i < len; i++)`).'
            );
          } else if (methodName === 'clone') {
            addDiagnostic(
              node.loc.start,
              'no-alloc-in-use-frame',
              'error',
              'Calling `.clone()` inside `useFrame` allocates a new instance on every frame.',
              'Copy into a pre-allocated scratch instance using `.copy()`, or read components directly.'
            );
          } else if (['getBoundingClientRect', 'offsetWidth', 'offsetHeight'].includes(methodName)) {
            addDiagnostic(
              node.loc.start,
              'no-layout-in-use-frame',
              'error',
              `DOM layout measurement \`.${methodName}()\` inside \`useFrame\` forces synchronous reflow / layout thrashing.`,
              'Cache screen coordinates or project using 3D raycasting/unproject without querying DOM layout.'
            );
          }
        } else if (node.callee?.type === 'Identifier') {
          const funcName = node.callee.name;
          if (/^set[A-Z]/.test(funcName)) {
            addDiagnostic(
              node.loc.start,
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

/**
 * Main CLI entry point.
 */
export function runR3FAudit(): number {
  console.log('\n--- Running WebGL & React Three Fiber (R3F) Performance Audit ---');

  const filesToScan: string[] = [];
  for (const targetDir of R3F_FILES_GLOB) {
    filesToScan.push(...collectSourceFiles(targetDir));
  }

  let totalErrors = 0;
  let totalWarnings = 0;
  let scannedFiles = 0;

  for (const file of filesToScan) {
    const content = fs.readFileSync(file, 'utf8');
    // Fast path: only scan files that reference Three.js, R3F, or useFrame
    if (!content.includes('useFrame') && !content.includes('@react-three') && !content.includes('three')) {
      continue;
    }

    scannedFiles++;
    const diagnostics = auditSourceFile(file, content);
    if (diagnostics.length > 0) {
      console.log(`\n📄 ${file}:`);
      for (const diag of diagnostics) {
        const icon = diag.severity === 'error' ? '❌' : '⚠️';
        console.log(`  ${icon} Line ${diag.line}:${diag.column} [${diag.ruleId}]`);
        console.log(`     Issue: ${diag.message}`);
        console.log(`     Code:  ${diag.snippet}`);
        console.log(`     Fix:   ${diag.remediation}`);
        if (diag.severity === 'error') totalErrors++;
        else totalWarnings++;
      }
    }
  }

  console.log('\n--- Audit Summary ---');
  console.log(`Files Scanned: ${scannedFiles}`);
  console.log(`Errors:        ${totalErrors}`);
  console.log(`Warnings:      ${totalWarnings}`);

  if (totalErrors > 0) {
    console.log('\n❌ WebGL / R3F audit found infractions. Resolve them or add `// r3f-audit-disable-next-line <rule-id>` if an exception is justified.\n');
    return 1;
  }

  console.log('\n✨ All WebGL & React Three Fiber invariants passed cleanly.\n');
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const exitCode = runR3FAudit();
  process.exit(exitCode);
}
