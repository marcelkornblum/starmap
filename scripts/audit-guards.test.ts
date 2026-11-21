import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  auditLiteralsContent,
  isTelemetryIdentifier,
  runAllGuards,
  runGuardsAudit,
} from './audit-guards';

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

    it('exempts files in src/config/ from G-literals checks', () => {
      const code = `
        export const SOL_ID = 'sol';
        export const SOL_NAME = 'Sol';
      `;
      const diags = auditLiteralsContent('src/config/referenceTargets.ts', code, mockCatalog);
      expect(diags).toEqual([]);
    });

    it('exempts wire discriminator comparisons (record.t === "sol", record.t !== "sol")', () => {
      const code = `
        export const isSolar = (record: { t: string }) => {
          return record.t === 'sol' || record?.t !== 'earth';
        };
      `;
      const diags = auditLiteralsContent('src/utils/compactDataCodec.ts', code, mockCatalog);
      expect(diags).toEqual([]);
    });

    it('permits multiplicative identity fallback (1 / -1) when LHS has no telemetry identifier', () => {
      const code = `
        export const getRenderSettings = (rawOpacity?: number, rawZoom?: number) => {
          const opacity = rawOpacity ?? 1;
          const zoom = rawZoom || 1;
          return { opacity, zoom };
        };
      `;
      const diags = auditLiteralsContent('src/services/renderService.ts', code, mockCatalog);
      expect(diags).toEqual([]);
    });

    it('flags multiplicative identity fallback (1 / -1) when LHS contains an astronomical telemetry identifier', () => {
      const code = `
        export const getPlanetProps = (planet: { radiusEarth?: number }, rawMass?: number) => {
          const radius = planet.radiusEarth ?? 1;
          const mass = rawMass || 1;
          return { radius, mass };
        };
      `;
      const diags = auditLiteralsContent('src/services/astroService.ts', code, mockCatalog);
      expect(diags.length).toBe(2);
      expect(diags.every((d) => d.ruleId === 'G-literals')).toBe(true);
      expect(diags.some((d) => d.snippet?.includes('planet.radiusEarth ?? 1'))).toBe(true);
      expect(diags.some((d) => d.snippet?.includes('rawMass || 1'))).toBe(true);
    });

    it('flags telemetry identifiers across camelCase, PascalCase and compound names with fallback 1 (planet.massEarth, planetMass, semiMajorAxisAu, PlanetRadius)', () => {
      const code = `
        export const calculateTelemetry = (planet: { massEarth?: number }, planetMass?: number, semiMajorAxisAu?: number, PlanetRadius?: number) => {
          const m1 = planet.massEarth ?? 1;
          const m2 = planetMass ?? 1;
          const a = semiMajorAxisAu ?? 1;
          const r = PlanetRadius ?? 1;
          return { m1, m2, a, r };
        };
      `;
      const diags = auditLiteralsContent('src/services/astroService.ts', code, mockCatalog);
      expect(diags.length).toBe(4);
      expect(diags.every((d) => d.ruleId === 'G-literals')).toBe(true);
      expect(diags.some((d) => d.snippet?.includes('planet.massEarth ?? 1'))).toBe(true);
      expect(diags.some((d) => d.snippet?.includes('planetMass ?? 1'))).toBe(true);
      expect(diags.some((d) => d.snippet?.includes('semiMajorAxisAu ?? 1'))).toBe(true);
      expect(diags.some((d) => d.snippet?.includes('PlanetRadius ?? 1'))).toBe(true);
    });

    it('permits non-telemetry identifiers containing partial stem substrings (opacity, page, template) with fallback 1', () => {
      const code = `
        export const getUIConfig = (rawOpacity?: number, rawPage?: number, rawTemplate?: number) => {
          const opacity = rawOpacity ?? 1;
          const page = rawPage ?? 1;
          const template = rawTemplate ?? 1;
          return { opacity, page, template };
        };
      `;
      const diags = auditLiteralsContent('src/services/uiService.ts', code, mockCatalog);
      expect(diags).toEqual([]);
    });

    it('verifies isTelemetryIdentifier correctly identifies telemetry stems and ignores non-telemetry words', () => {
      expect(isTelemetryIdentifier('dist')).toBe(true);
      expect(isTelemetryIdentifier('distance')).toBe(true);
      expect(isTelemetryIdentifier('massEarth')).toBe(true);
      expect(isTelemetryIdentifier('planetMass')).toBe(true);
      expect(isTelemetryIdentifier('semiMajorAxisAu')).toBe(true);
      expect(isTelemetryIdentifier('PlanetRadius')).toBe(true);
      expect(isTelemetryIdentifier('opacity')).toBe(false);
      expect(isTelemetryIdentifier('page')).toBe(false);
      expect(isTelemetryIdentifier('template')).toBe(false);
    });

    it('flags dist as telemetry identifier with fallback 1 (sys.dist ?? 1)', () => {
      const code = `
        export const getSystemDistance = (sys: { dist?: number }) => {
          const d = sys.dist ?? 1;
          return d;
        };
      `;
      const diags = auditLiteralsContent('src/services/astroService.ts', code, mockCatalog);
      expect(diags.length).toBe(1);
      expect(diags[0]?.ruleId).toBe('G-literals');
      expect(diags[0]?.snippet).toContain('sys.dist ?? 1');
    });

    it('reports parse-error violation on invalid syntax instead of silently passing', () => {
      const code = `export const broken = (`;
      const diags = auditLiteralsContent('src/services/broken.ts', code, mockCatalog);
      expect(diags.length).toBe(1);
      expect(diags[0]?.ruleId).toBe('parse-error');
    });
  });

  describe('runAllGuards & runGuardsAudit (G-literals Single Runner)', () => {
    const tempDirs: string[] = [];

    afterEach(() => {
      vi.restoreAllMocks();
      while (tempDirs.length > 0) {
        const dir = tempDirs.pop();
        if (dir) fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it('scans src/ for G-literals while skipping test and story files', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-runner-test-'));
      tempDirs.push(tempDir);
      const servicesDir = path.join(tempDir, 'src', 'services');
      fs.mkdirSync(servicesDir, { recursive: true });
      fs.writeFileSync(path.join(servicesDir, 'bad.ts'), "export const star = 'tau-ceti';\n");
      fs.writeFileSync(path.join(servicesDir, 'bad.test.ts'), "export const testStar = 'tau-ceti';\n");
      fs.writeFileSync(path.join(servicesDir, 'bad.stories.tsx'), "export const storyStar = 'tau-ceti';\n");

      const violations = runAllGuards(tempDir);
      expect(violations).toHaveLength(1);
      expect(violations[0]?.ruleId).toBe('G-literals');
      expect(violations[0]?.filePath).toContain('bad.ts');
    });

    it('fails closed (exit code 1) when violations are found and returns 0 when clean', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-cli-test-'));
      tempDirs.push(tempDir);
      const servicesDir = path.join(tempDir, 'src', 'services');
      fs.mkdirSync(servicesDir, { recursive: true });
      fs.writeFileSync(path.join(servicesDir, 'clean.ts'), "export const ok = 'nominal';\n");

      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(runGuardsAudit(tempDir)).toBe(0);

      fs.writeFileSync(path.join(servicesDir, 'bad.ts'), "export const star = 'sol';\n");
      expect(runGuardsAudit(tempDir)).toBe(1);
    });
  });
});
