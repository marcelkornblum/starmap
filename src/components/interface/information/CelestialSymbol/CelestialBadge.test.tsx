import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CelestialBadge } from './CelestialBadge';

describe('<CelestialBadge />', () => {
  it('renders CelestialBadge with default size and data attributes', () => {
    render(<CelestialBadge type="star" data-testid="celestial-badge" />);

    const badge = screen.getByTestId('celestial-badge');
    expect(badge.getAttribute('data-celestial-badge')).toBe('star');
    expect(badge.getAttribute('data-size')).toBe('sm');
    expect(badge.getAttribute('aria-label')).toBe('Star');
  });

  it('resolves interactive defaultGuideHref when interactive is true', () => {
    render(<CelestialBadge type="terrestrial" interactive />);

    const link = screen.getByRole('link', { name: 'Terrestrial' });
    expect(link.getAttribute('href')).toContain('/guide/planet-types/terrestrial');
  });

  it('allows explicit href override', () => {
    render(<CelestialBadge type="star" href="/custom/star/route" />);

    const link = screen.getByRole('link', { name: 'Star' });
    expect(link.getAttribute('href')).toContain('/custom/star/route');
  });

  it('renders visual label when showLabel is true', () => {
    render(<CelestialBadge type="super-earth" showLabel data-testid="celestial-badge" />);

    const badge = screen.getByTestId('celestial-badge');
    expect(badge.textContent).toContain('Super-Earth');
  });

  it('renders CelestialSymbol directly without wrapping in an outlined Badge box', () => {
    render(
      <CelestialBadge
        type="star"
        data-testid="unboxed-badge"
      />,
    );
    const badge = screen.getByTestId('unboxed-badge');
    expect(badge.getAttribute('data-celestial-badge')).toBe('star');
    expect(badge.getAttribute('data-celestial-symbol')).toBe('star');
    // Must not render badge container class
    expect(badge.className).not.toContain('_badge_');
  });
});
