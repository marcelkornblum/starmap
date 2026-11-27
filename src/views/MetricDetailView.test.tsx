import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useParams } from '@tanstack/react-router';
import { MetricDetailView } from './MetricDetailView';

vi.mock('@tanstack/react-router', () => ({
  useParams: vi.fn(() => ({})),
  useSearch: vi.fn(() => ({})),
  useRouter: vi.fn(() => undefined),
}));
import { clearDetailsRepositoryCache, seedDetailRecord } from '../data/detailsRepository';
import { clearGuideExamplesCache } from '../data/guideExamplesRepository';
import { clearReferenceBaselinesCache } from '../data/referenceBaselinesRepository';
import type { SystemManifest } from '../types/astro';

const TAU_CETI_FIXTURE: SystemManifest = {
  id: 'gaia-2452378776434477184',
  name: 'Tau Ceti',
  x: 3.156,
  y: 1.54,
  z: -1.003,
  dist: 3.65,
  sectorId: 'sector_+000_+000_-025',
  stars: [
    {
      id: '2452378776434477184-A',
      name: 'Tau Ceti',
      componentDesignation: 'A',
      spectralType: 'G8V',
      mag: 3.5,
      absmag: 5.68,
      massMsun: 0.783,
      radiusRsun: 0.793,
      luminosityLsun: 0.52,
      effectiveTempK: 5344,
    },
  ],
  planets: [
    {
      id: 'tau-ceti-e',
      name: 'Tau Ceti e',
      letter: 'e',
      massMearth: 3.93,
      radiusRearth: 1.81,
      equilibriumTempK: 282,
      surfaceGravityG: 1.2,
      composition: 'super-earth',
      isHabitableCandidate: true,
      orbit: {
        semiMajorAxis: 0.538,
        periodDays: 162.87,
        eccentricity: 0.18,
        inclination: 0,
        ascendingNode: 0,
        argumentOfPeriapsis: 22.3,
        meanAnomaly: 0,
      },
    },
  ],
};

describe('<MetricDetailView />', () => {
  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({});
    clearDetailsRepositoryCache();
    clearGuideExamplesCache();
    clearReferenceBaselinesCache();
  });

  it('renders single metric detail view with baseline and comparative panel', () => {
    render(<MetricDetailView metricId="stellar-mass" />);
    const root = screen.getByTestId('metric-detail-view-root');
    expect(root).toBeInTheDocument();
    expect(root.tagName).toBe('MAIN');
    expect(root.getAttribute('data-mode')).toBe('document');
    expect(root.getAttribute('data-metric-id')).toBe('stellar-mass');
    expect(screen.getByTestId('console-dock-guide')).toHaveAttribute('data-active', 'true');

    expect(screen.getByTestId('metric-comparative-3d')).toBeInTheDocument();
    const summary = screen.getByTestId('guide-detail-summary');
    expect(summary.textContent).toBeTruthy();
  });

  it('cold load of /guide/metrics/stellar-mass?focus=proxima-centauri never shows fabricated Tau Ceti 0.783 (AUD-020)', () => {
    render(
      <MetricDetailView
        metricId="stellar-mass"
        locationSearch="?focus=proxima-centauri"
      />,
    );

    const target = screen.getByTestId('metric-comparison-target');
    expect(target).toBeInTheDocument();
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
    expect(focusContext).toBeInTheDocument();
    expect(focusContext.textContent).toContain('jupiter');
    expect(screen.getByTestId('console-dock-map')).toHaveAttribute('href', '/galaxy?focus=jupiter');
  });

  it('renders cards for all classifications when multi-value metric is provided (AUD-092)', () => {
    render(<MetricDetailView metricId="stellar-mass,stellar-radius" />);
    expect(screen.getByTestId('metric-detail-view-root')).toBeInTheDocument();
    expect(screen.getByText('Stellar Mass')).toBeInTheDocument();
    expect(screen.getByText('Stellar Radius')).toBeInTheDocument();
  });

  it('renders fallback gracefully when metric is not recognized', () => {
    render(<MetricDetailView metricId="hyperdrive-efficiency" />);
    expect(screen.getByText(/No guide record found for telemetry metric/i)).toBeInTheDocument();
  });

  it('extracts metricId from route params via useParams when propMetricId is omitted', () => {
    vi.mocked(useParams).mockReturnValue({ metricId: 'equilibrium-temperature' });
    render(<MetricDetailView />);
    const root = screen.getByTestId('metric-detail-view-root');
    expect(root.getAttribute('data-metric-id')).toBe('equilibrium-temperature');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Telemetry Metric: equilibrium-temperature');
  });

  it('renders context-aware comparative 3D section for galactic-coordinates with ?focus=tau-ceti', () => {
    seedDetailRecord('tau-ceti', { kind: 'system', record: TAU_CETI_FIXTURE });
    render(
      <MetricDetailView
        metricId="galactic-coordinates"
        locationSearch="?focus=tau-ceti"
      />,
    );

    const compSection = screen.getByTestId('metric-comparative-3d');
    expect(compSection.getAttribute('data-focused-entity')).toBe('tau-ceti');
    expect(screen.getByTestId('metric-comparison-baseline').textContent).toContain('Sol');
    expect(screen.getByTestId('metric-comparison-target').textContent).toContain('Tau Ceti');
  });
});
