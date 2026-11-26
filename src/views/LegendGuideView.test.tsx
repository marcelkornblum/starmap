import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { LegendGuideView } from './LegendGuideView';
import {
  LEGEND_CHROMATIC_ENTRIES,
  LEGEND_LINE_ENTRIES,
  LEGEND_SYMBOL_GROUPS,
  LEGEND_ZONE_ENTRIES,
} from '../content/guide';

describe('<LegendGuideView />', () => {
  it('renders root, breadcrumbs, active Legend section nav, and heading', () => {
    render(<LegendGuideView />);

    expect(screen.getByTestId('legend-guide-view-root')).toBeInTheDocument();

    const breadcrumbs = screen.getByTestId('view-breadcrumbs');
    expect(breadcrumbs.textContent).toContain('Guide');
    expect(breadcrumbs.textContent).toContain('Cartography & Symbology');

    const sectionNav = screen.getByTestId('guide-section-nav');
    expect(within(sectionNav).getByRole('link', { name: 'Legend' }).getAttribute('aria-current')).toBe('page');

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Cartography & Symbology');
  });

  it('renders all line trajectory entries, zone boundary entries, celestial symbol groups, and chromaticity entries', () => {
    render(<LegendGuideView />);

    const linesSection = screen.getByTestId('legend-lines-section');
    const lineItems = within(linesSection).getAllByTestId('legend-line-item');
    expect(lineItems).toHaveLength(LEGEND_LINE_ENTRIES.length);
    expect(linesSection.textContent).toContain('Confirmed Keplerian Orbit');
    expect(linesSection.textContent).toContain('Journey Route Chord');

    const zonesSection = screen.getByTestId('legend-zones-section');
    const zoneItems = within(zonesSection).getAllByTestId('legend-zone-item');
    expect(zoneItems).toHaveLength(LEGEND_ZONE_ENTRIES.length);
    expect(zonesSection.textContent).toContain('Asteroid Belts & Debris Disks');
    expect(zonesSection.textContent).toContain('Planetary Ring Systems');
    expect(zonesSection.textContent).toContain('Circumstellar Habitable Zone');

    const symbolsSection = screen.getByTestId('legend-symbols-section');
    const totalExpectedSymbols = LEGEND_SYMBOL_GROUPS.reduce(
      (sum, group) => sum + group.types.length,
      0,
    );
    const symbolItems = within(symbolsSection).getAllByTestId('legend-symbol-item');
    expect(symbolItems).toHaveLength(totalExpectedSymbols);

    const chromaticitySection = screen.getByTestId('legend-chromaticity-section');
    const swatchItems = within(chromaticitySection).getAllByTestId('legend-swatch-item');
    expect(swatchItems).toHaveLength(LEGEND_CHROMATIC_ENTRIES.length);
    expect(chromaticitySection.textContent).toContain('Confirmed Observation');
  });
});
