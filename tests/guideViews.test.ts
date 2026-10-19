import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  STAR_TYPE_GUIDE_ENTRIES,
  PLANET_TYPE_GUIDE_ENTRIES,
  METRIC_GUIDE_ENTRIES,
  resolveStarTypeGuideEntry,
  resolvePlanetTypeGuideEntry,
  resolveMetricGuideEntry,
  resolveMetricComparison,
  computeSpectralCombination,
  STAR_TYPES_GUIDE_PATH,
  PLANET_TYPES_GUIDE_PATH,
  METRICS_GUIDE_PATH,
  HAZARDS_GUIDE_PATH,
  HAZARD_GUIDE_ENTRIES,
  resolveHazardGuideEntry,
} from '../src/services/guideService';
import { StarTypesListView } from '../src/views/StarTypesListView';
import { StarTypeDetailView } from '../src/views/StarTypeDetailView';
import { PlanetTypesListView } from '../src/views/PlanetTypesListView';
import { PlanetTypeDetailView } from '../src/views/PlanetTypeDetailView';
import { MetricsListView } from '../src/views/MetricsListView';
import { MetricDetailView } from '../src/views/MetricDetailView';
import { HazardsListView } from '../src/views/HazardsListView';
import { HazardDetailView } from '../src/views/HazardDetailView';

describe('DEC-027: Guide Service & Pure Resolvers', () => {
  describe('STAR_TYPE_GUIDE_ENTRIES catalog', () => {
    it('contains all 9 authoritative star classifications (O, B, A, F, G, K, M, L, D)', () => {
      const ids = STAR_TYPE_GUIDE_ENTRIES.map((e) => e.id);
      expect(ids).toEqual(['o', 'b', 'a', 'f', 'g', 'k', 'm', 'l', 'd']);

      for (const entry of STAR_TYPE_GUIDE_ENTRIES) {
        expect(entry.spectralClass).toBeTruthy();
        expect(entry.title).toBeTruthy();
        expect(entry.summary).toBeTruthy();
        expect(entry.effectiveTempRange).toBeTruthy();
        expect(entry.massRangeMsun).toBeTruthy();
        expect(entry.radiusRangeRsun).toBeTruthy();
        expect(entry.luminosityRangeLsun).toBeTruthy();
        expect(entry.habitableZoneAu).toBeTruthy();
        expect(entry.chromaticity).toBeTruthy();
        expect(entry.href).toBe(`${STAR_TYPES_GUIDE_PATH}/${entry.id}`);
        expect(entry.canonicalRadiusRsun).toBeGreaterThan(0);
        expect(entry.canonicalTempK).toBeGreaterThan(0);
        expect(entry.chromaticityHex).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(entry.examples.length).toBeGreaterThan(0);
        expect(entry.interiorLayers.length).toBeGreaterThan(0);
      }
    });

    it('contains specific required benchmark examples for key stellar classes', () => {
      const gEntry = STAR_TYPE_GUIDE_ENTRIES.find((e) => e.id === 'g');
      expect(gEntry?.examples.some((ex) => ex.name === 'Sol' && ex.href === '/galaxy/sol?select=star-type:g')).toBe(true);
      expect(gEntry?.examples.some((ex) => ex.name === 'Tau Ceti' && ex.href === '/galaxy/tau-ceti?select=star-type:g')).toBe(true);
      expect(gEntry?.examples.some((ex) => ex.name.includes('Alpha Centauri A'))).toBe(true);

      const kEntry = STAR_TYPE_GUIDE_ENTRIES.find((e) => e.id === 'k');
      expect(kEntry?.examples.some((ex) => ex.name.includes('Alpha Centauri B'))).toBe(true);
      expect(kEntry?.examples.some((ex) => ex.name === 'Epsilon Eridani')).toBe(true);

      const mEntry = STAR_TYPE_GUIDE_ENTRIES.find((e) => e.id === 'm');
      expect(mEntry?.examples.some((ex) => ex.name.includes('Proxima Centauri'))).toBe(true);
      expect(mEntry?.examples.some((ex) => ex.name === "Barnard's Star")).toBe(true);

      const lEntry = STAR_TYPE_GUIDE_ENTRIES.find((e) => e.id === 'l');
      expect(lEntry?.examples.some((ex) => ex.name === 'Luhman 16')).toBe(true);

      const dEntry = STAR_TYPE_GUIDE_ENTRIES.find((e) => e.id === 'd');
      expect(dEntry?.examples.some((ex) => ex.name === 'Sirius B')).toBe(true);
    });
  });

  describe('resolveStarTypeGuideEntry', () => {
    it('resolves direct class id without decoded subtype', () => {
      const detail = resolveStarTypeGuideEntry('g');
      expect(detail).not.toBeNull();
      expect(detail?.requestedRaw).toBe('g');
      expect(detail?.entry.id).toBe('g');
      expect(detail?.decodedSubtype).toBeUndefined();
    });

    it('resolves Yerkes spectral string G8.5V with decoded subtype', () => {
      const detail = resolveStarTypeGuideEntry('G8.5V');
      expect(detail).not.toBeNull();
      expect(detail?.requestedRaw).toBe('G8.5V');
      expect(detail?.entry.id).toBe('g');
      expect(detail?.decodedSubtype).toEqual({
        spectralLetter: 'G',
        subdivision: '8.5',
        luminosityClass: 'V',
        luminosityLabel: 'Main-Sequence Dwarf',
      });
    });

    it('resolves lowercase yerkes g2v with normalized spectral classification', () => {
      const detail = resolveStarTypeGuideEntry('g2v');
      expect(detail).not.toBeNull();
      expect(detail?.entry.id).toBe('g');
      expect(detail?.decodedSubtype).toEqual({
        spectralLetter: 'G',
        subdivision: '2',
        luminosityClass: 'V',
        luminosityLabel: 'Main-Sequence Dwarf',
      });
    });

    it('resolves emission dwarf M5.5Ve with emission suffix stripped from luminosity', () => {
      const detail = resolveStarTypeGuideEntry('M5.5Ve');
      expect(detail).not.toBeNull();
      expect(detail?.entry.id).toBe('m');
      expect(detail?.decodedSubtype).toEqual({
        spectralLetter: 'M',
        subdivision: '5.5',
        luminosityClass: 'V',
        luminosityLabel: 'Main-Sequence Dwarf',
      });
    });

    it('resolves white dwarf DA2 with luminosity class VII', () => {
      const detail = resolveStarTypeGuideEntry('DA2');
      expect(detail).not.toBeNull();
      expect(detail?.entry.id).toBe('d');
      expect(detail?.decodedSubtype).toEqual({
        spectralLetter: 'D',
        subdivision: '2',
        luminosityClass: 'VII',
        luminosityLabel: 'White Dwarf',
      });
    });

    it('resolves K1V to K-type dwarf', () => {
      const detail = resolveStarTypeGuideEntry('K1V');
      expect(detail).not.toBeNull();
      expect(detail?.entry.id).toBe('k');
      expect(detail?.decodedSubtype).toEqual({
        spectralLetter: 'K',
        subdivision: '1',
        luminosityClass: 'V',
        luminosityLabel: 'Main-Sequence Dwarf',
      });
    });

    it('resolves supergiant and subgiant luminosity classes', () => {
      const detailIa = resolveStarTypeGuideEntry('O9.5Ia');
      expect(detailIa?.decodedSubtype?.luminosityLabel).toBe('Supergiant');

      const detailIV = resolveStarTypeGuideEntry('B0.5IV');
      expect(detailIV?.decodedSubtype?.luminosityLabel).toBe('Subgiant');
    });

    it('returns null for empty or unrecognized spectral strings', () => {
      expect(resolveStarTypeGuideEntry('')).toBeNull();
      expect(resolveStarTypeGuideEntry('   ')).toBeNull();
      expect(resolveStarTypeGuideEntry('Z99X')).toBeNull();
    });
  });

  describe('PLANET_TYPE_GUIDE_ENTRIES & resolvePlanetTypeGuideEntry', () => {
    it('contains all 4 planetary classifications (DEC-032)', () => {
      const ids = PLANET_TYPE_GUIDE_ENTRIES.map((e) => e.id);
      expect(ids).toEqual(['terrestrial', 'super-earth', 'ice-giant', 'gas-giant']);

      for (const entry of PLANET_TYPE_GUIDE_ENTRIES) {
        expect(entry.composition).toBeTruthy();
        expect(entry.title).toBeTruthy();
        expect(entry.summary).toBeTruthy();
        expect(entry.massRangeMearth).toBeTruthy();
        expect(entry.radiusRangeRearth).toBeTruthy();
        expect(entry.bulkComposition).toBeTruthy();
        expect(entry.habitabilityNotes).toBeTruthy();
        expect(entry.canonicalRadiusRearth).toBeGreaterThan(0);
        expect(entry.textureTheme).toBeTruthy();
        expect(entry.href).toBe(`${PLANET_TYPES_GUIDE_PATH}/${entry.id}`);
        expect(entry.examples.length).toBeGreaterThan(0);
        expect(entry.interiorLayers.length).toBeGreaterThan(0);
      }
    });

    it('defines authoritative interior cross-section layers for planets', () => {
      const terrestrial = resolvePlanetTypeGuideEntry('terrestrial');
      expect(terrestrial?.interiorLayers).toEqual(['Iron-Nickel Core', 'Silicate Mantle', 'Rocky Crust']);

      const superEarth = resolvePlanetTypeGuideEntry('super-earth');
      expect(superEarth?.interiorLayers).toEqual(['Metallic Core', 'Silicate Mantle', 'Crust / Ocean Layer']);

      const iceGiant = resolvePlanetTypeGuideEntry('ice-giant');
      expect(iceGiant?.interiorLayers).toEqual([
        'Rock-Ice Core',
        'Supercritical Water-Ammonia-Methane Mantle',
        'Hydrogen-Helium Atmosphere',
      ]);

      const gasGiant = resolvePlanetTypeGuideEntry('gas-giant');
      expect(gasGiant?.interiorLayers).toEqual([
        'Rocky/Icy Core',
        'Liquid Metallic Hydrogen Mantle',
        'Molecular Hydrogen-Helium Envelope',
      ]);
    });

    it('contains expected planetary benchmark examples', () => {
      const terrestrial = resolvePlanetTypeGuideEntry('terrestrial');
      expect(terrestrial?.examples.some((ex) => ex.name === 'Earth' && ex.href === '/system/sol?focus=earth&select=planet-type:terrestrial')).toBe(true);
      expect(terrestrial?.examples.some((ex) => ex.name.includes('Proxima Centauri b'))).toBe(true);

      const superEarth = resolvePlanetTypeGuideEntry('super-earth');
      expect(superEarth?.examples.some((ex) => ex.name.includes('Tau Ceti e'))).toBe(true);
      expect(superEarth?.examples.some((ex) => ex.name.includes('Tau Ceti f'))).toBe(true);

      const iceGiant = resolvePlanetTypeGuideEntry('ice-giant');
      expect(iceGiant?.examples.some((ex) => ex.name === 'Uranus')).toBe(true);
      expect(iceGiant?.examples.some((ex) => ex.name === 'Neptune')).toBe(true);

      const gasGiant = resolvePlanetTypeGuideEntry('gas-giant');
      expect(gasGiant?.examples.some((ex) => ex.name === 'Jupiter')).toBe(true);
      expect(gasGiant?.examples.some((ex) => ex.name === 'Saturn')).toBe(true);
    });

    it('returns null for unknown planet types', () => {
      expect(resolvePlanetTypeGuideEntry('')).toBeNull();
      expect(resolvePlanetTypeGuideEntry('carbon-world')).toBeNull();
    });
  });

  describe('METRIC_GUIDE_ENTRIES & resolveMetricGuideEntry', () => {
    const requiredMetricSlugs = [
      'galactic-coordinates',
      'stellar-magnitude',
      'stellar-mass',
      'stellar-radius',
      'stellar-luminosity',
      'effective-temperature',
      'semi-major-axis',
      'orbital-period',
      'orbital-inclination',
      'planetary-mass',
      'planetary-radius',
      'equilibrium-temperature',
      'surface-gravity',
    ];

    it('covers all 13 required metrics with full telemetry metadata', () => {
      expect(METRIC_GUIDE_ENTRIES.length).toBe(13);
      for (const slug of requiredMetricSlugs) {
        const entry = resolveMetricGuideEntry(slug);
        expect(entry, `Expected metric slug ${slug} to resolve`).not.toBeNull();
        expect(entry?.id).toBe(slug);
        expect(entry?.title).toBeTruthy();
        expect(entry?.unitSymbol).toBeTruthy();
        expect(['Astrometry', 'Stellar Telemetry', 'Orbital & Planetary Telemetry']).toContain(entry?.category);
        expect(entry?.physicalDefinition).toBeTruthy();
        expect(entry?.referenceBaseline).toBeTruthy();
        expect(entry?.href).toBe(`${METRICS_GUIDE_PATH}/${slug}`);
        expect(entry?.examples.length).toBeGreaterThan(0);
        expect(entry?.familiarConversion).toBeTruthy();
        expect(['Sol', 'Earth']).toContain(entry?.comparisonBaselineLabel);
        expect(entry?.comparisonBaselineValue).toBeTruthy();
      }
    });

    it('provides familiar audience conversions including light-years for coordinates', () => {
      const coords = resolveMetricGuideEntry('galactic-coordinates');
      expect(coords?.familiarConversion).toContain('light-years');
      expect(coords?.comparisonBaselineLabel).toBe('Sol');

      const sma = resolveMetricGuideEntry('semi-major-axis');
      expect(sma?.familiarConversion).toContain('light-minutes');
      expect(sma?.comparisonBaselineLabel).toBe('Earth');
    });

    it('resolves legacy and shorthand aliases smoothly', () => {
      expect(resolveMetricGuideEntry('planet-mass')?.id).toBe('planetary-mass');
      expect(resolveMetricGuideEntry('planet-radius')?.id).toBe('planetary-radius');
      expect(resolveMetricGuideEntry('apparent-magnitude')?.id).toBe('stellar-magnitude');
      expect(resolveMetricGuideEntry('absolute-magnitude')?.id).toBe('stellar-magnitude');
      expect(resolveMetricGuideEntry('luminosity')?.id).toBe('stellar-luminosity');
    });

    it('returns null for unknown metrics', () => {
      expect(resolveMetricGuideEntry('')).toBeNull();
      expect(resolveMetricGuideEntry('warp-factor')).toBeNull();
    });
  });

  describe('resolveMetricComparison (DEC-028)', () => {
    it('resolves metric comparison against Sol baseline for galactic-coordinates with focus=tau-ceti', () => {
      const comparison = resolveMetricComparison('galactic-coordinates', 'tau-ceti');
      expect(comparison).not.toBeNull();
      expect(comparison?.metricId).toBe('galactic-coordinates');
      expect(comparison?.baselineName).toBe('Sol');
      expect(comparison?.baselineHref).toBe('/system/sol');
      expect(comparison?.targetId).toBe('tau-ceti');
      expect(comparison?.targetValue).toContain('pc');
      expect(comparison?.targetFamiliar).toContain('light-years');
      expect(comparison?.relativeRatioLabel).toContain('light-years from Sol');
      expect(comparison?.isFromFocusedContext).toBe(true);
    });

    it('resolves metric comparison against Earth baseline for semi-major-axis with focus=tau-ceti-e', () => {
      const comparison = resolveMetricComparison('semi-major-axis', 'tau-ceti-e');
      expect(comparison).not.toBeNull();
      expect(comparison?.metricId).toBe('semi-major-axis');
      expect(comparison?.baselineName).toBe('Earth');
      expect(comparison?.baselineHref).toBe('/planet/earth');
      expect(comparison?.targetId).toBe('tau-ceti-e');
      expect(comparison?.targetValue).toContain('AU');
      expect(comparison?.targetFamiliar).toContain('light-minutes');
      expect(comparison?.relativeRatioLabel).toContain('Earth orbit');
      expect(comparison?.isFromFocusedContext).toBe(true);
    });

    it('resolves metric comparison for planetary-mass with focus=tau-ceti-e', () => {
      const comparison = resolveMetricComparison('planetary-mass', 'tau-ceti-e');
      expect(comparison).not.toBeNull();
      expect(comparison?.baselineName).toBe('Earth');
      expect(comparison?.targetValue).toContain('M⊕');
      expect(comparison?.relativeRatioLabel).toContain('Earth mass');
    });

    it('resolves metric comparison for equilibrium-temperature with focus=tau-ceti-e', () => {
      const comparison = resolveMetricComparison('equilibrium-temperature', 'tau-ceti-e');
      expect(comparison).not.toBeNull();
      expect(comparison?.targetFamiliar).toContain('°C');
    });

    it('resolves metric comparison for surface-gravity with focus=tau-ceti-e', () => {
      const comparison = resolveMetricComparison('surface-gravity', 'tau-ceti-e');
      expect(comparison).not.toBeNull();
      expect(comparison?.metricId).toBe('surface-gravity');
      expect(comparison?.baselineName).toBe('Earth');
      expect(comparison?.baselineValue).toBe('1.00 g');
      expect(comparison?.targetValue).toContain('g');
      expect(comparison?.relativeRatioLabel).toContain('Earth gravity');
    });

    it('falls back to default benchmark when focusedEntityId is omitted', () => {
      const stellarComp = resolveMetricComparison('stellar-mass');
      expect(stellarComp?.targetId).toBe('tau-ceti');
      expect(stellarComp?.isFromFocusedContext).toBe(false);

      const orbitalComp = resolveMetricComparison('semi-major-axis');
      expect(orbitalComp?.targetId).toBe('tau-ceti-e');
      expect(orbitalComp?.isFromFocusedContext).toBe(false);
    });
  });

  describe('computeSpectralCombination', () => {
    it('computes realistic astrophysics parameters for G2V', () => {
      const combo = computeSpectralCombination('G', '2', 'V');
      expect(combo.combinedCode).toBe('G2V');
      expect(combo.effectiveTempK).toBeGreaterThanOrEqual(5200);
      expect(combo.effectiveTempK).toBeLessThanOrEqual(6000);
      expect(combo.chromaticityHex).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(combo.radiusRsun).toBeCloseTo(1.0, 1);
      expect(combo.luminosityLsun).toBeGreaterThan(0.5);
      expect(combo.luminosityLsun).toBeLessThan(1.5);
      expect(combo.habitableZoneAu).toContain('AU');
      expect(combo.classEffect).toBeTruthy();
      expect(combo.subdivisionEffect).toBeTruthy();
      expect(combo.luminosityEffect).toBeTruthy();
    });

    it('scales radius and luminosity up for Supergiant (I)', () => {
      const supergiant = computeSpectralCombination('B', '0', 'I');
      expect(supergiant.combinedCode).toBe('B0I');
      expect(supergiant.radiusRsun).toBeGreaterThanOrEqual(100);
      expect(supergiant.luminosityLsun).toBeGreaterThan(10000);
    });

    it('scales radius down for White Dwarf (VII)', () => {
      const whiteDwarf = computeSpectralCombination('D', '2', 'VII');
      expect(whiteDwarf.combinedCode).toBe('D2VII');
      expect(whiteDwarf.radiusRsun).toBeCloseTo(0.012, 3);
    });
  });

  describe('HAZARD_GUIDE_ENTRIES & resolveHazardGuideEntry', () => {
    const expectedHazardIds = [
      'flare-star',
      'ionising-radiation',
      'variable-flux',
      'extreme-heat',
      'cryogenic-cold',
      'high-gravity',
      'tidal-locking',
      'high-eccentricity',
    ];

    it('contains all 8 authoritative environmental hazards (DEC-032)', () => {
      const ids = HAZARD_GUIDE_ENTRIES.map((h) => h.id);
      expect(ids).toEqual(expectedHazardIds);

      for (const entry of HAZARD_GUIDE_ENTRIES) {
        expect(entry.id).toBeTruthy();
        expect(entry.title).toBeTruthy();
        expect(entry.domain).toMatch(/^(stellar|planetary)$/);
        expect(entry.domainLabel).toMatch(/^(Stellar System Hazard|Planetary Hazard)$/);
        expect(entry.severity).toMatch(/^(warning|critical)$/);
        expect(entry.summary).toBeTruthy();
        expect(entry.thresholdCriteria).toBeTruthy();
        expect(entry.physicalMechanism).toBeTruthy();
        expect(entry.operationalImpact).toBeTruthy();
        expect(entry.mitigationNotes).toBeTruthy();
        expect(entry.href).toBe(`${HAZARDS_GUIDE_PATH}/${entry.id}`);
        expect(entry.examples.length).toBeGreaterThan(0);
      }
    });

    it('resolves hazard guide entries by id and returns undefined for unknown id', () => {
      const flare = resolveHazardGuideEntry('flare-star');
      expect(flare).toBeDefined();
      expect(flare?.id).toBe('flare-star');
      expect(flare?.domain).toBe('stellar');
      expect(flare?.severity).toBe('warning');

      const tidal = resolveHazardGuideEntry('tidal-locking');
      expect(tidal).toBeDefined();
      expect(tidal?.id).toBe('tidal-locking');
      expect(tidal?.domain).toBe('planetary');

      expect(resolveHazardGuideEntry('unknown-hazard')).toBeUndefined();
      expect(resolveHazardGuideEntry('')).toBeUndefined();
    });

    it('contains specific benchmark examples for hazards', () => {
      const flare = resolveHazardGuideEntry('flare-star');
      expect(flare?.examples.some((ex) => ex.name.includes('Proxima Centauri'))).toBe(true);

      const highGrav = resolveHazardGuideEntry('high-gravity');
      expect(highGrav?.examples.some((ex) => ex.name.includes('Tau Ceti e'))).toBe(true);

      const tidal = resolveHazardGuideEntry('tidal-locking');
      expect(tidal?.examples.some((ex) => ex.name.includes('Proxima Centauri b'))).toBe(true);
    });
  });
});

describe('DEC-027: Guide Views Structure & DOM Test IDs', () => {
  describe('StarTypesListView', () => {
    it('renders root, breadcrumbs without Galaxy, section nav, 3D previews, and full-card links', () => {
      const html = renderToString(createElement(StarTypesListView));

      expect(html).toContain('data-testid="star-types-list-view-root"');
      expect(html).toContain('data-testid="guide-section-nav"');
      expect(html).toContain('href="/guide/star-types"');
      expect(html).toContain('href="/guide/planet-types"');
      expect(html).toContain('href="/guide/metrics"');

      // Breadcrumbs: starts at Guide, no Galaxy, and has persistent "Map" companion link (DEC-029)
      expect(html).toContain('data-testid="view-breadcrumbs"');
      expect(html).toContain('>Guide<');
      expect(html).not.toContain('>Galaxy<');
      expect(html).toContain('data-testid="breadcrumbs-companion-link"');
      expect(html).toContain('href="/galaxy"');
      expect(html).toContain('>Map<');

      // Header and List
      expect(html).toContain('<h1>Star Types</h1>');
      expect(html).toContain('data-testid="star-types-guide-list"');
      expect(html).toContain('data-testid="star-types-guide-item"');
      expect(html).toContain('data-star-type="g"');
      expect(html).toContain('data-star-type="m"');

      // Full card link
      expect(html).toContain('data-testid="star-types-guide-link"');
      expect(html).toContain('href="/guide/star-types/g"');

      // 3D preview slot
      expect(html).toContain('data-testid="guide-3d-preview"');
      expect(html).toContain('data-preview-kind="star"');
    });
  });

  describe('StarTypeDetailView', () => {
    it('renders detail view with Yerkes combinator, decoded subtype, telemetry, and 3D preview for G8.5V', () => {
      const html = renderToString(createElement(StarTypeDetailView, { starType: 'G8.5V' }));

      expect(html).toContain('data-testid="star-type-detail-view-root"');
      expect(html).toContain('data-star-type="G8.5V"');
      expect(html).toContain('data-testid="guide-section-nav"');
      expect(html).not.toContain('>Galaxy<');
      expect(html).toContain('<h1>Star Type: G8.5V</h1>');
      expect(html).toContain('data-testid="star-types-list-link"');

      // Decoded subtype
      expect(html).toContain('data-testid="star-type-decoded-subtype"');
      expect(html).toContain('Main-Sequence Dwarf');

      // Telemetry
      expect(html).toContain('data-testid="guide-detail-summary"');
      expect(html).toContain('data-testid="guide-detail-telemetry"');

      // 3D preview slot
      expect(html).toContain('data-testid="guide-3d-preview"');
      expect(html).toContain('data-preview-kind="star"');

      // Yerkes Spectral Combinator
      expect(html).toContain('data-testid="star-type-combinator"');
      expect(html).toContain('data-testid="combinator-slice-class"');
      expect(html).toContain('data-testid="combinator-slice-subdivision"');
      expect(html).toContain('data-testid="combinator-slice-luminosity"');
      expect(html).toContain('data-testid="combinator-output"');
      expect(html).toContain('data-testid="combinator-computed-telemetry"');
      expect(html).toContain('data-testid="combinator-permalink"');

      // Benchmark examples
      expect(html).toContain('data-testid="guide-examples-list"');
      expect(html).toContain('data-testid="guide-example-item"');
      expect(html).toContain('data-testid="guide-example-link"');
      expect(html).toContain('Sol');
    });

    it('renders fallback gracefully when starType is not found', () => {
      const html = renderToString(createElement(StarTypeDetailView, { starType: 'UNKNOWN_CLASS' }));
      expect(html).toContain('data-testid="star-type-detail-view-root"');
      expect(html).toContain('data-testid="star-types-list-link"');
    });
  });

  describe('PlanetTypesListView', () => {
    it('renders planet types list with breadcrumbs, full card links, and 3D previews', () => {
      const html = renderToString(createElement(PlanetTypesListView));

      expect(html).toContain('data-testid="planet-types-list-view-root"');
      expect(html).toContain('data-testid="guide-section-nav"');
      expect(html).not.toContain('>Galaxy<');
      expect(html).toContain('<h1>Planet Types</h1>');
      expect(html).toContain('data-testid="planet-types-guide-list"');
      expect(html).toContain('data-testid="planet-types-guide-item"');
      expect(html).toContain('data-planet-type="terrestrial"');
      expect(html).toContain('data-testid="planet-types-guide-link"');
      expect(html).toContain('href="/guide/planet-types/terrestrial"');
      expect(html).toContain('data-testid="guide-3d-preview"');
      expect(html).toContain('data-preview-kind="planet"');
    });
  });

  describe('PlanetTypeDetailView', () => {
    it('renders planet detail view with telemetry, examples, and 3D preview for terrestrial', () => {
      const html = renderToString(createElement(PlanetTypeDetailView, { planetType: 'terrestrial' }));

      expect(html).toContain('data-testid="planet-type-detail-view-root"');
      expect(html).toContain('data-planet-type="terrestrial"');
      expect(html).toContain('data-testid="guide-section-nav"');
      expect(html).not.toContain('>Galaxy<');
      expect(html).toContain('<h1>Planet Type: terrestrial</h1>');
      expect(html).toContain('data-testid="planet-types-list-link"');
      expect(html).toContain('data-testid="guide-detail-summary"');
      expect(html).toContain('data-testid="guide-detail-telemetry"');
      expect(html).toContain('data-testid="guide-3d-preview"');
      expect(html).toContain('data-preview-kind="planet"');
      expect(html).toContain('data-testid="guide-examples-list"');
      expect(html).toContain('Earth');
    });
  });

  describe('MetricsListView', () => {
    it('renders metrics list with full card links, familiar conversions, and comparative previews', () => {
      const html = renderToString(createElement(MetricsListView));

      expect(html).toContain('data-testid="metrics-list-view-root"');
      expect(html).toContain('data-testid="guide-section-nav"');
      expect(html).not.toContain('>Galaxy<');
      expect(html).toContain('<h1>Telemetry Metrics</h1>');
      expect(html).toContain('data-testid="metrics-guide-list"');
      expect(html).toContain('data-testid="metrics-guide-item"');
      expect(html).toContain('data-metric-id="semi-major-axis"');
      expect(html).toContain('data-testid="metrics-guide-link"');
      expect(html).toContain('href="/guide/metrics/semi-major-axis"');
      expect(html).toContain('data-testid="metric-familiar-conversion"');
      expect(html).toContain('data-testid="guide-3d-preview"');
      expect(html).toContain('data-preview-kind="metric"');
    });
  });

  describe('MetricDetailView', () => {
    it('renders metric detail view with physical definition, baseline and examples', () => {
      const html = renderToString(createElement(MetricDetailView, { metricId: 'semi-major-axis' }));

      expect(html).toContain('data-testid="metric-detail-view-root"');
      expect(html).toContain('data-metric-id="semi-major-axis"');
      expect(html).toContain('data-testid="guide-section-nav"');
      expect(html).not.toContain('>Galaxy<');
      expect(html).toContain('<h1>Telemetry Metric: semi-major-axis</h1>');
      expect(html).toContain('data-testid="metrics-list-link"');
      expect(html).toContain('data-testid="guide-detail-summary"');
      expect(html).toContain('data-testid="guide-detail-telemetry"');
      expect(html).toContain('data-testid="metric-familiar-conversion"');
      expect(html).toContain('data-testid="guide-examples-list"');
      expect(html).toContain('Earth');
    });

    it('renders context-aware comparative 3D section for galactic-coordinates with ?focus=tau-ceti', () => {
      const html = renderToString(createElement(MetricDetailView, {
        metricId: 'galactic-coordinates',
        locationSearch: '?focus=tau-ceti',
      }));

      expect(html).toContain('data-testid="metric-comparative-3d"');
      expect(html).toContain('data-focused-entity="tau-ceti"');
      expect(html).toContain('data-testid="metric-comparison-baseline"');
      expect(html).toContain('Sol');
      expect(html).toContain('data-testid="metric-comparison-target"');
      expect(html).toContain('Tau Ceti');
      expect(html).toContain('light-years');
      expect(html).toContain('data-testid="metric-comparison-ratio"');
      expect(html).toContain('light-years from Sol');
    });

    it('renders context-aware comparative 3D section for semi-major-axis with ?focus=tau-ceti-e', () => {
      const html = renderToString(createElement(MetricDetailView, {
        metricId: 'semi-major-axis',
        locationSearch: '?focus=tau-ceti-e',
      }));

      expect(html).toContain('data-testid="metric-comparative-3d"');
      expect(html).toContain('data-focused-entity="tau-ceti-e"');
      expect(html).toContain('data-testid="metric-comparison-baseline"');
      expect(html).toContain('Earth');
      expect(html).toContain('data-testid="metric-comparison-target"');
      expect(html).toContain('Tau Ceti e');
      expect(html).toContain('light-minutes');
      expect(html).toContain('data-testid="metric-comparison-ratio"');
      expect(html).toContain('Earth orbit');
    });
  });

  describe('HazardsListView', () => {
    it('renders root, breadcrumbs without Galaxy, section nav, 3D previews, and full-card links for all 8 hazards', () => {
      const html = renderToString(createElement(HazardsListView));

      expect(html).toContain('data-testid="hazards-list-view-root"');
      expect(html).toContain('data-testid="guide-section-nav"');
      expect(html).not.toContain('>Galaxy<');
      expect(html).toContain('<h1>Environmental Hazards</h1>');
      expect(html).toContain('data-testid="hazards-guide-list"');
      expect(html).toContain('data-testid="hazards-guide-item"');
      expect(html).toContain('data-hazard-id="flare-star"');
      expect(html).toContain('data-hazard-id="tidal-locking"');
      expect(html).toContain('data-testid="hazards-guide-link"');
      expect(html).toContain('href="/guide/hazards/flare-star"');
      expect(html).toContain('data-testid="guide-3d-preview"');
      expect(html).toContain('data-preview-kind="hazard"');
    });
  });

  describe('HazardDetailView', () => {
    it('renders hazard detail view with telemetry dl, summary, examples, and 3D preview for flare-star', () => {
      const html = renderToString(createElement(HazardDetailView, { hazardId: 'flare-star' }));

      expect(html).toContain('data-testid="hazard-detail-view-root"');
      expect(html).toContain('data-hazard-id="flare-star"');
      expect(html).toContain('data-testid="guide-section-nav"');
      expect(html).not.toContain('>Galaxy<');
      expect(html).toContain('<h1>Environmental Hazard: Stellar flare activity</h1>');
      expect(html).toContain('data-testid="hazards-list-link"');
      expect(html).toContain('data-testid="guide-detail-summary"');
      expect(html).toContain('data-testid="guide-detail-telemetry"');
      expect(html).toContain('data-testid="guide-3d-preview"');
      expect(html).toContain('data-preview-kind="hazard"');
      expect(html).toContain('data-testid="guide-examples-list"');
      expect(html).toContain('Proxima Centauri');
    });

    it('renders fallback gracefully when hazardId is not found', () => {
      const html = renderToString(createElement(HazardDetailView, { hazardId: 'unknown-hazard' }));

      expect(html).toContain('data-testid="hazard-detail-view-root"');
      expect(html).toContain('data-testid="hazard-detail-fallback"');
      expect(html).toContain('data-testid="hazards-list-link"');
    });
  });
});
