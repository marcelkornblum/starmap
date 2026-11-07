// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlanetTypeDetailView } from './PlanetTypeDetailView';

describe('<PlanetTypeDetailView />', () => {
  it('renders single planet type detail view for terrestrial', () => {
    render(<PlanetTypeDetailView planetType="terrestrial" />);
    expect(screen.getByTestId('planet-type-detail-view-root')).toBeDefined();
    expect(screen.getByTestId('guide-detail-summary')).toBeDefined();
    expect(screen.getByTestId('guide-detail-telemetry')).toBeDefined();
  });

  it('renders cards for all classifications when multi-value planet type is provided (AUD-092)', () => {
    render(<PlanetTypeDetailView planetType="terrestrial,super-earth" />);
    expect(screen.getByTestId('planet-type-detail-view-root')).toBeDefined();
    expect(screen.getByText('Terrestrial Worlds')).toBeDefined();
    expect(screen.getByText('Super-Earths')).toBeDefined();
  });

  it('renders focus context return button when ?focus= is provided in search (AUD-092)', () => {
    render(
      <PlanetTypeDetailView
        planetType="terrestrial"
        locationSearch="?focus=earth"
      />,
    );
    const focusContext = screen.getByTestId('guide-focus-context');
    expect(focusContext).toBeDefined();
    expect(focusContext.textContent).toContain('earth');
  });

  it('renders fallback gracefully when planet type is not recognized', () => {
    render(<PlanetTypeDetailView planetType="plasma-world" />);
    expect(screen.getByText(/No guide record found for planet classification/i)).toBeDefined();
  });
});
