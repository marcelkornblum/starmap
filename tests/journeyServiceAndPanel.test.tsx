import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  PARSEC_TO_LY,
  AU_TO_KM,
  AU_TO_LIGHT_MINUTES,
  STANDARD_G_MPS2,
  computeEuclideanDistance3D,
  computeInterstellarRelativisticTransit,
  computeInterstellarConstantBetaTransit,
  computeIntraSystemBrachistochroneTransit,
  computeHohmannTransferOrbit,
} from '../src/utils/astroMath';
import {
  buildJourneyChordRenderData,
  type JourneyChordLeg,
} from '../src/components/canvas/cartography/journeyChordGeometry';
import {
  extractUrlRouteStops,
  extractUrlJourneyOptionId,
  buildDirectionsTriggerHref,
  buildJourneyPlan,
} from '../src/services/journeyService';
import { DetentSheet } from '../src/components/interface/surfaces/DetentSheet';
import {
  DirectionsPanel,
  renderStructuredQuantity,
} from '../src/components/domain/DirectionsPanel/DirectionsPanel';
import { buildSystemBodiesSummary } from '../src/services/details/bodiesAndSchematics';
import { buildFocusedEntityDetails } from '../src/services/details/focusedEntityDetails';
import { GalaxyView } from '../src/views/GalaxyView';
import { SystemView } from '../src/views/SystemView';
import { createSpatialEntityStore } from '../src/components/canvas/entity/SpatialEntityStore';
import { SpatialEntityProvider } from '../src/components/canvas/entity/SpatialEntityContext';
import type { CompactSearchEntry } from '../src/utils/compactDataCodec';

const SAMPLE_BENCHMARK_CORPUS: readonly CompactSearchEntry[] = [
  {
    i: 'sol',
    n: 'Sol',
    h: 1,
    p: [0, 0, 0],
    m: [-26.74, 'G2V', 8, 1],
  },
  {
    i: 'proxima-centauri',
    n: 'Proxima Centauri',
    p: [-0.963, -0.669, -0.589],
    m: [11.13, 'M5.5V', 2, 1],
    g: 1,
  },
  {
    i: 'tau-ceti',
    n: 'Tau Ceti',
    p: [-2.61, 1.83, -1.72],
    m: [3.5, 'G8V', 4, 1],
    g: 1,
  },
  {
    i: 'sirius',
    n: 'Sirius',
    p: [-1.61, 2.07, -0.63],
    m: [-1.46, 'A1V', 0],
  },
  {
    i: 'earth',
    n: 'Earth',
    k: 2,
    s: 'sol',
    p: [0, 0, 0],
    r: 3,
    A: 1.0,
    P: 365.256,
    u: 'terrestrial',
    z: 1,
  },
  {
    i: 'mars',
    n: 'Mars',
    k: 2,
    s: 'sol',
    p: [0, 0, 0],
    r: 4,
    A: 1.524,
    P: 686.98,
    u: 'terrestrial',
  },
];

describe('DEC-033: Journey Visual Chord Geometry, Transit Mathematics & Progressive Directions Sheet', () => {
  describe('Part 1: Pure Astronomical & Relativistic Transit Math', () => {
    it('verifies fundamental astronomical and physical constants', () => {
      expect(PARSEC_TO_LY).toBeCloseTo(3.26156, 4);
      expect(AU_TO_KM).toBeCloseTo(149597870.7, 1);
      expect(AU_TO_LIGHT_MINUTES).toBeCloseTo(8.3167, 3);
      expect(STANDARD_G_MPS2).toBeCloseTo(9.80665, 4);
    });

    it('computes 3D Euclidean distances accurately in parsecs and light years', () => {
      // Sol (0,0,0) to Proxima Centauri (-0.963, -0.669, -0.589)
      const { distance: distPc } = computeEuclideanDistance3D([0, 0, 0], [-0.963, -0.669, -0.589]);
      expect(distPc).toBeCloseTo(1.309, 2);
      const distLy = distPc * PARSEC_TO_LY;
      expect(distLy).toBeCloseTo(4.27, 1);
    });

    it('computes interstellar continuous-acceleration relativistic transit for 1g continuous burn', () => {
      // Sol to Tau Ceti (~11.90 ly) at 1g turnaround
      const result = computeInterstellarRelativisticTransit(11.90, 1.0);
      expect(result.shipProperTimeYears).toBeGreaterThan(4.5);
      expect(result.shipProperTimeYears).toBeCloseTo(5.14, 1);
      expect(result.coordinateTimeYears).toBeGreaterThan(13.5);
      expect(result.coordinateTimeYears).toBeLessThan(14.0);
      expect(result.peakBetaC).toBeGreaterThan(0.98);
      expect(result.peakBetaC).toBeLessThan(1.0);
      expect(result.peakLorentzGamma).toBeGreaterThan(5.0);
      expect(result.turnaroundDistanceLy).toBeCloseTo(5.95, 2);
    });

    it('computes interstellar constant-beta sublight transit', () => {
      // Sol to Tau Ceti (11.90 ly) at 0.1c fusion cruise
      const result = computeInterstellarConstantBetaTransit(11.90, 0.1);
      expect(result.coordinateTimeYears).toBeCloseTo(119.0, 1);
      expect(result.shipProperTimeYears).toBeCloseTo(118.4, 1);
      expect(result.cruiseBetaC).toBe(0.1);
      expect(result.lorentzGamma).toBeGreaterThan(1.0);
      expect(result.lorentzGamma).toBeLessThan(1.01);
    });

    it('computes intra-system continuous-thrust brachistochrone transit', () => {
      // Earth to Mars mean distance ~ 0.524 AU at 1g
      const result = computeIntraSystemBrachistochroneTransit(0.524, 1.0);
      expect(result.transitDays).toBeGreaterThan(2.0);
      expect(result.transitDays).toBeLessThan(3.0);
      expect(result.peakVelocityKms).toBeGreaterThan(700);
      expect(result.peakVelocityKms).toBeLessThan(1100);
    });

    it('computes intra-system Hohmann minimum-energy orbital transfer', () => {
      // Earth (1.0 AU) to Mars (1.524 AU) around 1 solar mass
      const result = computeHohmannTransferOrbit(1.0, 1.524, 1.0);
      expect(result.transitDays).toBeGreaterThan(250);
      expect(result.transitDays).toBeLessThan(265);
      expect(result.totalDeltaVKms).toBeGreaterThan(5.0);
      expect(result.totalDeltaVKms).toBeLessThan(6.5);
      expect(result.synodicPeriodDays).toBeGreaterThan(770);
      expect(result.synodicPeriodDays).toBeLessThan(790);
    });
  });

  describe('Part 2: 3D Visual Journey Chord Geometry', () => {
    const mockLeg: JourneyChordLeg = {
      id: 'sol-tau-ceti',
      stepIndex: 0,
      fromId: 'sol',
      fromName: 'Sol',
      fromPosition: [0, 0, 0],
      toId: 'tau-ceti',
      toName: 'Tau Ceti',
      toPosition: [-2.61, 1.83, -1.72],
      distanceLabel: '11.90 ly',
      secondaryLabel: '1g Relativistic',
      methodId: 'torchship-1g',
    };

    it('builds render data with flat line positions, elevation projections, and waypoints', () => {
      const renderData = buildJourneyChordRenderData([mockLeg]);
      expect(renderData.legs).toHaveLength(1);
      const legGeom = renderData.legs[0];
      expect(legGeom.positions.length).toBe(6);
      expect(legGeom.elevationProjectionSegments?.length).toBeGreaterThanOrEqual(12);
      expect(renderData.waypoints).toHaveLength(2);
      expect(renderData.waypoints[0].name).toBe('Sol');
      expect(renderData.waypoints[1].name).toBe('Tau Ceti');
      expect(legGeom.distanceLabel).toContain('11.90 ly');
    });
  });

  describe('Part 3: Dedicated Journey Service', () => {
    it('extracts route stops from URL query search strings', () => {
      expect(extractUrlRouteStops('?route=sol,tau-ceti')).toEqual(['sol', 'tau-ceti']);
      expect(extractUrlRouteStops('?route=sol%2Cproxima-centauri%2Csirius')).toEqual([
        'sol',
        'proxima-centauri',
        'sirius',
      ]);
      expect(extractUrlRouteStops('?route=')).toBeNull();
      expect(extractUrlRouteStops('')).toBeNull();
      expect(extractUrlRouteStops('?focus=sol')).toBeNull();
    });

    it('extracts journeyOption ID from URL query search strings', () => {
      expect(extractUrlJourneyOptionId('?route=sol,tau-ceti&journeyOption=fusion-01c')).toBe(
        'fusion-01c',
      );
      expect(extractUrlJourneyOptionId('?route=sol,tau-ceti')).toBeNull();
    });

    it('builds directions trigger href with Step 1 default origins (Sol / Earth) and preserves current view and search', () => {
      // Galaxy scope defaults origin to Sol
      expect(
        buildDirectionsTriggerHref({
          focusedId: 'tau-ceti',
          viewScope: 'galaxy',
        }),
      ).toBe('/galaxy/tau-ceti?route=sol,tau-ceti');

      // Galaxy scope when focused on Sol keeps Sol as origin (gated as coming-soon when opened)
      expect(
        buildDirectionsTriggerHref({
          focusedId: 'sol',
          viewScope: 'galaxy',
        }),
      ).toBe('/galaxy/sol?route=sol,sol');

      // Preserves currentPathname and currentSearch without loading a new top-level view
      expect(
        buildDirectionsTriggerHref({
          focusedId: 'tau-ceti',
          viewScope: 'galaxy',
          currentPathname: '/galaxy',
          currentSearch: '?q=tau&focus=tau-ceti',
        }),
      ).toBe('/galaxy?q=tau&focus=tau-ceti&route=sol,tau-ceti');

      // Intra-system target defaults origin to Earth
      expect(
        buildDirectionsTriggerHref({
          focusedId: 'mars',
          systemId: 'sol',
          viewScope: 'system',
        }),
      ).toBe('/system/sol?route=earth,mars');

      // Intra-system target Earth keeps Earth as origin (gated as coming-soon when opened)
      expect(
        buildDirectionsTriggerHref({
          focusedId: 'earth',
          systemId: 'sol',
          viewScope: 'system',
        }),
      ).toBe('/system/sol?route=earth,earth');
    });

    it('builds comprehensive interstellar JourneyPlan with relativistic options', () => {
      const plan = buildJourneyPlan({
        stops: ['sol', 'tau-ceti'],
        corpus: SAMPLE_BENCHMARK_CORPUS,
      });
      expect(plan).not.toBeNull();
      if (!plan) return;

      expect(plan.title).toBe('Sol → Tau Ceti');
      expect(plan.domain).toBe('interstellar');
      expect(plan.totalDistance?.unit).toBe('ly');
      expect(plan.totalDistance?.value).toBe('11.8');
      expect(plan.totalCommsOneWay?.unit).toBe('yr');
      expect(plan.totalCommsRoundTrip?.unit).toBe('yr');
      expect(plan.options.length).toBeGreaterThanOrEqual(3);
      expect(plan.options.map((o) => o.id)).toContain('torchship-1g');
      expect(plan.options.map((o) => o.id)).toContain('antimatter-0.1c');
      expect(plan.chordLegs).toHaveLength(1);
    });

    it('builds comprehensive intra-system JourneyPlan with brachistochrone and Hohmann options', () => {
      const plan = buildJourneyPlan({
        stops: ['earth', 'mars'],
        corpus: SAMPLE_BENCHMARK_CORPUS,
      });
      expect(plan).not.toBeNull();
      if (!plan) return;

      expect(plan.title).toBe('Earth → Mars');
      expect(plan.domain).toBe('intra-system');
      expect(plan.totalDistance?.unit).toBe('AU');
      expect(plan.totalDistance?.value).toBe('1.82');
      expect(plan.totalCommsOneWay?.unit).toBe('min');
      expect(plan.options.map((o) => o.id)).toContain('torchship-1g');
      expect(plan.options.map((o) => o.id)).toContain('hohmann-transfer');
    });

    it('supports multi-stop routes with cumulative distance and multiple chord legs', () => {
      const plan = buildJourneyPlan({
        stops: ['sol', 'proxima-centauri', 'sirius'],
        corpus: SAMPLE_BENCHMARK_CORPUS,
      });
      expect(plan).not.toBeNull();
      if (!plan) return;

      expect(plan.title).toBe('Sol → Proxima Centauri → Sirius');
      expect(plan.steps).toHaveLength(2);
      expect(plan.chordLegs).toHaveLength(2);
      expect(plan.focusedStopIds).toEqual(['sol', 'proxima-centauri', 'sirius']);
    });
  });

  describe('Part 4: Shared DetentSheet & DirectionsPanel DOM Rendering', () => {
    it('renders DetentSheet landmark aside with data-detent and heading', () => {
      const html = renderToString(
        createElement(DetentSheet, {
          testIdPrefix: 'directions',
          heading: 'Directions',
          activeDetent: 'partial',
          peek: <div>Route Overview</div>,
          partial: <div>Options List</div>,
        }),
      );

      expect(html).toContain('data-testid="directions-panel"');
      expect(html).toContain('data-detent="partial"');
      expect(html).toContain('<h2 id="directions-panel-heading">Directions</h2>');
      expect(html).toContain('data-testid="directions-detent-peek"');
      expect(html).toContain('data-testid="directions-detent-partial"');
      expect(html).toContain('Route Overview');
      expect(html).toContain('Options List');
    });

    it('renders DirectionsPanel in Options List mode when no option is selected', () => {
      const plan = buildJourneyPlan({
        stops: ['sol', 'tau-ceti'],
        corpus: SAMPLE_BENCHMARK_CORPUS,
      });

      const html = renderToString(createElement(DirectionsPanel, { journey: plan }));

      expect(html).toContain('data-testid="directions-panel"');
      expect(html).toContain('data-testid="directions-route-title"');
      expect(html).toContain('Sol → Tau Ceti');
      expect(html).toContain('data-testid="directions-total-distance"');
      expect(html).toContain('Total Distance');
      expect(html).toContain('data-testid="directions-comms-peek">');
      expect(html).toContain('One-Way Light Time');
      expect(html).toContain('Round-Trip Comms Lag');
      expect(html).toContain('data-testid="directions-close-button"');
      expect(html).toContain('data-testid="directions-options-list"');
      expect(html).toContain('data-testid="directions-option-item"');
      expect(html).toContain('data-testid="directions-option-select"');
      expect(html).toContain('data-testid="directions-geometry-list"');
      expect(html).toContain('data-data-table="true"');
      expect(html).toContain('>Leg<');
      expect(html).toContain('>Distance<');
      expect(html).toContain('>Geometry<');
      expect(html).toContain('data-testid="directions-geometry-leg"');
      expect(html).toContain('data-numeric="true"');
    });

    it('renders DirectionsPanel in Option Details mode when an option is selected', () => {
      const plan = buildJourneyPlan({
        stops: ['sol', 'tau-ceti'],
        selectedOptionId: 'rel-1g',
        corpus: SAMPLE_BENCHMARK_CORPUS,
      });

      const html = renderToString(createElement(DirectionsPanel, { journey: plan }));

      expect(html).toContain('data-testid="directions-selected-option-title"');
      expect(html).toContain('Option');
      expect(html).toContain('Transit Time');
      expect(html).toContain('data-testid="directions-selected-option-time"');
      expect(html).toContain('data-testid="directions-back-to-options"');
      expect(html).toContain('Back to options');
      expect(html).toContain('data-testid="directions-selected-option-summary"');
      expect(html).toContain('data-testid="directions-option-profile"');
      expect(html).toContain('data-testid="directions-option-telemetry-list"');
      expect(html).toContain('data-testid="directions-option-ship-time"');
      expect(html).toContain('data-testid="directions-option-coord-time"');
      expect(html).toContain('data-testid="directions-option-peak-velocity"');
      expect(html).toContain('data-testid="directions-option-gamma"');
      // Tier 1 interface primitives
      expect(html).toContain('data-testid="directions-stat-ship-time"');
      expect(html).toContain('data-testid="directions-stat-coord-time"');
      expect(html).toContain('data-testid="directions-stat-peak-velocity"');
      expect(html).toContain('data-testid="directions-stat-lorentz-gamma"');
      expect(html).toContain('data-datum="true"');
      expect(html).toContain('data-quantity="true"');
      expect(html).toContain('data-unit="true"');
    });

    it('renders structured quantities with Quantity and Unit components', () => {
      const rendered = renderToString(
        createElement(
          'div',
          null,
          renderStructuredQuantity({ value: '18.6', unit: 'yr' }, 'test-qty'),
        ),
      );
      expect(rendered).toContain('data-testid="test-qty"');
      expect(rendered).toContain('data-quantity="true"');
      expect(rendered).toContain('18.6');
      expect(rendered).toContain('yr');
    });

    it('renders DirectionsPanel in Coming Soon gated mode for unsupported route', () => {
      const plan = buildJourneyPlan({
        stops: ['sol', 'earth'],
        viewScope: 'galaxy',
        corpus: SAMPLE_BENCHMARK_CORPUS,
      });

      expect(plan).not.toBeNull();
      expect(plan?.status).toBe('coming-soon');
      expect(plan?.chordLegs).toEqual([]);

      const html = renderToString(createElement(DirectionsPanel, { journey: plan }));

      expect(html).toContain('data-testid="directions-panel"');
      expect(html).toContain('data-testid="directions-route-title"');
      expect(html).toContain('Sol → Earth');
      expect(html).toContain('data-testid="directions-coming-soon"');
      expect(html).toContain(plan?.statusReason);
      expect(html).toContain('data-testid="directions-close-button"');
      expect(html).not.toContain('data-testid="directions-options-list"');
    });
  });

  describe('Part 5: Multi-Focus, View & Canvas Routing Integration', () => {
    it('GalaxyView mounts DirectionsPanel and CanvasLayer with chord legs on route query', () => {
      const store = createSpatialEntityStore();
      const html = renderToString(
        createElement(
          SpatialEntityProvider,
          { store },
          createElement(GalaxyView, {
            initialCorpus: SAMPLE_BENCHMARK_CORPUS,
            locationPathname: '/galaxy',
            locationSearch: '?route=sol,tau-ceti',
          }),
        ),
      );

      expect(html).toContain('data-testid="galaxy-view-root"');
      expect(html).toContain('data-testid="directions-panel"');
      expect(html).not.toContain('data-testid="details-panel"');
      expect(html).toContain('data-testid="directions-route-title"');
      expect(html).toContain('Sol → Tau Ceti');
      expect(html).toContain('data-journey-legs-count="1"');
    });

    it('SystemView mounts DirectionsPanel on intra-system route query', () => {
      const store = createSpatialEntityStore();
      const html = renderToString(
        createElement(
          SpatialEntityProvider,
          { store },
          createElement(SystemView, {
            initialCorpus: SAMPLE_BENCHMARK_CORPUS,
            locationPathname: '/system/sol',
            locationSearch: '?route=earth,mars',
          }),
        ),
      );

      expect(html).toContain('data-testid="system-view-root"');
      expect(html).toContain('data-testid="directions-panel"');
      expect(html).not.toContain('data-testid="details-panel"');
      expect(html).toContain('Earth → Mars');
      expect(html).toContain('data-journey-legs-count="1"');
    });

    it('GalaxyView renders standard DetailsPanel when route is null', () => {
      const store = createSpatialEntityStore();
      const html = renderToString(
        createElement(
          SpatialEntityProvider,
          { store },
          createElement(GalaxyView, {
            initialCorpus: SAMPLE_BENCHMARK_CORPUS,
            locationPathname: '/galaxy/sol',
            locationSearch: '',
          }),
        ),
      );

      expect(html).toContain('data-testid="details-panel"');
      expect(html).not.toContain('data-testid="directions-panel"');
    });
  });

  describe('Part 6: Strict Classifications and Structured Telemetry in Details Services', () => {
    it('populates categoryKey on SystemElementBodyItem for moons, dwarf planets, spacecraft, and asteroids', () => {
      const moonCorpus: CompactSearchEntry[] = [
        ...SAMPLE_BENCHMARK_CORPUS,
        { i: 'luna', n: 'Moon', k: 3, s: 'sol', o: 'earth', p: [0, 0, 0] },
        { i: 'ceres', n: 'Ceres', k: 4, s: 'sol', p: [0, 0, 0] },
        { i: 'voyager-1', n: 'Voyager 1', k: 6, s: 'sol', p: [0, 0, 0], u: 'construct' },
      ];

      const moonSummary = buildSystemBodiesSummary({
        details: {
          id: 'sol',
          systemId: 'sol',
          systemName: 'Sol',
          stars: [],
          planets: [],
        } as any,
        corpus: moonCorpus,
      });

      expect(moonSummary).not.toBeNull();
      const luna = moonSummary?.moonsAndDwarfPlanets.find((m) => m.id === 'luna');
      expect(luna?.categoryKey).toBe('moon');
      expect(luna?.categoryLabel).toBe('Moon');

      const ceres = moonSummary?.moonsAndDwarfPlanets.find((m) => m.id === 'ceres');
      expect(ceres?.categoryKey).toBe('dwarf-planet');
      expect(ceres?.categoryLabel).toBe('Dwarf Planet');

      const voyager = moonSummary?.minorBodiesAndSpacecraft.find((m) => m.id === 'voyager-1');
      expect(voyager?.categoryKey).toBe('spacecraft');
      expect(voyager?.categoryLabel).toBe('Spacecraft');
    });

    it('populates minorBodyTelemetry.classification on focused minor bodies', () => {
      const ceresCorpus: readonly CompactSearchEntry[] = [
        ...SAMPLE_BENCHMARK_CORPUS,
        { i: 'ceres', n: 'Ceres', k: 4, s: 'sol', p: [0, 0, 0] },
      ];

      const details = buildFocusedEntityDetails({
        focusedEntity: {
          id: 'ceres',
          name: 'Ceres',
          classification: 'asteroid',
          position: [0, 0, 0],
        } as any,
        corpus: ceresCorpus,
      });

      expect(details?.focusedKind).toBe('minor-body');
      if (details?.focusedKind === 'minor-body') {
        expect(details.minorBodyTelemetry.classification).toBe('dwarf-planet');
        expect(details.minorBodyTelemetry.categoryLabel).toBe('Dwarf Planet');
      }
    });

    it('populates structureTelemetry.symbolType on focused deep-sky galactic structures', () => {
      const details = buildFocusedEntityDetails({
        focusedEntity: {
          id: 'pleiades',
          name: 'Pleiades',
          classification: 'cluster',
          position: [0, 0, 0],
        } as any,
        entityDetail: {
          kind: 'structure',
          record: {
            id: 'pleiades',
            name: 'Pleiades',
            type: 'OpenCluster',
            x: 0,
            y: 0,
            z: 0,
            dist: 136,
            radiusPc: 2.4,
            designations: ['M45'],
            description: 'Open cluster in Taurus.',
          },
        } as any,
      });

      expect(details?.focusedKind).toBe('structure');
      if (details?.focusedKind === 'structure') {
        expect(details.structureTelemetry.structureType).toBe('OpenCluster');
        expect(details.structureTelemetry.symbolType).toBe('stellar-cluster');
      }
    });
  });
});
