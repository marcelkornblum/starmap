// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Unit } from './Unit';

describe('<Unit />', () => {
  it('renders a span with data-unit attribute and children', () => {
    render(<Unit>AU</Unit>);
    const unit = screen.getByText('AU');
    expect(unit.tagName.toLowerCase()).toBe('span');
    expect(unit.getAttribute('data-unit')).toBe('true');
  });

  it('returns null when children is null, undefined, or empty string', () => {
    const { container, rerender } = render(<Unit>{null}</Unit>);
    expect(container.firstChild).toBeNull();

    rerender(<Unit>{undefined}</Unit>);
    expect(container.firstChild).toBeNull();

    rerender(<Unit>{''}</Unit>);
    expect(container.firstChild).toBeNull();
  });

  it('renders unit in parentheses when inParens is true', () => {
    const { rerender } = render(<Unit inParens data-testid="unit">km/s</Unit>);
    expect(screen.getByTestId('unit').textContent).toBe('(km/s)');

    rerender(<Unit inParens data-testid="unit">{100}</Unit>);
    expect(screen.getByTestId('unit').textContent).toBe('(100)');

    rerender(
      <Unit inParens data-testid="unit">
        <span>M_☉</span>
      </Unit>
    );
    expect(screen.getByTestId('unit').textContent).toBe('(M_☉)');
  });

  it('renders an anchor link when href is supplied', () => {
    render(
      <Unit href="/guide/metrics/astronomical-unit" target="_blank" rel="noopener noreferrer">
        AU
      </Unit>
    );

    const link = screen.getByRole('link', { name: 'AU' });
    expect(link.tagName.toLowerCase()).toBe('a');
    expect(link.getAttribute('href')).toContain('/guide/metrics/astronomical-unit');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.getAttribute('data-unit')).toBe('true');
    expect(link.getAttribute('data-interactive')).toBe('true');
  });

  it('applies static module class and forwards extra attributes', () => {
    render(
      <Unit aria-label="Astronomical Units" data-testid="custom-unit">
        AU
      </Unit>
    );

    const unit = screen.getByTestId('custom-unit');
    expect(unit.className).toMatch(/unit/);
    expect(unit.getAttribute('aria-label')).toBe('Astronomical Units');
  });
});
