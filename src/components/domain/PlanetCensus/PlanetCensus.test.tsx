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
    const { rerender } = render(<PlanetCensus planetCount={1} data-testid="census-simple" />);

    let el = screen.getByTestId('census-simple');
    expect(el.getAttribute('data-planet-census')).toBe('true');
    expect(el.textContent).toContain('1');
    expect(el.textContent).toContain('planet');

    rerender(<PlanetCensus planetCount={3} data-testid="census-simple" />);
    el = screen.getByTestId('census-simple');
    expect(el.textContent).toContain('3');
    expect(el.textContent).toContain('planets');
  });

  it('renders breakdown with composition items and habitable candidate icon, omitting leading count', () => {
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

    // Leading count "5 planets" must NOT be rendered when breakdown is present
    expect(el.textContent).not.toContain('5 planets');

    const terrestrial = el.querySelector('[data-planet-census-item="terrestrial"]');
    expect(terrestrial).toBeDefined();
    expect(terrestrial?.textContent).toContain('3');

    const gasGiant = el.querySelector('[data-planet-census-item="gas-giant"]');
    expect(gasGiant).toBeDefined();
    expect(gasGiant?.textContent).toContain('2');

    const hzLink = screen.getByTestId('details-habitable-zone-link');
    expect(hzLink).toBeDefined();
    expect(hzLink.getAttribute('href')).toContain('/guide/planet-types/habitable-zone');
  });
});
