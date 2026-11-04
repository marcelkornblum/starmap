// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Well } from './Well';

describe('<Well />', () => {
  it('renders children with default padding and tabular undefined', () => {
    render(<Well data-testid="well">Well Content</Well>);

    const well = screen.getByTestId('well');
    expect(well.textContent).toBe('Well Content');
    expect(well.getAttribute('data-padding')).toBe('default');
    expect(well.getAttribute('data-tabular')).toBeNull();
  });

  it('renders tabular and padding variants', () => {
    const { rerender } = render(
      <Well padding="tight" tabular data-testid="well">
        Tabular Telemetry
      </Well>
    );

    let well = screen.getByTestId('well');
    expect(well.getAttribute('data-padding')).toBe('tight');
    expect(well.getAttribute('data-tabular')).toBe('true');

    rerender(
      <Well padding="loose" tabular={false} data-testid="well">
        Loose Text
      </Well>
    );

    well = screen.getByTestId('well');
    expect(well.getAttribute('data-padding')).toBe('loose');
    expect(well.getAttribute('data-tabular')).toBeNull();
  });

  it('merges custom className and forwards extra attributes', () => {
    render(
      <Well className="custom-well" role="note" data-testid="well">
        Note content
      </Well>
    );

    const well = screen.getByTestId('well');
    expect(well.className).toContain('custom-well');
    expect(well.getAttribute('role')).toBe('note');
  });
});
