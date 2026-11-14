// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('<Badge />', () => {
  it('renders a span element by default with children', () => {
    render(<Badge>SOLAR</Badge>);
    const badge = screen.getByText('SOLAR');
    expect(badge.tagName.toLowerCase()).toBe('span');
    expect(badge.getAttribute('data-status')).toBeNull();
    expect(badge.getAttribute('data-confidence')).toBeNull();
    expect(badge.getAttribute('data-category')).toBeNull();
  });

  it('renders status, confidence, and category data attributes', () => {
    const { rerender } = render(
      <Badge status="nominal" confidence="confirmed" category="star">
        Alpha Centauri
      </Badge>
    );

    let badge = screen.getByText('Alpha Centauri');
    expect(badge.getAttribute('data-status')).toBe('nominal');
    expect(badge.getAttribute('data-confidence')).toBe('confirmed');
    expect(badge.getAttribute('data-category')).toBe('star');

    rerender(
      <Badge status="critical" confidence="unverified" category="planet">
        Proxima b
      </Badge>
    );
    badge = screen.getByText('Proxima b');
    expect(badge.getAttribute('data-status')).toBe('critical');
    expect(badge.getAttribute('data-confidence')).toBe('unverified');
    expect(badge.getAttribute('data-category')).toBe('planet');
  });

  it('renders an anchor tag when href is provided and resolves app href', () => {
    render(
      <Badge href="/guide/star-types" target="_blank" rel="noopener noreferrer">
        Star Guide
      </Badge>
    );

    const link = screen.getByRole('link', { name: 'Star Guide' });
    expect(link.tagName.toLowerCase()).toBe('a');
    expect(link.getAttribute('href')).toContain('/guide/star-types');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('applies static module class and forwards attributes', () => {
    render(<Badge data-testid="static-badge">Static</Badge>);
    const badge = screen.getByTestId('static-badge');
    expect(badge.className).toMatch(/badge/);
  });

  it('forwards additional HTML and ARIA attributes', () => {
    render(
      <Badge aria-label="Hazard Indicator" data-testid="test-badge">
        Warning
      </Badge>
    );
    const badge = screen.getByTestId('test-badge');
    expect(badge.getAttribute('aria-label')).toBe('Hazard Indicator');
  });
});
