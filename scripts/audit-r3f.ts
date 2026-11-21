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

export const R3F_FILES_GLOB = [
  'src/components/canvas',
  'src/components/domain',
  'src/hooks',
  'src/views',
  'src/router',
];
const SANCTIONED_CANVAS_HOSTS = [
  'src/components/domain/CanvasLayer/CanvasWebGLHost.tsx',
  'src/components/canvas/scenes/StandaloneSceneShell.tsx',
  'src/components/canvas/scenes/InteractiveNavigator.tsx',
];
const INVALID_R3F_TAGS = new Set(['threeline']);
const POINTER_EVENT_HANDLERS = new Set([
  'onClick',
  'onDoubleClick',
  'onPointerOver',
  'onPointerOut',
  'onPointerMove',
  'onPointerDown',
  'onPointerUp',
  'onPointerEnter',
  'onPointerLeave',
  'onPointerMissed',
]);

/**
 * Checks whether a comment on the preceding line or current line suppresses the diagnostic.
 */
function checkSuppression(text: string, ruleId: string): { suppressed: boolean; invalid: boolean } | null {
  const match = text.match(/(?:\/\/|\/\*)\s*r3f-audit-disable(?:-next-line)?(?:\s+([\w-]+))?(.*)/);
  if (!match) return null;
  const specifiedRule = match[1];
  const rest = match[2]?.trim() || '';

  if (specifiedRule && specifiedRule !== ruleId) {
    return null;
  }

  const reasonMatch = rest.match(/^--\s+(\S+.*)/);
  if (!reasonMatch) {
    return { suppressed: false, invalid: true };
  }
  return { suppressed: true, invalid: false };
}

function isLineSuppressed(lines: string[], targetLine: number, ruleId: string): boolean {
  const prevLine = targetLine > 1 ? lines[targetLine - 2] : '';
  const currentLine = lines[targetLine - 1] || '';

  const resPrev = checkSuppression(prevLine, ruleId);
  if (resPrev && resPrev.suppressed) return true;

  const resCurr = checkSuppression(currentLine, ruleId);
  if (resCurr && resCurr.suppressed) return true;

  return false;
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

  // Check for unreasoned r3f-audit-disable comments
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/(?:\/\/|\/\*)\s*r3f-audit-disable(?:-next-line)?(?:\s+([\w-]+))?(.*)/);
    if (match) {
      const rest = match[2]?.trim() || '';
      if (!rest.match(/^--\s+(\S+.*)/)) {
        const commentIdx = line.indexOf('//') >= 0 ? line.indexOf('//') : line.indexOf('/*');
        diagnostics.push({
          filePath,
          line: i + 1,
          column: (commentIdx >= 0 ? commentIdx : 0) + 1,
          ruleId: 'invalid-suppression',
          severity: 'error',
          message: `Suppression comment "${line.trim()}" without a required reason (-- <reason>) is forbidden.`,
          snippet: line.trim().slice(0, 80),
          remediation: 'Provide a clear technical justification after "-- <reason>".',
        });
      }
    }
  }

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
    params?: ASTNode[];
    body?: ASTNode | ASTNode[];
    name?: string | (ASTNode & { name?: string; type?: string; loc?: { start: { line: number; column: number } } });
    property?: { name?: string; type?: string };
    elements?: ASTNode[];
    [key: string]: unknown;
  }

  function getConstructorName(callee: ASTNode | undefined): string {
    if (!callee) return '';
    if (callee.type === 'Identifier' && typeof callee.name === 'string') {
      return callee.name;
    }
    if (callee.type === 'MemberExpression' && callee.property && typeof callee.property.name === 'string') {
      return callee.property.name;
    }
    return '';
  }

  function hasNewMaterial(factoryNode: ASTNode | undefined): boolean {
    if (!factoryNode) return false;
    let found = false;
    const check = (n: unknown) => {
      if (!n || typeof n !== 'object' || found) return;
      const obj = n as ASTNode;
      if (obj.type === 'NewExpression' && getConstructorName(obj.callee).endsWith('Material')) {
        found = true;
        return;
      }
      for (const k of Object.keys(obj)) {
        if (k === 'loc' || k === 'range' || k === 'comments') continue;
        const child = obj[k];
        if (Array.isArray(child)) {
          for (const item of child) check(item);
        } else if (child && typeof child === 'object') {
          check(child);
        }
      }
    };
    check(factoryNode);
    return found;
  }

  let insideUseMemoDepth = 0;
  let insideJsxExprDepth = 0;
  const normalizedPath = filePath.replace(/\\/g, '/');
  const isProductionFile = !/\.(?:stories|test)\.[jt]sx?$/.test(normalizedPath);
  const isCanvasProductionFile =
    /(?:^|\/)src\/components\/canvas\//.test(normalizedPath) && isProductionFile;

  function isGpuResourceConstructor(ctorName: string): boolean {
    return (
      ctorName.endsWith('Geometry') ||
      ctorName.endsWith('Material') ||
      ctorName.endsWith('Texture') ||
      ctorName === 'WebGLRenderTarget'
    );
  }

  function hasDisposeCleanupCall(rootNode: ASTNode): boolean {
    let found = false;
    simpleTraverse(rootNode, (n: ASTNode) => {
      if (found) return;
      if (n.type === 'CallExpression' || n.type === 'OptionalCallExpression') {
        const callee = n.callee as ASTNode | undefined;
        if (
          (callee?.type === 'MemberExpression' || callee?.type === 'OptionalMemberExpression') &&
          callee.property?.type === 'Identifier' &&
          callee.property.name === 'dispose'
        ) {
          found = true;
        } else if (
          callee?.type === 'Identifier' &&
          typeof callee.name === 'string' &&
          (callee.name === 'dispose' || /^dispose[A-Z]/.test(callee.name))
        ) {
          found = true;
        }
      }
    });
    return found;
  }

  const fileHasDispose = isCanvasProductionFile
    ? hasDisposeCleanupCall(ast as unknown as ASTNode)
    : true;

  function isFrameloopAlwaysValue(attr: ASTNode): boolean {
    const val = attr.value as ASTNode | null | undefined;
    if (!val) return false;
    if (val.type === 'StringLiteral' && val.value === 'always') return true;
    if (val.type === 'JSXExpressionContainer') {
      const expr = val.expression as ASTNode | undefined;
      if (expr?.type === 'StringLiteral' && expr.value === 'always') return true;
      if (
        expr?.type === 'TemplateLiteral' &&
        Array.isArray(expr.expressions) &&
        expr.expressions.length === 0 &&
        Array.isArray(expr.quasis) &&
        expr.quasis.length === 1
      ) {
        const quasi = expr.quasis[0] as { value?: { cooked?: string; raw?: string } };
        const text = quasi.value?.cooked ?? quasi.value?.raw;
        if (text === 'always') return true;
      }
    }
    return false;
  }

  function hasRaycastNoopAssignment(scopeNode: ASTNode, targetVarName: string): boolean {
    let found = false;
    simpleTraverse(scopeNode, (n: ASTNode) => {
      if (found || n.type !== 'AssignmentExpression' || n.operator !== '=') return;
      const left = n.left as ASTNode | undefined;
      const right = n.right as ASTNode | undefined;
      if (
        left?.type === 'MemberExpression' &&
        !left.computed &&
        (left.object as ASTNode | undefined)?.type === 'Identifier' &&
        ((left.object as ASTNode).name as string | undefined) === targetVarName &&
        left.property?.type === 'Identifier' &&
        left.property.name === 'raycast' &&
        right?.type === 'Identifier' &&
        right.name === 'NOOP_RAYCAST'
      ) {
        found = true;
      }
    });
    return found;
  }

  function hasNoopRaycastOrPointerHandler(openingEl: ASTNode): boolean {
    const attrs = Array.isArray(openingEl.attributes) ? (openingEl.attributes as ASTNode[]) : [];
    for (const attr of attrs) {
      if (attr.type !== 'JSXAttribute') continue;
      const attrNameNode = typeof attr.name === 'object' ? (attr.name as ASTNode) : undefined;
      const attrName = typeof attrNameNode?.name === 'string' ? attrNameNode.name : '';
      if (POINTER_EVENT_HANDLERS.has(attrName)) return true;
      if (attrName === 'raycast') {
        const val = attr.value as ASTNode | undefined;
        if (
          val?.type === 'JSXExpressionContainer' &&
          (val.expression as ASTNode | undefined)?.type === 'Identifier' &&
          ((val.expression as ASTNode).name as string | undefined) === 'NOOP_RAYCAST'
        ) {
          return true;
        }
      }
    }
    return false;
  }

  const scopeStack: ASTNode[] = [];

  function traverseAst(node: unknown, parent?: ASTNode) {
    if (!node || typeof node !== 'object') return;
    const obj = node as ASTNode;

    const pushesScope =
      obj.type === 'Program' ||
      obj.type === 'BlockStatement' ||
      obj.type === 'FunctionDeclaration' ||
      obj.type === 'FunctionExpression' ||
      obj.type === 'ArrowFunctionExpression';
    if (pushesScope) scopeStack.push(obj);

    const isUseMemoCall =
      obj.type === 'CallExpression' &&
      (obj.callee?.type === 'Identifier'
        ? obj.callee.name === 'useMemo'
        : obj.callee?.type === 'MemberExpression' && obj.callee.property?.type === 'Identifier'
        ? obj.callee.property.name === 'useMemo'
        : false);

    const isJsxExpr = obj.type === 'JSXExpressionContainer';

    // 1. Check no-material-memo-color-deps
    if (isUseMemoCall) {
      const factory = obj.arguments?.[0];
      const deps = obj.arguments?.[1];
      if (
        factory &&
        hasNewMaterial(factory) &&
        deps &&
        deps.type === 'ArrayExpression' &&
        Array.isArray(deps.elements)
      ) {
        for (const el of deps.elements) {
          if (!el) continue;
          let depName = '';
          if (el.type === 'Identifier' && typeof el.name === 'string') {
            depName = el.name;
          } else if (
            el.type === 'MemberExpression' &&
            el.property &&
            typeof el.property.name === 'string'
          ) {
            depName = el.property.name;
          }
          if (depName && /color|colour|opacity|emissive/i.test(depName)) {
            addDiagnostic(
              el.loc?.start || obj.loc?.start,
              'no-material-memo-color-deps',
              'error',
              `Material recreation dependency \`${depName}\` detected in useMemo dependency array. Recreating materials on color/opacity change forces WebGL shader recompilations.`,
              'Mutate material color/opacity in-place via refs or uniforms in useEffect/useFrame rather than recreating the material instance.'
            );
          }
        }
      }
    }

    // 2. Check no-inline-jsx-geometry & require-resource-dispose
    if (obj.type === 'NewExpression') {
      const ctorName = getConstructorName(obj.callee);
      if (insideJsxExprDepth > 0 && insideUseMemoDepth === 0 && ctorName.endsWith('Geometry')) {
        addDiagnostic(
          obj.loc?.start,
          'no-inline-jsx-geometry',
          'error',
          `Inline geometry instantiation \`new ${ctorName}()\` inside JSX prop. Geometries created in JSX are recreated on every render and leak GPU memory unless disposed.`,
          'Instantiate geometry in useMemo or module scope, and dispose on unmount.'
        );
      } else if (
        isCanvasProductionFile &&
        insideUseMemoDepth > 0 &&
        !fileHasDispose &&
        isGpuResourceConstructor(ctorName)
      ) {
        addDiagnostic(
          obj.loc?.start,
          'require-resource-dispose',
          'error',
          `GPU resource \`new ${ctorName}()\` allocated inside \`useMemo\` without a corresponding \`.dispose()\` cleanup call in this file.`,
          'Register a `useEffect(() => () => resource.dispose(), [resource])` cleanup effect.'
        );
      }
    }

    // 3. Detect useFrame calls and inspect their hot-path callback bodies
    if (obj.type === 'CallExpression') {
      const callee = obj.callee;
      const callName: string =
        callee?.type === 'Identifier' && typeof callee.name === 'string'
          ? callee.name
          : callee?.type === 'MemberExpression' && typeof callee.property?.name === 'string'
          ? callee.property.name
          : '';

      if (callName === 'useFrame') {
        const callbackArg = obj.arguments?.[0];
        if (
          callbackArg &&
          (callbackArg.type === 'ArrowFunctionExpression' ||
            callbackArg.type === 'FunctionExpression') &&
          callbackArg.body
        ) {
          auditUseFrameCallback(callbackArg.body as ASTNode);
        }
      }

      // 4. Detect atomic-store-selectors: Zustand store subscriptions
      if (
        callName !== 'useSyncExternalStore' &&
        /^use[A-Z]\w*Store$/.test(callName)
      ) {
        if (!obj.arguments || obj.arguments.length === 0) {
          addDiagnostic(
            obj.loc?.start,
            'atomic-store-selectors',
            'error',
            `Whole-store subscription detected (\`${callName}()\`). Subscribing to the entire store forces full component re-renders on any state change.`,
            `Subscribe to discrete atomic state selectors instead (e.g. \`${callName}(s => s.foo)\`).`
          );
        } else {
          let selectorArg: ASTNode | undefined = obj.arguments[0];
          let isShallow = false;
          if (
            selectorArg &&
            selectorArg.type === 'CallExpression' &&
            selectorArg.callee?.type === 'Identifier' &&
            selectorArg.callee.name === 'useShallow'
          ) {
            selectorArg = selectorArg.arguments?.[0];
            isShallow = true;
          }

          if (
            selectorArg &&
            (selectorArg.type === 'ArrowFunctionExpression' ||
              selectorArg.type === 'FunctionExpression')
          ) {
            const body = selectorArg.body;
            const param = selectorArg.params?.[0];
            const paramName = param && param.type === 'Identifier' ? param.name : undefined;

            if (body && !Array.isArray(body)) {
              // Identity selector: (state) => state or s => s
              if (paramName) {
                if (body.type === 'Identifier' && body.name === paramName) {
                  addDiagnostic(
                    body.loc?.start || obj.loc?.start,
                    'atomic-store-selectors',
                    'error',
                    `Identity store selector detected (\`${callName}(${paramName} => ${paramName})\`). Subscribing to the entire store object forces full component re-renders on any state change.`,
                    `Subscribe to discrete atomic state selectors instead (e.g. \`${callName}(s => s.foo)\`).`
                  );
                } else if (body.type === 'BlockStatement' && Array.isArray(body.body)) {
                  const returnStmt = body.body.find(
                    (s: ASTNode) => s.type === 'ReturnStatement'
                  ) as ASTNode | undefined;
                  const retArg = returnStmt?.argument as ASTNode | undefined;
                  if (retArg && retArg.type === 'Identifier' && retArg.name === paramName) {
                    addDiagnostic(
                      retArg.loc?.start || obj.loc?.start,
                      'atomic-store-selectors',
                      'error',
                      `Identity store selector detected (\`${callName}(${paramName} => ${paramName})\`). Subscribing to the entire store object forces full component re-renders on any state change.`,
                      `Subscribe to discrete atomic state selectors instead (e.g. \`${callName}(s => s.foo)\`).`
                    );
                  }
                }
              }

              // Object-literal returning selector: s => ({ a: s.a })
              let returnedObj: ASTNode | undefined;
              if (body.type === 'ObjectExpression') {
                returnedObj = body;
              } else if (body.type === 'BlockStatement' && Array.isArray(body.body)) {
                const returnStmt = body.body.find(
                  (s: ASTNode) => s.type === 'ReturnStatement'
                ) as ASTNode | undefined;
                const retArg = returnStmt?.argument as ASTNode | undefined;
                if (retArg && retArg.type === 'ObjectExpression') {
                  returnedObj = retArg;
                }
              }
              if (returnedObj && !isShallow) {
                addDiagnostic(
                  returnedObj.loc?.start || obj.loc?.start,
                  'atomic-store-selectors',
                  'error',
                  'Object-literal returning store selector detected. Returning a new object reference on every selector invocation causes infinite render loops or unnecessary re-renders.',
                  'Subscribe to discrete atomic selectors individually, or use shallow comparison.'
                );
              }

              // Broad state.tokens subscription (expression body or block return, dot or bracket notation)
              let returnedMember: ASTNode | undefined;
              if (body.type === 'MemberExpression') {
                returnedMember = body;
              } else if (body.type === 'BlockStatement' && Array.isArray(body.body)) {
                const returnStmt = body.body.find(
                  (s: ASTNode) => s.type === 'ReturnStatement'
                ) as ASTNode | undefined;
                const retArg = returnStmt?.argument as ASTNode | undefined;
                if (retArg && retArg.type === 'MemberExpression') {
                  returnedMember = retArg;
                }
              }
              const prop = returnedMember?.property;
              const isTokensProp =
                prop &&
                (('name' in prop && prop.name === 'tokens') ||
                  ('value' in prop && prop.value === 'tokens'));
              if (returnedMember && isTokensProp) {
                addDiagnostic(
                  returnedMember.loc?.start || obj.loc?.start,
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
    }

    // 5. Detect invalid JSX intrinsic tags (e.g. <threeLine>), require-noop-raycast & require-demand-frameloop
    if (obj.type === 'JSXOpeningElement' || obj.type === 'JSXSelfClosingElement') {
      const tagObj = typeof obj.name === 'object' ? obj.name : undefined;
      const tagNameStr = typeof obj.name === 'string' ? obj.name : tagObj?.name;
      if (tagObj && typeof tagNameStr === 'string') {
        const lower = tagNameStr.toLowerCase();
        if (INVALID_R3F_TAGS.has(lower)) {
          addDiagnostic(
            tagObj.loc?.start || obj.loc?.start,
            'valid-r3f-intrinsics',
            'error',
            `Invalid React Three Fiber intrinsic element <${tagNameStr}> detected. R3F intrinsic tags map directly to lowercase Three.js classes.`,
            'Replace with `<line>` (maps to `THREE.Line`) or `<lineSegments>`.'
          );
        } else if (isProductionFile && tagNameStr === 'Canvas') {
          const isSanctionedHost = SANCTIONED_CANVAS_HOSTS.some(
            (host) => normalizedPath === host || normalizedPath.endsWith(`/${host}`)
          );
          if (!isSanctionedHost) {
            addDiagnostic(
              obj.loc?.start || tagObj.loc?.start,
              'single-canvas-host',
              'error',
              `Unsanctioned <Canvas> host in "${filePath}". Starmap enforces a single persistent root WebGL <Canvas> host.`,
              'Mount 3D scenes via <CanvasLayer> inside the persistent root Canvas host instead of instantiating a new <Canvas>.'
            );
          }

          const attrs = Array.isArray(obj.attributes) ? (obj.attributes as ASTNode[]) : [];
          const frameloopAttr = attrs.find((attr) => {
            if (attr.type !== 'JSXAttribute') return false;
            const attrNameNode = typeof attr.name === 'object' ? (attr.name as ASTNode) : undefined;
            return attrNameNode?.name === 'frameloop';
          });
          if (!frameloopAttr) {
            addDiagnostic(
              obj.loc?.start || tagObj.loc?.start,
              'require-demand-frameloop',
              'error',
              '<Canvas> is missing an explicit `frameloop` attribute (R3F defaults to `"always"` continuous rendering).',
              'Add `frameloop="demand"` (or `"never"` / a dynamic `frameloop` prop) to avoid idle GPU rendering.'
            );
          } else if (isFrameloopAlwaysValue(frameloopAttr)) {
            addDiagnostic(
              frameloopAttr.loc?.start || obj.loc?.start,
              'require-demand-frameloop',
              'error',
              '<Canvas frameloop="always"> forces a continuous 60fps WebGL loop even when the scene is static.',
              'Use `frameloop="demand"` (with `invalidate()` where needed) or `frameloop="never"`.'
            );
          }
        } else if (
          isCanvasProductionFile &&
          (tagNameStr === 'mesh' || tagNameStr === 'lineSegments') &&
          !hasNoopRaycastOrPointerHandler(obj)
        ) {
          addDiagnostic(
            obj.loc?.start || tagObj.loc?.start,
            'require-noop-raycast',
            'error',
            `Decorative <${tagNameStr}> without pointer handlers must set \`raycast={NOOP_RAYCAST}\` to skip Three.js raycasting.`,
            'Add `raycast={NOOP_RAYCAST}` or attach pointer handlers if the mesh is interactive.'
          );
        }
      }
    }

    // 6. require-noop-raycast on `new Line2(...)`
    if (isCanvasProductionFile && obj.type === 'NewExpression' && getConstructorName(obj.callee) === 'Line2') {
      let varName: string | undefined;
      if (parent?.type === 'VariableDeclarator' && (parent.id as ASTNode | undefined)?.type === 'Identifier') {
        varName = (parent.id as ASTNode).name as string;
      } else if (parent?.type === 'AssignmentExpression' && (parent.left as ASTNode | undefined)?.type === 'Identifier') {
        varName = (parent.left as ASTNode).name as string;
      }
      const enclosingScope = scopeStack[scopeStack.length - 1];
      const hasAssignment = Boolean(varName && enclosingScope && hasRaycastNoopAssignment(enclosingScope, varName));
      if (!hasAssignment) {
        addDiagnostic(
          obj.loc?.start,
          'require-noop-raycast',
          'error',
          '`new Line2(...)` allocation without `.raycast = NOOP_RAYCAST` leaves fat-line geometry active in Three.js raycasting.',
          'Assign `<mesh>.raycast = NOOP_RAYCAST;` immediately after constructing the `Line2` instance.'
        );
      }
    }

    if (isJsxExpr) insideJsxExprDepth++;

    for (const key of Object.keys(obj)) {
      if (key === 'loc' || key === 'range' || key === 'comments') continue;
      const child = obj[key];
      if (isUseMemoCall && key === 'arguments' && Array.isArray(child) && child.length > 0) {
        insideUseMemoDepth++;
        traverseAst(child[0], obj);
        insideUseMemoDepth--;
        for (let idx = 1; idx < child.length; idx++) {
          traverseAst(child[idx], obj);
        }
      } else if (Array.isArray(child)) {
        for (const item of child) {
          traverseAst(item, obj);
        }
      } else if (child && typeof child === 'object') {
        traverseAst(child, obj);
      }
    }

    if (isJsxExpr) insideJsxExprDepth--;
    if (pushesScope) scopeStack.pop();
  }

  traverseAst(ast);

  function simpleTraverse(node: unknown, visitor: (n: ASTNode) => void) {
    if (!node || typeof node !== 'object') return;
    const obj = node as ASTNode;
    visitor(obj);
    for (const key of Object.keys(obj)) {
      if (key === 'loc' || key === 'range' || key === 'comments') continue;
      const child = obj[key];
      if (Array.isArray(child)) {
        for (let i = 0, len = child.length; i < len; i++) {
          simpleTraverse(child[i], visitor);
        }
      } else if (child && typeof child === 'object') {
        simpleTraverse(child, visitor);
      }
    }
  }

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
    const hasThree =
      content.includes('useFrame') ||
      content.includes('@react-three') ||
      content.includes('three') ||
      content.includes('<Canvas');
    const hasStore = content.includes('Store(') || /use[A-Z]\w*Store/.test(content);
    if (!hasThree && !hasStore) {
      continue;
    }
    diagnostics.push(...auditSourceFile(file, content));
  }
  return diagnostics;
}

/**
 * Main CLI entry point.
 */
export function runR3FAudit(targetDirs: string[] = R3F_FILES_GLOB): number {
  console.log('\n--- Running WebGL & React Three Fiber (R3F) Performance Audit ---');

  const diagnostics = runR3fAudit(targetDirs);

  let totalErrors = 0;

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
        const icon = diag.severity === 'error' ? '❌' : '⚠️';
        console.log(`  ${icon} Line ${diag.line}:${diag.column} [${diag.ruleId}]`);
        console.log(`     Issue: ${diag.message}`);
        console.log(`     Code:  ${diag.snippet}`);
        console.log(`     Fix:   ${diag.remediation}`);

        if (diag.severity === 'error') {
          totalErrors++;
        }
      }
    }
  }

  console.log('\n--- Audit Summary ---');
  console.log(`Total Violations: ${diagnostics.length}`);
  console.log(`Errors:           ${totalErrors}`);

  if (totalErrors > 0) {
    console.log('\n❌ WebGL / R3F audit found infractions. Resolve them or add `// r3f-audit-disable-next-line <rule-id> -- <reason>` if an exception is justified.\n');
    return 1;
  }

  console.log('\n✨ All WebGL & React Three Fiber invariants passed cleanly.\n');
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const exitCode = runR3FAudit();
  process.exit(exitCode);
}
