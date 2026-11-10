import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  checkComponentQuads,
  auditInlineStylesContent,
  auditDynamicClassNamesContent,
  auditRawElementsContent,
  auditRenderToStringContent,
  auditCssModuleContent,
  runUiAudit,
} from '../../../scripts/audit-ui';

describe('UI Design System & Component Governance Audit (scripts/audit-ui.ts)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-audit-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('AUD-001: Component Quads Traversal & Sibling Detection', () => {
    it('detects missing quads in nested interface controls directories', () => {
      // Create nested controls structure: mockDir/controls/CustomButton
      const controlsDir = path.join(tempDir, 'controls', 'CustomButton');
      fs.mkdirSync(controlsDir, { recursive: true });
      fs.writeFileSync(path.join(controlsDir, 'CustomButton.tsx'), 'export const CustomButton = () => <div />;');
      // Missing .module.css, .stories.tsx, .test.tsx

      const diags = checkComponentQuads([tempDir]);
      expect(diags.length).toBeGreaterThan(0);
      expect(diags.some((d) => d.ruleId === 'missing-component-quad' && d.filePath.includes('CustomButton.tsx'))).toBe(true);
      expect(diags[0].message).toContain('missing mandatory quad file(s)');
    });

    it('passes when all quad files exist in nested component directory', () => {
      const componentDir = path.join(tempDir, 'controls', 'CompleteButton');
      fs.mkdirSync(componentDir, { recursive: true });
      fs.writeFileSync(path.join(componentDir, 'CompleteButton.tsx'), 'export const CompleteButton = () => <div />;');
      fs.writeFileSync(path.join(componentDir, 'CompleteButton.module.css'), '@layer blocks { .btn {} }');
      fs.writeFileSync(path.join(componentDir, 'CompleteButton.stories.tsx'), 'export default {};');
      fs.writeFileSync(path.join(componentDir, 'CompleteButton.test.tsx'), 'test("ok", () => {});');

      const diags = checkComponentQuads([tempDir]);
      expect(diags).toEqual([]);
    });

    it('flags sibling component missing a quad within the same directory', () => {
      const dir = path.join(tempDir, 'information', 'MultiBadge');
      fs.mkdirSync(dir, { recursive: true });
      // Primary quad complete
      fs.writeFileSync(path.join(dir, 'MultiBadge.tsx'), 'export const MultiBadge = () => <div />;');
      fs.writeFileSync(path.join(dir, 'MultiBadge.module.css'), '@layer blocks { .badge {} }');
      fs.writeFileSync(path.join(dir, 'MultiBadge.stories.tsx'), 'export default {};');
      fs.writeFileSync(path.join(dir, 'MultiBadge.test.tsx'), 'test("ok", () => {});');

      // Sibling component missing .module.css and .stories.tsx
      fs.writeFileSync(path.join(dir, 'SubBadge.tsx'), 'export const SubBadge = () => <div />;');
      fs.writeFileSync(path.join(dir, 'SubBadge.test.tsx'), 'test("ok", () => {});');

      const diags = checkComponentQuads([tempDir]);
      const siblingDiag = diags.find((d) => d.filePath.includes('SubBadge.tsx'));
      expect(siblingDiag).toBeDefined();
      expect(siblingDiag?.ruleId).toBe('missing-component-quad');
      expect(siblingDiag?.message).toContain('SubBadge.module.css');
      expect(siblingDiag?.message).toContain('SubBadge.stories.tsx');
    });

    it('excludes sub-component helper files that belong to a parent quad', () => {
      const dir = path.join(tempDir, 'domain', 'Panel');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'Panel.tsx'), 'export const Panel = () => <div />;');
      fs.writeFileSync(path.join(dir, 'Panel.module.css'), '@layer blocks { .panel {} }');
      fs.writeFileSync(path.join(dir, 'Panel.stories.tsx'), 'export default {};');
      fs.writeFileSync(path.join(dir, 'Panel.test.tsx'), 'test("ok", () => {});');

      // Helper files: lowercase or section helper belonging to Panel
      fs.writeFileSync(path.join(dir, 'panelHelpers.tsx'), 'export const helper = () => null;');
      fs.writeFileSync(path.join(dir, 'PanelSection.tsx'), 'export const PanelSection = () => null;');

      const diags = checkComponentQuads([tempDir]);
      expect(diags).toEqual([]);
    });

    it('flags component exceeding 300 lines (G-size)', () => {
      const dir = path.join(tempDir, 'controls', 'HugeButton');
      fs.mkdirSync(dir, { recursive: true });
      const hugeContent = Array.from({ length: 305 }, (_, i) => `// line ${i + 1}`).join('\n') + '\nexport const HugeButton = () => null;\n';
      fs.writeFileSync(path.join(dir, 'HugeButton.tsx'), hugeContent);
      fs.writeFileSync(path.join(dir, 'HugeButton.module.css'), '@layer blocks { .btn {} }');
      fs.writeFileSync(path.join(dir, 'HugeButton.stories.tsx'), 'export default {};');
      fs.writeFileSync(path.join(dir, 'HugeButton.test.tsx'), 'test("ok", () => {});');

      const diags = checkComponentQuads([tempDir]);
      expect(diags.some((d) => d.ruleId === 'file-size-exceeded' && d.filePath.includes('HugeButton.tsx'))).toBe(true);
    });
  });

  describe('AUD-001: AST / Source Scanning Scope & Forbidden Patterns', () => {
    it('flags raw interactive elements: <button>, <input>, <select>', () => {
      const code = `
        export const MyView = () => (
          <div>
            <button onClick={() => {}}>Click</button>
            <input type="text" />
            <select><option value="1">1</option></select>
          </div>
        );
      `;
      const diags = auditRawElementsContent('src/views/MyView.tsx', code);
      expect(diags).toHaveLength(3);
      expect(diags.map((d) => d.snippet)).toEqual(
        expect.arrayContaining([expect.stringContaining('<button'), expect.stringContaining('<input'), expect.stringContaining('<select')])
      );
      expect(diags.every((d) => d.ruleId === 'forbidden-raw-element')).toBe(true);
    });

    it('flags raw list elements: <ul>, <ol>, <dl>', () => {
      const code = `
        export const MyListView = () => (
          <div>
            <ul><li>Item</li></ul>
            <ol><li>Ordered</li></ol>
            <dl><dt>Term</dt><dd>Definition</dd></dl>
          </div>
        );
      `;
      const diags = auditRawElementsContent('src/views/MyListView.tsx', code);
      expect(diags).toHaveLength(3);
      expect(diags.map((d) => d.snippet)).toEqual(
        expect.arrayContaining([expect.stringContaining('<ul'), expect.stringContaining('<ol'), expect.stringContaining('<dl')])
      );
      expect(diags.every((d) => d.ruleId === 'forbidden-raw-element')).toBe(true);
      expect(diags[0].remediation).toContain('<Stack as="ul">');
    });

    it('permits Tier 1 Interface Primitives: <Button>, <Input>, <Select>', () => {
      const code = `
        import { Button, Input, Select } from '../components/interface';
        export const MyView = () => (
          <div>
            <Button>Click</Button>
            <Input />
            <Select />
          </div>
        );
      `;
      const diags = auditRawElementsContent('src/views/MyView.tsx', code);
      expect(diags).toEqual([]);
    });

    it('permits raw elements inside Tier 1 Interface Primitives (src/components/interface/)', () => {
      const code = `
        export const Button = () => (
          <button type="button">Click</button>
        );
      `;
      const diags = auditRawElementsContent('src/components/interface/Button/Button.tsx', code);
      expect(diags).toEqual([]);
    });

    it('flags inline style attributes in views, search, and canvas files', () => {
      const code = `
        export const SearchComponent = () => (
          <div style={{ display: 'flex', width: 200 }}>Search</div>
        );
      `;
      const diags = auditInlineStylesContent('src/components/search/SearchPanel.tsx', code);
      expect(diags).toHaveLength(1);
      expect(diags[0].ruleId).toBe('forbidden-inline-style');
    });

    it('flags dynamic className string concatenation and template literals', () => {
      const code = `
        export const DynamicComponent = ({ active, variant }: { active: boolean; variant: string }) => {
          return (
            <div>
              <div className={\`btn \${active ? 'btn-active' : ''}\`}>Template</div>
              <div className={'btn ' + variant}>Concat</div>
              <div className={['btn', variant].join(' ')}>Join</div>
            </div>
          );
        };
      `;
      const diags = auditDynamicClassNamesContent('src/views/DynamicView.tsx', code);
      expect(diags.length).toBe(3);
      expect(diags.every((d) => d.ruleId === 'forbidden-dynamic-classname')).toBe(true);
    });

    it('permits static className identifiers and data-* attributes', () => {
      const code = `
        import styles from './MyView.module.css';
        export const CleanComponent = ({ active }: { active: boolean }) => (
          <div className={styles.container} data-active={active ? 'true' : undefined}>
            Clean
          </div>
        );
      `;
      const diags = auditDynamicClassNamesContent('src/views/CleanView.tsx', code);
      expect(diags).toEqual([]);
    });

    it('flags renderToString from react-dom/server across src and tests', () => {
      const testCode = `
        import { renderToString } from 'react-dom/server';
        describe('test', () => {
          it('renders', () => {
            const html = renderToString(<div />);
          });
        });
      `;
      const diags = auditRenderToStringContent('tests/legacy.test.tsx', testCode);
      expect(diags).toHaveLength(1);
      expect(diags[0].ruleId).toBe('forbidden-rendertostring');
    });
  });

  describe('AUD-002: CSS Module Tokens, Margin Discipline & Safelisting', () => {
    it('flags hardcoded px and rem values in CSS modules', () => {
      const css = `
        @layer blocks {
          .container {
            padding: 16px;
            font-size: 1.25rem;
            width: 240px;
          }
        }
      `;
      const diags = auditCssModuleContent('src/views/MyView.module.css', css);
      const tokenDiags = diags.filter((d) => d.ruleId === 'hardcoded-css-token');
      expect(tokenDiags.length).toBe(3);
    });

    it('does NOT mask raw px/rem inside minmax(...) and clamp(...)', () => {
      const css = `
        @layer blocks {
          .grid {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            width: clamp(100px, 20vw, 400px);
          }
        }
      `;
      const diags = auditCssModuleContent('src/components/search/Search.module.css', css);
      const tokenDiags = diags.filter((d) => d.ruleId === 'hardcoded-css-token');
      expect(tokenDiags.length).toBeGreaterThanOrEqual(2);
      expect(tokenDiags.some((d) => d.snippet.includes('minmax'))).toBe(true);
      expect(tokenDiags.some((d) => d.snippet.includes('clamp'))).toBe(true);
    });

    it('safelists 1px borders/hairlines and 0 / 0px values', () => {
      const css = `
        @layer blocks {
          .box {
            border: 1px solid var(--border-color);
            outline: 1px solid var(--focus-ring);
            margin: 0;
            padding: 0px;
          }
        }
      `;
      const diags = auditCssModuleContent('src/components/interface/Box/Box.module.css', css);
      expect(diags.filter((d) => d.ruleId === 'hardcoded-css-token')).toEqual([]);
    });

    it('flags outer margin declarations on component blocks', () => {
      const css = `
        @layer blocks {
          .widget {
            margin: 16px;
            margin-top: 10px;
            margin-inline: 8px;
          }
        }
      `;
      const diags = auditCssModuleContent('src/components/domain/Widget.module.css', css);
      const marginDiags = diags.filter((d) => d.ruleId === 'forbidden-outer-margin');
      expect(marginDiags.length).toBe(3);
    });

    it('flags hardcoded hex color literals', () => {
      const css = `
        @layer blocks {
          .text {
            color: #ff3366;
            background: #ffffff;
          }
        }
      `;
      const diags = auditCssModuleContent('src/views/Color.module.css', css);
      const hexDiags = diags.filter((d) => d.ruleId === 'hardcoded-hex-color');
      expect(hexDiags).toHaveLength(2);
    });

    it('exempts @media and @container condition headers while flagging declarations inside', () => {
      const css = `
        @layer blocks {
          @media (max-width: 767px) {
            .responsive {
              padding: var(--space-fib-3);
            }
          }
          @container (min-width: 400px) {
            .card {
              display: flex;
            }
          }
          @media (max-width: 767px) { .inline { padding: 16px; } }
        }
      `;
      const diags = auditCssModuleContent('src/views/Media.module.css', css);
      const tokenDiags = diags.filter((d) => d.ruleId === 'hardcoded-css-token');
      expect(tokenDiags).toHaveLength(1);
      expect(tokenDiags[0].snippet).toContain('padding: 16px');
    });

    it('flags hardcoded rgba/rgb/hsl color functions', () => {
      const css = `
        @layer blocks {
          .glass {
            background: rgba(255, 255, 255, 0.92);
            border-color: rgb(0, 0, 0);
            box-shadow: 0 0 var(--space-fib-3) hsla(200, 50%, 50%, 0.5);
          }
        }
      `;
      const diags = auditCssModuleContent('src/views/Glass.module.css', css);
      const colorDiags = diags.filter((d) => d.ruleId === 'hardcoded-css-token');
      expect(colorDiags).toHaveLength(3);
    });

    it('flags hardcoded ms durations and safelists 0ms', () => {
      const css = `
        @layer blocks {
          .animated {
            transition: color 150ms ease, opacity 0ms linear;
            animation-duration: 300ms;
          }
        }
      `;
      const diags = auditCssModuleContent('src/views/Anim.module.css', css);
      const tokenDiags = diags.filter((d) => d.ruleId === 'hardcoded-css-token');
      expect(tokenDiags).toHaveLength(2);
      expect(tokenDiags.some((d) => d.message.includes('"150ms"'))).toBe(true);
      expect(tokenDiags.some((d) => d.message.includes('"300ms"'))).toBe(true);
      expect(tokenDiags.some((d) => d.message.includes('"0ms"'))).toBe(false);
    });

    it('verifies that all Wave 1A owned CSS modules have zero violations', () => {
      const ownedFiles = [
        'src/views/GuideViews.module.css',
        'src/components/canvas/FullAssembly.module.css',
        'src/components/canvas/cartography/StorybookCanvasWrapper.module.css',
        'src/components/canvas/entity/EntityLabel.module.css',
        'src/components/canvas/entity/JourneyChord.module.css',
        'src/components/canvas/scenes/SpatialScenes.module.css',
        'src/components/domain/BodiesPanel/BodiesPanel.module.css',
        'src/components/domain/Breadcrumbs/Breadcrumbs.module.css',
        'src/components/domain/CanonLayerItem/CanonLayerItem.module.css',
        'src/components/domain/ControlBar/ControlBar.module.css',
        'src/components/domain/Guide3DPreview/Guide3DPreview.module.css',
        'src/components/domain/MetricComparativePanel/MetricComparativePanel.module.css',
        'src/components/domain/Minimap/Minimap.module.css',
        'src/components/domain/PreviewPanel/PreviewPanel.module.css',
        'src/components/domain/SpatialShell/SpatialShell.module.css',
        'src/components/domain/StarTypeCombinator/StarTypeCombinator.module.css',
        'src/components/domain/domainStories.module.css',
      ];

      for (const file of ownedFiles) {
        const fullPath = path.resolve(file);
        expect(fs.existsSync(fullPath), `File ${file} should exist`).toBe(true);
        const content = fs.readFileSync(fullPath, 'utf8');
        const diags = auditCssModuleContent(file, content);
        expect(diags, `Violations found in ${file}: ${JSON.stringify(diags)}`).toEqual([]);
      }
    });
  });

  describe('Suppression Reason Validation (invalid-suppression)', () => {
    it('flags unreasoned ui-audit-disable or guard-disable comments without -- <reason>', () => {
      const code = `
        export const MyComp = () => {
          // ui-audit-disable-next-line forbidden-raw-element
          return <button>Click</button>;
        };
      `;
      const diags = auditRawElementsContent('src/views/MyComp.tsx', code);
      const invalidSupp = diags.filter((d) => d.ruleId === 'invalid-suppression');
      expect(invalidSupp.length).toBe(1);
      expect(invalidSupp[0].message).toContain('without a required reason');
    });

    it('permits ui-audit-disable with proper -- <reason>', () => {
      const code = `
        export const MyComp = () => {
          // ui-audit-disable-next-line forbidden-raw-element -- Essential accessible button demo
          return <button>Click</button>;
        };
      `;
      const diags = auditRawElementsContent('src/views/MyComp.tsx', code);
      expect(diags).toEqual([]);
    });
  });

  describe('Pure Function runUiAudit', () => {
    it('returns structured diagnostics array without process.exit', () => {
      const diags = runUiAudit(tempDir);
      expect(Array.isArray(diags)).toBe(true);
    });
  });
});
