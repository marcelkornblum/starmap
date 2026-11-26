import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GuideSectionNav } from './GuideSectionNav';

describe('<GuideSectionNav />', () => {
  it('renders all 5 guide section links', () => {
    render(<GuideSectionNav />);

    const nav = screen.getByTestId('guide-section-nav');
    expect(nav).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Star Types' })).toHaveAttribute('href', '/guide/star-types');
    expect(screen.getByRole('link', { name: 'Planet Types' })).toHaveAttribute('href', '/guide/planet-types');
    expect(screen.getByRole('link', { name: 'Telemetry Metrics' })).toHaveAttribute('href', '/guide/metrics');
    expect(screen.getByRole('link', { name: 'Environmental Hazards' })).toHaveAttribute('href', '/guide/hazards');
    expect(screen.getByRole('link', { name: 'Legend' })).toHaveAttribute('href', '/guide/legend');
  });

  it('marks current section with aria-current="page"', () => {
    const { rerender } = render(<GuideSectionNav currentSection="star-types" />);
    expect(screen.getByRole('link', { name: 'Star Types' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Planet Types' }).getAttribute('aria-current')).toBeNull();

    rerender(<GuideSectionNav currentSection="metrics" />);
    expect(screen.getByRole('link', { name: 'Star Types' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('link', { name: 'Telemetry Metrics' }).getAttribute('aria-current')).toBe('page');

    rerender(<GuideSectionNav currentSection="legend" />);
    expect(screen.getByRole('link', { name: 'Telemetry Metrics' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('link', { name: 'Legend' }).getAttribute('aria-current')).toBe('page');
  });
});
