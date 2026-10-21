import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  decodeSystemHazards,
  decodePlanetHazards,
  formatHazardSummaryLabel,
  buildFocusedEntityDetails,
  buildGalaxySystemNavigationHref,
  resolveGalacticInstrumentAperture,
  extractGalaxyBodies,
  buildSystemOrbitalSchematic,
  formatDiskKindLabel,
  type FocusedPlanetEntityDetails,
  type FocusedSystemEntityDetails,
  type FocusedBeltEntityDetails,
  type GalaxyBodiesSummary,
} from '../src/services/detailsService';
import {
  SYSTEM_HAZARD_BITS,
  PLANET_HAZARD_BITS,
} from '../src/utils/astroMath';
import { DetailsPanel } from '../src/components/domain/DetailsPanel/DetailsPanel';
import { BodiesPanel } from '../src/components/domain/BodiesPanel/BodiesPanel';
import { OrbitalSchematicPanel } from '../src/components/domain/OrbitalSchematicPanel/OrbitalSchematicPanel';
import { GalaxyView } from '../src/views/GalaxyView';
import { SystemView } from '../src/views/SystemView';
import {
  fetchDetailRecord,
  clearDetailsRepositoryCache,
} from '../src/data/detailsRepository';
import { SpatialEntityProvider } from '../src/components/canvas/entity/SpatialEntityContext';
import { createSpatialEntityStore } from '../src/components/canvas/entity/SpatialEntityStore';
import type { SystemManifest, CircumstellarDiskRecord } from '../src/types/astro';
import {
  decodeExoplanet,
  encodeSystemManifest,
  type CompactSearchEntry,
} from '../src/utils/compactDataCodec';

describe('DEC-032: Environmental Hazards & Planetary Telemetry', () => {
  describe('Hazard Bitmask Decoders', () => {
    it('decodeSystemHazards returns empty array for 0 or undefined mask', () => {
      expect(decodeSystemHazards(undefined)).toEqual([]);
      expect(decodeSystemHazards(0)).toEqual([]);
    });

    it('decodeSystemHazards correctly decodes individual system hazard bits', () => {
      const flare = decodeSystemHazards(SYSTEM_HAZARD_BITS.FLARE_STAR);
      expect(flare).toHaveLength(1);
      expect(flare[0]).toMatchObject({
        code: 'flare-star',
        severity: 'warning',
        label: 'Stellar flare activity',
      });

      const ionising = decodeSystemHazards(SYSTEM_HAZARD_BITS.IONISING_RADIATION);
      expect(ionising).toHaveLength(1);
      expect(ionising[0]).toMatchObject({
        code: 'ionising-radiation',
        severity: 'critical',
        label: 'Hard ionising radiation',
      });

      const variable = decodeSystemHazards(SYSTEM_HAZARD_BITS.VARIABLE_FLUX);
      expect(variable).toHaveLength(1);
      expect(variable[0]).toMatchObject({
        code: 'variable-flux',
        severity: 'warning',
        label: 'Variable stellar flux',
      });
    });

    it('decodeSystemHazards decodes composite masks', () => {
      const composite = decodeSystemHazards(
        SYSTEM_HAZARD_BITS.FLARE_STAR | SYSTEM_HAZARD_BITS.VARIABLE_FLUX,
      );
      expect(composite).toHaveLength(2);
      expect(composite.map((h) => h.code)).toEqual(['flare-star', 'variable-flux']);
    });

    it('decodePlanetHazards returns empty array for 0 or undefined mask', () => {
      expect(decodePlanetHazards(undefined)).toEqual([]);
      expect(decodePlanetHazards(0)).toEqual([]);
    });

    it('decodePlanetHazards correctly decodes all planet hazard bits', () => {
      const heat = decodePlanetHazards(PLANET_HAZARD_BITS.EXTREME_HEAT);
      expect(heat).toHaveLength(1);
      expect(heat[0]).toMatchObject({
        code: 'extreme-heat',
        severity: 'critical',
      });

      const cold = decodePlanetHazards(PLANET_HAZARD_BITS.CRYOGENIC_COLD);
      expect(cold).toHaveLength(1);
      expect(cold[0]).toMatchObject({
        code: 'cryogenic-cold',
        severity: 'warning',
      });

      const highG = decodePlanetHazards(PLANET_HAZARD_BITS.HIGH_GRAVITY);
      expect(highG).toHaveLength(1);
      expect(highG[0]).toMatchObject({
        code: 'high-gravity',
        severity: 'warning',
      });

      const tidal = decodePlanetHazards(PLANET_HAZARD_BITS.TIDAL_LOCKING);
      expect(tidal).toHaveLength(1);
      expect(tidal[0]).toMatchObject({
        code: 'tidal-locking',
        severity: 'warning',
      });

      const ecc = decodePlanetHazards(PLANET_HAZARD_BITS.HIGH_ECCENTRICITY);
      expect(ecc).toHaveLength(1);
      expect(ecc[0]).toMatchObject({
        code: 'high-eccentricity',
        severity: 'warning',
      });
    });

    it('formatHazardSummaryLabel formats singular and plural counts', () => {
      expect(formatHazardSummaryLabel(0)).toBe('0 hazards');
      expect(formatHazardSummaryLabel(1)).toBe('1 hazard');
      expect(formatHazardSummaryLabel(2)).toBe('2 hazards');
      expect(formatHazardSummaryLabel(5)).toBe('5 hazards');
    });

    it('decodeExoplanet without H or g derives surfaceGravityG and high-gravity hazard (Tau Ceti e)', () => {
      const decoded = decodeExoplanet({
        i: 'tau-ceti-e',
        n: 'Tau Ceti e',
        l: 'e',
        e: 3.93,
        r: 1.59,
        T: 282,
        o: [0.538, 0.06, 0, 0, 0, 0, 162.87],
      });

      expect(decoded.surfaceGravityG).toBeDefined();
      expect(decoded.surfaceGravityG).toBeGreaterThan(1.2);
      expect(decoded.hazardMask).toBeDefined();
      expect((decoded.hazardMask ?? 0) & PLANET_HAZARD_BITS.HIGH_GRAVITY).toBe(
        PLANET_HAZARD_BITS.HIGH_GRAVITY,
      );
    });
  });

  describe('Host System Hazard Inheritance & Planetary Telemetry', () => {
    const mockProximaManifest: SystemManifest = {
      id: 'proxima-centauri',
      name: 'Proxima Centauri',
      x: -0.47,
      y: 1.32,
      z: -0.33,
      dist: 1.3,
      hazardMask: SYSTEM_HAZARD_BITS.FLARE_STAR,
      sectorId: 'sector_-000_+001_-000',
      planetCompositionCounts: [1, 1, 0, 0], // 1 terrestrial, 1 super-earth
      stars: [
        {
          id: 'proxima-centauri-a',
          name: 'Proxima Centauri',
          componentDesignation: 'A',
          spectralType: 'M5.5Ve',
          mag: 11.13,
          absmag: 15.6,
          massMsun: 0.12,
        },
      ],
      planets: [
        {
          id: 'proxima-centauri-b',
          name: 'Proxima Centauri b',
          letter: 'b',
          composition: 'terrestrial',
          massMearth: 1.07,
          radiusRearth: 1.03,
          surfaceGravityG: 1.01,
          equilibriumTempK: 234,
          esi: 0.87,
          orbit: {
            semiMajorAxis: 0.0485,
            periodDays: 11.186,
            eccentricity: 0.02,
            inclination: 0,
            ascendingNode: 0,
            argumentOfPeriapsis: 0,
            meanAnomaly: 0,
          },
          hazardMask: PLANET_HAZARD_BITS.TIDAL_LOCKING,
          isHabitableCandidate: true,
        },
        {
          id: 'proxima-centauri-c',
          name: 'Proxima Centauri c',
          letter: 'c',
          composition: 'super-earth',
          massMearth: 7.0,
          radiusRearth: 1.8,
          surfaceGravityG: 2.16,
          equilibriumTempK: 39,
          esi: 0.2,
          orbit: {
            semiMajorAxis: 1.48,
            periodDays: 1928,
            eccentricity: 0.04,
            inclination: 0,
            ascendingNode: 0,
            argumentOfPeriapsis: 0,
            meanAnomaly: 0,
          },
          hazardMask: PLANET_HAZARD_BITS.CRYOGENIC_COLD | PLANET_HAZARD_BITS.HIGH_GRAVITY,
          isHabitableCandidate: false,
        },
      ],
    };

    it('host system inherits its own hazard mask in details', () => {
      const details = buildFocusedEntityDetails({
        focusedEntity: null,
        systemDetail: { kind: 'system', record: mockProximaManifest },
        urlSystemSlug: 'proxima-centauri',
      });

      expect(details).not.toBeNull();
      expect(details?.focusedKind).toBe('system');
      expect(details?.hazardCount).toBe(1);
      expect(details?.hazards).toHaveLength(1);
      expect(details?.hazards[0].code).toBe('flare-star');
      expect(details?.hazardSummaryLabel).toBe('1 hazard');
      expect(details?.planetCompositionBreakdown).toEqual([
        { composition: 'terrestrial', count: 1 },
        { composition: 'super-earth', count: 1 },
      ]);
    });

    it('focused planet inherits host system hazards and combines them with planet hazards', () => {
      const details = buildFocusedEntityDetails({
        focusedEntity: {
          id: 'proxima-centauri-b',
          name: 'Proxima Centauri b',
          position: [-0.47, 1.32, -0.33],
        },
        systemDetail: { kind: 'system', record: mockProximaManifest },
        urlSystemSlug: 'proxima-centauri',
        hasExplicitFocus: true,
      });

      expect(details).not.toBeNull();
      expect(details?.focusedKind).toBe('planet');
      // flare-star (system) + tidal-locking (planet) = 2 hazards
      expect(details?.hazardCount).toBe(2);
      expect(details?.hazardSummaryLabel).toBe('2 hazards');
      const codes = details?.hazards.map((h) => h.code);
      expect(codes).toContain('flare-star');
      expect(codes).toContain('tidal-locking');

      const planetDetails = details as FocusedPlanetEntityDetails;
      expect(planetDetails.planetTelemetry).toBeDefined();
      expect(planetDetails.planetTelemetry.surfaceGravityG).toBe(1.01);
      expect(planetDetails.planetTelemetry.isTidallyLocked).toBe(true);
      expect(planetDetails.planetTelemetry.esi).toBe(0.87);
      expect(planetDetails.planetTelemetry.hazardCount).toBe(2);
      expect(planetDetails.planetTelemetry.hazards).toHaveLength(2);
    });

    it('focused super-earth planet displays super-earth reticle classification and telemetries', () => {
      const details = buildFocusedEntityDetails({
        focusedEntity: {
          id: 'proxima-centauri-c',
          name: 'Proxima Centauri c',
          position: [-0.47, 1.32, -0.33],
        },
        systemDetail: { kind: 'system', record: mockProximaManifest },
        urlSystemSlug: 'proxima-centauri',
        hasExplicitFocus: true,
      });

      expect(details).not.toBeNull();
      expect(details?.focusedKind).toBe('planet');
      expect(details?.reticleType).toBe('super-earth');
      // flare-star (system) + cryogenic-cold (planet) + high-gravity (planet) = 3 hazards
      expect(details?.hazardCount).toBe(3);
      expect(details?.hazardSummaryLabel).toBe('3 hazards');

      const planetDetails = details as FocusedPlanetEntityDetails;
      expect(planetDetails.planetTelemetry.composition).toBe('super-earth');
      expect(planetDetails.planetTelemetry.surfaceGravityG).toBe(2.16);
      expect(planetDetails.planetTelemetry.isTidallyLocked).toBe(false);
    });

    it('focused star in the system also inherits the host system hazards', () => {
      const details = buildFocusedEntityDetails({
        focusedEntity: {
          id: 'proxima-centauri-a',
          name: 'Proxima Centauri',
          position: [-0.47, 1.32, -0.33],
        },
        systemDetail: { kind: 'system', record: mockProximaManifest },
        urlSystemSlug: 'proxima-centauri',
        hasExplicitFocus: true,
      });

      expect(details).not.toBeNull();
      expect(details?.focusedKind).toBe('star');
      expect(details?.hazardCount).toBe(1);
      expect(details?.hazards[0].code).toBe('flare-star');
    });
  });

  describe('<DetailsPanel /> DOM rendering for DEC-032', () => {
    const mockFixture: FocusedPlanetEntityDetails = {
      id: 'proxima-centauri-b',
      systemId: 'proxima-centauri',
      name: 'Proxima Centauri b',
      systemName: 'Proxima Centauri',
      focusedKind: 'planet',
      hazardCount: 2,
      hazards: [
        {
          code: 'flare-star',
          severity: 'critical',
          label: 'Flare star host',
          description: 'Host star is an active UV Ceti red flare dwarf.',
        },
        {
          code: 'tidal-locking',
          severity: 'warning',
          label: 'Tidally locked (synchronous)',
          description: 'Synchronous rotation creates permanent day/night hemispheres.',
        },
      ],
      hazardSummaryLabel: '2 hazards',
      spectralType: 'M5.5Ve',
      reticleType: 'terrestrial',
      starCount: 1,
      planetCount: 2,
      planetCompositionBreakdown: [
        { composition: 'terrestrial', count: 1 },
        { composition: 'super-earth', count: 1 },
      ],
      planetCompositionSummary: '1 terrestrial · 1 super-earth',
      hasHabitableCandidate: true,
      systemSummary: 'Host system contains flare star hazards.',
      systemSummarySegments: [{ kind: 'text', text: 'Proxima Centauri system' }],
      coordinatesPc: [-0.47, 1.32, -0.33],
      sectorId: 'sector_-000_+001_-000',
      sectorName: 'sector_-000_+001_-000',
      tags: ['ExoplanetHost', 'HabitableCandidate'],
      directionsHref: '/galaxy/proxima-centauri?anchor=sol',
      stars: [],
      planets: [],
      orbitingBodies: [],
      canonAnnotations: [],
      planetTelemetry: {
        composition: 'terrestrial',
        isHabitableCandidate: true,
        surfaceGravityG: 1.01,
        isTidallyLocked: true,
        esi: 0.87,
        hazardCount: 2,
        hazards: [
          {
            code: 'flare-star',
            severity: 'critical',
            label: 'Flare star host',
            description: 'Host star is an active UV Ceti red flare dwarf.',
          },
          {
            code: 'tidal-locking',
            severity: 'warning',
            label: 'Tidally locked (synchronous)',
            description: 'Synchronous rotation creates permanent day/night hemispheres.',
          },
        ],
      },
    };

    it('renders hazard summary badge in Peek detent with guide link', () => {
      const html = renderToString(createElement(DetailsPanel, { details: mockFixture }));
      expect(html).toContain('data-testid="details-hazard-summary"');
      expect(html).toContain('2 hazards');
      expect(html).toContain('data-testid="details-hazard-summary-link"');
      expect(html).toContain('href="/guide/hazards"');

      // Test single hazard links directly to specific hazard guide page
      const singleHazardFixture: FocusedPlanetEntityDetails = {
        ...mockFixture,
        hazardCount: 1,
        hazardSummaryLabel: '1 hazard',
        hazards: [mockFixture.hazards[0]],
      };
      const singleHtml = renderToString(
        createElement(DetailsPanel, { details: singleHazardFixture }),
      );
      expect(singleHtml).toContain('data-testid="details-hazard-summary-link"');
      expect(singleHtml).toContain('href="/guide/hazards/flare-star"');
    });

    it('renders hazard section with individual hazard items and guide links in Partial detent', () => {
      const html = renderToString(createElement(DetailsPanel, { details: mockFixture }));
      expect(html).toContain('data-testid="details-hazards-section"');
      expect(html).toContain('data-testid="details-hazard-item"');
      expect(html).toContain('data-hazard-code="flare-star"');
      expect(html).toContain('data-hazard-severity="critical"');
      expect(html).toContain('data-hazard-code="tidal-locking"');
      expect(html).toContain('data-hazard-severity="warning"');
      expect(html).toContain('Flare star host');
      expect(html).toContain('Tidally locked (synchronous)');
      expect(html).toContain('data-testid="details-hazard-guide-link"');
      expect(html).toContain('href="/guide/hazards/flare-star"');
      expect(html).toContain('href="/guide/hazards/tidal-locking"');
    });

    it('renders Surface Gravity, Tidal Status, and ESI in Full detent with Tier 1 primitives', () => {
      const html = renderToString(createElement(DetailsPanel, { details: mockFixture }));
      expect(html).toContain('data-testid="details-detent-full"');
      expect(html).toContain('data-testid="details-planet-telemetry-gravity"');
      expect(html).toContain('/guide/metrics/surface-gravity');
      expect(html).toContain('1.01');
      expect(html).toContain('data-testid="details-planet-telemetry-tidal"');
      expect(html).toContain('Tidally locked (synchronous)');
      expect(html).toContain('data-testid="details-planet-telemetry-esi"');
      expect(html).toContain('0.87');
      expect(html).toContain('data-datum="true"');
      expect(html).toContain('data-testid="details-planet-telemetry-habitability"');
      expect(html).toContain('data-testid="details-planet-telemetry-tidal-status"');
      expect(html).toContain('data-testid="details-cta-group"');
      expect(html).toContain('data-testid="details-reticle-type"');
    });

    it('renders nominal environmental profile when entity has 0 hazards', () => {
      const nominalFixture: FocusedSystemEntityDetails = {
        id: 'sol',
        systemId: 'sol',
        name: 'Sol',
        systemName: 'Sol',
        focusedKind: 'system',
        hazardCount: 0,
        hazards: [],
        hazardSummaryLabel: '0 hazards',
        spectralType: 'G2V',
        reticleType: 'stellar-system',
        starCount: 1,
        planetCount: 8,
        planetCompositionBreakdown: [
          { composition: 'terrestrial', count: 4 },
          { composition: 'gas-giant', count: 2 },
          { composition: 'ice-giant', count: 2 },
        ],
        planetCompositionSummary: '4 terrestrial · 2 gas-giant · 2 ice-giant',
        hasHabitableCandidate: true,
        systemSummary: 'The Solar System',
        systemSummarySegments: [{ kind: 'text', text: 'The Solar System' }],
        coordinatesPc: [0, 0, 0],
        sectorId: 'sector_+000_+000_+000',
        sectorName: 'sector_+000_+000_+000',
        tags: ['HomeSystem'],
        directionsHref: '/galaxy/sol?anchor=sol',
        stars: [],
        planets: [],
        canonAnnotations: [],
      };

      const html = renderToString(createElement(DetailsPanel, { details: nominalFixture }));
      expect(html).toContain('data-testid="details-hazards-nominal"');
      expect(html).toContain('Nominal environment');
      expect(html).toContain('>0</span>');
      expect(html).toContain('hazards</a>');
      expect(html).toContain('data-testid="details-hazards-guide-link"');
      expect(html).toContain('href="/guide/hazards"');
    });

    it('renders PlanetCensus in DetailsPanel with per-composition CelestialSymbols and omits leading count when breakdown is present', () => {
      const nominalFixture: FocusedSystemEntityDetails = {
        id: 'sol',
        systemId: 'sol',
        name: 'Sol',
        systemName: 'Sol',
        focusedKind: 'system',
        hazardCount: 0,
        hazards: [],
        hazardSummaryLabel: '0 hazards',
        spectralType: 'G2V',
        reticleType: 'stellar-system',
        starCount: 1,
        planetCount: 8,
        planetCompositionBreakdown: [
          { composition: 'terrestrial', count: 4 },
          { composition: 'gas-giant', count: 2 },
          { composition: 'ice-giant', count: 2 },
        ],
        planetCompositionSummary: '4 terrestrial · 2 gas-giant · 2 ice-giant',
        hasHabitableCandidate: true,
        systemSummary: 'The Solar System',
        systemSummarySegments: [{ kind: 'text', text: 'The Solar System' }],
        coordinatesPc: [0, 0, 0],
        sectorId: 'sector_+000_+000_+000',
        sectorName: 'sector_+000_+000_+000',
        tags: ['HomeSystem'],
        directionsHref: '/galaxy/sol?anchor=sol',
        stars: [],
        planets: [],
        canonAnnotations: [],
      };

      const html = renderToString(createElement(DetailsPanel, { details: nominalFixture }));
      expect(html).toContain('data-testid="details-planet-composition"');
      expect(html).toContain('data-planet-census="true"');

      // Breakdown present -> MUST NOT render leading total "8 planets"
      expect(html).not.toContain('>8</span>');
      expect(html).not.toContain('planets</span>');

      // Composition breakdown items with counts
      expect(html).toContain('data-planet-census-item="terrestrial"');
      expect(html).toContain('>4</span>');
      expect(html).toContain('data-planet-census-item="gas-giant"');
      expect(html).toContain('>2</span>');
      expect(html).toContain('data-planet-census-item="ice-giant"');

      // CelestialSymbol links (not badges or buttons)
      expect(html).toContain('data-testid="details-summary-planet-type-link"');
      expect(html).toContain('data-celestial-symbol="terrestrial"');
      expect(html).toContain('data-category="planet"');
      expect(html).toContain('href="/guide/planet-types/terrestrial"');

      // Habitable zone symbol link
      expect(html).toContain('data-testid="details-habitable-zone-link"');
      expect(html).toContain('data-celestial-symbol="habitable-zone"');
      expect(html).toContain('data-status="nominal"');
      expect(html).toContain('href="/galaxy?select=tag:habitable-candidate"');
    });
  });
});

describe('DEC-034: 3D Cartographic Instrument Sphere & Galaxy Bodies Panel', () => {
  const SAMPLE_GALAXY_CORPUS: readonly CompactSearchEntry[] = [
    {
      i: 'sol',
      n: 'Sol',
      p: [0, 0, 0],
      m: [-26.74, 'G2V', 8, 1],
      h: 1,
      c: 'stars',
    },
    {
      i: 'alpha-centauri',
      n: 'Alpha Centauri',
      p: [-0.47, 1.32, -0.33],
      m: [-0.27, 'G2V', 1, 1],
      c: 'stars',
    },
    {
      i: 'barnard-star',
      n: "Barnard's Star",
      p: [-0.05, 1.81, 0.49],
      m: [9.54, 'M4V', 0],
      c: 'stars',
    },
    {
      i: 'tau-ceti',
      n: 'Tau Ceti',
      p: [-3.1, -0.4, -2.0],
      m: [3.5, 'G8V', 4, 1],
      c: 'stars',
    },
    {
      i: 'distant-star',
      n: 'Distant Star',
      p: [50, 0, 0],
      m: [6.0, 'K0V', 0],
      c: 'stars',
    },
    {
      i: 'tau-ceti-e',
      k: 2,
      n: 'Tau Ceti e',
      s: 'tau-ceti',
      p: [-3.1, -0.4, -2.0],
      z: 1,
    },
  ];

  describe('buildGalaxySystemNavigationHref', () => {
    it('drops focus parameter while preserving active search parameters and literal : and ,', () => {
      const search = '?focus=sol&q=alpha&searchCategory=stars&select=layer:project-hail-mary,tag:habitable-candidate&center=tau-ceti&x=1&y=2&z=3&az=45&el=30&dist=35&zoom=1.5&route=sol,tau-ceti&journeyOption=torchship-1g';
      const href = buildGalaxySystemNavigationHref('alpha-centauri', search);
      expect(href).toContain('/galaxy/alpha-centauri?');
      expect(href).not.toContain('focus=');
      expect(href).toContain('q=alpha');
      expect(href).toContain('searchCategory=stars');
      expect(href).toContain('select=layer:project-hail-mary,tag:habitable-candidate');
      expect(href).toContain('center=tau-ceti');
      expect(href).toContain('x=1');
      expect(href).toContain('y=2');
      expect(href).toContain('z=3');
      expect(href).toContain('dist=35');
      expect(href).toContain('zoom=1.5');
      expect(href).toContain('route=sol,tau-ceti');
      expect(href).toContain('journeyOption=torchship-1g');
    });

    it('returns clean galaxy href when no search params are present', () => {
      expect(buildGalaxySystemNavigationHref('tau-ceti')).toBe('/galaxy/tau-ceti');
      expect(buildGalaxySystemNavigationHref('tau-ceti', '')).toBe('/galaxy/tau-ceti');
      expect(buildGalaxySystemNavigationHref('tau-ceti', '?focus=sol')).toBe('/galaxy/tau-ceti');
    });
  });

  describe('resolveGalacticInstrumentAperture', () => {
    it('computes apertureRadiusPc and apertureRadiusLy from cameraState dist and zoom', () => {
      // Default: baseDist = 34.9, zoom = 1, refDist = 34.9 -> rawAperturePc = 10
      const defaultAperture = resolveGalacticInstrumentAperture({
        corpus: SAMPLE_GALAXY_CORPUS,
      });
      expect(defaultAperture.centerId).toBe('sol');
      expect(defaultAperture.centerName).toBe('Sol');
      expect(defaultAperture.centerCoordinatesPc).toEqual([0, 0, 0]);
      expect(defaultAperture.apertureRadiusPc).toBe(10);
      expect(defaultAperture.apertureRadiusLy).toBe(32.62);

      // Half distance -> 5 pc aperture radius
      const zoomedAperture = resolveGalacticInstrumentAperture({
        cameraState: { dist: 17.45, zoom: 1 },
        corpus: SAMPLE_GALAXY_CORPUS,
      });
      expect(zoomedAperture.apertureRadiusPc).toBe(5);

      // Explicit coordinates [10, 20, -5]
      const customOriginAperture = resolveGalacticInstrumentAperture({
        cameraState: { x: 10, y: 20, z: -5, center: 'Sector Hub' },
        corpus: SAMPLE_GALAXY_CORPUS,
      });
      expect(customOriginAperture.centerCoordinatesPc).toEqual([10, 20, -5]);
      expect(customOriginAperture.centerId).toBe('sector-hub');
      expect(customOriginAperture.centerName).toBe('Sector Hub');
    });

    it('identifies systems inside 3D instrument aperture sphere and excludes outer systems', () => {
      const aperture = resolveGalacticInstrumentAperture({
        corpus: SAMPLE_GALAXY_CORPUS,
      });
      expect(aperture.apertureIds.has('sol')).toBe(true);
      expect(aperture.apertureIds.has('alpha-centauri')).toBe(true);
      expect(aperture.apertureIds.has('barnard-star')).toBe(true);
      expect(aperture.apertureIds.has('tau-ceti')).toBe(true);
      // distant-star at [50, 0, 0] is outside 10 pc aperture
      expect(aperture.apertureIds.has('distant-star')).toBe(false);
    });
  });

  describe('extractGalaxyBodies', () => {
    it('filters strictly to non-passive systems (focused, selected, active) and excludes passive background stars', () => {
      const summary = extractGalaxyBodies({
        corpus: SAMPLE_GALAXY_CORPUS,
        focusedEntity: {
          id: 'sol',
          name: 'Sol',
          position: [0, 0, 0],
          classification: 'stellar-system',
        },
      });

      expect(summary.scope).toBe('galaxy');
      expect(summary.focusedSystemId).toBe('sol');
      expect(summary.focusedSystemName).toBe('Sol');
      const systemIds = summary.systems.map((s) => s.id);
      expect(systemIds).toContain('sol');
      expect(systemIds).toContain('alpha-centauri');
      expect(systemIds).toContain('barnard-star');
      expect(systemIds).toContain('tau-ceti');
      expect(systemIds).not.toContain('distant-star');
      expect(summary.systems.every((s) => s.tier === 'focused' || s.tier === 'selected' || s.tier === 'active')).toBe(true);
    });

    it('promotes systems in selectedEntities to selected tier and includes them even if outside aperture', () => {
      const summary = extractGalaxyBodies({
        corpus: SAMPLE_GALAXY_CORPUS,
        selectedEntities: [
          {
            id: 'distant-star',
            name: 'Distant Star',
            position: [50, 0, 0],
            classification: 'stellar-system',
          },
        ],
      });

      const distant = summary.systems.find((s) => s.id === 'distant-star');
      expect(distant).toBeDefined();
      expect(distant?.tier).toBe('selected');
    });

    it('sorts systems ascending by distance from focused system and populates focus-relative distances', () => {
      const summary = extractGalaxyBodies({
        corpus: SAMPLE_GALAXY_CORPUS,
        focusedEntity: {
          id: 'sol',
          name: 'Sol',
          position: [0, 0, 0],
          classification: 'stellar-system',
        },
      });

      expect(summary.systems[0].id).toBe('sol');
      expect(summary.systems[0].distanceFromFocusPc).toBe(0);
      expect(summary.systems[0].distanceFromFocusLy).toBe(0);

      // Next closest from Sol: Alpha Centauri (~1.44 pc), Barnard's Star (~1.87 pc), Tau Ceti (~3.71 pc)
      expect(summary.systems[1].id).toBe('alpha-centauri');
      expect(summary.systems[1].distanceFromFocusPc).toBe(1.44);
      expect(summary.systems[1].distanceFromFocusLy).toBe(4.7);
      expect(summary.systems[1].distanceGuideHref).toBe('/guide/metrics/distance?focus=alpha-centauri');

      expect(summary.systems[2].id).toBe('barnard-star');
      expect(summary.systems[2].distanceFromFocusPc).toBe(1.88);

      expect(summary.systems[3].id).toBe('tau-ceti');
      expect(summary.systems[3].distanceFromFocusPc).toBe(3.71);
    });

    it('resolves parent system slug when child planet/star is focused on GalaxyView', () => {
      const summary = extractGalaxyBodies({
        corpus: SAMPLE_GALAXY_CORPUS,
        focusedEntity: {
          id: 'tau-ceti-e',
          name: 'Tau Ceti e',
          position: [-3.1, -0.4, -2.0],
          classification: 'terrestrial',
        },
      });

      expect(summary.focusedSystemId).toBe('tau-ceti');
      expect(summary.focusedSystemName).toBe('Tau Ceti');
      const tauCetiItem = summary.systems.find((s) => s.id === 'tau-ceti');
      expect(tauCetiItem?.tier).toBe('focused');
      expect(tauCetiItem?.distanceFromFocusPc).toBe(0);
    });

    it('omits distances when no system is focused and sorts ascending from aperture center', () => {
      const summary = extractGalaxyBodies({
        corpus: SAMPLE_GALAXY_CORPUS,
      });

      expect(summary.focusedSystemId).toBeUndefined();
      expect(summary.focusedSystemName).toBeUndefined();
      for (const sys of summary.systems) {
        expect(sys.distanceFromFocusPc).toBeUndefined();
        expect(sys.distanceFromFocusLy).toBeUndefined();
        expect(sys.distanceGuideHref).toBeUndefined();
      }
      expect(summary.systems[0].id).toBe('sol');
    });

    it('preserves query parameters like select, center, dist on system navigation href', () => {
      const summary = extractGalaxyBodies({
        corpus: SAMPLE_GALAXY_CORPUS,
        currentSearch: '?select=layer:halo&center=sol&dist=20',
      });

      const alpha = summary.systems.find((s) => s.id === 'alpha-centauri');
      expect(alpha?.href).toBe('/galaxy/alpha-centauri?select=layer:halo&center=sol&dist=20');
    });
  });

  describe('<BodiesPanel scope="galaxy" /> DOM rendering', () => {
    const mockGalaxySummary: GalaxyBodiesSummary = {
      scope: 'galaxy',
      centerId: 'sol',
      centerName: 'Sol',
      centerCoordinatesPc: [0, 0, 0],
      apertureRadiusPc: 10,
      apertureRadiusLy: 32.62,
      focusedSystemId: 'sol',
      focusedSystemName: 'Sol',
      systems: [
        {
          id: 'sol',
          name: 'Sol',
          href: '/galaxy/sol',
          tier: 'focused',
          reticleType: 'stellar-system',
          spectralType: 'G2V',
          starTypeGuideHref: '/guide/star-types/G2V',
          planetCount: 8,
          hasHabitableCandidate: true,
          habitableZoneGuideHref: '/galaxy?select=tag:habitable-candidate',
          hazardCount: 0,
          hazardSummaryLabel: '0 hazards',
          hasCriticalHazard: false,
          distanceFromFocusPc: 0,
          distanceFromFocusLy: 0,
          distanceGuideHref: '/guide/metrics/distance?focus=sol',
        },
        {
          id: 'alpha-centauri',
          name: 'Alpha Centauri',
          href: '/galaxy/alpha-centauri',
          tier: 'active',
          reticleType: 'stellar-system',
          spectralType: 'G2V',
          starTypeGuideHref: '/guide/star-types/G2V',
          planetCount: 1,
          hasHabitableCandidate: true,
          habitableZoneGuideHref: '/galaxy?select=tag:habitable-candidate',
          hazardCount: 1,
          hazardSummaryLabel: '1 hazard',
          hasCriticalHazard: false,
          distanceFromFocusPc: 1.44,
          distanceFromFocusLy: 4.7,
          distanceGuideHref: '/guide/metrics/distance?focus=alpha-centauri',
        },
      ],
    };

    it('renders Galactic Systems heading, does NOT render orbital schematic panel, and renders distance caption', () => {
      const html = renderToString(createElement(BodiesPanel, { elements: mockGalaxySummary }));
      expect(html).toContain('data-testid="bodies-panel"');
      expect(html).toContain('data-scope="galaxy"');
      expect(html).toContain('data-center-id="sol"');
      expect(html).toContain('data-aperture-radius-pc="10"');
      expect(html).toContain('Galactic Systems');
      // Orbital schematic panel MUST NOT be rendered
      expect(html).not.toContain('data-testid="orbital-schematic-panel"');
      expect(html).toContain('data-testid="bodies-distance-caption"');
      expect(html.replace(/<!-- -->/g, '')).toContain('Distances from Sol');
    });

    it('renders system rows with link, reticle, badges, and focus-relative distances', () => {
      const html = renderToString(createElement(BodiesPanel, { elements: mockGalaxySummary }));
      expect(html).toContain('data-testid="bodies-galaxy-systems-list"');
      expect(html).toContain('data-testid="bodies-galaxy-system-item"');
      expect(html).toContain('data-system-id="sol"');
      expect(html).toContain('data-tier="focused"');
      expect(html).toContain('data-focused="true"');
      expect(html).toContain('data-testid="bodies-galaxy-system-link"');
      expect(html).toContain('data-testid="bodies-galaxy-system-reticle"');
      expect(html).toContain('data-testid="bodies-galaxy-system-spectral-link"');
      expect(html).toContain('href="/guide/star-types/G2V"');
      expect(html).toContain('data-testid="bodies-galaxy-system-planets"');
      expect(html).toContain('>8</span>');
      expect(html).toContain('planets</span>');
      expect(html).toContain('>1</span>');
      expect(html).toContain('planet</span>');
      expect(html).toContain('data-testid="bodies-galaxy-system-hz-link"');
      expect(html).toContain('href="/galaxy?select=tag:habitable-candidate"');
      expect(html).toContain('data-testid="bodies-galaxy-system-hazard"');
      expect(html).toContain('1 hazard');

      // Focused origin badge
      expect(html).toContain('data-testid="bodies-focused-origin-badge"');
      expect(html).toContain('Focused');
      expect(html).toContain('>0</span>');
      expect(html).toContain('pc</span>');

      // Other system distance
      expect(html).toContain('data-testid="bodies-system-distance"');
      expect(html).toContain('1.44');
      expect(html).toContain('data-testid="bodies-distance-unit-link"');
      expect(html).toContain('href="/guide/metrics/distance?focus=alpha-centauri"');
      expect(html).toContain('>4.7</span>');
      expect(html).toContain('ly</span>');
    });

    it('omits distance caption and distances when unfocused', () => {
      const unfocusedSummary: GalaxyBodiesSummary = {
        ...mockGalaxySummary,
        focusedSystemId: undefined,
        focusedSystemName: undefined,
        systems: mockGalaxySummary.systems.map((s) => ({
          ...s,
          tier: 'active',
          distanceFromFocusPc: undefined,
          distanceFromFocusLy: undefined,
          distanceGuideHref: undefined,
        })),
      };

      const html = renderToString(createElement(BodiesPanel, { elements: unfocusedSummary }));
      expect(html).not.toContain('data-testid="bodies-distance-caption"');
      expect(html).not.toContain('data-testid="bodies-focused-origin-badge"');
      expect(html).not.toContain('data-testid="bodies-system-distance"');
    });
  });

  describe('Integration: GalaxyView renders BodiesPanel scope="galaxy"', () => {
    it('mounts <BodiesPanel scope="galaxy" /> inside GalaxyView', () => {
      const store = createSpatialEntityStore();
      const html = renderToString(
        createElement(
          SpatialEntityProvider,
          { store },
          createElement(GalaxyView, {
            initialCorpus: SAMPLE_GALAXY_CORPUS,
            locationPathname: '/galaxy',
            locationSearch: '?dist=34.9',
          }),
        ),
      );

      expect(html).toContain('data-testid="bodies-panel"');
      expect(html).toContain('data-scope="galaxy"');
      expect(html).toContain('Galactic Systems');
      expect(html).toContain('data-testid="bodies-galaxy-systems-list"');
    });
  });

  describe('DEC-035: Circumstellar Disks, Orbital Schematic Interleaving & Belt Inspector', () => {
    const SAMPLE_DISKS: CircumstellarDiskRecord[] = [
      {
        id: 'sol-asteroid-belt',
        name: 'Asteroid Belt',
        kind: 'asteroid-belt',
        innerRadiusAu: 2.1,
        outerRadiusAu: 3.3,
        semiMajorAxisAu: 2.7,
        tempK: 165,
        composition: 'Carbonaceous, silicate, and metallic planetesimals',
      },
      {
        id: 'sol-kuiper-belt',
        name: 'Kuiper Belt',
        kind: 'kuiper-belt',
        innerRadiusAu: 30,
        outerRadiusAu: 50,
        semiMajorAxisAu: 40,
        tempK: 45,
        composition: 'Methane, ammonia, and water ices with volatile organics',
      },
    ];

    const SAMPLE_STARS = [
      {
        id: 'sol',
        name: 'Sol',
        componentDesignation: 'A',
        spectralType: 'G2V',
        mag: -26.74,
        absmag: 4.83,
      },
    ];

    const SAMPLE_PLANETS = [
      { id: 'mercury', name: 'Mercury', composition: 'terrestrial' as const, semiMajorAxisAu: 0.387, isHabitableCandidate: false },
      { id: 'venus', name: 'Venus', composition: 'terrestrial' as const, semiMajorAxisAu: 0.723, isHabitableCandidate: false },
      { id: 'earth', name: 'Earth', composition: 'terrestrial' as const, semiMajorAxisAu: 1.0, isHabitableCandidate: true },
      { id: 'mars', name: 'Mars', composition: 'terrestrial' as const, semiMajorAxisAu: 1.524, isHabitableCandidate: false },
      { id: 'jupiter', name: 'Jupiter', composition: 'gas-giant' as const, semiMajorAxisAu: 5.204, isHabitableCandidate: false },
      { id: 'saturn', name: 'Saturn', composition: 'gas-giant' as const, semiMajorAxisAu: 9.582, isHabitableCandidate: false },
      { id: 'uranus', name: 'Uranus', composition: 'ice-giant' as const, semiMajorAxisAu: 19.2, isHabitableCandidate: false },
      { id: 'neptune', name: 'Neptune', composition: 'ice-giant' as const, semiMajorAxisAu: 30.05, isHabitableCandidate: false },
    ];

    const SAMPLE_CORPUS: CompactSearchEntry[] = [
      { i: 'sol', n: 'Sol', k: 1, s: 'sol', p: [0, 0, 0] },
      { i: 'ceres', n: 'Ceres', k: 4, s: 'sol', p: [0, 0, 0], A: 2.77, e: 'belt' },
      { i: 'pluto', n: 'Pluto', k: 4, s: 'sol', p: [0, 0, 0], A: 39.48, e: 'kuiper' },
      { i: 'haumea', n: 'Haumea', k: 4, s: 'sol', p: [0, 0, 0], A: 43.22, e: 'kuiper' },
    ];

    describe('formatDiskKindLabel', () => {
      it('correctly maps disk kinds to human-readable labels', () => {
        expect(formatDiskKindLabel('asteroid-belt')).toBe('Asteroid Belt');
        expect(formatDiskKindLabel('kuiper-belt')).toBe('Kuiper Belt');
        expect(formatDiskKindLabel('debris-disk')).toBe('Debris Disk');
      });
    });

    describe('buildSystemOrbitalSchematic', () => {
      it('interleaves belts radially and nests resident dwarf planets as children with sequential orbitRank', () => {
        const schematic = buildSystemOrbitalSchematic({
          systemId: 'sol',
          systemName: 'Sol',
          stars: SAMPLE_STARS,
          planets: SAMPLE_PLANETS,
          disks: SAMPLE_DISKS,
          corpus: SAMPLE_CORPUS,
        });

        expect(schematic).not.toBeNull();
        expect(schematic?.systemId).toBe('sol');
        const items = schematic!.items;

        const topIds = items.map((i) => i.id);
        expect(topIds).not.toContain('ceres');
        expect(topIds).not.toContain('pluto');
        expect(topIds).not.toContain('haumea');

        expect(topIds).toEqual([
          'sol',
          'mercury',
          'venus',
          'earth',
          'mars',
          'sol-asteroid-belt',
          'jupiter',
          'saturn',
          'uranus',
          'neptune',
          'sol-kuiper-belt',
        ]);

        expect(items[0].orbitRank).toBe(0);
        expect(items[1].orbitRank).toBe(1);
        expect(items[4].orbitRank).toBe(4);
        expect(items[5].orbitRank).toBe(5);
        expect(items[6].orbitRank).toBe(6);
        expect(items[10].orbitRank).toBe(10);

        const asteroidBelt = items[5];
        expect(asteroidBelt.kind).toBe('belt');
        expect(asteroidBelt.name).toBe('Asteroid Belt');
        expect(asteroidBelt.radialSpanAu).toEqual([2.1, 3.3]);
        expect(asteroidBelt.summaryLabel).toBe('Asteroid Belt');
        expect(asteroidBelt.children).toHaveLength(1);
        expect(asteroidBelt.children![0].id).toBe('ceres');
        expect(asteroidBelt.children![0].name).toBe('Ceres');
        expect(asteroidBelt.children![0].kind).toBe('dwarf-planet');
        expect(asteroidBelt.children![0].region).toBe('asteroid-belt');
        expect(asteroidBelt.children![0].summaryLabel).toBe('Dwarf Planet');

        const kuiperBelt = items[10];
        expect(kuiperBelt.kind).toBe('belt');
        expect(kuiperBelt.name).toBe('Kuiper Belt');
        expect(kuiperBelt.radialSpanAu).toEqual([30, 50]);
        expect(kuiperBelt.summaryLabel).toBe('Kuiper Belt');
        expect(kuiperBelt.children).toHaveLength(2);
        expect(kuiperBelt.children!.map((c) => c.name)).toEqual(['Pluto', 'Haumea']);
        expect(kuiperBelt.children![0].region).toBe('kuiper-belt');
        expect(kuiperBelt.children![1].region).toBe('kuiper-belt');
      });

      it('interleaves debris disk by midpoint radius in extrasolar system', () => {
        const debrisDisk: CircumstellarDiskRecord = {
          id: 'fomalhaut-debris-disk',
          name: 'Main Debris Ring',
          kind: 'debris-disk',
          innerRadiusAu: 133,
          outerRadiusAu: 158,
          semiMajorAxisAu: 145.5,
          tempK: 40,
          composition: 'Cold carbonaceous dust',
        };
        const schematic = buildSystemOrbitalSchematic({
          systemId: 'fomalhaut',
          systemName: 'Fomalhaut',
          stars: [{ id: 'fomalhaut', name: 'Fomalhaut', componentDesignation: 'A', spectralType: 'A3V', mag: 1.16, absmag: 1.72 }],
          planets: [{ id: 'fomalhaut-b', name: 'Fomalhaut b', composition: 'gas-giant' as const, semiMajorAxisAu: 177, isHabitableCandidate: false }],
          disks: [debrisDisk],
        });

        expect(schematic).not.toBeNull();
        const items = schematic!.items;
        expect(items.map((i) => i.id)).toEqual([
          'fomalhaut',
          'fomalhaut-debris-disk',
          'fomalhaut-b',
        ]);
        expect(items[1].radialSpanAu).toEqual([133, 158]);
      });
    });

    describe('<OrbitalSchematicPanel /> Belt Rendering', () => {
      it('renders belt badge, radial span with AU unit link, and nested resident bodies', () => {
        const schematic = buildSystemOrbitalSchematic({
          systemId: 'sol',
          systemName: 'Sol',
          stars: SAMPLE_STARS,
          planets: SAMPLE_PLANETS,
          disks: SAMPLE_DISKS,
          corpus: SAMPLE_CORPUS,
        });

        const html = renderToString(createElement(OrbitalSchematicPanel, { elements: schematic }));

        expect(html).toContain('data-testid="orbital-schematic-belt-badge"');
        expect(html).toContain('Asteroid Belt');
        expect(html).toContain('Kuiper Belt');

        expect(html).toContain('data-testid="orbital-schematic-belt-span"');
        expect(html).toContain('data-testid="orbital-schematic-belt-unit-link"');
        expect(html).toContain('href="/guide/metrics/semi-major-axis"');
        expect(html).toContain('2.1–3.3');
        expect(html).toContain('30–50');

        expect(html).toContain('data-testid="orbital-schematic-item"');
        expect(html).toContain('Ceres');
        expect(html).toContain('Pluto');
        expect(html).toContain('Haumea');
        expect(html).toContain('data-region="asteroid-belt"');
        expect(html).toContain('data-region="kuiper-belt"');
      });
    });

    describe('buildFocusedEntityDetails for Belts', () => {
      it('constructs FocusedBeltEntityDetails with diskTelemetry, resident bodies, and inherited hazards', () => {
        const details = buildFocusedEntityDetails({
          focusedEntity: {
            id: 'sol-asteroid-belt',
            name: 'Asteroid Belt',
            position: [0, 0, 0],
            classification: 'terrestrial',
          },
          corpus: SAMPLE_CORPUS,
          systemDetail: {
            kind: 'system',
            record: {
              id: 'sol',
              name: 'Sol',
              x: 0,
              y: 0,
              z: 0,
              dist: 0,
              sectorId: 'sector_+000_+000_+000',
              hazardMask: SYSTEM_HAZARD_BITS.FLARE_STAR,
              stars: SAMPLE_STARS,
              planets: [],
              disks: SAMPLE_DISKS,
            },
          },
        });

        expect(details).not.toBeNull();
        expect(details!.focusedKind).toBe('belt');
        const beltDetails = details as FocusedBeltEntityDetails;
        expect(beltDetails.name).toBe('Asteroid Belt');
        expect(beltDetails.diskTelemetry).toBeDefined();
        expect(beltDetails.diskTelemetry.classification).toBe('asteroid-belt');
        expect(beltDetails.diskTelemetry.classificationLabel).toBe('Asteroid Belt');
        expect(beltDetails.diskTelemetry.innerRadiusAu).toBe(2.1);
        expect(beltDetails.diskTelemetry.outerRadiusAu).toBe(3.3);
        expect(beltDetails.diskTelemetry.semiMajorAxisAu).toBe(2.7);
        expect(beltDetails.diskTelemetry.tempK).toBe(165);
        expect(beltDetails.diskTelemetry.composition).toBe(
          'Carbonaceous, silicate, and metallic planetesimals',
        );

        expect(beltDetails.orbitingBodies).toHaveLength(1);
        expect(beltDetails.orbitingBodies[0].id).toBe('ceres');
        expect(beltDetails.orbitingBodies[0].name).toBe('Ceres');
        expect(beltDetails.orbitingBodies[0].categoryLabel).toBe('Dwarf Planet');

        expect(beltDetails.hazards).toHaveLength(1);
        expect(beltDetails.hazards[0].code).toBe('flare-star');

        expect(beltDetails.systemSummarySegments.some((s) => s.kind === 'text' && s.text.includes('Asteroid Belt'))).toBe(true);
      });
    });

    describe('<DetailsPanel /> DOM Rendering across Detents for Belts & Disks', () => {
      it('renders Circumstellar Belts & Disks section in Partial detent when host system is focused', () => {
        const systemFixture: FocusedSystemEntityDetails = {
          id: 'sol',
          systemId: 'sol',
          name: 'Sol',
          systemName: 'Sol',
          focusedKind: 'system',
          hazardCount: 0,
          hazards: [],
          hazardSummaryLabel: '0 hazards',
          spectralType: 'G2V',
          reticleType: 'stellar-system',
          starCount: 1,
          planetCount: 8,
          planetCompositionBreakdown: [],
          planetCompositionSummary: '',
          hasHabitableCandidate: true,
          systemSummary: 'The Solar System',
          systemSummarySegments: [{ kind: 'text', text: 'The Solar System' }],
          coordinatesPc: [0, 0, 0],
          sectorId: 'sector_+000_+000_+000',
          tags: ['HomeSystem'],
          directionsHref: '/galaxy/sol?anchor=sol',
          stars: [],
          planets: [],
          disks: [
            {
              id: 'sol-asteroid-belt',
              name: 'Asteroid Belt',
              href: '/system/sol?focus=asteroid-belt',
              kind: 'asteroid-belt',
              kindLabel: 'Asteroid Belt',
              innerRadiusAu: 2.1,
              outerRadiusAu: 3.3,
              semiMajorAxisAu: 2.7,
              tempK: 165,
              composition: 'Carbonaceous, silicate, and metallic planetesimals',
              guideHref: '/guide/metrics/semi-major-axis',
            },
          ],
          canonAnnotations: [],
        };

        const html = renderToString(createElement(DetailsPanel, { details: systemFixture }));
        expect(html).toContain('data-testid="details-disks-section"');
        expect(html).toContain('Circumstellar Belts &amp; Disks');
        expect(html).toContain('data-testid="details-disk-item"');
        expect(html).toContain('data-disk-id="sol-asteroid-belt"');
        expect(html).toContain('data-kind="asteroid-belt"');
        expect(html).toContain('data-testid="details-disk-name-link"');
        expect(html).toContain('Asteroid Belt');
        expect(html).toContain('2.1–3.3');
        expect(html).toContain('data-testid="details-disk-unit-link"');
        expect(html).toContain('165');
        expect(html).toContain('data-testid="details-disk-temp-link"');
      });

      it('renders Peek, Partial (Resident Bodies), and Full (Disk Telemetry) when belt is focused', () => {
        const beltFixture: FocusedBeltEntityDetails = {
          id: 'sol-asteroid-belt',
          systemId: 'sol',
          name: 'Asteroid Belt',
          systemName: 'Sol',
          focusedKind: 'belt',
          reticleType: 'terrestrial',
          starCount: 1,
          planetCount: 8,
          planetCompositionBreakdown: [],
          planetCompositionSummary: '',
          hasHabitableCandidate: false,
          hazardCount: 1,
          hazards: [
            {
              code: 'flare-star',
              severity: 'warning',
              label: 'Stellar flare activity',
              description: 'Significant bolometric luminosity fluctuations.',
            },
          ],
          hazardSummaryLabel: '1 hazard',
          systemSummary: 'Circumstellar asteroid belt in Sol.',
          systemSummarySegments: [{ kind: 'text', text: 'Circumstellar asteroid belt in Sol.' }],
          coordinatesPc: [0, 0, 0],
          sectorId: 'sector_+000_+000_+000',
          tags: [],
          directionsHref: '/galaxy/sol?anchor=sol',
          stars: [],
          planets: [],
          orbitingBodies: [
            {
              id: 'ceres',
              name: 'Ceres',
              href: '/system/sol?focus=ceres',
              categoryKey: 'dwarf-planet',
              categoryLabel: 'Dwarf Planet',
            },
          ],
          canonAnnotations: [],
          diskTelemetry: {
            classification: 'asteroid-belt',
            classificationLabel: 'Asteroid Belt',
            innerRadiusAu: 2.1,
            outerRadiusAu: 3.3,
            semiMajorAxisAu: 2.7,
            tempK: 165,
            composition: 'Carbonaceous, silicate, and metallic planetesimals',
          },
        };

        const html = renderToString(createElement(DetailsPanel, { details: beltFixture }));

        // Peek detent
        expect(html).toContain('data-testid="details-focused-entity-peek"');
        expect(html).toContain('Asteroid Belt');
        expect(html).toContain('2.1–3.3');
        expect(html).toContain('165');
        expect(html).toContain('data-testid="details-hazard-summary"');

        // Partial detent: Resident bodies
        expect(html).toContain('data-testid="details-orbiting-bodies-section"');
        expect(html).toContain('Resident Bodies');
        expect(html).toContain('data-testid="details-orbiting-body-item"');
        expect(html).toContain('data-body-id="ceres"');
        expect(html).toContain('Ceres');
        expect(html).toContain('data-celestial-badge="dwarf-planet"');

        // Full detent: Disk Telemetry
        expect(html).toContain('data-testid="details-disk-telemetry-section"');
        expect(html).toContain('Circumstellar Disk Telemetry');
        expect(html).toContain('data-testid="details-disk-telemetry-classification"');
        expect(html).toContain('data-testid="details-disk-telemetry-span"');
        expect(html).toContain('2.1–3.3');
        expect(html).toContain('data-testid="details-disk-telemetry-midpoint"');
        expect(html).toContain('2.7');
        expect(html).toContain('data-testid="details-disk-telemetry-temp"');
        expect(html).toContain('165');
        expect(html).toContain('data-testid="details-disk-telemetry-composition"');
        expect(html).toContain('Carbonaceous, silicate, and metallic planetesimals');
      });
    });

    describe('Integration: SystemView mounts belt inspector from URL focus slug', () => {
      it('resolves belt inspector from URL focus slug directly', async () => {
        clearDetailsRepositoryCache();
        const compactSol = encodeSystemManifest({
          id: 'sol',
          name: 'Sol',
          properName: 'Sun',
          x: 0,
          y: 0,
          z: 0,
          dist: 0,
          sectorId: 'sector_+000_+000_+000',
          stars: [
            {
              id: 'sol',
              name: 'Sol',
              componentDesignation: 'A',
              spectralType: 'G2V',
              mag: -26.74,
              absmag: 4.83,
            },
          ],
          planets: [],
          disks: [
            {
              id: 'sol-asteroid-belt',
              name: 'Asteroid Belt',
              kind: 'asteroid-belt',
              innerRadiusAu: 2.1,
              outerRadiusAu: 3.3,
              semiMajorAxisAu: 2.7,
              tempK: 165,
              composition: 'Carbonaceous, silicate, and metallic planetesimals',
            },
          ],
        });
        const mockFetch = async () =>
          ({
            ok: true,
            json: async () => ({
              d: {
                sol: compactSol,
              },
            }),
          }) as unknown as Response;

        await fetchDetailRecord('sol', mockFetch);

        const store = createSpatialEntityStore();
        const html = renderToString(
          createElement(
            SpatialEntityProvider,
            { store },
            createElement(SystemView, {
              initialCorpus: SAMPLE_CORPUS,
              locationPathname: '/system/sol',
              locationSearch: '?focus=asteroid-belt',
            }),
          ),
        );

        expect(html).toContain('data-testid="details-panel"');
        expect(html).toContain('Asteroid Belt');
        expect(html).toContain('data-testid="details-disk-telemetry-section"');
        expect(html).toContain('Circumstellar Disk Telemetry');
        expect(html).toContain('Carbonaceous, silicate, and metallic planetesimals');
      });
    });

    describe('Track 02 Architectural Fixes: Submodule Decomposition, Live Aperture Frame & Clean URL Focus', () => {
      it('resolves belt details directly through urlFocusSlug without synthetic entity workaround', () => {
        const details = buildFocusedEntityDetails({
          focusedEntity: null,
          urlSystemSlug: 'sol',
          urlFocusSlug: 'asteroid-belt',
          systemDetail: {
            kind: 'system',
            record: {
              id: 'sol',
              name: 'Sol',
              x: 0,
              y: 0,
              z: 0,
              dist: 0,
              sectorId: 'sector_+000_+000_+000',
              stars: [
                {
                  id: 'sol',
                  name: 'Sol',
                  componentDesignation: 'A',
                  spectralType: 'G2V',
                  mag: -26.74,
                  absmag: 4.83,
                },
              ],
              planets: [],
              disks: SAMPLE_DISKS,
            },
          },
        });

        expect(details).not.toBeNull();
        expect(details!.focusedKind).toBe('belt');
        const belt = details as FocusedBeltEntityDetails;
        expect(belt.id).toBe('sol-asteroid-belt');
        expect(belt.name).toBe('Asteroid Belt');
        expect(belt.diskTelemetry.classification).toBe('asteroid-belt');
        expect(belt.centerHref).toBe('/system/sol?center=sol-asteroid-belt&focus=sol-asteroid-belt');
      });

      it('extractGalaxyBodies reuses precomputed aperture directly', () => {
        const liveAperture = resolveGalacticInstrumentAperture({
          cameraState: { dist: 100, zoom: 2 },
          corpus: SAMPLE_CORPUS,
        });

        const summary = extractGalaxyBodies({
          corpus: SAMPLE_CORPUS,
          aperture: liveAperture,
        });

        expect(summary.apertureRadiusPc).toBe(liveAperture.apertureRadiusPc);
        expect(summary.centerCoordinatesPc).toEqual(liveAperture.centerCoordinatesPc);
      });

      it('manages live aperture frame in SpatialEntityStore with shallow equality', () => {
        const store = createSpatialEntityStore();
        expect(store.getState().apertureRadius).toBeNull();
        expect(store.getState().apertureCenter).toBeNull();

        store.getState().setApertureFrame([10, 20, 30], 45.5);
        expect(store.getState().apertureRadius).toBe(45.5);
        expect(store.getState().apertureCenter).toEqual([10, 20, 30]);

        // Verify shallow equality does not trigger state reference change
        const prevState = store.getState();
        store.getState().setApertureFrame([10, 20, 30], 45.5);
        expect(store.getState()).toBe(prevState);

        // Verify updating radius changes state
        store.getState().setApertureFrame([10, 20, 30], 50.0);
        expect(store.getState().apertureRadius).toBe(50.0);
      });

      it('resolveGalacticInstrumentAperture respects live aperture center and radius overrides', () => {
        const aperture = resolveGalacticInstrumentAperture({
          corpus: SAMPLE_CORPUS,
          liveApertureCenterPc: [5, 15, 25],
          liveApertureRadiusPc: 42.18,
        });

        expect(aperture.centerCoordinatesPc).toEqual([5, 15, 25]);
        expect(aperture.apertureRadiusPc).toBe(42.18);
      });
    });
  });
});

