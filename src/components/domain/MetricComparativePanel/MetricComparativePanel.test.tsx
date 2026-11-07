// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricComparativePanel } from './MetricComparativePanel';
import {
  resolveMetricComparison,
  resolveMetricGuideEntry,
  type MetricComparison,
} from '../../../services/guideService';

describe('<MetricComparativePanel />', () => {
  it('renders comparative telemetry with baseline and target columns for a single catalogued target', () => {
    const entry = resolveMetricGuideEntry('semi-major-axis')!;
    const comparison = resolveMetricComparison('semi-major-axis', 'tau-ceti-e')!;

    render(<MetricComparativePanel entry={entry} comparison={comparison} />);

    const panel = screen.getByTestId('metric-comparative-3d');
    expect(panel.getAttribute('data-focused-entity')).toBe('tau-ceti-e');

    const baseline = screen.getByTestId('metric-comparison-baseline');
    expect(baseline).toBeDefined();
    expect(baseline.textContent).toContain('Earth');

    const target = screen.getByTestId('metric-comparison-target');
    expect(target).toBeDefined();
    expect(target.textContent).toContain('Tau Ceti e');

    const ratioBadge = screen.getByTestId('metric-comparison-ratio');
    expect(ratioBadge.textContent).toContain(comparison.relativeRatioLabel);
  });

  it('renders uncatalogued target gracefully without fabricated numbers (AUD-020)', () => {
    const entry = resolveMetricGuideEntry('stellar-mass')!;
    const uncataloguedComparison: MetricComparison = {
      metricId: 'stellar-mass',
      baselineName: 'Sol',
      baselineHref: '/system/sol',
      baselineValue: '1.00 M☉',
      baselineFamiliar: '332,950 M⊕',
      targetId: 'proxima-centauri',
      targetName: 'Proxima Centauri',
      targetHref: '/system/proxima-centauri',
      targetValue: '—',
      targetFamiliar: '—',
      relativeRatioLabel: '—',
      isFromFocusedContext: true,
      isCatalogued: false,
      targets: [
        {
          targetId: 'proxima-centauri',
          targetName: 'Proxima Centauri',
          targetHref: '/system/proxima-centauri',
          targetValue: '—',
          targetFamiliar: '—',
          relativeRatioLabel: '—',
          isCatalogued: false,
        },
      ],
    };

    render(<MetricComparativePanel entry={entry} comparison={uncataloguedComparison} />);

    const target = screen.getByTestId('metric-comparison-target');
    expect(target.textContent).toContain('Proxima Centauri');
    expect(target.textContent).toContain('—');
    expect(target.textContent).not.toContain('0.78');
  });

  it('renders multiple target cards when targets.length > 1 (DEC-R020 & AUD-092)', () => {
    const entry = resolveMetricGuideEntry('stellar-mass')!;
    const multiTargetComparison: MetricComparison = {
      metricId: 'stellar-mass',
      baselineName: 'Sol',
      baselineHref: '/system/sol',
      baselineValue: '1.00 M☉',
      baselineFamiliar: '332,950 M⊕',
      targetId: 'alpha-centauri-a',
      targetName: 'Alpha Centauri A',
      targetHref: '/system/alpha-centauri?focus=alpha-centauri-a',
      targetValue: '1.10 M☉',
      targetFamiliar: '≈ 366,245 Earth masses (M⊕)',
      relativeRatioLabel: '1.10× Solar mass',
      isFromFocusedContext: true,
      isCatalogued: true,
      targets: [
        {
          targetId: 'alpha-centauri-a',
          targetName: 'Alpha Centauri A',
          targetHref: '/system/alpha-centauri?focus=alpha-centauri-a',
          targetValue: '1.10 M☉',
          targetFamiliar: '≈ 366,245 Earth masses (M⊕)',
          relativeRatioLabel: '1.10× Solar mass',
          isCatalogued: true,
        },
        {
          targetId: 'alpha-centauri-b',
          targetName: 'Alpha Centauri B',
          targetHref: '/system/alpha-centauri?focus=alpha-centauri-b',
          targetValue: '0.91 M☉',
          targetFamiliar: '≈ 302,985 Earth masses (M⊕)',
          relativeRatioLabel: '0.91× Solar mass',
          isCatalogued: true,
        },
      ],
    };

    render(<MetricComparativePanel entry={entry} comparison={multiTargetComparison} />);

    const target0 = screen.getByTestId('metric-comparison-target');
    expect(target0.textContent).toContain('Alpha Centauri A');
    expect(target0.textContent).toContain('1.10 M☉');

    const target1 = screen.getByTestId('metric-comparison-target-1');
    expect(target1.textContent).toContain('Alpha Centauri B');
    expect(target1.textContent).toContain('0.91 M☉');
  });
});
