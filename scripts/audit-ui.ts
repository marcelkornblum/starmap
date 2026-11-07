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

export const COMPONENT_QUAD_DIRS = ['src/components/interface', 'src/components/domain'];
export const AST_SCAN_DIRS = [
  'src/components/interface',
  'src/components/domain',
  'src/components/search',
  'src/components/canvas',
  'src/views',
];
export const RENDER_TO_STRING_DIRS = ['src', 'tests'];
export const CSS_MODULE_DIRS = [
  'src/components/interface',
  'src/components/domain',
  'src/components/search',
  'src/components/canvas',
  'src/views',
];

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
 * Checks whether a comment on the preceding line or current line suppresses the diagnostic.
 */
export function isLineSuppressed(lines: string[], targetLine: number, ruleId: string): boolean {
  const prevLine = targetLine > 1 ? lines[targetLine - 2] : '';
  const currentLine = lines[targetLine - 1] || '';

  const checkComment = (text: string) => {
    const match = text.match(/(?:\/\/|\/\*)\s*(?:ui-audit-disable|guard-disable)(?:-next-line)?(?:\s+([\w-]+))?/);
    if (!match) return false;
    const specifiedRule = match[1];
    return !specifiedRule || specifiedRule === ruleId;
  };

  return checkComment(prevLine) || checkComment(currentLine);
}

/**
 * Recursively collects all directories within a root directory.
 */
function collectDirectories(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      const fullPath = path.join(dir, entry.name);
      results.push(fullPath);
      results = results.concat(collectDirectories(fullPath));
    }
  }
  return results;
}

/**
 * Recursively collects files matching a predicate.
 */
function collectFiles(dir: string, predicate: (filePath: string) => boolean): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  if (fs.statSync(dir).isFile()) {
    if (predicate(dir)) results.push(dir);
    return results;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist') {
        results = results.concat(collectFiles(fullPath, predicate));
      }
    } else if (entry.isFile() && predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

interface ASTNode {
  type?: string;
  loc?: { start: { line: number; column: number }; end?: { line: number; column: number } };
  name?: { type?: string; name?: string };
  attributes?: ASTNode[];
  operator?: string;
  callee?: ASTNode;
  property?: ASTNode & { name?: string };
  expressions?: ASTNode[];
  value?: ASTNode & { type?: string; value?: unknown; expression?: ASTNode };
  [key: string]: unknown;
}

function traverseAst(node: unknown, visitor: (n: ASTNode) => void) {
  if (!node || typeof node !== 'object') return;
  const obj = node as ASTNode;
  visitor(obj);
  for (const key of Object.keys(obj)) {
    if (key === 'loc' || key === 'range' || key === 'comments') continue;
    const child = obj[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        traverseAst(item, visitor);
      }
    } else if (child && typeof child === 'object') {
      traverseAst(child, visitor);
    }
  }
}

/**
 * Checks whether a filename is a sub-component helper file that belongs to a parent quad in the folder.
 */
function isSubComponentHelper(fileName: string, primaryName: string): boolean {
  const baseName = path.basename(fileName, '.tsx');
  // Starts with lowercase -> helper
  if (/^[a-z]/.test(baseName)) return true;
  // Contains helper or utils -> helper
  if (/(?:helpers?|utils?)/i.test(baseName)) return true;
  // Belongs to primary parent component as a section or helper
  const stem = primaryName.replace(/(?:Panel|View|Layout|Root|Sheet)$/, '');
  if (baseName.startsWith(stem) && /(?:Section|Sections|Helper|Helpers)$/.test(baseName)) {
    return true;
  }
  return false;
}

/**
 * Rule 1: Audit Mandatory Component File Quad.
 * In target directories, traverses recursively.
 * Every component .tsx implementation file must have:
 * - <Name>.module.css
 * - <Name>.stories.tsx
 * - <Name>.test.tsx
 * And must not exceed 300 lines (G-size).
 */
export function auditComponentQuads(targetDirs: string[] = COMPONENT_QUAD_DIRS): AuditDiagnostic[] {
  const diagnostics: AuditDiagnostic[] = [];

  for (const baseDir of targetDirs) {
    if (!fs.existsSync(baseDir)) continue;

    const allDirs = [baseDir, ...collectDirectories(baseDir)];
    for (const dir of allDirs) {
      if (dir.includes('__tests__') || dir.includes('__mocks__')) continue;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const folderName = path.basename(dir);

      // Find all candidate .tsx files directly in this directory
      const tsxFiles = entries
        .filter(
          (e) =>
            e.isFile() &&
            e.name.endsWith('.tsx') &&
            !e.name.endsWith('.stories.tsx') &&
            !e.name.endsWith('.test.tsx') &&
            !e.name.endsWith('.d.ts') &&
            e.name !== 'index.tsx'
        )
        .map((e) => e.name);

      if (tsxFiles.length === 0) continue;

      // Identify primary component (if matches folderName.tsx, or first file)
      const primaryName = tsxFiles.find((f) => path.basename(f, '.tsx') === folderName)
        ? folderName
        : path.basename(tsxFiles[0], '.tsx');

      for (const tsxFile of tsxFiles) {
        const componentName = path.basename(tsxFile, '.tsx');

        // Check if sub-component helper file that belongs to parent quad in this folder
        if (componentName !== primaryName && isSubComponentHelper(tsxFile, primaryName)) {
          continue;
        }

        const componentPath = path.join(dir, tsxFile);
        const content = fs.readFileSync(componentPath, 'utf8');
        const lines = content.split('\n');

        // G-size check: components <= 300 lines
        if (lines.length > 300 && !isLineSuppressed(lines, 1, 'file-size-exceeded')) {
          diagnostics.push({
            filePath: componentPath,
            line: 1,
            column: 1,
            ruleId: 'file-size-exceeded',
            severity: 'error',
            message: `Component "${componentName}" exceeds 300 lines (${lines.length} lines). Decompose into sub-components.`,
            snippet: lines[0]?.trim() || '',
            remediation: 'Decompose complex panels and views into focused sub-components under 300 lines.',
          });
        }

        // Quad files check
        const requiredFiles = [
          { ext: '.module.css', desc: 'CSS Module' },
          { ext: '.stories.tsx', desc: 'Storybook Story' },
          { ext: '.test.tsx', desc: 'Component Test' },
        ];

        const missing: string[] = [];
        for (const req of requiredFiles) {
          const quadPath = path.join(dir, `${componentName}${req.ext}`);
          if (!fs.existsSync(quadPath)) {
            missing.push(`${componentName}${req.ext}`);
          }
        }

        if (missing.length > 0 && !isLineSuppressed(lines, 1, 'missing-component-quad')) {
          diagnostics.push({
            filePath: componentPath,
            line: 1,
            column: 1,
            ruleId: 'missing-component-quad',
            severity: 'error',
            message: `Component "${componentName}" is missing mandatory quad file(s): ${missing.join(', ')}`,
            snippet: `${tsxFile} in ${dir}`,
            remediation: `Create the missing file(s) in ${dir} to satisfy the Mandatory Component File Quad.`,
          });
        }
      }
    }
  }

  return diagnostics;
}

export const checkComponentQuads = auditComponentQuads;

/**
 * Audits a source string for raw HTML interactive elements (<button>, <input>, <select>).
 */
export function auditRawElementsContent(filePath: string, content: string): AuditDiagnostic[] {
  const diagnostics: AuditDiagnostic[] = [];
  if (!content.includes('<button') && !content.includes('<input') && !content.includes('<select')) {
    return diagnostics;
  }

  let ast: ReturnType<typeof parse>;
  try {
    ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });
  } catch {
    return diagnostics;
  }

  const lines = content.split('\n');

  traverseAst(ast, (node: ASTNode) => {
    if (node.type === 'JSXOpeningElement' || node.type === 'JSXSelfClosingElement') {
      if (node.name?.type === 'JSXIdentifier') {
        const tagName = node.name.name;
        if (tagName && ['button', 'input', 'select'].includes(tagName)) {
          const loc = node.loc?.start;
          if (loc && !isLineSuppressed(lines, loc.line, 'forbidden-raw-element')) {
            diagnostics.push({
              filePath,
              line: loc.line,
              column: loc.column + 1,
              ruleId: 'forbidden-raw-element',
              severity: 'error',
              message: `Forbidden raw HTML control <${tagName}>. Domain components and views must compose Tier 1 Interface Primitives (<Button>, <Input>, <Select>).`,
              snippet: (lines[loc.line - 1] || '').trim().slice(0, 80),
              remediation: `Replace <${tagName}> with Tier 1 Interface Primitive <${tagName.charAt(0).toUpperCase() + tagName.slice(1)}>.`,
            });
          }
        }
      }
    }
  });

  return diagnostics;
}

/**
 * Audits a source string for dynamic className concatenation.
 */
export function auditDynamicClassNamesContent(filePath: string, content: string): AuditDiagnostic[] {
  const diagnostics: AuditDiagnostic[] = [];
  if (!content.includes('className=')) {
    return diagnostics;
  }

  let ast: ReturnType<typeof parse>;
  try {
    ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });
  } catch {
    return diagnostics;
  }

  const lines = content.split('\n');

  traverseAst(ast, (node: ASTNode) => {
    if (node.type === 'JSXAttribute' && node.name?.name === 'className') {
      const expr = node.value?.expression;
      if (!expr) return;

      let isDynamic = false;
      let detail = '';

      if (expr.type === 'TemplateLiteral' && expr.expressions && expr.expressions.length > 0) {
        isDynamic = true;
        detail = 'template literal interpolation';
      } else if (expr.type === 'BinaryExpression' && expr.operator === '+') {
        isDynamic = true;
        detail = 'string concatenation (+)';
      } else if (
        expr.type === 'CallExpression' &&
        expr.callee?.type === 'MemberExpression' &&
        expr.callee.property?.type === 'Identifier' &&
        expr.callee.property.name === 'join'
      ) {
        isDynamic = true;
        detail = 'Array.join() concatenation';
      }

      if (isDynamic) {
        const loc = node.loc?.start;
        if (loc && !isLineSuppressed(lines, loc.line, 'forbidden-dynamic-classname')) {
          diagnostics.push({
            filePath,
            line: loc.line,
            column: loc.column + 1,
            ruleId: 'forbidden-dynamic-classname',
            severity: 'error',
            message: `Forbidden dynamic className concatenation (${detail}). Variants and states must mutate CSS via CUBE @layer exceptions and HTML data-* attributes.`,
            snippet: (lines[loc.line - 1] || '').trim().slice(0, 80),
            remediation: 'Remove className concatenation and bind states/variants to HTML data-* attributes (e.g. data-active={active ? "true" : undefined}).',
          });
        }
      }
    }
  });

  return diagnostics;
}

/**
 * Audits a source string for forbidden inline JSX style attributes.
 */
export function auditInlineStylesContent(filePath: string, content: string): AuditDiagnostic[] {
  const diagnostics: AuditDiagnostic[] = [];
  if (!content.includes('style=')) {
    return diagnostics;
  }

  let ast: ReturnType<typeof parse>;
  try {
    ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });
  } catch {
    return diagnostics;
  }

  const lines = content.split('\n');

  traverseAst(ast, (node: ASTNode) => {
    if (node.type === 'JSXAttribute' && node.name?.name === 'style') {
      const loc = node.loc?.start;
      if (loc && !isLineSuppressed(lines, loc.line, 'forbidden-inline-style')) {
        diagnostics.push({
          filePath,
          line: loc.line,
          column: loc.column + 1,
          ruleId: 'forbidden-inline-style',
          severity: 'error',
          message: 'Forbidden inline JSX style attribute.',
          snippet: (lines[loc.line - 1] || '').trim().slice(0, 80),
          remediation:
            'Remove style={{ ... }} and use scoped CSS Modules with CUBE @layer blocks or HTML data-* attributes.',
        });
      }
    }
  });

  return diagnostics;
}

/**
 * Audits test content for forbidden `renderToString` imports.
 */
export function auditRenderToStringContent(filePath: string, content: string): AuditDiagnostic[] {
  const diagnostics: AuditDiagnostic[] = [];
  if (!content.includes('renderToString')) {
    return diagnostics;
  }

  const lines = content.split('\n');
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    if (
      line.includes('renderToString') &&
      (line.includes('react-dom/server') || line.includes('import'))
    ) {
      if (!isLineSuppressed(lines, lineNum, 'forbidden-rendertostring')) {
        diagnostics.push({
          filePath,
          line: lineNum,
          column: line.indexOf('renderToString') + 1,
          ruleId: 'forbidden-rendertostring',
          severity: 'error',
          message: 'Forbidden import of renderToString in test file.',
          snippet: line.trim().slice(0, 80),
          remediation: 'Use @testing-library/react (render, screen, fireEvent/userEvent) in jsdom.',
        });
      }
    }
  });

  return diagnostics;
}

// Regex to match hex colors (#fff, #ffffff, #12345678), ignoring url(#...)
const HEX_COLOR_REGEX = /(?:^|[^a-zA-Z0-9_\-#])#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b(?![0-9a-fA-F])/g;

// Regex to match hardcoded px / rem values (excluding safelisted 1px, 0px, 0)
const HARDCODED_UNIT_REGEX = /(?:^|[^a-zA-Z0-9_\-])(\d+(?:\.\d+)?)(px|rem)\b/g;

// Regex to match outer margin declarations
const MARGIN_DECL_REGEX = /^\s*(?:margin|margin-top|margin-right|margin-bottom|margin-left|margin-inline|margin-block)\s*:\s*([^;]+);?/i;

/**
 * Audits CSS Module content for CUBE @layer blocks, hardcoded tokens, and outer margins.
 */
export function auditCssModuleContent(filePath: string, content: string): AuditDiagnostic[] {
  const diagnostics: AuditDiagnostic[] = [];
  const trimmed = content.trim();
  if (!trimmed) {
    return diagnostics;
  }

  const lines = content.split('\n');

  // Check for @layer blocks or @layer exceptions
  const hasLayer = /@layer\s+(?:blocks|exceptions)\b/.test(content);
  if (!hasLayer && !isLineSuppressed(lines, 1, 'missing-layer-blocks')) {
    diagnostics.push({
      filePath,
      line: 1,
      column: 1,
      ruleId: 'missing-layer-blocks',
      severity: 'error',
      message: 'CSS Module is missing CUBE @layer blocks or @layer exceptions declaration.',
      snippet: (lines[0] || '').trim().slice(0, 80),
      remediation: 'Wrap component styles inside @layer blocks { ... } and/or @layer exceptions { ... }.',
    });
  }

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    // Strip comments for checking
    const strippedLine = line.replace(/\/\*.*?\*\//g, '');

    // 1. Check for outer margin declarations
    const marginMatch = strippedLine.match(MARGIN_DECL_REGEX);
    if (marginMatch) {
      const marginVal = marginMatch[1].trim();
      if (marginVal !== '0' && marginVal !== '0px' && marginVal !== 'none') {
        if (!isLineSuppressed(lines, lineNum, 'forbidden-outer-margin')) {
          diagnostics.push({
            filePath,
            line: lineNum,
            column: marginMatch.index ? marginMatch.index + 1 : 1,
            ruleId: 'forbidden-outer-margin',
            severity: 'error',
            message: `Forbidden outer margin declaration "${marginMatch[0].trim()}". Components must never declare external margin; layout flow is owned by Composition Primitives.`,
            snippet: line.trim().slice(0, 80),
            remediation: 'Remove margin from component. Use <Stack>, <Cluster>, or <Grid> composition primitives to manage spacing.',
          });
        }
      }
    }

    // 2. Check for hardcoded hex colors
    if (!strippedLine.includes('url(#')) {
      HEX_COLOR_REGEX.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = HEX_COLOR_REGEX.exec(strippedLine)) !== null) {
        if (!isLineSuppressed(lines, lineNum, 'hardcoded-hex-color')) {
          diagnostics.push({
            filePath,
            line: lineNum,
            column: match.index + 1,
            ruleId: 'hardcoded-hex-color',
            severity: 'error',
            message: `Hardcoded hex color #${match[1]} is forbidden.`,
            snippet: line.trim().slice(0, 80),
            remediation: 'Replace with semantic design token var(--token-name).',
          });
        }
      }
    }

    // 3. Check for hardcoded px / rem tokens (do NOT mask minmax/clamp)
    HARDCODED_UNIT_REGEX.lastIndex = 0;
    let unitMatch: RegExpExecArray | null;
    while ((unitMatch = HARDCODED_UNIT_REGEX.exec(strippedLine)) !== null) {
      const numStr = unitMatch[1];
      const unit = unitMatch[2];
      const full = `${numStr}${unit}`;

      // Safelist: 1px (borders/hairlines/outlines) or 0px
      if (full === '1px' || full === '0px' || full === '0rem') {
        continue;
      }

      if (!isLineSuppressed(lines, lineNum, 'hardcoded-css-token')) {
        diagnostics.push({
          filePath,
          line: lineNum,
          column: unitMatch.index + 1,
          ruleId: 'hardcoded-css-token',
          severity: 'error',
          message: `Hardcoded CSS token "${full}" is forbidden. Consume semantic tokens (var(--token-name)) or use 1px for borders/hairlines.`,
          snippet: line.trim().slice(0, 80),
          remediation: 'Replace raw unit with canonical semantic design token var(--space-*) or var(--font-*).',
        });
      }
    }
  });

  return diagnostics;
}

/**
 * Scans directories for inline styles.
 */
export function auditInlineStyles(targetDirs: string[] = AST_SCAN_DIRS): AuditDiagnostic[] {
  const diagnostics: AuditDiagnostic[] = [];
  const files: string[] = [];

  for (const baseDir of targetDirs) {
    files.push(
      ...collectFiles(baseDir, (filePath) => {
        return (
          filePath.endsWith('.tsx') &&
          !filePath.endsWith('.test.tsx') &&
          !filePath.endsWith('.stories.tsx')
        );
      })
    );
  }

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    diagnostics.push(...auditInlineStylesContent(file, content));
  }

  return diagnostics;
}

/**
 * Scans directories for dynamic classNames.
 */
export function auditDynamicClassNames(targetDirs: string[] = AST_SCAN_DIRS): AuditDiagnostic[] {
  const diagnostics: AuditDiagnostic[] = [];
  const files: string[] = [];

  for (const baseDir of targetDirs) {
    files.push(
      ...collectFiles(baseDir, (filePath) => {
        return (
          filePath.endsWith('.tsx') &&
          !filePath.endsWith('.test.tsx') &&
          !filePath.endsWith('.stories.tsx')
        );
      })
    );
  }

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    diagnostics.push(...auditDynamicClassNamesContent(file, content));
  }

  return diagnostics;
}

/**
 * Scans directories for raw HTML elements.
 */
export function auditRawElements(targetDirs: string[] = AST_SCAN_DIRS): AuditDiagnostic[] {
  const diagnostics: AuditDiagnostic[] = [];
  const files: string[] = [];

  for (const baseDir of targetDirs) {
    files.push(
      ...collectFiles(baseDir, (filePath) => {
        return (
          filePath.endsWith('.tsx') &&
          !filePath.endsWith('.test.tsx') &&
          !filePath.endsWith('.stories.tsx')
        );
      })
    );
  }

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    diagnostics.push(...auditRawElementsContent(file, content));
  }

  return diagnostics;
}

/**
 * Scans directories for forbidden renderToString imports in test files.
 */
export function auditRenderToString(targetDirs: string[] = RENDER_TO_STRING_DIRS): AuditDiagnostic[] {
  const diagnostics: AuditDiagnostic[] = [];
  const files: string[] = [];

  for (const baseDir of targetDirs) {
    files.push(
      ...collectFiles(baseDir, (filePath) => {
        return filePath.endsWith('.test.ts') || filePath.endsWith('.test.tsx');
      })
    );
  }

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    diagnostics.push(...auditRenderToStringContent(file, content));
  }

  return diagnostics;
}

/**
 * Scans directories for CSS modules.
 */
export function auditCssModules(targetDirs: string[] = CSS_MODULE_DIRS): AuditDiagnostic[] {
  const diagnostics: AuditDiagnostic[] = [];
  const files: string[] = [];

  for (const baseDir of targetDirs) {
    files.push(
      ...collectFiles(baseDir, (filePath) => filePath.endsWith('.module.css'))
    );
  }

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    diagnostics.push(...auditCssModuleContent(file, content));
  }

  return diagnostics;
}

/**
 * Pure function: Runs full UI audit and returns diagnostics without exiting.
 */
export function runUiAudit(targetDir?: string): AuditDiagnostic[] {
  const quadDirs = targetDir ? [targetDir] : COMPONENT_QUAD_DIRS;
  const astDirs = targetDir ? [targetDir] : AST_SCAN_DIRS;
  const renderDirs = targetDir ? [targetDir] : RENDER_TO_STRING_DIRS;
  const cssDirs = targetDir ? [targetDir] : CSS_MODULE_DIRS;

  return [
    ...auditComponentQuads(quadDirs),
    ...auditInlineStyles(astDirs),
    ...auditDynamicClassNames(astDirs),
    ...auditRawElements(astDirs),
    ...auditRenderToString(renderDirs),
    ...auditCssModules(cssDirs),
  ];
}

/**
 * Main CLI entry point.
 */
export function runUIAudit(): number {
  console.log('\n--- Running Starmap UI Design System & Component Governance Audit ---');

  const diagnostics = runUiAudit();
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
        if (diag.snippet) {
          console.log(`     Code:  ${diag.snippet}`);
        }
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

  console.log('\n--- UI Audit Summary ---');
  console.log(`Total Violations:   ${diagnostics.length}`);
  console.log(`Unbaselined Errors: ${unbaselinedErrors}`);

  if (unbaselinedErrors > 0) {
    console.log(
      '\n❌ UI Design System audit found unbaselined infractions. Resolve them or add `/* ui-audit-disable-next-line <rule-id> */` if an exception is justified.\n'
    );
    return 1;
  }

  console.log('\n✨ All UI Design System & Component Governance invariants passed cleanly (within baseline).\n');
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const exitCode = runUIAudit();
  process.exit(exitCode);
}
