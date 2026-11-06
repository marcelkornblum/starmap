import { describe, it, expect } from 'vitest';
import {
  auditComponentQuads,
  auditInlineStyles,
  auditInlineStylesContent,
  auditRenderToString,
  auditRenderToStringContent,
  auditCssModules,
  auditCssModuleContent,
  runUIAudit,
} from '../scripts/audit-ui';

describe('UI Design System & Component Governance Audit (scripts/audit-ui.ts)', () => {
  describe('Repository Baseline Invariants', () => {
    it('passes all component quad checks across src/components/interface and src/components/domain', () => {
      const diagnostics = auditComponentQuads();
      expect(diagnostics).toEqual([]);
    });

    it('detects zero forbidden inline JSX styles across components and views', () => {
      const diagnostics = auditInlineStyles();
      expect(diagnostics).toEqual([]);
    });

    it('detects zero forbidden renderToString imports across src/components and src/views test files', () => {
      const diagnostics = auditRenderToString();
      expect(diagnostics).toEqual([]);
    });

    it('detects zero CSS module layer or token discipline violations across src/components and src/views', () => {
      const diagnostics = auditCssModules();
      expect(diagnostics).toEqual([]);
    });

    it('executes runUIAudit cleanly and returns exit code 0', () => {
      const exitCode = runUIAudit();
      expect(exitCode).toBe(0);
    });
  });

  describe('Rule 2: Inline Styles Detector', () => {
    it('flags style={{ color: "red" }} in JSX elements', () => {
      const code = `
        export const BadComponent = () => {
          return <div style={{ color: 'red' }}>Forbidden</div>;
        };
      `;
      const diags = auditInlineStylesContent('BadComponent.tsx', code);
      expect(diags).toHaveLength(1);
      expect(diags[0].ruleId).toBe('forbidden-inline-style');
      expect(diags[0].line).toBe(3);
    });

    it('respects ui-audit-disable-next-line suppression comment', () => {
      const code = `
        export const SuppressedComponent = () => {
          // ui-audit-disable-next-line forbidden-inline-style
          return <div style={{ color: 'red' }}>Allowed via suppression</div>;
        };
      `;
      const diags = auditInlineStylesContent('SuppressedComponent.tsx', code);
      expect(diags).toEqual([]);
    });
  });

  describe('Rule 3: renderToString in Tests Detector', () => {
    it('flags renderToString import from react-dom/server', () => {
      const testCode = `
        import { renderToString } from 'react-dom/server';
        describe('bad test', () => {
          it('renders', () => {
            const html = renderToString(<div />);
          });
        });
      `;
      const diags = auditRenderToStringContent('Bad.test.tsx', testCode);
      expect(diags).toHaveLength(1);
      expect(diags[0].ruleId).toBe('forbidden-rendertostring');
    });

    it('respects ui-audit-disable-next-line for renderToString', () => {
      const testCode = `
        // ui-audit-disable-next-line forbidden-rendertostring
        import { renderToString } from 'react-dom/server';
      `;
      const diags = auditRenderToStringContent('Suppressed.test.tsx', testCode);
      expect(diags).toEqual([]);
    });
  });

  describe('Rule 4: CSS Module Layer & Token Discipline', () => {
    it('flags CSS files missing @layer blocks or @layer exceptions', () => {
      const css = `
        .myClass {
          display: flex;
        }
      `;
      const diags = auditCssModuleContent('Bad.module.css', css);
      expect(diags.some((d) => d.ruleId === 'missing-layer-blocks')).toBe(true);
    });

    it('flags hardcoded hex colors in CSS', () => {
      const css = `
        @layer blocks {
          .myClass {
            color: #ff0000;
            background-color: #12345678;
          }
        }
      `;
      const diags = auditCssModuleContent('Hex.module.css', css);
      expect(diags.filter((d) => d.ruleId === 'hardcoded-hex-color')).toHaveLength(2);
    });

    it('ignores SVG url(#id) fragments and empty files', () => {
      const css = `
        @layer blocks {
          .svgElement {
            clip-path: url(#clip-mask);
          }
        }
      `;
      const diags = auditCssModuleContent('Svg.module.css', css);
      expect(diags).toEqual([]);
      expect(auditCssModuleContent('Empty.module.css', '   \n  ')).toEqual([]);
    });

    it('respects ui-audit-disable-next-line suppression in CSS', () => {
      const css = `
        @layer blocks {
          .myClass {
            /* ui-audit-disable-next-line hardcoded-hex-color */
            color: #ff0000;
          }
        }
      `;
      const diags = auditCssModuleContent('SuppressedHex.module.css', css);
      expect(diags).toEqual([]);
    });
  });
});
