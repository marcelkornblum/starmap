import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useParams } from '@tanstack/react-router';
import { HazardDetailView } from './HazardDetailView';
import {
  clearGuideExamplesCache,
  seedGuideExamples,
} from '../data/guideExamplesRepository';

vi.mock('@tanstack/react-router', () => ({
  useParams: vi.fn(() => ({})),
  useSearch: vi.fn(() => ({})),
  useRouter: vi.fn(() => undefined),
}));

describe('<HazardDetailView />', () => {
  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({});
    clearGuideExamplesCache();
  });

  it('renders single hazard detail view for high-gravity', () => {
    render(<HazardDetailView hazardId="high-gravity" />);
    const root = screen.getByTestId('hazard-detail-view-root');
    expect(root).toBeInTheDocument();
    expect(root.tagName).toBe('MAIN');
    expect(root.getAttribute('data-mode')).toBe('document');
    expect(root.getAttribute('data-hazard-id')).toBe('high-gravity');
    expect(screen.getByTestId('console-dock-guide')).toHaveAttribute('data-active', 'true');

    const summary = screen.getByTestId('guide-detail-summary');
    expect(summary.textContent).toBeTruthy();

    const telemetry = screen.getByTestId('guide-detail-telemetry');
    expect(telemetry.textContent).toContain('Trigger Threshold');
  });

  it('renders cards for all classifications when multi-value hazard is provided (AUD-092)', () => {
    render(<HazardDetailView hazardId="high-gravity,tidal-locking" />);
    expect(screen.getByTestId('hazard-detail-view-root')).toBeInTheDocument();
    expect(screen.getAllByText('High surface gravity').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tidal locking').length).toBeGreaterThan(0);
  });

  it('renders focus context return button when ?focus= is provided in search (AUD-092)', () => {
    render(
      <HazardDetailView
        hazardId="high-gravity"
        locationSearch="?focus=jupiter"
      />,
    );
    const focusContext = screen.getByTestId('guide-focus-context');
    expect(focusContext).toBeInTheDocument();
    expect(focusContext.textContent).toContain('jupiter');
    expect(screen.getByTestId('console-dock-map')).toHaveAttribute('href', '/galaxy?focus=jupiter');
  });

  it('renders fallback gracefully when hazard is not recognized', () => {
    render(<HazardDetailView hazardId="quantum-instability" />);
    const fallback = screen.getByTestId('hazard-detail-fallback');
    expect(fallback).toBeInTheDocument();
    expect(fallback.textContent).toContain('quantum-instability');
  });

  it('extracts hazardId from route params via useParams when propHazardId is omitted', () => {
    vi.mocked(useParams).mockReturnValue({ hazardId: 'extreme-heat' });
    render(<HazardDetailView />);
    const root = screen.getByTestId('hazard-detail-view-root');
    expect(root.getAttribute('data-hazard-id')).toBe('extreme-heat');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Environmental Hazard: Extreme thermal regime');
  });

  it('renders dataset-driven examples when guideExamplesRepository is hydrated', () => {
    seedGuideExamples({
      version: 1,
      generatedAt: '2026-01-01T00:00:00.000Z',
      sections: {
        starTypes: {},
        planetTypes: {},
        metricTypes: {},
        hazardTypes: {
          'high-gravity': [
            {
              id: 'tau-ceti-e',
              name: 'Tau Ceti e',
              href: '/system/tau-ceti?focus=tau-ceti-e',
              note: 'Super-Earth candidate (1.83 g).',
              reticleType: 'super-earth',
            },
          ],
        },
      },
    });
    render(<HazardDetailView hazardId="high-gravity" />);
    const links = screen.getAllByTestId('guide-example-link');
    expect(links[0]?.textContent).toBe('Tau Ceti e');
    expect(links[0]?.getAttribute('href')).toBe('/system/tau-ceti?focus=tau-ceti-e');
  });
});
