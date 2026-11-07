// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HazardDetailView } from './HazardDetailView';

describe('<HazardDetailView />', () => {
  it('renders single hazard detail view for high-gravity', () => {
    render(<HazardDetailView hazardId="high-gravity" />);
    expect(screen.getByTestId('hazard-detail-view-root')).toBeDefined();
    expect(screen.getByTestId('guide-detail-summary')).toBeDefined();
    expect(screen.getByTestId('guide-detail-telemetry')).toBeDefined();
  });

  it('renders cards for all classifications when multi-value hazard is provided (AUD-092)', () => {
    render(<HazardDetailView hazardId="high-gravity,tidal-locking" />);
    expect(screen.getByTestId('hazard-detail-view-root')).toBeDefined();
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
    expect(focusContext).toBeDefined();
    expect(focusContext.textContent).toContain('jupiter');
  });

  it('renders fallback gracefully when hazard is not recognized', () => {
    render(<HazardDetailView hazardId="quantum-instability" />);
    expect(screen.getByTestId('hazard-detail-fallback')).toBeDefined();
  });
});
