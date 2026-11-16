import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useParams } from '@tanstack/react-router';
import { HazardDetailView } from './HazardDetailView';

describe('<HazardDetailView />', () => {
  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({});
  });

  it('renders single hazard detail view for high-gravity', () => {
    render(<HazardDetailView hazardId="high-gravity" />);
    const root = screen.getByTestId('hazard-detail-view-root');
    expect(root).toBeInTheDocument();
    expect(root.getAttribute('data-hazard-id')).toBe('high-gravity');

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
});
