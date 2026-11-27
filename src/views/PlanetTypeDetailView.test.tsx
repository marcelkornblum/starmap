import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { useParams } from '@tanstack/react-router';
import { PlanetTypeDetailView } from './PlanetTypeDetailView';
import {
  clearGuideExamplesCache,
  seedGuideExamples,
} from '../data/guideExamplesRepository';

vi.mock('@tanstack/react-router', () => ({
  useParams: vi.fn(() => ({})),
  useSearch: vi.fn(() => ({})),
  useRouter: vi.fn(() => undefined),
}));

describe('<PlanetTypeDetailView />', () => {
  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({});
    clearGuideExamplesCache();
  });

  it('renders single planet type detail view for terrestrial', () => {
    render(<PlanetTypeDetailView planetType="terrestrial" />);
    const root = screen.getByTestId('planet-type-detail-view-root');
    expect(root).toBeInTheDocument();
    expect(root.tagName).toBe('MAIN');
    expect(root.getAttribute('data-mode')).toBe('document');
    expect(root.getAttribute('data-planet-type')).toBe('terrestrial');
    expect(screen.getByTestId('console-dock-guide')).toHaveAttribute('data-active', 'true');

    const summary = screen.getByTestId('guide-detail-summary');
    expect(summary.textContent).toBeTruthy();

    const telemetry = screen.getByTestId('guide-detail-telemetry');
    expect(telemetry.textContent).toContain('Mass Range');
  });

  it('renders cards for all classifications when multi-value planet type is provided (AUD-092)', () => {
    render(<PlanetTypeDetailView planetType="terrestrial,super-earth" />);
    expect(screen.getByTestId('planet-type-detail-view-root')).toBeInTheDocument();
    expect(screen.getByText('Terrestrial Worlds')).toBeInTheDocument();
    expect(screen.getByText('Super-Earths')).toBeInTheDocument();
  });

  it('renders focus context return button when ?focus= is provided in search (AUD-092)', () => {
    render(
      <PlanetTypeDetailView
        planetType="terrestrial"
        locationSearch="?focus=earth"
      />,
    );
    const focusContext = screen.getByTestId('guide-focus-context');
    expect(focusContext).toBeInTheDocument();
    expect(focusContext.textContent).toContain('earth');
    expect(screen.getByTestId('console-dock-map')).toHaveAttribute('href', '/galaxy?focus=earth');
  });

  it('renders fallback gracefully when planet type is not recognized', () => {
    render(<PlanetTypeDetailView planetType="plasma-world" />);
    expect(screen.getByText(/No guide record found for planet classification/i)).toBeInTheDocument();
  });

  it('extracts planetType from route params via useParams when propPlanetType is omitted', () => {
    vi.mocked(useParams).mockReturnValue({ planetType: 'gas-giant' });
    render(<PlanetTypeDetailView />);
    const root = screen.getByTestId('planet-type-detail-view-root');
    expect(root.getAttribute('data-planet-type')).toBe('gas-giant');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Planet Type: gas-giant');
  });

  it('renders dataset-driven examples when guideExamplesRepository is hydrated', () => {
    seedGuideExamples({
      version: 1,
      generatedAt: '2026-01-01T00:00:00.000Z',
      sections: {
        starTypes: {},
        planetTypes: {
          terrestrial: [
            {
              id: 'earth',
              name: 'Earth',
              href: '/system/sol?focus=earth',
              note: 'Terrestrial benchmark.',
              reticleType: 'terrestrial',
            },
          ],
        },
        metricTypes: {},
        hazardTypes: {},
      },
    });
    render(<PlanetTypeDetailView planetType="terrestrial" />);
    const links = screen.getAllByTestId('guide-example-link');
    expect(links[0]?.textContent).toBe('Earth');
    expect(links[0]?.getAttribute('href')).toBe('/system/sol?focus=earth');
  });

  it('renders 2-crumb breadcrumbs without redundant Guide prefix and wraps telemetry in a CollapsibleSection', () => {
    render(<PlanetTypeDetailView planetType="terrestrial" />);

    const breadcrumbs = screen.getByTestId('view-breadcrumbs');
    expect(within(breadcrumbs).getAllByTestId('breadcrumb-item')).toHaveLength(2);
    expect(breadcrumbs.textContent).not.toContain('Guide');
    expect(breadcrumbs.textContent).toContain('Planet Types');

    const telemetryToggle = screen.getByRole('button', { name: /Geophysical & Atmospheric Telemetry/i });
    expect(telemetryToggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(telemetryToggle);
    expect(telemetryToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('guide-detail-telemetry')).toBeNull();
  });
});
