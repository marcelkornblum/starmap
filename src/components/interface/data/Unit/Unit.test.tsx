// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Unit } from './Unit';

describe('<Unit /> (data re-export)', () => {
  it('renders re-exported unit component correctly', () => {
    render(<Unit data-testid="unit">mas</Unit>);

    const unit = screen.getByTestId('unit');
    expect(unit.getAttribute('data-unit')).toBe('true');
    expect(unit.textContent).toBe('mas');
  });
});
