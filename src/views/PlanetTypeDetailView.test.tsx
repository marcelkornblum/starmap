import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useParams } from '@tanstack/react-router';
import { PlanetTypeDetailView } from './PlanetTypeDetailView';

describe('<PlanetTypeDetailView />', () => {
  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({});
  });

  it('renders single planet type detail view for terrestrial', () => {
    render(<PlanetTypeDetailView planetType="terrestrial" />);
    const root = screen.getByTestId('planet-type-detail-view-root');
    expect(root).toBeInTheDocument();
    expect(root.getAttribute('data-planet-type')).toBe('terrestrial');

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
});
