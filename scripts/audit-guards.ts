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
  'kuiper-belt', 'kuiper belt', 'asteroid-belt', 'asteroid belt', 'debris-disk', 'debris disk',
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

const RAW_CATALOG_ID_PATTERNS = [
  /^gaia-\d+(?:-[a-z0-9]+)?$/i,
  /^hip-\d+(?:-[a-z0-9]+)?$/i,
  /^hyg-\d+(?:-[a-z0-9]+)?$/i,
];

const SLUG_ID_PATTERN = /^[a-z0-9-]+$/;

function isRawCatalogIdLiteral(value: string): boolean {
  return RAW_CATALOG_ID_PATTERNS.some((pattern) => pattern.test(value));
}

function addEntityId(entityIds: Set<string>, raw: unknown): void {
  if (typeof raw !== 'string') return;
  const normalized = raw.trim().toLowerCase();
  if (normalized.length >= 3 && !GENERIC_EXCLUSION_WORDS.has(normalized)) {
    entityIds.add(normalized);
  }
}

function addEntityName(entityNames: Set<string>, raw: unknown): void {
  if (typeof raw !== 'string') return;
  const trimmed = raw.trim();
  if (trimmed.length >= 3 && !GENERIC_EXCLUSION_WORDS.has(trimmed.toLowerCase())) {
    entityNames.add(trimmed);
  }
}

function readSeedJson(seedDir: string, filename: string): unknown | null {
  const filePath = path.join(seedDir, filename);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Loads entity IDs and names strictly from data/seed/*.json.
 * Fails loudly if the resulting entity catalog is empty.
 */
export function loadEntityCatalog(projectRoot = process.cwd()): EntityCatalog {
  const entityIds = new Set<string>();
  const entityNames = new Set<string>();
  const seedDir = path.join(projectRoot, 'data/seed');

  const solarBodies = readSeedJson(seedDir, 'solar-system-bodies.json');
  if (Array.isArray(solarBodies)) {
    for (const body of solarBodies) {
      if (!body || typeof body !== 'object') continue;
      const rec = body as Record<string, unknown>;
      addEntityId(entityIds, rec.id);
      addEntityName(entityNames, rec.name);
      addEntityName(entityNames, rec.displayName);
      addEntityName(entityNames, rec.properName);
    }
  }

  const iauStars = readSeedJson(seedDir, 'iau-star-names.json');
  if (iauStars && typeof iauStars === 'object' && !Array.isArray(iauStars)) {
    for (const [starId, entry] of Object.entries(iauStars as Record<string, unknown>)) {
      addEntityId(entityIds, starId);
      if (!entry || typeof entry !== 'object') continue;
      const rec = entry as Record<string, unknown>;
      addEntityName(entityNames, rec.properName);
      if (Array.isArray(rec.aliases)) {
        for (const alias of rec.aliases) addEntityName(entityNames, alias);
      }
    }
  }

  const recons = readSeedJson(seedDir, 'recons-10pc.json');
  if (Array.isArray(recons)) {
    for (const item of recons) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      addEntityId(entityIds, rec.id);
      addEntityName(entityNames, rec.name);
      addEntityName(entityNames, rec.properName);
      if (Array.isArray(rec.aliases)) {
        for (const alias of rec.aliases) addEntityName(entityNames, alias);
      }
    }
  }

  const exoNames = readSeedJson(seedDir, 'name-exoworlds.json');
  if (exoNames && typeof exoNames === 'object' && !Array.isArray(exoNames)) {
    for (const entry of Object.values(exoNames as Record<string, unknown>)) {
      if (!entry || typeof entry !== 'object') continue;
      const rec = entry as Record<string, unknown>;
      addEntityName(entityNames, rec.starName);
      addEntityName(entityNames, rec.planetName);
    }
  }

  const structures = readSeedJson(seedDir, 'galactic-structures.json');
  if (Array.isArray(structures)) {
    for (const item of structures) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      addEntityId(entityIds, rec.id);
      addEntityName(entityNames, rec.name);
      if (Array.isArray(rec.designations)) {
        for (const designation of rec.designations) addEntityName(entityNames, designation);
      }
    }
  }

  const disks = readSeedJson(seedDir, 'circumstellar-disks.json');
  if (disks && typeof disks === 'object' && !Array.isArray(disks)) {
    for (const [hostName, diskList] of Object.entries(disks as Record<string, unknown>)) {
      addEntityName(entityNames, hostName);
      if (!Array.isArray(diskList)) continue;
      for (const disk of diskList) {
        if (!disk || typeof disk !== 'object') continue;
        const rec = disk as Record<string, unknown>;
        addEntityId(entityIds, rec.id);
        addEntityName(entityNames, rec.name);
      }
    }
  }

  const aliases = readSeedJson(seedDir, 'system-aliases.json');
  if (aliases && typeof aliases === 'object' && !Array.isArray(aliases)) {
    const rec = aliases as Record<string, unknown>;
    if (rec.specialSystemNameMap && typeof rec.specialSystemNameMap === 'object') {
      for (const [aliasKey, canonicalName] of Object.entries(rec.specialSystemNameMap as Record<string, unknown>)) {
        addEntityName(entityNames, aliasKey);
        addEntityName(entityNames, canonicalName);
      }
    }
    if (rec.diskHostAliases && typeof rec.diskHostAliases === 'object') {
      for (const [hostKey, aliasList] of Object.entries(rec.diskHostAliases as Record<string, unknown>)) {
        addEntityName(entityNames, hostKey);
        if (Array.isArray(aliasList)) {
          for (const alias of aliasList) addEntityName(entityNames, alias);
        }
      }
    }
  }

  const guideExamples = readSeedJson(seedDir, 'guide-examples.json');
  if (guideExamples && typeof guideExamples === 'object' && !Array.isArray(guideExamples)) {
    for (const section of Object.values(guideExamples as Record<string, unknown>)) {
      if (!section || typeof section !== 'object' || Array.isArray(section)) continue;
      for (const group of Object.values(section as Record<string, unknown>)) {
        if (!Array.isArray(group)) continue;
        for (const item of group) {
          if (!item || typeof item !== 'object') continue;
          const rec = item as Record<string, unknown>;
          addEntityId(entityIds, rec.entityId);
          addEntityId(entityIds, rec.systemId);
        }
      }
    }
  }

  if (entityIds.size === 0 || entityNames.size === 0) {
    throw new Error(
      `G-literals entity catalog loaded from ${seedDir} is empty (entityIds=${entityIds.size}, entityNames=${entityNames.size}).`
    );
  }

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

function pushGuardedViolation(
  violations: GuardViolation[],
  filePath: string,
  lines: string[],
  loc: { line: number; column: number } | undefined,
  message: string,
  ruleId = 'G-literals'
): void {
  if (!loc) return;
  const supp = checkSuppression(lines, loc.line, ruleId);
  if (supp.invalidComment) {
    violations.push({
      filePath,
      line: loc.line,
      column: loc.column + 1,
      ruleId,
      message: `Suppression comment "${supp.invalidComment}" without a required reason (-- <reason>) is forbidden.`,
      snippet: (lines[loc.line - 1] || '').trim(),
    });
  } else if (!supp.suppressed) {
    violations.push({
      filePath,
      line: loc.line,
      column: loc.column + 1,
      ruleId,
      message,
      snippet: (lines[loc.line - 1] || '').trim(),
    });
  }
}

function getBindingContextLabel(parent?: ASTNode): string | null {
  if (!parent) return null;
  if (parent.type === 'ObjectProperty' && parent.key && typeof parent.key === 'object') {
    const keyNode = parent.key as ASTNode;
    if (keyNode.type === 'Identifier' && typeof keyNode.name === 'string') {
      return keyNode.name;
    }
  }
  if (parent.type === 'VariableDeclarator' && parent.id && typeof parent.id === 'object') {
    const idNode = parent.id as ASTNode;
    if (idNode.type === 'Identifier' && typeof idNode.name === 'string') {
      return idNode.name;
    }
  }
  return null;
}

/**
 * G-literals: Checks source for entity literal mentions and suspicious numeric fallbacks.
 */
export function auditLiteralsContent(filePath: string, content: string, catalog: EntityCatalog): GuardViolation[] {
  const normPath = filePath.replace(/\\/g, '/');
  const isReferenceTargetsFile =
    normPath === 'src/config/referenceTargets.ts' || normPath.endsWith('/src/config/referenceTargets.ts');
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

    // 1. Literal Entity IDs, Display Names & Raw Catalogue IDs (StringLiteral and 0-expression TemplateLiteral)
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
        const isRawCatId = isRawCatalogIdLiteral(val);
        const matchesEntity = catalog.entityIds.has(valLower) || catalog.entityNames.has(val);

        if (isRawCatId) {
          pushGuardedViolation(
            violations,
            filePath,
            lines,
            node.loc?.start,
            `Hardcoded raw catalogue-ID literal "${val}" found in runtime code. Read from build-time data or precalculated shards.`
          );
        } else if (isReferenceTargetsFile) {
          if (!SLUG_ID_PATTERN.test(val)) {
            const msg = matchesEntity
              ? `Hardcoded celestial entity display name "${val}" is forbidden in referenceTargets.ts; only lowercase structural slug IDs are permitted.`
              : `Forbidden non-ID string literal "${val}" in referenceTargets.ts; only lowercase structural slug IDs are permitted.`;
            pushGuardedViolation(violations, filePath, lines, node.loc?.start, msg);
          }
        } else if (matchesEntity) {
          pushGuardedViolation(
            violations,
            filePath,
            lines,
            node.loc?.start,
            `Hardcoded celestial entity literal "${val}" found in runtime code. Read from build-time data or precalculated shards.`
          );
        }
      }
    }

    // 2. Forbid non-zero numeric constants / telemetry properties in src/config/referenceTargets.ts
    if (isReferenceTargetsFile) {
      const isNegativeNumeric =
        node.type === 'UnaryExpression' &&
        node.operator === '-' &&
        (node.argument as ASTNode | undefined)?.type === 'NumericLiteral';
      const isStandaloneNumeric =
        node.type === 'NumericLiteral' &&
        !(parent?.type === 'UnaryExpression' && parent.operator === '-');

      if (isNegativeNumeric || isStandaloneNumeric) {
        const numVal = isNegativeNumeric
          ? -((node.argument as ASTNode).value as number)
          : (node.value as number);
        if (typeof numVal === 'number' && numVal !== 0) {
          const contextLabel = getBindingContextLabel(parent);
          const detail = contextLabel ? `${contextLabel}: ${numVal}` : `${numVal}`;
          pushGuardedViolation(
            violations,
            filePath,
            lines,
            node.loc?.start,
            `Forbidden non-zero numeric constant (${detail}) in referenceTargets.ts. Physical telemetry must come from build-time data shards.`
          );
        }
      }
    }

    // 3. Suspicious non-zero numeric fallback check (?? <num> / || <num>)
    if (isTargetForNumericFallback && node.type === 'LogicalExpression') {
      const op = node.operator;
      if (op === '??' || op === '||') {
        const right = node.right;
        let numVal: number | null = null;
        if (right && right.type === 'NumericLiteral' && typeof right.value === 'number') {
          numVal = right.value;
        } else if (right && right.type === 'UnaryExpression' && right.operator === '-') {
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
            pushGuardedViolation(
              violations,
              filePath,
              lines,
              right?.loc?.start,
              `Suspicious non-zero numeric fallback "${op} ${numVal}". Entity telemetry and properties must not invent fallback numbers.`
            );
          }
        }
      }
    }
  });

  return violations;
}

function unwrapTsExpression(node: ASTNode | undefined): ASTNode | undefined {
  let current = node;
  while (
    current &&
    (current.type === 'TSAsExpression' ||
      current.type === 'TSSatisfiesExpression' ||
      current.type === 'TSTypeAssertion' ||
      current.type === 'TSNonNullExpression' ||
      current.type === 'ParenthesizedExpression')
  ) {
    current = current.expression as ASTNode | undefined;
  }
  return current;
}

function isGlobalThisIdentifier(node: ASTNode | undefined): boolean {
  const unwrapped = unwrapTsExpression(node);
  return unwrapped?.type === 'Identifier' && unwrapped.name === 'globalThis';
}

/**
 * no-global-this-mutation: Forbids writing properties or defining descriptors on globalThis.
 */
export function auditGlobalThisMutationContent(filePath: string, content: string): GuardViolation[] {
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
      message: `Failed to parse file for no-global-this-mutation check: ${message}`,
    });
    return violations;
  }

  const lines = content.split('\n');

  traverseAst(ast, (node: ASTNode) => {
    if (node.type === 'AssignmentExpression') {
      const left = unwrapTsExpression(node.left);
      if (left?.type === 'MemberExpression' && isGlobalThisIdentifier(left.object as ASTNode | undefined)) {
        pushGuardedViolation(
          violations,
          filePath,
          lines,
          node.loc?.start,
          'Mutating properties on `globalThis` is forbidden in runtime code. Use React context or Zustand stores instead.',
          'no-global-this-mutation'
        );
      }
    } else if (node.type === 'CallExpression' || node.type === 'OptionalCallExpression') {
      const callee = unwrapTsExpression(node.callee as ASTNode | undefined);
      if (callee?.type === 'MemberExpression' && !callee.computed) {
        const obj = unwrapTsExpression(callee.object as ASTNode | undefined);
        const prop = callee.property as ASTNode | undefined;
        const args = Array.isArray(node.arguments) ? (node.arguments as ASTNode[]) : [];
        const objName = obj?.type === 'Identifier' && typeof obj.name === 'string' ? obj.name : '';
        const propName = prop?.type === 'Identifier' && typeof prop.name === 'string' ? prop.name : '';
        const isObjectDefine =
          objName === 'Object' &&
          (propName === 'defineProperty' || propName === 'defineProperties' || propName === 'assign');
        const isReflectWrite =
          objName === 'Reflect' &&
          (propName === 'set' || propName === 'defineProperty' || propName === 'deleteProperty');

        if ((isObjectDefine || isReflectWrite) && isGlobalThisIdentifier(args[0])) {
          pushGuardedViolation(
            violations,
            filePath,
            lines,
            node.loc?.start,
            `Mutating \`globalThis\` via \`${objName}.${propName}(globalThis, ...)\` is forbidden in runtime code.`,
            'no-global-this-mutation'
          );
        }
      }
    }
  });

  return violations;
}

function isWindowOrGlobalRef(node: ASTNode | undefined): boolean {
  const unwrapped = unwrapTsExpression(node);
  return unwrapped?.type === 'Identifier' && (unwrapped.name === 'window' || unwrapped.name === 'globalThis');
}

function isHostObject(node: ASTNode | undefined, targetName: string): boolean {
  const unwrapped = unwrapTsExpression(node);
  if (!unwrapped) return false;
  if (unwrapped.type === 'Identifier' && unwrapped.name === targetName) {
    return true;
  }
  if (
    (unwrapped.type === 'MemberExpression' || unwrapped.type === 'OptionalMemberExpression') &&
    !unwrapped.computed
  ) {
    const prop = unwrapped.property as ASTNode | undefined;
    return (
      isWindowOrGlobalRef(unwrapped.object as ASTNode | undefined) &&
      prop?.type === 'Identifier' &&
      prop.name === targetName
    );
  }
  return false;
}

/**
 * no-direct-history-mutation: Enforces router SSOT by forbidding direct history/location mutations outside src/hooks/spaNavigation.ts.
 */
export function auditDirectHistoryMutationContent(filePath: string, content: string): GuardViolation[] {
  const normPath = filePath.replace(/\\/g, '/');
  if (normPath === 'src/hooks/spaNavigation.ts' || normPath.endsWith('/src/hooks/spaNavigation.ts')) {
    return [];
  }

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
      message: `Failed to parse file for no-direct-history-mutation check: ${message}`,
    });
    return violations;
  }

  const lines = content.split('\n');

  traverseAst(ast, (node: ASTNode) => {
    if (node.type === 'CallExpression' || node.type === 'OptionalCallExpression') {
      const callee = unwrapTsExpression(node.callee as ASTNode | undefined);
      if (
        (callee?.type === 'MemberExpression' || callee?.type === 'OptionalMemberExpression') &&
        !callee.computed
      ) {
        const prop = callee.property as ASTNode | undefined;
        const propName = prop?.type === 'Identifier' && typeof prop.name === 'string' ? prop.name : '';
        if (
          (propName === 'pushState' || propName === 'replaceState') &&
          isHostObject(callee.object as ASTNode | undefined, 'history')
        ) {
          pushGuardedViolation(
            violations,
            filePath,
            lines,
            node.loc?.start,
            `Direct \`history.${propName}()\` mutation is forbidden outside src/hooks/spaNavigation.ts. Route SPA history updates through TanStack Router or spaNavigation.ts.`,
            'no-direct-history-mutation'
          );
        } else if (
          (propName === 'assign' || propName === 'replace') &&
          isHostObject(callee.object as ASTNode | undefined, 'location')
        ) {
          pushGuardedViolation(
            violations,
            filePath,
            lines,
            node.loc?.start,
            `Direct \`location.${propName}()\` navigation is forbidden outside src/hooks/spaNavigation.ts. Use TanStack Router or spaNavigation.ts.`,
            'no-direct-history-mutation'
          );
        }
      }
    } else if (node.type === 'AssignmentExpression') {
      const left = unwrapTsExpression(node.left);
      if (
        (left?.type === 'MemberExpression' || left?.type === 'OptionalMemberExpression') &&
        !left.computed
      ) {
        const prop = left.property as ASTNode | undefined;
        if (
          prop?.type === 'Identifier' &&
          prop.name === 'href' &&
          isHostObject(left.object as ASTNode | undefined, 'location')
        ) {
          pushGuardedViolation(
            violations,
            filePath,
            lines,
            node.loc?.start,
            'Direct `location.href = ...` assignment is forbidden outside src/hooks/spaNavigation.ts. Use TanStack Router or spaNavigation.ts.',
            'no-direct-history-mutation'
          );
        }
      }
    }
  });

  return violations;
}

/**
 * no-deprecated-shims: Forbids @deprecated JSDoc/comment shims in production src/ files.
 */
export function auditDeprecatedShimsContent(filePath: string, content: string): GuardViolation[] {
  const violations: GuardViolation[] = [];
  if (!content.includes('@deprecated')) {
    return violations;
  }

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
      message: `Failed to parse file for no-deprecated-shims check: ${message}`,
    });
    return violations;
  }

  const lines = content.split('\n');
  const comments = (ast as unknown as { comments?: { value: string; loc?: { start: { line: number; column: number } } }[] }).comments ?? [];

  for (const comment of comments) {
    if (!comment.loc?.start) continue;
    const trimmed = comment.value.trim();
    if (/^(?:guard-disable(?:-next-line)?\s+no-deprecated-shims)\b/.test(trimmed)) {
      continue;
    }
    const commentLines = comment.value.split('\n');
    for (let idx = 0; idx < commentLines.length; idx++) {
      const commentLine = commentLines[idx];
      if (/@deprecated\b/.test(commentLine)) {
        const lineNum = comment.loc.start.line + idx;
        const col = idx === 0 ? comment.loc.start.column : Math.max(0, commentLine.indexOf('@deprecated'));
        pushGuardedViolation(
          violations,
          filePath,
          lines,
          { line: lineNum, column: col },
          '`@deprecated` shims and aliases are forbidden in production code. Perform a clean, complete cutover instead.',
          'no-deprecated-shims'
        );
      }
    }
  }

  return violations;
}

/**
 * no-wall-clock-in-pipeline: Forbids non-deterministic 0-arg `new Date()` and `Date.now()` in scripts/pipeline/.
 */
export function auditWallClockInPipelineContent(filePath: string, content: string): GuardViolation[] {
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
      message: `Failed to parse file for no-wall-clock-in-pipeline check: ${message}`,
    });
    return violations;
  }

  const lines = content.split('\n');

  traverseAst(ast, (node: ASTNode) => {
    if (node.type === 'NewExpression') {
      const callee = unwrapTsExpression(node.callee as ASTNode | undefined);
      const args = Array.isArray(node.arguments) ? node.arguments : [];
      if (callee?.type === 'Identifier' && callee.name === 'Date' && args.length === 0) {
        pushGuardedViolation(
          violations,
          filePath,
          lines,
          node.loc?.start,
          'Non-deterministic 0-argument `new Date()` is forbidden in scripts/pipeline/. Pass explicit deterministic timestamps (e.g. resolveBuildTimestampIso()).',
          'no-wall-clock-in-pipeline'
        );
      }
    } else if (node.type === 'CallExpression' || node.type === 'OptionalCallExpression') {
      const callee = unwrapTsExpression(node.callee as ASTNode | undefined);
      if (
        (callee?.type === 'MemberExpression' || callee?.type === 'OptionalMemberExpression') &&
        !callee.computed
      ) {
        const obj = unwrapTsExpression(callee.object as ASTNode | undefined);
        const prop = callee.property as ASTNode | undefined;
        if (
          obj?.type === 'Identifier' &&
          obj.name === 'Date' &&
          prop?.type === 'Identifier' &&
          prop.name === 'now'
        ) {
          pushGuardedViolation(
            violations,
            filePath,
            lines,
            node.loc?.start,
            'Non-deterministic `Date.now()` is forbidden in scripts/pipeline/. Pass explicit deterministic timestamps.',
            'no-wall-clock-in-pipeline'
          );
        }
      }
    }
  });

  return violations;
}

/**
 * no-vitest-environment-pragma: Enforces split .test.ts (Node) vs .test.tsx (jsdom) projects by forbidding @vitest-environment pragmas.
 */
export function auditVitestEnvironmentPragmaContent(filePath: string, content: string): GuardViolation[] {
  const violations: GuardViolation[] = [];
  if (!content.includes('@vitest-environment')) {
    return violations;
  }

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
      message: `Failed to parse file for no-vitest-environment-pragma check: ${message}`,
    });
    return violations;
  }

  const lines = content.split('\n');
  const comments = (ast as unknown as { comments?: { value: string; loc?: { start: { line: number; column: number } } }[] }).comments ?? [];

  for (const comment of comments) {
    if (!comment.loc?.start) continue;
    const commentLines = comment.value.split('\n');
    for (let idx = 0; idx < commentLines.length; idx++) {
      const commentLine = commentLines[idx];
      if (/@vitest-environment\b/.test(commentLine)) {
        const lineNum = comment.loc.start.line + idx;
        const col = idx === 0 ? comment.loc.start.column : Math.max(0, commentLine.indexOf('@vitest-environment'));
        pushGuardedViolation(
          violations,
          filePath,
          lines,
          { line: lineNum, column: col },
          'Inline `@vitest-environment` pragmas are forbidden (DEC-R055). Use `.test.ts` for Node tests and `.test.tsx` for jsdom tests.',
          'no-vitest-environment-pragma'
        );
      }
    }
  }

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
 * Runs G-literals and structural guard suite across src/, scripts/pipeline/, and test suites.
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
    allViolations.push(...auditGlobalThisMutationContent(file, content));
    allViolations.push(...auditDirectHistoryMutationContent(file, content));
    allViolations.push(...auditDeprecatedShimsContent(file, content));
  }

  const pipelineDir = path.join(projectRoot, 'scripts', 'pipeline');
  const pipelineFiles = collectAllSourceFiles(pipelineDir, ['.ts']);
  for (const file of pipelineFiles) {
    if (file.endsWith('.test.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    allViolations.push(...auditWallClockInPipelineContent(file, content));
  }

  const testsDir = path.join(projectRoot, 'tests');
  const testFiles = [
    ...collectAllSourceFiles(srcDir, ['.test.ts', '.test.tsx']),
    ...collectAllSourceFiles(testsDir, ['.test.ts', '.test.tsx']),
  ];
  for (const file of testFiles) {
    const content = fs.readFileSync(file, 'utf8');
    allViolations.push(...auditVitestEnvironmentPragmaContent(file, content));
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
