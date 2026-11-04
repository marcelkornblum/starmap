// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Quantity } from './Quantity';

describe('<Quantity /> (data re-export)', () => {
  it('renders re-exported quantity component correctly', () => {
    render(<Quantity value="1.0" unit="AU" data-testid="qty" />);

    const qty = screen.getByTestId('qty');
    expect(qty.getAttribute('data-quantity')).toBe('true');
    expect(qty.textContent).toContain('1.0');
    expect(qty.textContent).toContain('AU');
  });
});
