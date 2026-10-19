import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  decodeSystemHazards,
  decodePlanetHazards,
  formatHazardSummaryLabel,
  buildFocusedEntityDetails,
  type FocusedPlanetEntityDetails,
  type FocusedSystemEntityDetails,
} from '../src/services/detailsService';
import {
  SYSTEM_HAZARD_BITS,
  PLANET_HAZARD_BITS,
} from '../src/utils/astroMath';
import { DetailsPanel } from '../src/components/domain/DetailsPanel/DetailsPanel';
import type { SystemManifest } from '../src/types/astro';
import { decodeExoplanet } from '../src/utils/compactDataCodec';

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

    it('renders Surface Gravity, Tidal Status, and ESI in Full detent', () => {
      const html = renderToString(createElement(DetailsPanel, { details: mockFixture }));
      expect(html).toContain('data-testid="details-detent-full"');
      expect(html).toContain('data-testid="details-planet-telemetry-gravity"');
      expect(html).toContain('/guide/metrics/surface-gravity');
      expect(html).toContain('1.01');
      expect(html).toContain('data-testid="details-planet-telemetry-tidal"');
      expect(html).toContain('Tidally locked (synchronous)');
      expect(html).toContain('data-testid="details-planet-telemetry-esi"');
      expect(html).toContain('0.87');
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
      expect(html).toContain('0 hazards');
      expect(html).toContain('data-testid="details-hazards-guide-link"');
      expect(html).toContain('href="/guide/hazards"');
    });
  });
});
