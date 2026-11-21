import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MetricsListView } from './MetricsListView';
import {
  clearReferenceBaselinesCache,
  seedReferenceBaselines,
} from '../data/referenceBaselinesRepository';

describe('<MetricsListView />', () => {
  beforeEach(() => {
    clearReferenceBaselinesCache();
  });

  it('renders root, breadcrumbs, section nav, heading, and all 13 metric items', () => {
    render(<MetricsListView />);

    const root = screen.getByTestId('metrics-list-view-root');
    expect(root).toBeTruthy();

    const breadcrumbs = screen.getByTestId('view-breadcrumbs');
    expect(breadcrumbs).toBeTruthy();
    expect(breadcrumbs.textContent).toContain('Guide');
    expect(breadcrumbs.textContent).toContain('Telemetry Metrics');

    const sectionNav = screen.getByTestId('guide-section-nav');
    expect(sectionNav).toBeTruthy();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Telemetry Metrics');

    const list = screen.getByTestId('metrics-guide-list');
    expect(list).toBeTruthy();

    const items = screen.getAllByTestId('metrics-guide-item');
    expect(items.length).toBe(13);

    const smaItem = items.find((item) => item.getAttribute('data-metric-id') === 'semi-major-axis');
    expect(smaItem).toBeTruthy();
    if (smaItem) {
      const link = within(smaItem).getByTestId('metrics-guide-link');
      expect(link.getAttribute('href')).toBe('/guide/metrics/semi-major-axis');
      expect(link.textContent).toContain('Semi-Major Axis');
      expect(link.textContent).toContain('Familiar Scale');

      const preview = within(smaItem).getByTestId('guide-3d-preview');
      expect(preview.getAttribute('data-preview-kind')).toBe('metric');

      const conversion = within(smaItem).getByTestId('metric-familiar-conversion');
      expect(conversion.textContent).toContain('light-minutes');
    }
  });

  it('renders dataset baseline values when referenceBaselinesRepository is seeded', () => {
    seedReferenceBaselines({
      version: 1,
      generatedAt: '2026-01-01T00:00:00.000Z',
      targets: {
        sol: {
          id: 'sol',
          name: 'Sol',
          systemId: 'sol',
          href: '/system/sol',
          spectralType: 'G2V',
          coordinatesPc: [0, 0, 0],
          massMsun: { value: 1, unit: 'M☉' },
          radiusRsun: { value: 1, unit: 'R☉' },
          luminosityLsun: { value: 1, unit: 'L☉' },
          effectiveTempK: { value: 5778, unit: 'K' },
          visualMagnitude: { value: -26.74, unit: 'V' },
          absoluteMagnitude: { value: 4.83, unit: 'M_V' },
          reticleType: 'stellar-system',
        },
        earth: {
          id: 'earth',
          name: 'Earth',
          systemId: 'sol',
          systemName: 'Sol',
          href: '/planet/earth',
          coordinatesPc: [0, 0, 0],
          massMearth: { value: 1, unit: 'M⊕' },
          radiusRearth: { value: 1, unit: 'R⊕' },
          semiMajorAxisAu: { value: 1, unit: 'AU' },
          periodDays: { value: 365.26, unit: 'd' },
          inclinationDeg: { value: 0, unit: '°' },
          equilibriumTempK: { value: 249, unit: 'K' },
          surfaceGravityG: { value: 1, unit: 'g' },
          reticleType: 'terrestrial',
        },
        stellarBenchmark: {
          id: 'tau-ceti',
          systemId: 'tau-ceti',
          name: 'Tau Ceti',
          href: '/system/tau-ceti',
          coordinatesPc: [0, 0, 0],
          reticleType: 'stellar-system',
        },
        orbitalBenchmark: {
          id: 'tau-ceti-e',
          systemId: 'tau-ceti',
          systemName: 'Tau Ceti',
          name: 'Tau Ceti e',
          href: '/system/tau-ceti?focus=tau-ceti-e',
          reticleType: 'super-earth',
        },
      },
      metrics: {
        'semi-major-axis': {
          baselineId: 'earth',
          baselineName: 'Earth',
          baselineHref: '/planet/earth',
          baselineReticleType: 'terrestrial',
          value: '1.000 AU',
          familiar: '8.32 light-minutes',
          numericValue: 1,
          unit: 'AU',
        },
      },
    });

    render(<MetricsListView />);
    expect(screen.getByText('Earth: 1.000 AU')).toBeInTheDocument();
  });
});
