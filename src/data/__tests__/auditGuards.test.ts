import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { describe, it, expect } from 'vitest';
import {
  auditLiteralsContent,
  auditImportsContent,
  auditFileSize,
  compareBaseline,
  detectImportCycles,
  type GuardViolation,
  type GuardBaseline,
} from '../../../scripts/audit-guards';

describe('Structural Guard Suite (scripts/audit-guards.ts)', () => {
  describe('G-literals: Entity IDs, Names & Numeric Fallbacks (DEC-R011)', () => {
    const mockCatalog = {
      entityIds: new Set(['sol', 'earth', 'tau-ceti', 'gaia-123456789']),
      entityNames: new Set(['Sol', 'Earth', 'Tau Ceti']),
    };

    it('detects string literals matching catalog entity IDs and names', () => {
      const code = `
        export const getTarget = () => {
          const defaultStar = 'tau-ceti';
          const defaultName = 'Tau Ceti';
          return { defaultStar, defaultName };
        };
      `;
      const diags = auditLiteralsContent('src/services/targetService.ts', code, mockCatalog);
      expect(diags.length).toBe(2);
      expect(diags.every((d) => d.ruleId === 'G-literals')).toBe(true);
      expect(diags.some((d) => d.message.includes('tau-ceti'))).toBe(true);
      expect(diags.some((d) => d.message.includes('Tau Ceti'))).toBe(true);
    });

    it('respects // guard-disable-next-line G-literals -- reason with justification', () => {
      const code = `
        export const getBenchmark = () => {
          // guard-disable-next-line G-literals -- Required for calibration benchmark
          const star = 'tau-ceti';
          return star;
        };
      `;
      const diags = auditLiteralsContent('src/services/targetService.ts', code, mockCatalog);
      expect(diags).toEqual([]);
    });

    it('rejects bare suppression comment without -- reason', () => {
      const code = `
        export const getBenchmark = () => {
          // guard-disable-next-line G-literals
          const star = 'tau-ceti';
          return star;
        };
      `;
      const diags = auditLiteralsContent('src/services/targetService.ts', code, mockCatalog);
      expect(diags.length).toBeGreaterThan(0);
      expect(diags.some((d) => d.message.includes('without a required reason'))).toBe(true);
    });

    it('detects suspicious non-zero numeric fallbacks (?? <num> / || <num>) in services, canvas, views', () => {
      const code = `
        export const calculateMass = (rawMass?: number, rawRadius?: number) => {
          const mass = rawMass ?? 0.783;
          const radius = rawRadius || 5778;
          return { mass, radius };
        };
      `;
      const diags = auditLiteralsContent('src/services/astroService.ts', code, mockCatalog);
      expect(diags.length).toBe(2);
      expect(diags.some((d) => d.snippet?.includes('?? 0.783'))).toBe(true);
      expect(diags.some((d) => d.snippet?.includes('|| 5778'))).toBe(true);
    });

    it('detects static TemplateLiteral matching entity IDs or names with 0 expressions', () => {
      const code = `
        export const getBenchmark = () => {
          const id = \`tau-ceti\`;
          const name = \`Tau Ceti\`;
          return { id, name };
        };
      `;
      const diags = auditLiteralsContent('src/services/targetService.ts', code, mockCatalog);
      expect(diags.length).toBe(2);
      expect(diags.every((d) => d.ruleId === 'G-literals')).toBe(true);
      expect(diags.some((d) => d.message.includes('tau-ceti'))).toBe(true);
      expect(diags.some((d) => d.message.includes('Tau Ceti'))).toBe(true);
    });

    it('does NOT trigger G-literals for import or export source specifiers matching entity names', () => {
      const code = `
        import { sol } from './sol';
        import { EarthData } from '../data/earth';
        export { mars } from './mars';
        export * from './jupiter';
      `;
      const diags = auditLiteralsContent('src/services/systemService.ts', code, mockCatalog);
      expect(diags).toEqual([]);
    });

    it('permits ?? 0 or || 0 fallback defaults', () => {
      const code = `
        export const calculateOffset = (offset?: number) => {
          return offset ?? 0;
        };
      `;
      const diags = auditLiteralsContent('src/services/astroService.ts', code, mockCatalog);
      expect(diags).toEqual([]);
    });
  });

  describe('G-imports: Layer Boundary Hierarchy & Cycle Detection (DEC-R012)', () => {
    it('flags utils importing from components/canvas', () => {
      const code = `
        import { CameraRig } from '../components/canvas/CameraRig';
        export const util = () => CameraRig;
      `;
      const diags = auditImportsContent('src/utils/math.ts', code);
      expect(diags.length).toBe(1);
      expect(diags[0].ruleId).toBe('G-imports');
      expect(diags[0].message).toContain('Layer "utils" cannot import from higher layer "components/canvas"');
    });

    it('flags services importing from stores', () => {
      const code = `
        import { useUIStore } from '../stores/useUIStore';
        export const runService = () => useUIStore.getState();
      `;
      const diags = auditImportsContent('src/services/searchService.ts', code);
      expect(diags.length).toBe(1);
      expect(diags[0].ruleId).toBe('G-imports');
      expect(diags[0].message).toContain('Layer "services" cannot import from higher layer "stores"');
    });

    it('flags interface primitive importing from data or services', () => {
      const code = `
        import { guideCatalog } from '../../../data/guideCatalog';
        export const SpectralBadge = () => guideCatalog;
      `;
      const diags = auditImportsContent('src/components/interface/information/SpectralBadge.tsx', code);
      expect(diags.length).toBe(1);
      expect(diags[0].ruleId).toBe('G-imports');
      expect(diags[0].message).toContain('Layer "components/interface" cannot import from "data"');
    });

    it('flags any file importing from isolated prototypes directory', () => {
      const code = `
        import { PaletteShowcase } from '../components/prototypes/PaletteShowcase';
        export const View = () => PaletteShowcase;
      `;
      const diags = auditImportsContent('src/views/GalaxyView.tsx', code);
      expect(diags.length).toBe(1);
      expect(diags[0].ruleId).toBe('G-imports');
      expect(diags[0].message).toContain('Prototypes is isolated');
    });

    it('flags unreasoned guard-disable comment in auditImportsContent', () => {
      const code = `
        // guard-disable-next-line G-imports
        import { CameraRig } from '../components/canvas/CameraRig';
        export const util = () => CameraRig;
      `;
      const diags = auditImportsContent('src/utils/math.ts', code);
      expect(diags.length).toBe(1);
      expect(diags[0].message).toContain('without a required reason');
    });

    it('detects multi-line import cycles across files', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cycle-test-'));
      try {
        const fileA = path.join(tempDir, 'a.ts');
        const fileB = path.join(tempDir, 'b.ts');
        fs.writeFileSync(
          fileA,
          `import {\n  funcB,\n  otherVal,\n} from './b';\nexport const funcA = () => funcB();\n`
        );
        fs.writeFileSync(
          fileB,
          `import {\n  funcA,\n} from './a';\nexport const funcB = () => funcA();\n`
        );
        const violations = detectImportCycles([fileA, fileB], tempDir);
        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0].ruleId).toBe('G-imports-cycle');
        expect(violations[0].message).toContain('a.ts -> b.ts -> a.ts');
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('permits valid downward imports', () => {
      const code = `
        import type { CelestialEntity } from '../types/astro';
        import { calculateDistance } from '../utils/math';
        import { searchRepository } from '../data/searchRepository';
        export const service = () => ({ calculateDistance, searchRepository });
      `;
      const diags = auditImportsContent('src/services/queryService.ts', code);
      expect(diags).toEqual([]);
    });
  });

  describe('G-size: File Size Limits', () => {
    it('flags component or view files exceeding 300 lines', () => {
      const diagsComp = auditFileSize('src/components/domain/BigPanel.tsx', 305);
      expect(diagsComp).toHaveLength(1);
      expect(diagsComp[0].ruleId).toBe('G-size');

      const diagsView = auditFileSize('src/views/BigView.tsx', 301);
      expect(diagsView).toHaveLength(1);
      expect(diagsView[0].ruleId).toBe('G-size');
    });

    it('flags service or util files exceeding 500 lines', () => {
      const diagsServ = auditFileSize('src/services/BigService.ts', 550);
      expect(diagsServ).toHaveLength(1);
      expect(diagsServ[0].ruleId).toBe('G-size');

      const diagsUtil = auditFileSize('src/utils/BigUtil.ts', 505);
      expect(diagsUtil).toHaveLength(1);
      expect(diagsUtil[0].ruleId).toBe('G-size');
    });

    it('permits files within limits', () => {
      expect(auditFileSize('src/components/Normal.tsx', 250)).toEqual([]);
      expect(auditFileSize('src/services/NormalService.ts', 450)).toEqual([]);
    });
  });

  describe('DEC-R010: Baseline Comparison & Ratchet Logic', () => {
    const sampleBaseline: GuardBaseline = {
      version: 1,
      entries: {
        'G-literals::src/services/legacy.ts': { count: 3, audId: 'AUD-060' },
        'G-size::src/views/GalaxyView.tsx': { count: 1, audId: 'AUD-120' },
      },
    };

    it('passes when violations match or are below baseline counts', () => {
      const violations: GuardViolation[] = [
        { ruleId: 'G-literals', filePath: 'src/services/legacy.ts', line: 10, column: 1, message: 'literal' },
        { ruleId: 'G-literals', filePath: 'src/services/legacy.ts', line: 20, column: 1, message: 'literal' },
        { ruleId: 'G-size', filePath: 'src/views/GalaxyView.tsx', line: 1, column: 1, message: 'size' },
      ];
      const result = compareBaseline(violations, sampleBaseline);
      expect(result.success).toBe(true);
      expect(result.unbaselinedErrors).toEqual([]);
    });

    it('fails when an unbaselined violation is introduced', () => {
      const violations: GuardViolation[] = [
        { ruleId: 'G-literals', filePath: 'src/services/newFile.ts', line: 5, column: 1, message: 'new literal' },
      ];
      const result = compareBaseline(violations, sampleBaseline);
      expect(result.success).toBe(false);
      expect(result.unbaselinedErrors.length).toBe(1);
      expect(result.unbaselinedErrors[0].key).toBe('G-literals::src/services/newFile.ts');
    });

    it('fails when a violation count increases above baseline', () => {
      const violations: GuardViolation[] = [
        { ruleId: 'G-literals', filePath: 'src/services/legacy.ts', line: 10, column: 1, message: '1' },
        { ruleId: 'G-literals', filePath: 'src/services/legacy.ts', line: 20, column: 1, message: '2' },
        { ruleId: 'G-literals', filePath: 'src/services/legacy.ts', line: 30, column: 1, message: '3' },
        { ruleId: 'G-literals', filePath: 'src/services/legacy.ts', line: 40, column: 1, message: '4' },
      ];
      const result = compareBaseline(violations, sampleBaseline);
      expect(result.success).toBe(false);
      expect(result.unbaselinedErrors.some((e) => e.message.includes('increased from 3 to 4'))).toBe(true);
    });

    it('--update mode only ratchets downward and prunes zero-count entries', () => {
      const violations: GuardViolation[] = [
        // legacy dropped from 3 to 1
        { ruleId: 'G-literals', filePath: 'src/services/legacy.ts', line: 10, column: 1, message: '1' },
        // GalaxyView size fixed (0 violations)
      ];
      const result = compareBaseline(violations, sampleBaseline, { update: true });
      expect(result.success).toBe(true);
      expect(result.updatedBaseline).toBeDefined();
      expect(result.updatedBaseline?.entries['G-literals::src/services/legacy.ts']?.count).toBe(1);
      expect(result.updatedBaseline?.entries['G-size::src/views/GalaxyView.tsx']).toBeUndefined();
    });

    it('--update mode rejects count increases or new entries without --init-baseline', () => {
      const violations: GuardViolation[] = [
        { ruleId: 'G-literals', filePath: 'src/services/legacy.ts', line: 10, column: 1, message: '1' },
        { ruleId: 'G-literals', filePath: 'src/services/brandNew.ts', line: 1, column: 1, message: 'brand new' },
      ];
      const result = compareBaseline(violations, sampleBaseline, { update: true, initBaseline: false });
      expect(result.success).toBe(false);
      expect(result.unbaselinedErrors.some((e) => e.message.includes('Cannot add new entry in update mode'))).toBe(true);
    });
  });
});
