// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricDetailView } from './MetricDetailView';

describe('<MetricDetailView />', () => {
  it('renders single metric detail view with baseline and comparative panel', () => {
    render(<MetricDetailView metricId="stellar-mass" />);
    expect(screen.getByTestId('metric-detail-view-root')).toBeDefined();
    expect(screen.getByTestId('metric-comparative-3d')).toBeDefined();
    expect(screen.getByTestId('guide-detail-summary')).toBeDefined();
  });

  it('cold load of /guide/metrics/stellar-mass?focus=proxima-centauri never shows fabricated Tau Ceti 0.783 (AUD-020)', async () => {
    render(
      <MetricDetailView
        metricId="stellar-mass"
        locationSearch="?focus=proxima-centauri"
      />,
    );

    const target = screen.getByTestId('metric-comparison-target');
    expect(target).toBeDefined();
    expect(target.textContent).not.toContain('0.78');
    expect(target.textContent).not.toContain('0.783');
  });

  it('renders focus context return button when ?focus= is provided in search (AUD-092)', () => {
    render(
      <MetricDetailView
        metricId="planetary-mass"
        locationSearch="?focus=jupiter"
      />,
    );
    const focusContext = screen.getByTestId('guide-focus-context');
    expect(focusContext).toBeDefined();
    expect(focusContext.textContent).toContain('jupiter');
  });

  it('renders cards for all classifications when multi-value metric is provided (AUD-092)', () => {
    render(<MetricDetailView metricId="stellar-mass,stellar-radius" />);
    expect(screen.getByTestId('metric-detail-view-root')).toBeDefined();
    expect(screen.getByText('Stellar Mass')).toBeDefined();
    expect(screen.getByText('Stellar Radius')).toBeDefined();
  });

  it('renders fallback gracefully when metric is not recognized', () => {
    render(<MetricDetailView metricId="hyperdrive-efficiency" />);
    expect(screen.getByText(/No guide record found for telemetry metric/i)).toBeDefined();
  });
});
