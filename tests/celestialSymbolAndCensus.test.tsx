import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  CelestialSymbol,
  CelestialBadge,
  SpectralBadge,
  HazardBadge,
  CELESTIAL_SYMBOL_META,
  shouldDisplaySpectralBadge,
  type CelestialSymbolType,
} from '../src/components/interface/information/CelestialSymbol';
import { PlanetCensus } from '../src/components/domain/PlanetCensus';

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

describe('CelestialSymbol & Badge Primitives', () => {
  describe('Metadata Registry (CELESTIAL_SYMBOL_META)', () => {
    it('defines authoritative metadata for all canonical symbol types', () => {
      ALL_SYMBOL_TYPES.forEach((type) => {
        const meta = CELESTIAL_SYMBOL_META[type];
        expect(meta).toBeDefined();
        expect(meta.type).toBe(type);
        expect(typeof meta.label).toBe('string');
        expect(meta.label.trim().length).toBeGreaterThan(0);
        expect(meta.badgeCategory !== undefined || meta.badgeStatus !== undefined).toBe(true);
      });
    });

    it('maps terrestrial and giant planets to planet category and canonical guide hrefs', () => {
      expect(CELESTIAL_SYMBOL_META['terrestrial']).toMatchObject({
        type: 'terrestrial',
        label: 'Terrestrial',
        badgeCategory: 'planet',
        defaultGuideHref: '/guide/planet-types/terrestrial',
      });
      expect(CELESTIAL_SYMBOL_META['super-earth']).toMatchObject({
        type: 'super-earth',
        label: 'Super-Earth',
        badgeCategory: 'planet',
        defaultGuideHref: '/guide/planet-types/super-earth',
      });
      expect(CELESTIAL_SYMBOL_META['ice-giant']).toMatchObject({
        type: 'ice-giant',
        label: 'Ice Giant',
        badgeCategory: 'planet',
        defaultGuideHref: '/guide/planet-types/ice-giant',
      });
      expect(CELESTIAL_SYMBOL_META['gas-giant']).toMatchObject({
        type: 'gas-giant',
        label: 'Gas Giant',
        badgeCategory: 'planet',
        defaultGuideHref: '/guide/planet-types/gas-giant',
      });
      expect(CELESTIAL_SYMBOL_META['habitable-zone']).toMatchObject({
        type: 'habitable-zone',
        label: 'Habitable Zone',
        badgeStatus: 'nominal',
        defaultGuideHref: '/guide/planet-types/habitable-zone',
      });
    });
  });

  describe('<CelestialSymbol>', () => {
    it('renders 1px open-centre SVG geometry with correct role and aria-label', () => {
      const html = renderToString(
        createElement(CelestialSymbol, { type: 'terrestrial', showTooltip: false }),
      );
      expect(html).toContain('<svg');
      expect(html).toContain('data-celestial-symbol="terrestrial"');
      expect(html).toContain('role="img"');
      expect(html).toContain('aria-label="Terrestrial"');
      expect(html).toContain('viewBox="-12 -12 24 24"');
      expect(html).toContain('fill="none"');
      expect(html).toContain('stroke="currentColor"');
      expect(html).toContain('stroke-width="1.5"');
    });

    it('renders all canonical symbol types without crashing', () => {
      ALL_SYMBOL_TYPES.forEach((type) => {
        const html = renderToString(
          createElement(CelestialSymbol, {
            type,
            showTooltip: false,
            'data-testid': `sym-${type}`,
          }),
        );
        expect(html).toContain(`data-testid="sym-${type}"`);
        expect(html).toContain(`data-celestial-symbol="${type}"`);
      });
    });

    it('renders with label text when showLabel is true', () => {
      const html = renderToString(
        createElement(CelestialSymbol, { type: 'super-earth', showLabel: true, showTooltip: false }),
      );
      expect(html).toContain('Super-Earth');
    });

    it('wraps in Tooltip with label text when showTooltip is true', () => {
      const html = renderToString(
        createElement(CelestialSymbol, { type: 'gas-giant', showTooltip: true }),
      );
      expect(html).toContain('role="tooltip"');
      expect(html).toContain('Gas Giant');
    });

    it('renders semantic data-category and data-status attributes when colored is true (default)', () => {
      const planetHtml = renderToString(
        createElement(CelestialSymbol, { type: 'terrestrial', showTooltip: false }),
      );
      expect(planetHtml).toContain('data-category="planet"');
      expect(planetHtml).not.toContain('data-status=');

      const hzHtml = renderToString(
        createElement(CelestialSymbol, { type: 'habitable-zone', showTooltip: false }),
      );
      expect(hzHtml).not.toContain('data-category=');
      expect(hzHtml).toContain('data-status="nominal"');

      const starHtml = renderToString(
        createElement(CelestialSymbol, { type: 'star', showTooltip: false }),
      );
      expect(starHtml).not.toContain('data-category=');
      expect(starHtml).toContain('data-status="neutral"');
    });

    it('omits data-category and data-status attributes when colored is false', () => {
      const uncoloredHtml = renderToString(
        createElement(CelestialSymbol, { type: 'terrestrial', colored: false, showTooltip: false }),
      );
      expect(uncoloredHtml).not.toContain('data-category=');
      expect(uncoloredHtml).not.toContain('data-status=');
    });

    it('renders anchor tag when href is provided, supporting target and rel attributes', () => {
      const linkHtml = renderToString(
        createElement(CelestialSymbol, {
          type: 'gas-giant',
          href: '/guide/planet-types/gas-giant',
          target: '_blank',
          rel: 'noopener noreferrer',
          showTooltip: false,
          'data-testid': 'sym-link',
        }),
      );
      expect(linkHtml).toContain('<a');
      expect(linkHtml).toContain('href="/guide/planet-types/gas-giant"');
      expect(linkHtml).toContain('target="_blank"');
      expect(linkHtml).toContain('rel="noopener noreferrer"');
      expect(linkHtml).toContain('data-testid="sym-link"');
      expect(linkHtml).toContain('data-celestial-symbol="gas-giant"');
      expect(linkHtml).toContain('data-category="planet"');
    });
  });

  describe('<CelestialBadge>', () => {
    it('renders Badge with correct category and aria-label', () => {
      const html = renderToString(
        createElement(CelestialBadge, { type: 'ice-giant', 'data-testid': 'celestial-badge-ice' }),
      );
      expect(html).toContain('data-category="planet"');
      expect(html).toContain('data-celestial-badge="ice-giant"');
      expect(html).toContain('aria-label="Ice Giant"');
    });

    it('renders as anchor tag when href is passed or interactive is true', () => {
      const html = renderToString(
        createElement(CelestialBadge, {
          type: 'terrestrial',
          interactive: true,
          'data-testid': 'interactive-badge',
        }),
      );
      expect(html).toContain('<a');
      expect(html).toContain('href="/guide/planet-types/terrestrial"');
      expect(html).toContain('data-testid="interactive-badge"');
    });

    it('renders explicit href override over defaultGuideHref', () => {
      const html = renderToString(
        createElement(CelestialBadge, {
          type: 'habitable-zone',
          href: '/custom/hz',
          'data-testid': 'custom-href-badge',
        }),
      );
      expect(html).toContain('<a');
      expect(html).toContain('href="/custom/hz"');
      expect(html).toContain('data-status="nominal"');
    });

    it('renders CelestialSymbol directly without wrapping in an outlined Badge box', () => {
      const html = renderToString(
        createElement(CelestialBadge, {
          type: 'star',
          'data-testid': 'unboxed-badge',
        }),
      );
      expect(html).toContain('data-testid="unboxed-badge"');
      expect(html).toContain('data-celestial-badge="star"');
      expect(html).toContain('data-celestial-symbol="star"');
      // Must not render badge classes or badge wrapper container
      expect(html).not.toContain('_badge_');
    });
  });

  describe('SpectralBadge (<SpectralBadge> & shouldDisplaySpectralBadge)', () => {
    it('evaluates shouldDisplaySpectralBadge predicate correctly', () => {
      expect(shouldDisplaySpectralBadge(undefined)).toBe(false);
      expect(shouldDisplaySpectralBadge('')).toBe(false);
      expect(shouldDisplaySpectralBadge('   ')).toBe(false);
      expect(shouldDisplaySpectralBadge('Unknown')).toBe(false);
      expect(shouldDisplaySpectralBadge('G2V')).toBe(true);
      expect(shouldDisplaySpectralBadge('M1V')).toBe(true);
      expect(shouldDisplaySpectralBadge('DA2')).toBe(true);
    });

    it('renders star category Badge with link to star type guide when spectralType is valid', () => {
      const html = renderToString(
        createElement(SpectralBadge, { spectralType: 'G2V', 'data-testid': 'spect-badge' }),
      );
      expect(html).toContain('<a');
      expect(html).toContain('data-category="star"');
      expect(html).toContain('data-spectral-badge="G2V"');
      expect(html).toContain('href="/guide/star-types/G2V"');
      expect(html).toContain('G2V');
    });

    it('renders fallback when spectralType is invalid or Unknown', () => {
      const html = renderToString(
        createElement(SpectralBadge, {
          spectralType: 'Unknown',
          fallback: createElement('span', { 'data-testid': 'fallback' }, 'No Spectrum'),
        }),
      );
      expect(html).toContain('data-testid="fallback"');
      expect(html).toContain('No Spectrum');
      expect(html).not.toContain('<a');
    });

    it('renders non-interactive span when interactive is false', () => {
      const html = renderToString(
        createElement(SpectralBadge, {
          spectralType: 'M1V',
          interactive: false,
          'data-testid': 'static-spect',
        }),
      );
      expect(html).toContain('<span');
      expect(html).not.toContain('href=');
      expect(html).toContain('M1V');
    });
  });

  describe('<HazardBadge>', () => {
    it('renders Badge with critical status for critical hazards', () => {
      const html = renderToString(
        createElement(HazardBadge, {
          code: 'RAD-01',
          label: 'Ionising Radiation',
          severity: 'critical',
          href: '/guide/hazards/radiation',
          'data-testid': 'hz-badge',
        }),
      );
      expect(html).toContain('<a');
      expect(html).toContain('href="/guide/hazards/radiation"');
      expect(html).toContain('data-status="critical"');
      expect(html).toContain('data-hazard-badge="RAD-01"');
      expect(html).toContain('Ionising Radiation');
    });

    it('renders Badge with caution status for caution/warning severity', () => {
      const html = renderToString(
        createElement(HazardBadge, {
          label: 'Tidal Heating',
          severity: 'caution',
          'data-testid': 'caution-hz',
        }),
      );
      expect(html).toContain('<span');
      expect(html).toContain('data-status="caution"');
      expect(html).toContain('data-hazard-badge="summary"');
      expect(html).toContain('Tidal Heating');
    });
  });

  describe('<PlanetCensus>', () => {
    it('renders 0 confirmed planets Quantity when planetCount is 0 or negative', () => {
      const html = renderToString(
        createElement(PlanetCensus, { planetCount: 0, 'data-testid': 'census-zero' }),
      );
      expect(html).toContain('data-testid="census-zero"');
      expect(html).toContain('data-quantity="true"');
      expect(html).toContain('0');
      expect(html).toContain('confirmed planets');
      expect(html).not.toContain('data-planet-census="true"');
    });

    it('renders per-composition CelestialSymbols and omits leading count when breakdown is present', () => {
      const html = renderToString(
        createElement(PlanetCensus, {
          planetCount: 8,
          breakdown: [
            { composition: 'terrestrial', count: 4 },
            { composition: 'gas-giant', count: 2 },
            { composition: 'ice-giant', count: 2 },
          ],
          hasHabitableCandidate: true,
          'data-testid': 'sol-census',
        }),
      );

      expect(html).toContain('data-planet-census="true"');
      expect(html).toContain('data-testid="sol-census"');

      // Total count "8 planets" must NOT be rendered when breakdown is present
      expect(html).not.toContain('>8</span>');
      expect(html).not.toContain('planets</span>');

      // Breakdown items
      expect(html).toContain('data-planet-census-item="terrestrial"');
      expect(html).toContain('data-planet-census-item="gas-giant"');
      expect(html).toContain('data-planet-census-item="ice-giant"');

      // Item counts
      expect(html).toContain('>4</span>');
      expect(html).toContain('>2</span>');

      // Symbols rendered as anchor links
      expect(html).toContain('data-testid="details-summary-planet-type-link"');
      expect(html).toContain('href="/guide/planet-types/terrestrial"');
      expect(html).toContain('href="/guide/planet-types/gas-giant"');
      expect(html).toContain('href="/guide/planet-types/ice-giant"');
      expect(html).toContain('data-celestial-symbol="terrestrial"');
      expect(html).toContain('data-celestial-symbol="gas-giant"');
      expect(html).toContain('data-celestial-symbol="ice-giant"');

      // Habitable zone symbol link
      expect(html).toContain('data-testid="details-habitable-zone-link"');
      expect(html).toContain('data-celestial-symbol="habitable-zone"');
      expect(html).toContain('href="/guide/planet-types/habitable-zone"');
    });

    it('renders leading singular "planet" Quantity when breakdown is omitted and count is 1', () => {
      const html = renderToString(
        createElement(PlanetCensus, {
          planetCount: 1,
          'data-testid': 'single-census',
        }),
      );
      expect(html).toContain('data-planet-census="true"');
      expect(html).toContain('>1</span>');
      expect(html).toContain('planet</span>');
    });

    it('renders leading plural "planets" Quantity when breakdown is omitted and count > 1', () => {
      const html = renderToString(
        createElement(PlanetCensus, {
          planetCount: 5,
          'data-testid': 'plural-census',
        }),
      );
      expect(html).toContain('data-planet-census="true"');
      expect(html).toContain('>5</span>');
      expect(html).toContain('planets</span>');
    });
  });
});
