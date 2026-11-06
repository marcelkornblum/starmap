// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GuideSectionNav } from './GuideSectionNav';

describe('<GuideSectionNav />', () => {
  it('renders all 4 guide section links', () => {
    render(<GuideSectionNav />);

    const nav = screen.getByTestId('guide-section-nav');
    expect(nav).toBeDefined();

    expect(screen.getByRole('link', { name: 'Star Types' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Planet Types' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Telemetry Metrics' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Environmental Hazards' })).toBeDefined();
  });

  it('marks current section with aria-current="page"', () => {
    const { rerender } = render(<GuideSectionNav currentSection="star-types" />);
    expect(screen.getByRole('link', { name: 'Star Types' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Planet Types' }).getAttribute('aria-current')).toBeNull();

    rerender(<GuideSectionNav currentSection="metrics" />);
    expect(screen.getByRole('link', { name: 'Star Types' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('link', { name: 'Telemetry Metrics' }).getAttribute('aria-current')).toBe('page');
  });
});
