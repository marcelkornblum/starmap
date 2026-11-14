import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CelestialSymbol, CELESTIAL_SYMBOL_META, type CelestialSymbolType } from './CelestialSymbol';

const ALL_SYMBOL_TYPES: CelestialSymbolType[] = [
  'star',
  'stellar-system',
  'brown-dwarf',
  'white-dwarf',
  'neutron-star',
  'hazard',
  'black-hole',
  'barycentre',
  'stellar-cluster',
  'construct',
  'terrestrial',
  'super-earth',
  'gas-giant',
  'ice-giant',
  'dwarf-planet',
  'moon',
  'asteroid',
  'comet',
  'belt',
  'asteroid-belt',
  'kuiper-belt',
  'debris-disk',
  'nebula',
  'ism',
  'supernova-remnant',
  'habitable-zone',
];

describe('<CelestialSymbol />', () => {
  it('renders SVG glyph with role="img" and accessible aria-label and 1px geometry attributes', () => {
    render(<CelestialSymbol type="star" showTooltip={false} data-testid="symbol" />);

    const symbol = screen.getByTestId('symbol');
    expect(symbol.getAttribute('data-celestial-symbol')).toBe('star');
    expect(symbol.getAttribute('data-size')).toBe('md');

    const svg = screen.getByRole('img', { name: 'Star' });
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('data-celestial-symbol')).toBe('star');
    expect(svg.getAttribute('viewBox')).toBe('-12 -12 24 24');
    expect(svg.getAttribute('fill')).toBe('none');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('stroke-width')).toBe('1.5');
  });

  it('renders all canonical symbol types without crashing', () => {
    ALL_SYMBOL_TYPES.forEach((type) => {
      const { unmount } = render(
        <CelestialSymbol type={type} showTooltip={false} data-testid={`sym-${type}`} />,
      );
      const symbol = screen.getByTestId(`sym-${type}`);
      expect(symbol.getAttribute('data-celestial-symbol')).toBe(type);
      unmount();
    });
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

  it('omits data-category and data-status attributes when colored is false', () => {
    render(
      <CelestialSymbol type="terrestrial" colored={false} showTooltip={false} data-testid="uncolored-symbol" />,
    );
    const symbol = screen.getByTestId('uncolored-symbol');
    expect(symbol.getAttribute('data-category')).toBeNull();
    expect(symbol.getAttribute('data-status')).toBeNull();
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
    ALL_SYMBOL_TYPES.forEach((type) => {
      const meta = CELESTIAL_SYMBOL_META[type];
      expect(meta).toBeDefined();
      expect(meta.type).toBe(type);
      expect(typeof meta.label).toBe('string');
      expect(meta.label.trim().length).toBeGreaterThan(0);
      expect(meta.badgeCategory !== undefined || meta.badgeStatus !== undefined).toBe(true);
    });

    expect(CELESTIAL_SYMBOL_META.star.label).toBe('Star');
    expect(CELESTIAL_SYMBOL_META['neutron-star'].badgeStatus).toBe('critical');
    expect(CELESTIAL_SYMBOL_META['terrestrial'].badgeCategory).toBe('planet');
    expect(CELESTIAL_SYMBOL_META['asteroid-belt'].badgeStatus).toBe('caution');
  });
});
