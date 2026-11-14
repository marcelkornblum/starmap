import { describe, expect, it, vi } from 'vitest';
import {
  COMMENT_MARKER,
  LEGACY_MARKERS,
  computeModuleName,
  computeRelativePath,
  findExistingCoverageComment,
  generateCoverageMarkdown,
  getBadgeColour,
  getStatusIndicator,
  getStatusLabel,
  getVitestCoverageThresholds,
  parseCoverageData,
  parseVitestThresholds,
  postOrUpdateComment,
  DEFAULT_THRESHOLDS,
  type CoverageSummaryData,
} from '../../../scripts/coverage-comment';

describe('coverage-comment script', () => {
  const sampleData: CoverageSummaryData = {
    total: {
      lines: { total: 1000, covered: 850, skipped: 0, pct: 85.0 },
      statements: { total: 1200, covered: 1000, skipped: 0, pct: 83.3 },
      branches: { total: 400, covered: 320, skipped: 0, pct: 80.0 },
      functions: { total: 200, covered: 180, skipped: 0, pct: 90.0 },
    },
    '/repo/src/stores/useSettingsStore.ts': {
      lines: { total: 50, covered: 48, skipped: 0, pct: 96.0 },
      statements: { total: 60, covered: 58, skipped: 0, pct: 96.7 },
      branches: { total: 20, covered: 18, skipped: 0, pct: 90.0 },
      functions: { total: 10, covered: 10, skipped: 0, pct: 100.0 },
    },
    '/repo/src/components/poc/canvas/CelestialNode.tsx': {
      lines: { total: 100, covered: 40, skipped: 0, pct: 40.0 },
      statements: { total: 120, covered: 50, skipped: 0, pct: 41.7 },
      branches: { total: 50, covered: 15, skipped: 0, pct: 30.0 },
      functions: { total: 20, covered: 8, skipped: 0, pct: 40.0 },
    },
    '/repo/src/components/poc/layout/RootLayout.tsx': {
      lines: { total: 80, covered: 60, skipped: 0, pct: 75.0 },
      statements: { total: 90, covered: 70, skipped: 0, pct: 77.8 },
      branches: { total: 30, covered: 20, skipped: 0, pct: 66.7 },
      functions: { total: 15, covered: 10, skipped: 0, pct: 66.7 },
    },
    '/repo/src/App.tsx': {
      lines: { total: 20, covered: 20, skipped: 0, pct: 100.0 },
      statements: { total: 25, covered: 25, skipped: 0, pct: 100.0 },
      branches: { total: 5, covered: 5, skipped: 0, pct: 100.0 },
      functions: { total: 5, covered: 5, skipped: 0, pct: 100.0 },
    },
    '/repo/src/types/index.ts': {
      lines: { total: 0, covered: 0, skipped: 0, pct: 0.0 },
      statements: { total: 0, covered: 0, skipped: 0, pct: 0.0 },
      branches: { total: 0, covered: 0, skipped: 0, pct: 0.0 },
      functions: { total: 0, covered: 0, skipped: 0, pct: 0.0 },
    },
  };

  it('extracts coverage thresholds matching vite.config.ts', () => {
    const thresholds = getVitestCoverageThresholds();
    expect(thresholds).toEqual({
      lines: 78,
      statements: 78,
      branches: 70,
      functions: 78,
    });
  });

  it('parses thresholds correctly from vite config string', () => {
    const mockConfig = `
      export default defineConfig({
        test: {
          coverage: {
            thresholds: {
              lines: 85,
              statements: 85,
              branches: 75,
              functions: 80,
            },
          },
        },
      });
    `;
    const parsed = parseVitestThresholds(mockConfig);
    expect(parsed).toEqual({
      lines: 85,
      statements: 85,
      branches: 75,
      functions: 80,
    });
  });

  it('falls back to default thresholds when config is empty or missing thresholds', () => {
    const parsed = parseVitestThresholds('export default {}');
    expect(parsed).toEqual({});
    expect(DEFAULT_THRESHOLDS).toEqual({
      lines: 78,
      statements: 78,
      branches: 70,
      functions: 78,
    });
  });

  it('determines status indicators and labels accurately', () => {
    expect(getStatusIndicator(95)).toBe('🟢');
    expect(getStatusIndicator(80)).toBe('🟢');
    expect(getStatusIndicator(79.9)).toBe('🟡');
    expect(getStatusIndicator(50)).toBe('🟡');
    expect(getStatusIndicator(49.9)).toBe('🔴');

    expect(getStatusLabel(85)).toBe('🟢 Strong');
    expect(getStatusLabel(65)).toBe('🟡 Moderate');
    expect(getStatusLabel(30)).toBe('🔴 Weak');

    expect(getStatusIndicator(78, 78)).toBe('🟢');
    expect(getStatusIndicator(77.9, 78)).toBe('🟡');
    expect(getStatusLabel(78, 78)).toBe('🟢 Strong');
    expect(getStatusLabel(60, 78)).toBe('🟡 Moderate');
    expect(getStatusLabel(40, 78)).toBe('🔴 Weak');
  });

  it('maps coverage percentages to shields badge colours', () => {
    expect(getBadgeColour(95)).toBe('brightgreen');
    expect(getBadgeColour(92)).toBe('brightgreen');
    expect(getBadgeColour(85)).toBe('green');
    expect(getBadgeColour(75)).toBe('yellowgreen');
    expect(getBadgeColour(65)).toBe('yellow');
    expect(getBadgeColour(55)).toBe('orange');
    expect(getBadgeColour(45)).toBe('red');
  });

  it('computes correct module name from file path', () => {
    const srcDir = '/repo/src';
    expect(computeModuleName('/repo/src/components/poc/canvas/CelestialNode.tsx', srcDir)).toBe(
      'src/components/poc',
    );
    expect(computeModuleName('/repo/src/stores/useSettingsStore.ts', srcDir)).toBe('src/stores');
    expect(computeModuleName('/repo/src/App.tsx', srcDir)).toBe('src (root)');
  });

  it('computes relative path from repository root', () => {
    expect(computeRelativePath('/repo/src/stores/useSettingsStore.ts', '/repo')).toBe(
      'src/stores/useSettingsStore.ts',
    );
  });

  it('parses coverage summary, filters empty files, and sorts weakest first', () => {
    const { total, moduleSummaries, filesList } = parseCoverageData(sampleData, '/repo');

    expect(total.lines.pct).toBe(85);
    expect(filesList).toHaveLength(4);

    const modNames = moduleSummaries.map((m) => m.module);
    expect(modNames).toContain('src/components/poc');
    expect(modNames).toContain('src/stores');
    expect(modNames).toContain('src (root)');

    expect(moduleSummaries[0].module).toBe('src/components/poc');
    expect(moduleSummaries[0].linesPct).toBe(55.55555555555556);

    expect(filesList[0].path).toBe('src/components/poc/canvas/CelestialNode.tsx');
  });

  it('generates concise GitHub markdown within character limits and reflects thresholds', () => {
    const { total, moduleSummaries, filesList } = parseCoverageData(sampleData, '/repo');
    const md = generateCoverageMarkdown(total, moduleSummaries, filesList, {
      lines: 80,
      statements: 80,
      branches: 75,
      functions: 85,
    });

    expect(md).toContain(COMMENT_MARKER);
    expect(md).toContain('### Test Coverage Summary');
    expect(md).toContain('Ratchet Baseline');
    expect(md).toContain('🟢 Pass');
    expect(md).toContain('Module Coverage Overview');
    expect(md).toContain('File-by-File Breakdown');
    expect(md).toContain('<details>');
    expect(md).toContain('</details>');
    expect(md.length).toBeLessThan(65536);
  });

  it('marks metrics as Below Ratchet when falling short of Vitest threshold', () => {
    const belowData: CoverageSummaryData = {
      total: {
        lines: { total: 100, covered: 75, skipped: 0, pct: 75.0 },
        statements: { total: 100, covered: 75, skipped: 0, pct: 75.0 },
        branches: { total: 100, covered: 65, skipped: 0, pct: 65.0 },
        functions: { total: 100, covered: 75, skipped: 0, pct: 75.0 },
      },
    };

    const { total, moduleSummaries, filesList } = parseCoverageData(belowData, '/repo');
    const markdown = generateCoverageMarkdown(total, moduleSummaries, filesList);

    expect(markdown).toContain('| **Lines** | 75 / 100 | 75.0% | 78% | 🔴 Below Ratchet |');
    expect(markdown).toContain('| **Statements** | 75 / 100 | 75.0% | 78% | 🔴 Below Ratchet |');
    expect(markdown).toContain('| **Branches** | 65 / 100 | 65.0% | 70% | 🔴 Below Ratchet |');
    expect(markdown).toContain('| **Functions** | 75 / 100 | 75.0% | 78% | 🔴 Below Ratchet |');
  });

  it('identifies existing coverage comments', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 101, body: 'Standard review note' },
        { id: 102, body: `Prefix\n${COMMENT_MARKER}\nCoverage breakdown` },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);

    const foundId = await findExistingCoverageComment('org/repo', '42', 'test-token');
    expect(foundId).toBe(102);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 201, body: `Prefix\n${LEGACY_MARKERS[0]}\nOld comment` }],
    });
    const legacyId = await findExistingCoverageComment('org/repo', '42', 'test-token');
    expect(legacyId).toBe(201);

    vi.unstubAllGlobals();
  });

  it('posts or updates comment depending on existing ID', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 555, body: `${COMMENT_MARKER}` }],
      })
      .mockResolvedValueOnce({ ok: true });

    await postOrUpdateComment('org/repo', '42', 'tok', 'new body');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/org/repo/issues/comments/555',
      expect.objectContaining({ method: 'PATCH' }),
    );

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({ ok: true });

    await postOrUpdateComment('org/repo', '42', 'tok', 'new body');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/org/repo/issues/42/comments',
      expect.objectContaining({ method: 'POST' }),
    );

    vi.unstubAllGlobals();
  });
});
