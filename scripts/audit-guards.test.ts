import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  auditDeprecatedShimsContent,
  auditDirectHistoryMutationContent,
  auditGlobalThisMutationContent,
  auditLiteralsContent,
  auditVitestEnvironmentPragmaContent,
  auditWallClockInPipelineContent,
  isTelemetryIdentifier,
  loadEntityCatalog,
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

    it('enforces G-literals inside src/content/ and non-allowlisted src/config/ files', () => {
      const contentCode = `
        export const EXAMPLES = ['Sol', 'Earth', 'Tau Ceti'];
      `;
      const contentDiags = auditLiteralsContent('src/content/guide/starTypes.ts', contentCode, mockCatalog);
      expect(contentDiags).toHaveLength(3);
      expect(contentDiags.every((d) => d.ruleId === 'G-literals')).toBe(true);

      const configCode = `
        export const TARGET_NAME = 'Tau Ceti';
        export const TARGET_ID = 'sol';
      `;
      const configDiags = auditLiteralsContent('src/config/otherConfig.ts', configCode, mockCatalog);
      expect(configDiags).toHaveLength(2);
      expect(configDiags.every((d) => d.ruleId === 'G-literals')).toBe(true);
    });

    it('allows only lowercase structural IDs in src/config/referenceTargets.ts while rejecting display names, telemetry properties, and formatted telemetry strings', () => {
      const validCode = `
        const SOL_ID = 'sol';
        const EARTH_ID = 'earth';
        export const SOL_TARGET = {
          id: SOL_ID,
          href: \`/system/\${SOL_ID}\`,
          coordinatesPc: [0, 0, 0],
        };
      `;
      expect(auditLiteralsContent('src/config/referenceTargets.ts', validCode, mockCatalog)).toEqual([]);

      const badDisplayCode = `
        export const SOL_ID = 'sol';
        export const SOL_NAME = 'Sol';
        export const TARGET = {
          effectiveTempK: 5778,
          massMsun: 1,
          visualMagnitude: -26.74,
          tempLabel: '5,778 K',
        };
      `;
      const diags = auditLiteralsContent('src/config/referenceTargets.ts', badDisplayCode, mockCatalog);
      expect(diags.some((d) => d.message.includes('Sol'))).toBe(true);
      expect(diags.some((d) => d.message.includes('5778'))).toBe(true);
      expect(diags.some((d) => d.message.includes('massMsun') || d.message.includes('1'))).toBe(true);
      expect(diags.some((d) => d.message.includes('-26.74'))).toBe(true);
      expect(diags.some((d) => d.message.includes('5,778 K'))).toBe(true);
    });

    it('flags raw structural catalogue-ID literals (gaia-*, hip-*, hyg-*) even when absent from seed catalog', () => {
      const emptyishCatalog = {
        entityIds: new Set(['sol']),
        entityNames: new Set(['Sol']),
      };
      const code = `
        export const targets = [
          'gaia-2452378776434477184',
          'hip-32349',
          'hyg-119518',
          'hip-71683-A',
        ];
      `;
      const diags = auditLiteralsContent('src/services/targetService.ts', code, emptyishCatalog);
      expect(diags).toHaveLength(4);
      expect(diags.every((d) => d.ruleId === 'G-literals')).toBe(true);

      const refDiags = auditLiteralsContent(
        'src/config/referenceTargets.ts',
        "export const RAW_ID = 'hip-32349';\n",
        emptyishCatalog
      );
      expect(refDiags).toHaveLength(1);
      expect(refDiags[0]?.ruleId).toBe('G-literals');
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

  describe('loadEntityCatalog (Seed-Backed A3)', () => {
    const tempDirs: string[] = [];

    afterEach(() => {
      while (tempDirs.length > 0) {
        const dir = tempDirs.pop();
        if (dir) fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it('loads entity IDs and names strictly from data/seed/*.json and ignores public/data/search/', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-seed-test-'));
      tempDirs.push(tempDir);
      const seedDir = path.join(tempDir, 'data', 'seed');
      const searchDir = path.join(tempDir, 'public', 'data', 'search');
      fs.mkdirSync(seedDir, { recursive: true });
      fs.mkdirSync(searchDir, { recursive: true });

      fs.writeFileSync(
        path.join(searchDir, 'core.json'),
        JSON.stringify({ d: [{ i: 'search-only-id', n: 'Search Only Name' }] })
      );
      fs.writeFileSync(
        path.join(seedDir, 'solar-system-bodies.json'),
        JSON.stringify([{ id: 'sol', name: 'Sol (Sun)', displayName: 'Sol', properName: 'Sun' }])
      );
      fs.writeFileSync(
        path.join(seedDir, 'iau-star-names.json'),
        JSON.stringify({ 'hip-32349': { properName: 'Sirius', aliases: ['Dog Star'] } })
      );
      fs.writeFileSync(
        path.join(seedDir, 'recons-10pc.json'),
        JSON.stringify([{ id: 'luhman-16', name: 'Luhman 16 (WISE 1049-5319)', properName: 'Luhman 16', aliases: ['WISE 1049-5319'] }])
      );
      fs.writeFileSync(
        path.join(seedDir, 'name-exoworlds.json'),
        JSON.stringify({ '51 Pegasi b': { starName: 'Helvetios', planetName: 'Dimidium' } })
      );
      fs.writeFileSync(
        path.join(seedDir, 'galactic-structures.json'),
        JSON.stringify([{ id: 'hyades', name: 'Hyades Cluster', designations: ['Melotte 25'] }])
      );
      fs.writeFileSync(
        path.join(seedDir, 'circumstellar-disks.json'),
        JSON.stringify({
          Sol: [{ id: 'kuiper-belt', name: 'Kuiper Belt' }],
          Fomalhaut: [{ id: 'fomalhaut-outer-belt', name: 'Fomalhaut Great Dust Belt' }],
        })
      );
      fs.writeFileSync(
        path.join(seedDir, 'system-aliases.json'),
        JSON.stringify({
          specialSystemNameMap: { 'rigil kentaurus': 'Alpha Centauri' },
          diskHostAliases: { 'Tau Ceti': ['tau ceti', 'hd 10700'] },
        })
      );
      fs.writeFileSync(
        path.join(seedDir, 'guide-examples.json'),
        JSON.stringify({
          starTypes: { g: [{ entityId: 'tau-ceti', systemId: 'tau-ceti-sys' }] },
        })
      );

      const catalog = loadEntityCatalog(tempDir);
      expect(catalog.entityIds.has('sol')).toBe(true);
      expect(catalog.entityIds.has('luhman-16')).toBe(true);
      expect(catalog.entityIds.has('hyades')).toBe(true);
      expect(catalog.entityIds.has('fomalhaut-outer-belt')).toBe(true);
      expect(catalog.entityIds.has('kuiper-belt')).toBe(false);
      expect(catalog.entityIds.has('tau-ceti')).toBe(true);
      expect(catalog.entityIds.has('tau-ceti-sys')).toBe(true);
      expect(catalog.entityIds.has('search-only-id')).toBe(false);

      expect(catalog.entityNames.has('Sol')).toBe(true);
      expect(catalog.entityNames.has('Kuiper Belt')).toBe(false);
      expect(catalog.entityNames.has('Sirius')).toBe(true);
      expect(catalog.entityNames.has('Dog Star')).toBe(true);
      expect(catalog.entityNames.has('Luhman 16')).toBe(true);
      expect(catalog.entityNames.has('Helvetios')).toBe(true);
      expect(catalog.entityNames.has('Dimidium')).toBe(true);
      expect(catalog.entityNames.has('Melotte 25')).toBe(true);
      expect(catalog.entityNames.has('Fomalhaut')).toBe(true);
      expect(catalog.entityNames.has('Alpha Centauri')).toBe(true);
      expect(catalog.entityNames.has('Tau Ceti')).toBe(true);
      expect(catalog.entityNames.has('Search Only Name')).toBe(false);
    });

    it('throws loudly when data/seed/ is missing or empty', () => {
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-empty-seed-'));
      tempDirs.push(emptyDir);
      expect(() => loadEntityCatalog(emptyDir)).toThrow();

      const seedDir = path.join(emptyDir, 'data', 'seed');
      fs.mkdirSync(seedDir, { recursive: true });
      fs.writeFileSync(path.join(seedDir, 'solar-system-bodies.json'), '[]');
      expect(() => loadEntityCatalog(emptyDir)).toThrow();
    });
  });

  describe('runAllGuards & runGuardsAudit (G-literals Single Runner)', () => {
    const tempDirs: string[] = [];

    const writeMinimalSeeds = (rootDir: string) => {
      const seedDir = path.join(rootDir, 'data', 'seed');
      fs.mkdirSync(seedDir, { recursive: true });
      fs.writeFileSync(
        path.join(seedDir, 'solar-system-bodies.json'),
        JSON.stringify([{ id: 'sol', name: 'Sol (Sun)', displayName: 'Sol' }])
      );
      fs.writeFileSync(
        path.join(seedDir, 'guide-examples.json'),
        JSON.stringify({ starTypes: { g: [{ entityId: 'tau-ceti' }] } })
      );
    };

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
      writeMinimalSeeds(tempDir);
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
      writeMinimalSeeds(tempDir);
      const servicesDir = path.join(tempDir, 'src', 'services');
      fs.mkdirSync(servicesDir, { recursive: true });
      fs.writeFileSync(path.join(servicesDir, 'clean.ts'), "export const ok = 'nominal';\n");

      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(runGuardsAudit(tempDir)).toBe(0);

      fs.writeFileSync(path.join(servicesDir, 'bad.ts'), "export const star = 'sol';\n");
      expect(runGuardsAudit(tempDir)).toBe(1);
    });

    it('flags no-global-this-mutation via runAllGuards across production src/ files while skipping tests', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-global-runner-'));
      tempDirs.push(tempDir);
      writeMinimalSeeds(tempDir);
      const servicesDir = path.join(tempDir, 'src', 'services');
      fs.mkdirSync(servicesDir, { recursive: true });
      fs.writeFileSync(
        path.join(servicesDir, 'mutator.ts'),
        '(globalThis as Record<string, unknown>).__starmap = true;\n'
      );
      fs.writeFileSync(
        path.join(servicesDir, 'mutator.test.ts'),
        '(globalThis as Record<string, unknown>).__starmap = true;\n'
      );

      const violations = runAllGuards(tempDir);
      expect(violations).toHaveLength(1);
      expect(violations[0]?.ruleId).toBe('no-global-this-mutation');
    });
  });

  describe('no-global-this-mutation', () => {
    it('flags direct, bracket, and type-casted assignments to globalThis properties', () => {
      const code = `
        export const mutateGlobals = () => {
          (globalThis as unknown as { __STARMAP_STATE__: unknown }).__STARMAP_STATE__ = {};
          (globalThis as Record<string, unknown>)['__foo'] = 123;
          globalThis['__bar'] = 'abc';
          (globalThis as { count?: number }).count = 1;
        };
      `;
      const violations = auditGlobalThisMutationContent('src/services/globalState.ts', code);
      expect(violations).toHaveLength(4);
      expect(violations.every((v) => v.ruleId === 'no-global-this-mutation')).toBe(true);
    });

    it('flags Object.defineProperty(globalThis, ...) and Reflect.set(globalThis, ...)', () => {
      const code = `
        export const defineGlobals = () => {
          Object.defineProperty(globalThis, '__STARMAP__', { value: 1 });
          Object.defineProperty(globalThis as object, '__OTHER__', { value: 2 });
          Reflect.set(globalThis, '__REFLECT__', true);
          Reflect.set(globalThis as Record<string, unknown>, '__REFLECT2__', false);
        };
      `;
      const violations = auditGlobalThisMutationContent('src/utils/globalPatch.ts', code);
      expect(violations).toHaveLength(4);
      expect(violations.every((v) => v.ruleId === 'no-global-this-mutation')).toBe(true);
    });

    it('permits read-only access to globalThis properties and nested DOM properties', () => {
      const code = `
        export const readEnvironment = () => {
          const ua = globalThis.navigator?.userAgent ?? '';
          const storage = globalThis.localStorage;
          const href = globalThis.location?.href ?? '';
          const idle = globalThis.requestIdleCallback;
          const val = (globalThis as Record<string, unknown>)['__READ_ONLY__'];
          return { ua, storage, href, idle, val };
        };
      `;
      const violations = auditGlobalThisMutationContent('src/utils/env.ts', code);
      expect(violations).toEqual([]);
    });

    it('validates // guard-disable-next-line no-global-this-mutation -- <reason>', () => {
      const validSuppressed = `
        export const installHook = () => {
          // guard-disable-next-line no-global-this-mutation -- Required WebGL polyfill
          (globalThis as Record<string, unknown>).__POLYFILL__ = true;
        };
      `;
      expect(auditGlobalThisMutationContent('src/utils/polyfill.ts', validSuppressed)).toEqual([]);

      const bareSuppressed = `
        export const installHook = () => {
          // guard-disable-next-line no-global-this-mutation
          (globalThis as Record<string, unknown>).__POLYFILL__ = true;
        };
      `;
      const violations = auditGlobalThisMutationContent('src/utils/polyfill.ts', bareSuppressed);
      expect(violations).toHaveLength(1);
      expect(violations[0]?.ruleId).toBe('no-global-this-mutation');
      expect(violations[0]?.message).toContain('without a required reason');
    });
  });

  describe('no-direct-history-mutation', () => {
    it('flags history.pushState, history.replaceState, location.assign, location.replace, and location.href assignment', () => {
      const code = `
        export const badNav = (url: string) => {
          window.history.pushState({}, '', url);
          history.replaceState(history.state, '', url);
          window.location.assign(url);
          window.location.replace(url);
          window.location.href = url;
          location.href = url;
        };
      `;
      const violations = auditDirectHistoryMutationContent('src/hooks/useBadNav.ts', code);
      expect(violations).toHaveLength(6);
      expect(violations.every((v) => v.ruleId === 'no-direct-history-mutation')).toBe(true);
    });

    it('permits src/hooks/spaNavigation.ts, read-only location access, and reasoned suppressions', () => {
      const spaCode = `
        export const replaceSpaHistoryUrl = (url: string) => {
          window.history.replaceState(window.history.state, '', url);
        };
      `;
      expect(auditDirectHistoryMutationContent('src/hooks/spaNavigation.ts', spaCode)).toEqual([]);

      const readOnlyCode = `
        export const readUrl = () => {
          const href = window.location.href;
          const search = location.search;
          return { href, search };
        };
      `;
      expect(auditDirectHistoryMutationContent('src/hooks/useReadUrl.ts', readOnlyCode)).toEqual([]);

      const suppressedCode = `
        export const hardRedirect = (url: string) => {
          // guard-disable-next-line no-direct-history-mutation -- External OAuth redirect
          window.location.assign(url);
        };
      `;
      expect(auditDirectHistoryMutationContent('src/hooks/useAuth.ts', suppressedCode)).toEqual([]);
    });
  });

  describe('no-deprecated-shims', () => {
    it('flags @deprecated JSDoc and comment tags in production src/ files', () => {
      const code = `
        /**
         * Legacy helper.
         * @deprecated Use newHelper instead.
         */
        export const oldHelper = () => 1;
        // @deprecated Remove me
        export const olderHelper = () => 2;
      `;
      const violations = auditDeprecatedShimsContent('src/services/legacy.ts', code);
      expect(violations).toHaveLength(2);
      expect(violations.every((v) => v.ruleId === 'no-deprecated-shims')).toBe(true);
    });

    it('ignores @deprecated inside string literals and supports reasoned suppressions', () => {
      const code = `
        export const DOC_HINT = '@deprecated';
        // guard-disable-next-line no-deprecated-shims -- Documenting upstream tag
        // @deprecated External API marker
        export const ok = true;
      `;
      expect(auditDeprecatedShimsContent('src/services/docs.ts', code)).toEqual([]);
    });
  });

  describe('no-wall-clock-in-pipeline', () => {
    it('flags 0-arg new Date() and Date.now() in pipeline files', () => {
      const code = `
        export const makeStamp = () => {
          const nowIso = new Date().toISOString();
          const nowMs = Date.now();
          return { nowIso, nowMs };
        };
      `;
      const violations = auditWallClockInPipelineContent('scripts/pipeline/badStep.ts', code);
      expect(violations).toHaveLength(2);
      expect(violations.every((v) => v.ruleId === 'no-wall-clock-in-pipeline')).toBe(true);
    });

    it('permits deterministic new Date(epoch) and new Date(isoString)', () => {
      const code = `
        export const parseStamp = (unixSec: number, iso: string) => {
          return {
            fromSec: new Date(unixSec * 1000).toISOString(),
            fromIso: new Date(iso).toISOString(),
          };
        };
      `;
      expect(auditWallClockInPipelineContent('scripts/pipeline/seedCatalogs.ts', code)).toEqual([]);
    });
  });

  describe('no-vitest-environment-pragma', () => {
    it('flags vitest environment pragmas in test files', () => {
      const pragma = '@vitest-' + 'environment';
      const code = `// ${pragma} jsdom
import { describe, it, expect } from 'vitest';
describe('test', () => { it('works', () => expect(true).toBe(true)); });
`;
      const violations = auditVitestEnvironmentPragmaContent('src/stores/sample.test.ts', code);
      expect(violations).toHaveLength(1);
      expect(violations[0]?.ruleId).toBe('no-vitest-environment-pragma');
    });

    it('permits clean test files without vitest environment pragmas', () => {
      const code = `import { describe, it, expect } from 'vitest';
describe('test', () => { it('works', () => expect(true).toBe(true)); });
`;
      expect(auditVitestEnvironmentPragmaContent('src/stores/sample.test.ts', code)).toEqual([]);
    });
  });

  describe('runAllGuards integration for new rules', () => {
    const tempDirs: string[] = [];

    const writeMinimalSeeds = (rootDir: string) => {
      const seedDir = path.join(rootDir, 'data', 'seed');
      fs.mkdirSync(seedDir, { recursive: true });
      fs.writeFileSync(
        path.join(seedDir, 'solar-system-bodies.json'),
        JSON.stringify([{ id: 'sol', name: 'Sol (Sun)', displayName: 'Sol' }]),
      );
      fs.writeFileSync(
        path.join(seedDir, 'guide-examples.json'),
        JSON.stringify({ starTypes: { g: [{ entityId: 'tau-ceti' }] } }),
      );
    };

    afterEach(() => {
      while (tempDirs.length > 0) {
        const dir = tempDirs.pop();
        if (dir) fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it('runs no-direct-history-mutation, no-deprecated-shims, no-wall-clock-in-pipeline, and no-vitest-environment-pragma', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-all-rules-'));
      tempDirs.push(tempDir);
      writeMinimalSeeds(tempDir);

      fs.mkdirSync(path.join(tempDir, 'src', 'hooks'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'src', 'services'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'scripts', 'pipeline'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'tests'), { recursive: true });

      fs.writeFileSync(
        path.join(tempDir, 'src', 'hooks', 'spaNavigation.ts'),
        "export const replaceSpaHistoryUrl = (u: string) => window.history.replaceState(null, '', u);\n",
      );
      fs.writeFileSync(
        path.join(tempDir, 'src', 'hooks', 'badHook.ts'),
        "export const bad = (u: string) => window.history.replaceState(null, '', u);\n",
      );
      fs.writeFileSync(
        path.join(tempDir, 'src', 'services', 'legacy.ts'),
        '/** @deprecated */\nexport const legacy = 1;\n',
      );
      fs.writeFileSync(
        path.join(tempDir, 'scripts', 'pipeline', 'buildStep.ts'),
        'export const t = () => new Date();\n',
      );
      fs.writeFileSync(
        path.join(tempDir, 'scripts', 'pipeline', 'buildStep.test.ts'),
        'export const testTime = () => Date.now();\n',
      );
      const pragma = '@vitest-' + 'environment';
      fs.writeFileSync(
        path.join(tempDir, 'tests', 'env.test.ts'),
        `// ${pragma} jsdom\nexport const x = 1;\n`,
      );

      const violations = runAllGuards(tempDir);
      expect(violations.map((v) => v.ruleId).sort()).toEqual([
        'no-deprecated-shims',
        'no-direct-history-mutation',
        'no-vitest-environment-pragma',
        'no-wall-clock-in-pipeline',
      ]);
    });
  });
});
