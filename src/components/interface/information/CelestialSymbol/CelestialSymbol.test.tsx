// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CelestialSymbol, CELESTIAL_SYMBOL_META } from './CelestialSymbol';

describe('<CelestialSymbol />', () => {
  it('renders SVG glyph with role="img" and accessible aria-label', () => {
    render(<CelestialSymbol type="star" showTooltip={false} data-testid="symbol" />);

    const symbol = screen.getByTestId('symbol');
    expect(symbol.getAttribute('data-celestial-symbol')).toBe('star');
    expect(symbol.getAttribute('data-size')).toBe('md');

    const svg = screen.getByRole('img', { name: 'Star' });
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('data-celestial-symbol')).toBe('star');
  });

  it('renders metadata defaults for planetary and hazard categories and statuses', () => {
    const { rerender } = render(
      <CelestialSymbol type="terrestrial" showTooltip={false} data-testid="symbol" />
    );
    let symbol = screen.getByTestId('symbol');
    expect(symbol.getAttribute('data-category')).toBe('planet');

    rerender(
      <CelestialSymbol type="neutron-star" showTooltip={false} data-testid="symbol" />
    );
    symbol = screen.getByTestId('symbol');
    expect(symbol.getAttribute('data-status')).toBe('critical');
  });

  it('renders an anchor tag when href is provided', () => {
    render(
      <CelestialSymbol
        type="black-hole"
        href="/guide/hazards"
        target="_blank"
        showTooltip={false}
      />
    );

    const link = screen.getByRole('link', { name: 'Black Hole' });
    expect(link.tagName.toLowerCase()).toBe('a');
    expect(link.getAttribute('href')).toContain('/guide/hazards');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('renders visual label when showLabel is true', () => {
    render(<CelestialSymbol type="gas-giant" showLabel showTooltip={false} />);
    expect(screen.getByText('Gas Giant')).toBeDefined();
  });

  it('wraps with Tooltip when showTooltip is true', () => {
    render(<CelestialSymbol type="white-dwarf" showTooltip={true} tooltipText="Dense Degenerate Star" />);
    // The tooltip renders around the symbol
    expect(screen.getByRole('img', { name: 'White Dwarf' })).toBeDefined();
  });

  it('exposes valid metadata for all defined celestial symbol types', () => {
    expect(CELESTIAL_SYMBOL_META.star.label).toBe('Star');
    expect(CELESTIAL_SYMBOL_META['neutron-star'].badgeStatus).toBe('critical');
    expect(CELESTIAL_SYMBOL_META['terrestrial'].badgeCategory).toBe('planet');
    expect(CELESTIAL_SYMBOL_META['asteroid-belt'].badgeStatus).toBe('caution');
  });
});
