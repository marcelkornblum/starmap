import { describe, expect, it } from 'vitest';
import {
  getVitestCoverageThresholds,
  parseVitestThresholds,
  generateCoverageMarkdown,
  getStatusIndicator,
  getStatusLabel,
  getBadgeColour,
  DEFAULT_THRESHOLDS,
  type CoverageSummaryData,
  parseCoverageData,
} from '../../../scripts/coverage-comment';

describe('coverage-comment thresholds and badges', () => {
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

  it('formats status indicators and labels consistently with thresholds', () => {
    expect(getStatusIndicator(78, 78)).toBe('🟢');
    expect(getStatusIndicator(77.9, 78)).toBe('🟡');
    expect(getStatusIndicator(50)).toBe('🟡');
    expect(getStatusIndicator(49.9)).toBe('🔴');

    expect(getStatusLabel(78, 78)).toBe('🟢 Strong');
    expect(getStatusLabel(60, 78)).toBe('🟡 Moderate');
    expect(getStatusLabel(40, 78)).toBe('🔴 Weak');
  });

  it('computes correct badge colours for percentage bands', () => {
    expect(getBadgeColour(92)).toBe('brightgreen');
    expect(getBadgeColour(85)).toBe('green');
    expect(getBadgeColour(75)).toBe('yellowgreen');
    expect(getBadgeColour(65)).toBe('yellow');
    expect(getBadgeColour(55)).toBe('orange');
    expect(getBadgeColour(45)).toBe('red');
  });

  it('generates coverage markdown using Vitest thresholds as baseline', () => {
    const sampleData: CoverageSummaryData = {
      total: {
        lines: { total: 100, covered: 79, skipped: 0, pct: 79.0 },
        statements: { total: 100, covered: 79, skipped: 0, pct: 79.0 },
        branches: { total: 100, covered: 71, skipped: 0, pct: 71.0 },
        functions: { total: 100, covered: 79, skipped: 0, pct: 79.0 },
      },
      '/repo/src/sample.ts': {
        lines: { total: 100, covered: 79, skipped: 0, pct: 79.0 },
        statements: { total: 100, covered: 79, skipped: 0, pct: 79.0 },
        branches: { total: 100, covered: 71, skipped: 0, pct: 71.0 },
        functions: { total: 100, covered: 79, skipped: 0, pct: 79.0 },
      },
    };

    const { total, moduleSummaries, filesList } = parseCoverageData(sampleData, '/repo');
    const markdown = generateCoverageMarkdown(total, moduleSummaries, filesList);

    // Baseline should reflect 78% for lines, statements, functions, and 70% for branches
    expect(markdown).toContain('| **Lines** | 79 / 100 | 79.0% | 78% | 🟢 Pass |');
    expect(markdown).toContain('| **Statements** | 79 / 100 | 79.0% | 78% | 🟢 Pass |');
    expect(markdown).toContain('| **Branches** | 71 / 100 | 71.0% | 70% | 🟢 Pass |');
    expect(markdown).toContain('| **Functions** | 79 / 100 | 79.0% | 78% | 🟢 Pass |');
  });

  it('marks metrics as Below Ratchet when falling short of Vitest threshold', () => {
    const sampleData: CoverageSummaryData = {
      total: {
        lines: { total: 100, covered: 75, skipped: 0, pct: 75.0 },
        statements: { total: 100, covered: 75, skipped: 0, pct: 75.0 },
        branches: { total: 100, covered: 65, skipped: 0, pct: 65.0 },
        functions: { total: 100, covered: 75, skipped: 0, pct: 75.0 },
      },
    };

    const { total, moduleSummaries, filesList } = parseCoverageData(sampleData, '/repo');
    const markdown = generateCoverageMarkdown(total, moduleSummaries, filesList);

    expect(markdown).toContain('| **Lines** | 75 / 100 | 75.0% | 78% | 🔴 Below Ratchet |');
    expect(markdown).toContain('| **Statements** | 75 / 100 | 75.0% | 78% | 🔴 Below Ratchet |');
    expect(markdown).toContain('| **Branches** | 65 / 100 | 65.0% | 70% | 🔴 Below Ratchet |');
    expect(markdown).toContain('| **Functions** | 75 / 100 | 75.0% | 78% | 🔴 Below Ratchet |');
  });
});
