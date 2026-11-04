// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Quantity, Measurement } from './Quantity';
import { Unit } from '../Unit/Unit';

describe('<Quantity />', () => {
  it('renders value and unit with data-quantity attribute', () => {
    render(<Quantity value="4.2465" unit="ly" data-testid="qty" />);

    const qty = screen.getByTestId('qty');
    expect(qty.getAttribute('data-quantity')).toBe('true');
    expect(qty.textContent).toContain('4.2465');
    expect(qty.textContent).toContain('ly');
  });

  it('automatically enables data-no-gap for angular units (°, ′, ″)', () => {
    const { rerender } = render(<Quantity value="45" unit="°" data-testid="qty" />);
    let qty = screen.getByTestId('qty');
    expect(qty.getAttribute('data-no-gap')).toBe('true');

    rerender(<Quantity value="30" unit="′" data-testid="qty" />);
    qty = screen.getByTestId('qty');
    expect(qty.getAttribute('data-no-gap')).toBe('true');

    rerender(<Quantity value="15" unit="″" data-testid="qty" />);
    qty = screen.getByTestId('qty');
    expect(qty.getAttribute('data-no-gap')).toBe('true');

    rerender(<Quantity value="1.0" unit="AU" data-testid="qty" />);
    qty = screen.getByTestId('qty');
    expect(qty.getAttribute('data-no-gap')).toBeNull();
  });

  it('respects explicit noGap prop', () => {
    render(<Quantity value="100" unit="%" noGap data-testid="qty" />);
    const qty = screen.getByTestId('qty');
    expect(qty.getAttribute('data-no-gap')).toBe('true');
  });

  it('preserves existing Unit element passed into unit prop', () => {
    render(
      <Quantity
        value="5778"
        unit={<Unit inParens>K</Unit>}
        data-testid="qty"
      />
    );
    const qty = screen.getByTestId('qty');
    expect(qty.textContent).toContain('5778');
    expect(qty.textContent).toContain('(K)');
  });

  it('renders direct children when supplied instead of value/unit', () => {
    render(
      <Quantity data-testid="qty">
        <span>Custom Rendered <strong>12.5 pc</strong></span>
      </Quantity>
    );
    const qty = screen.getByTestId('qty');
    expect(qty.textContent).toBe('Custom Rendered 12.5 pc');
  });

  it('supports Measurement alias identically', () => {
    render(<Measurement value="10" unit="parsecs" data-testid="measurement" />);
    const m = screen.getByTestId('measurement');
    expect(m.getAttribute('data-quantity')).toBe('true');
    expect(m.textContent).toContain('10');
    expect(m.textContent).toContain('parsecs');
  });
});
