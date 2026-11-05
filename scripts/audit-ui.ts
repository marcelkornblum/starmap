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

const COMPONENT_QUAD_DIRS = ['src/components/interface', 'src/components/domain'];
const INLINE_STYLE_DIRS = ['src/components/interface', 'src/components/domain', 'src/views'];
const RENDER_TO_STRING_DIRS = ['src/components', 'src/views'];
const CSS_MODULE_DIRS = ['src/components', 'src/views'];

/**
 * Checks whether a comment on the preceding line or current line suppresses the diagnostic.
 */
export function isLineSuppressed(lines: string[], targetLine: number, ruleId: string): boolean {
  const prevLine = targetLine > 1 ? lines[targetLine - 2] : '';
  const currentLine = lines[targetLine - 1] || '';

  const checkComment = (text: string) => {
    const match = text.match(/(?:\/\/|\/\*)\s*ui-audit-disable(?:-next-line)?(?:\s+([\w-]+))?/);
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

/**
 * Rule 1: Audit Mandatory Component File Quad.
 * In src/components/interface/** and src/components/domain/**,
 * whenever <FolderName>.tsx exists in a directory, ensure colocated:
 * - <FolderName>.module.css
 * - <FolderName>.stories.tsx
 * - <FolderName>.test.tsx
 */
export function auditComponentQuads(targetDirs: string[] = COMPONENT_QUAD_DIRS): AuditDiagnostic[] {
  const diagnostics: AuditDiagnostic[] = [];

  for (const baseDir of targetDirs) {
    const dirs = collectDirectories(baseDir);
    for (const dir of dirs) {
      const folderName = path.basename(dir);
      const componentTsx = path.join(dir, `${folderName}.tsx`);

      if (!fs.existsSync(componentTsx)) {
        // Not a primary component directory (e.g. category folder or subfolder without matching Component.tsx)
        continue;
      }

      const requiredFiles = [
        { ext: '.module.css', desc: 'CSS Module' },
        { ext: '.stories.tsx', desc: 'Storybook Story' },
        { ext: '.test.tsx', desc: 'Component Test' },
      ];

      const missing: string[] = [];
      for (const req of requiredFiles) {
        const filePath = path.join(dir, `${folderName}${req.ext}`);
        if (!fs.existsSync(filePath)) {
          missing.push(`${folderName}${req.ext}`);
        }
      }

      if (missing.length > 0) {
        diagnostics.push({
          filePath: componentTsx,
          line: 1,
          column: 1,
          ruleId: 'missing-component-quad',
          severity: 'error',
          message: `Component "${folderName}" is missing mandatory quad file(s): ${missing.join(', ')}`,
          snippet: `${folderName}.tsx in ${dir}`,
          remediation: `Create the missing file(s) in ${dir} to satisfy the Mandatory Component File Quad.`,
        });
      }
    }
  }

  return diagnostics;
}

interface ASTNode {
  type?: string;
  loc?: { start: { line: number; column: number }; end?: { line: number; column: number } };
  name?: { type?: string; name?: string };
  attributes?: ASTNode[];
  [key: string]: unknown;
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

  const walk = (node: ASTNode | null | undefined) => {
    if (!node || typeof node !== 'object') return;

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

    for (const key of Object.keys(node)) {
      const val = node[key];
      if (Array.isArray(val)) {
        for (const item of val) {
          walk(item as ASTNode);
        }
      } else if (val && typeof val === 'object' && 'type' in val) {
        walk(val as ASTNode);
      }
    }
  };

  walk(ast as unknown as ASTNode);
  return diagnostics;
}

/**
 * Rule 2: Audit Forbidden Inline Styles (`style=`).
 * Scans non-test, non-story .tsx files in target directories.
 */
export function auditInlineStyles(targetDirs: string[] = INLINE_STYLE_DIRS): AuditDiagnostic[] {
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
          message: 'Forbidden import of renderToString in component or view test.',
          snippet: line.trim().slice(0, 80),
          remediation: 'Use @testing-library/react (render, screen, fireEvent/userEvent) in jsdom.',
        });
      }
    }
  });

  return diagnostics;
}

/**
 * Rule 3: Audit Forbidden `renderToString` in Component Tests.
 * Scans .test.tsx files under src/components and src/views.
 */
export function auditRenderToString(targetDirs: string[] = RENDER_TO_STRING_DIRS): AuditDiagnostic[] {
  const diagnostics: AuditDiagnostic[] = [];
  const files: string[] = [];

  for (const baseDir of targetDirs) {
    files.push(
      ...collectFiles(baseDir, (filePath) => filePath.endsWith('.test.tsx'))
    );
  }

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    diagnostics.push(...auditRenderToStringContent(file, content));
  }

  return diagnostics;
}

// Regex to match hex colors (#fff, #ffffff, #12345678), ignoring url(#...)
const HEX_COLOR_REGEX = /(?:^|[^a-zA-Z0-9_\-#])#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b(?![0-9a-fA-F])/g;

/**
 * Audits CSS Module content for CUBE @layer blocks and hardcoded hex colors.
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

  // Check for hardcoded hex colors
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    // Strip comments for hex checking
    const strippedLine = line.replace(/\/\*.*?\*\//g, '');
    if (strippedLine.includes('url(#')) {
      // Skip SVG url fragments
      return;
    }

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
  });

  return diagnostics;
}

/**
 * Rule 4: Audit CSS Module Layer & Token Discipline.
 * Scans *.module.css files under targetDirs.
 * Fails if file is non-empty and lacks @layer blocks / @layer exceptions,
 * or contains hardcoded hex colors.
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
 * Main CLI entry point.
 */
export function runUIAudit(): number {
  console.log('\n--- Running Starmap UI Design System & Component Governance Audit ---');

  const diagnostics: AuditDiagnostic[] = [
    ...auditComponentQuads(),
    ...auditInlineStyles(),
    ...auditRenderToString(),
    ...auditCssModules(),
  ];

  let totalErrors = 0;
  let totalWarnings = 0;

  if (diagnostics.length > 0) {
    // Group diagnostics by file
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
        if (diag.snippet) {
          console.log(`     Code:  ${diag.snippet}`);
        }
        console.log(`     Fix:   ${diag.remediation}`);
        if (diag.severity === 'error') totalErrors++;
        else totalWarnings++;
      }
    }
  }

  console.log('\n--- UI Audit Summary ---');
  console.log(`Errors:   ${totalErrors}`);
  console.log(`Warnings: ${totalWarnings}`);

  if (totalErrors > 0) {
    console.log(
      '\n❌ UI Design System audit found infractions. Resolve them or add `/* ui-audit-disable-next-line <rule-id> */` if an exception is justified.\n'
    );
    return 1;
  }

  console.log('\n✨ All UI Design System & Component Governance invariants passed cleanly.\n');
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const exitCode = runUIAudit();
  process.exit(exitCode);
}
