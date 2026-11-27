import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { CELESTIAL_SYMBOL_META } from '../components/interface';
import {
  LEGEND_CHROMATIC_ENTRIES,
  LEGEND_CONFIDENCE_LEVELS,
  LEGEND_LINE_ENTRIES,
  LEGEND_SPECTRAL_CLASSES,
  LEGEND_SYMBOL_GROUPS,
  LEGEND_ZONE_ENTRIES,
} from '../content/guide';
import { LegendGuideView } from './LegendGuideView';

describe('<LegendGuideView />', () => {
  it('renders root, active Legend section nav without duplicate breadcrumbs, and heading', () => {
    render(<LegendGuideView />);

    const root = screen.getByTestId('legend-guide-view-root');
    expect(root).toBeInTheDocument();
    expect(root.tagName).toBe('MAIN');
    expect(root.getAttribute('data-mode')).toBe('document');

    expect(screen.getByTestId('console-dock')).toBeInTheDocument();
    expect(screen.getByTestId('console-dock-guide')).toHaveAttribute('data-active', 'true');

    expect(screen.queryByTestId('view-breadcrumbs')).toBeNull();

    const sectionNav = screen.getByTestId('guide-section-nav');
    expect(within(sectionNav).getByRole('link', { name: 'Legend' }).getAttribute('aria-current')).toBe('page');

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Cartography & Symbology');
    expect(heading).toHaveAttribute('data-visually-hidden', 'true');
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

    const symbolGuideLinks = within(symbolsSection).getAllByTestId('legend-symbol-guide-link');
    expect(symbolGuideLinks.length).toBeGreaterThan(0);
    for (const link of symbolGuideLinks) {
      expect(link.getAttribute('href')).toMatch(/^\/guide\//);
    }

    const chromaticitySection = screen.getByTestId('legend-chromaticity-section');
    const spectralItems = within(chromaticitySection).getAllByTestId('legend-spectral-item');
    expect(spectralItems).toHaveLength(LEGEND_SPECTRAL_CLASSES.length);
    for (const spectralClass of LEGEND_SPECTRAL_CLASSES) {
      const swatch = spectralItems.find(
        (item) => item.getAttribute('data-spectral-class') === spectralClass,
      );
      expect(swatch).toBeDefined();
    }

    const confidenceItems = within(chromaticitySection).getAllByTestId('legend-confidence-item');
    expect(confidenceItems).toHaveLength(LEGEND_CONFIDENCE_LEVELS.length);
    expect(confidenceItems.map((el) => el.getAttribute('data-confidence'))).toEqual([
      'confirmed',
      'candidate',
      'theoretical',
    ]);

    const swatchItems = within(chromaticitySection).getAllByTestId('legend-swatch-item');
    expect(swatchItems).toHaveLength(LEGEND_CHROMATIC_ENTRIES.length);
    expect(chromaticitySection.textContent).toContain('Confirmed Observation');
  });

  it('covers 100% of CELESTIAL_SYMBOL_META keys across symbol groups and habitable-zone rail documentation', () => {
    const groupedTypes = LEGEND_SYMBOL_GROUPS.flatMap((group) => group.types);
    const zoneCoveredTypes = LEGEND_ZONE_ENTRIES.filter(
      (entry) => entry.regionKind === 'habitable-zone',
    ).map((entry) => entry.regionKind);

    const coveredSet = new Set<string>([...groupedTypes, ...zoneCoveredTypes]);
    const metaKeys = Object.keys(CELESTIAL_SYMBOL_META);

    expect(groupedTypes).not.toContain('habitable-zone');
    expect(groupedTypes).toContain('kuiper-belt-object');
    for (const key of metaKeys) {
      expect(coveredSet.has(key)).toBe(true);
    }
    expect(coveredSet.size).toBe(metaKeys.length);
  });

  it('renders top-level legend sections and symbol groups inside CollapsibleSections', () => {
    render(<LegendGuideView />);

    const linesSection = screen.getByTestId('legend-lines-section');
    expect(linesSection).toHaveAttribute('data-expanded', 'true');

    const linesToggle = screen.getByRole('button', { name: /Lines & Trajectories/i });
    fireEvent.click(linesToggle);
    expect(linesToggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(linesSection).queryByTestId('legend-line-item')).toBeNull();

    const symbolsSection = screen.getByTestId('legend-symbols-section');
    const firstGroupToggle = within(symbolsSection).getByRole('button', { name: new RegExp(LEGEND_SYMBOL_GROUPS[0].title, 'i') });
    expect(firstGroupToggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(firstGroupToggle);
    expect(firstGroupToggle).toHaveAttribute('aria-expanded', 'false');
  });
});
