import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { auditCssModuleContent } from '../../../scripts/audit-ui';

describe('UI Design System & CSS Governance Audit (scripts/audit-ui.ts)', () => {
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
      const diags = auditCssModuleContent('src/components/domain/Search/SearchPanel/SearchPanel.module.css', css);
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
});
