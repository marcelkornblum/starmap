// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricComparativePanel } from './MetricComparativePanel';
import {
  resolveMetricComparison,
  resolveMetricGuideEntry,
} from '../../../services/guideService';

describe('<MetricComparativePanel />', () => {
  it('renders comparative telemetry with baseline and target columns', () => {
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
});
