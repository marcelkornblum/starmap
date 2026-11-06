// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlanetCensus } from './PlanetCensus';

describe('<PlanetCensus />', () => {
  it('renders zero confirmed planets when planetCount is 0 or negative', () => {
    const { rerender } = render(
      <PlanetCensus planetCount={0} data-testid="census-zero" />
    );
    const zeroEl = screen.getByTestId('census-zero');
    expect(zeroEl.textContent).toContain('0');
    expect(zeroEl.textContent).toContain('confirmed planets');

    rerender(<PlanetCensus planetCount={-3} data-testid="census-zero" />);
    expect(screen.getByTestId('census-zero').textContent).toContain('0');
  });

  it('renders simple count when no breakdown is provided', () => {
    render(<PlanetCensus planetCount={3} data-testid="census-simple" />);

    const el = screen.getByTestId('census-simple');
    expect(el.getAttribute('data-planet-census')).toBe('true');
    expect(el.textContent).toContain('3');
    expect(el.textContent).toContain('planets');
  });

  it('renders breakdown with composition items and habitable candidate icon', () => {
    render(
      <PlanetCensus
        planetCount={5}
        hasHabitableCandidate={true}
        breakdown={[
          { composition: 'terrestrial', count: 3 },
          { composition: 'gas-giant', count: 2 },
        ]}
        data-testid="census-breakdown"
      />
    );

    const el = screen.getByTestId('census-breakdown');
    expect(el).toBeDefined();

    const terrestrial = el.querySelector('[data-planet-census-item="terrestrial"]');
    expect(terrestrial).toBeDefined();
    expect(terrestrial?.textContent).toContain('3');

    const gasGiant = el.querySelector('[data-planet-census-item="gas-giant"]');
    expect(gasGiant).toBeDefined();
    expect(gasGiant?.textContent).toContain('2');

    expect(screen.getByTestId('details-habitable-zone-link')).toBeDefined();
  });
});
