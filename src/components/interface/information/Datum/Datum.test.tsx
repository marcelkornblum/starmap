// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Datum } from './Datum';

describe('<Datum />', () => {
  it('renders datum with label and formatted quantity value', () => {
    render(<Datum label="Orbital Period" value="365.25" unit="d" valueTestId="period-val" />);

    expect(screen.getByText('Orbital Period')).toBeDefined();
    const val = screen.getByTestId('period-val');
    expect(val.textContent).toContain('365.25');
    expect(val.textContent).toContain('d');

    const datumRoot = val.closest('[data-datum="true"]');
    expect(datumRoot).toBeDefined();
    expect(datumRoot?.getAttribute('data-size')).toBe('md');
  });

  it('renders status and size attributes', () => {
    const { rerender } = render(
      <Datum
        label="Surface Temp"
        value="5778"
        unit="K"
        status="nominal"
        size="sm"
        data-testid="datum-el"
      />
    );

    let datum = screen.getByTestId('datum-el');
    expect(datum.getAttribute('data-status')).toBe('nominal');
    expect(datum.getAttribute('data-size')).toBe('sm');

    rerender(
      <Datum
        label="Surface Temp"
        value="5778"
        unit="K"
        status="critical"
        size="md"
        data-testid="datum-el"
      />
    );
    datum = screen.getByTestId('datum-el');
    expect(datum.getAttribute('data-status')).toBe('critical');
    expect(datum.getAttribute('data-size')).toBe('md');
  });

  it('renders ConfidencePip when confidence level is provided', () => {
    render(
      <Datum
        label="Semi-Major Axis"
        value="1.0"
        unit="AU"
        confidence="confirmed"
        data-testid="datum-with-confidence"
      />
    );

    const button = screen.getByRole('button', {
      name: 'We have confirmed confidence in this data',
    });
    expect(button).toBeDefined();
  });

  it('applies custom className and forwards extra attributes', () => {
    render(
      <Datum
        label="Metallicity"
        value="+0.12"
        className="astronomy-datum"
        data-custom="custom-attr"
      />
    );

    const datum = screen.getByText('Metallicity').closest('[data-datum="true"]');
    expect(datum?.className).toContain('astronomy-datum');
    expect(datum?.getAttribute('data-custom')).toBe('custom-attr');
  });
});
