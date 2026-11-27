import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Datum } from './Datum';

describe('<Datum />', () => {
  it('renders datum with label and formatted quantity value', () => {
    render(<Datum label="Orbital Period" value="365.25" unit="d" valueTestId="period-val" />);

    expect(screen.getByText('Orbital Period')).toBeInTheDocument();
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
    expect(button).toBeInTheDocument();
  });

  it('applies static module class and forwards extra attributes', () => {
    render(
      <Datum
        label="Metallicity"
        value="+0.12"
        data-custom="custom-attr"
      />
    );

    const datum = screen.getByText('Metallicity').closest('[data-datum="true"]');
    expect(datum?.className).toMatch(/datum/);
    expect(datum?.getAttribute('data-custom')).toBe('custom-attr');
  });

  it('wraps React element values cleanly with valueTestId', () => {
    render(
      <Datum
        label="Classification"
        value={<span data-testid="badge-elem">Terrestrial</span>}
        valueTestId="details-planet-telemetry-composition"
      />
    );

    const val = screen.getByTestId('details-planet-telemetry-composition');
    expect(val).toBeInTheDocument();
    expect(screen.getByText('Classification')).toBeInTheDocument();
    expect(screen.getByTestId('badge-elem').textContent).toBe('Terrestrial');
  });

  it('uses <Quantity> for numeric values and string values with a unit', () => {
    const { rerender } = render(
      <Datum label="Distance" value={4.25} valueTestId="numeric-val" />
    );

    expect(screen.getByTestId('numeric-val').getAttribute('data-quantity')).toBe('true');

    rerender(
      <Datum label="Orbital Period" value="365.25" unit="d" valueTestId="unit-val" />
    );

    expect(screen.getByTestId('unit-val').getAttribute('data-quantity')).toBe('true');
  });

  it('renders ReactNode and prose string values without unit outside <Quantity> while preserving valueTestId', () => {
    const { rerender } = render(
      <Datum
        label="Tags"
        value={
          <>
            <span data-testid="tag-1">HabitableCandidate</span>
            <span data-testid="tag-2">TidallyLocked</span>
          </>
        }
        valueTestId="details-astrometry-tags"
      />
    );

    const tagsEl = screen.getByTestId('details-astrometry-tags');
    expect(tagsEl.getAttribute('data-quantity')).toBeNull();
    expect(tagsEl.closest('[data-quantity="true"]')).toBeNull();
    expect(screen.getByTestId('tag-1')).toBeInTheDocument();
    expect(screen.getByTestId('tag-2')).toBeInTheDocument();

    rerender(
      <Datum
        label="Tidal Status"
        status="caution"
        value="Tidally locked (synchronous)"
        valueTestId="details-planet-telemetry-tidal"
      />
    );

    const proseEl = screen.getByTestId('details-planet-telemetry-tidal');
    expect(proseEl.getAttribute('data-quantity')).toBeNull();
    expect(proseEl.closest('[data-quantity="true"]')).toBeNull();
    expect(proseEl).toHaveTextContent('Tidally locked (synchronous)');
  });
});
