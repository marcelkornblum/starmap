// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HazardBadge } from './HazardBadge';

describe('<HazardBadge />', () => {
  it('renders critical hazard with critical status', () => {
    render(
      <HazardBadge
        label="Relativistic Jet"
        severity="critical"
        code="HZ-01"
        data-testid="hazard-badge"
      />
    );

    const badge = screen.getByTestId('hazard-badge');
    expect(badge.getAttribute('data-status')).toBe('critical');
    expect(badge.getAttribute('data-hazard-badge')).toBe('HZ-01');
    expect(badge.textContent).toBe('Relativistic Jet');
  });

  it('renders warning or caution severity with caution status', () => {
    const { rerender } = render(
      <HazardBadge
        label="Asteroid Belt"
        severity="caution"
        data-testid="hazard-badge"
      />
    );

    let badge = screen.getByTestId('hazard-badge');
    expect(badge.getAttribute('data-status')).toBe('caution');
    expect(badge.getAttribute('data-hazard-badge')).toBe('summary');

    rerender(
      <HazardBadge
        label="Solar Flare Risk"
        severity="warning"
        data-testid="hazard-badge"
      />
    );
    badge = screen.getByTestId('hazard-badge');
    expect(badge.getAttribute('data-status')).toBe('caution');
  });

  it('renders anchor when href is provided', () => {
    render(
      <HazardBadge
        label="Radiation Hazard"
        severity="critical"
        href="/guide/hazards"
      />
    );

    const link = screen.getByRole('link', { name: 'Radiation Hazard' });
    expect(link.getAttribute('href')).toContain('/guide/hazards');
  });
});
