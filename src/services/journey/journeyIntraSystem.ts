import {
  AU_TO_KM,
  AU_TO_LIGHT_MINUTES,
  computeIntraSystemBrachistochroneTransit,
  computeHohmannTransferOrbit,
} from '../../utils/transitDynamics';
import type {
  JourneyEndpoint,
  JourneyOption,
  JourneyOptionElevationOrRange,
  JourneyOptionStats,
  JourneyStep,
  JourneyStepOptionMetrics,
  StructuredQuantity,
} from './journeyTypes';

export function buildIntraSystemStep(from: JourneyEndpoint, to: JourneyEndpoint, stepIndex: number): JourneyStep {
  if (typeof from.semiMajorAxisAu !== 'number' || typeof to.semiMajorAxisAu !== 'number' || from.semiMajorAxisAu <= 0 || to.semiMajorAxisAu <= 0) {
    throw new Error(`Missing or non-positive orbital semi-major axis telemetry for intra-system leg between ${from.name} and ${to.name}.`);
  }
  const r1 = from.semiMajorAxisAu;
  const r2 = to.semiMajorAxisAu;
  const dMin = Math.abs(r1 - r2);
  const dMax = r1 + r2;
  const dMean = Math.sqrt(r1 * r1 + r2 * r2);
  const lightMinMean = dMean * AU_TO_LIGHT_MINUTES;

  return {
    stepIndex,
    id: `${from.id}-${to.id}`,
    domain: 'intra-system',
    from,
    to,
    distanceAuMean: dMean,
    distanceAuMin: dMin,
    distanceAuMax: dMax,
    oneWayLightTime: { value: Number(lightMinMean.toFixed(1)), unit: 'min' },
    roundTripLightTime: { value: Number((lightMinMean * 2).toFixed(1)), unit: 'min' },
    primaryDistance: {
      value: Number(dMean.toFixed(2)),
      unit: 'AU',
      secondaryValue: Number(((dMean * AU_TO_KM) / 1e6).toFixed(1)),
      secondaryUnit: 'M km',
    },
    secondaryGeometry: {
      kind: 'orbital-range',
      min: { value: Number(dMin.toFixed(2)), unit: 'AU', secondaryValue: Number(((dMin * AU_TO_KM) / 1e6).toFixed(1)), secondaryUnit: 'M km' },
      max: { value: Number(dMax.toFixed(2)), unit: 'AU', secondaryValue: Number(((dMax * AU_TO_KM) / 1e6).toFixed(1)), secondaryUnit: 'M km' },
    },
  };
}

function mapIntraSystemTorchMetrics(
  steps: readonly JourneyStep[],
  accelG: number,
): readonly JourneyStepOptionMetrics[] {
  return steps.map((s) => {
    const stepTransit = computeIntraSystemBrachistochroneTransit(s.distanceAuMean ?? 0, accelG);
    return {
      stepIndex: s.stepIndex,
      stepId: s.id,
      fromName: s.from.name,
      toName: s.to.name,
      distance: s.primaryDistance,
      shipTime: { value: Number(stepTransit.transitDays.toFixed(1)), unit: 'd' },
      coordinateTime: { value: Number(stepTransit.transitDays.toFixed(1)), unit: 'd' },
      oneWayComms: s.oneWayLightTime,
    };
  });
}

type CommonIntraSystemStats = Pick<
  JourneyOptionStats,
  'originLabel' | 'destinationLabel' | 'distancePrimary' | 'elevationOrRange'
>;

interface IntraTorchConfig {
  readonly accelG: number;
  readonly id: string;
  readonly title: string;
  readonly methodBadge: string;
  readonly shortDesc: string;
  readonly profile: string;
}

function buildIntraTorchOption(
  cfg: IntraTorchConfig,
  totalDistanceAu: number,
  totalLightMinMean: number,
  commonStats: CommonIntraSystemStats,
  steps: readonly JourneyStep[],
  makeOptionHref: (optionId: string) => string,
): JourneyOption {
  const b = computeIntraSystemBrachistochroneTransit(totalDistanceAu, cfg.accelG);
  return {
    id: cfg.id,
    domain: 'intra-system',
    title: cfg.title,
    methodBadge: cfg.methodBadge,
    topSummaryTime: { value: Number(b.transitDays.toFixed(1)), unit: 'days' },
    shortDescription: cfg.shortDesc,
    selectHref: makeOptionHref(cfg.id),
    stats: {
      ...commonStats,
      shipTime: { value: Number(b.transitDays.toFixed(2)), unit: 'days', secondaryValue: Number(b.transitHours.toFixed(1)), secondaryUnit: 'hours' },
      coordinateTime: { value: Number(b.transitDays.toFixed(2)), unit: 'days' },
      oneWayComms: { value: Number(totalLightMinMean.toFixed(1)), unit: 'min' },
      roundTripComms: { value: Number((totalLightMinMean * 2).toFixed(1)), unit: 'min' },
      peakVelocity: { value: Math.round(b.peakVelocityKms), unit: 'km/s' },
      turnaroundPoint: { value: Number((totalDistanceAu / 2).toFixed(2)), unit: 'AU' },
      deltaV: { value: Math.round(b.deltaVKms), unit: 'km/s' },
      propulsionProfile: cfg.profile,
    },
    stepMetrics: mapIntraSystemTorchMetrics(steps, cfg.accelG),
  };
}

export function buildIntraSystemOptions(
  steps: readonly JourneyStep[],
  totalDistanceAu: number,
  originLabel: string,
  destinationLabel: string,
  stops: readonly JourneyEndpoint[],
  makeOptionHref: (optionId: string) => string,
): readonly JourneyOption[] {
  const distancePrimary: StructuredQuantity = {
    value: Number(totalDistanceAu.toFixed(2)),
    unit: 'AU',
    secondaryValue: Number(((totalDistanceAu * AU_TO_KM) / 1e6).toFixed(1)),
    secondaryUnit: 'M km',
  };
  const elevationOrRange: JourneyOptionElevationOrRange =
    steps.length === 1
      ? { kind: 'single-leg', geometry: steps[0].secondaryGeometry }
      : { kind: 'multi-leg', legCount: steps.length, domain: 'intra-system' };

  const commonStats: CommonIntraSystemStats = { originLabel, destinationLabel, distancePrimary, elevationOrRange };
  const totalLightMinMean = totalDistanceAu * AU_TO_LIGHT_MINUTES;

  const r1 = stops[0].semiMajorAxisAu;
  const r2 = stops[stops.length - 1].semiMajorAxisAu;
  if (typeof r1 !== 'number' || typeof r2 !== 'number' || r1 <= 0 || r2 <= 0) {
    throw new Error(
      `Missing or non-positive orbital semi-major axis telemetry for Hohmann transfer between ${stops[0].name} and ${stops[stops.length - 1].name}.`,
    );
  }
  const hohmann = computeHohmannTransferOrbit(r1, r2, 1.0);

  return [
    {
      id: 'light-speed',
      domain: 'intra-system',
      title: 'Light-Speed Signal (1.0c)',
      methodBadge: 'RF/Laser Comms',
      topSummaryTime: { value: Number(totalLightMinMean.toFixed(1)), unit: 'min' },
      shortDescription: 'Planetary optical / microwave telemetry at light speed.',
      selectHref: makeOptionHref('light-speed'),
      stats: {
        ...commonStats,
        shipTime: { value: 0, unit: 's' },
        coordinateTime: { value: Number(totalLightMinMean.toFixed(1)), unit: 'min' },
        oneWayComms: { value: Number(totalLightMinMean.toFixed(1)), unit: 'min' },
        roundTripComms: { value: Number((totalLightMinMean * 2).toFixed(1)), unit: 'min' },
        peakVelocity: { value: 1.0, unit: 'c', secondaryValue: 299792, secondaryUnit: 'km/s' },
        propulsionProfile: 'Interplanetary laser relay array',
      },
      stepMetrics: steps.map((s) => ({
        stepIndex: s.stepIndex,
        stepId: s.id,
        fromName: s.from.name,
        toName: s.to.name,
        distance: s.primaryDistance,
        shipTime: { value: 0, unit: 's' },
        coordinateTime: s.oneWayLightTime,
        oneWayComms: s.oneWayLightTime,
      })),
    },
    buildIntraTorchOption(
      { accelG: 1.0, id: 'torchship-1g', title: '1g Brachistochrone Torchship', methodBadge: '1g Continuous Burn', shortDesc: 'High-thrust continuous 1.0g flip-and-burn brachistochrone trajectory.', profile: 'High-density antimatter torch / magnetic pinch drive' },
      totalDistanceAu, totalLightMinMean, commonStats, steps, makeOptionHref,
    ),
    buildIntraTorchOption(
      { accelG: 0.1, id: 'torchship-0.1g', title: '0.1g Continuous Fusion Torch', methodBadge: '0.1g Economy Burn', shortDesc: 'Continuous 0.1g acceleration for cargo and commercial passenger liners.', profile: 'Magnetoplasmadynamic gas-core nuclear fusion torch' },
      totalDistanceAu, totalLightMinMean, commonStats, steps, makeOptionHref,
    ),
    {
      id: 'hohmann-transfer',
      domain: 'intra-system',
      title: 'Hohmann Ballistic Transfer',
      methodBadge: 'Ballistic Hohmann',
      topSummaryTime: {
        value: Math.round(hohmann.transitDays),
        unit: 'days',
        secondaryValue: Number(hohmann.transitMonths.toFixed(1)),
        secondaryUnit: 'mo',
      },
      shortDescription: 'Minimum-energy semi-elliptical Keplerian orbit connecting planetary spheres.',
      selectHref: makeOptionHref('hohmann-transfer'),
      stats: {
        ...commonStats,
        shipTime: { value: Math.round(hohmann.transitDays), unit: 'days', secondaryValue: Number(hohmann.transitMonths.toFixed(1)), secondaryUnit: 'months' },
        coordinateTime: { value: Math.round(hohmann.transitDays), unit: 'days' },
        oneWayComms: { value: Number(totalLightMinMean.toFixed(1)), unit: 'min' },
        roundTripComms: { value: Number((totalLightMinMean * 2).toFixed(1)), unit: 'min' },
        peakVelocity: { value: Number(Math.max(hohmann.deltaVDepartureKms, hohmann.deltaVArrivalKms).toFixed(2)), unit: 'km/s' },
        departureVelocity: { value: Number(hohmann.deltaVDepartureKms.toFixed(2)), unit: 'km/s' },
        arrivalVelocity: { value: Number(hohmann.deltaVArrivalKms.toFixed(2)), unit: 'km/s' },
        turnaroundPoint: { value: Number(hohmann.semiMajorAxisTransferAu.toFixed(3)), unit: 'AU' },
        deltaV: { value: Number(hohmann.totalDeltaVKms.toFixed(2)), unit: 'km/s' },
        synodicPeriod: hohmann.synodicPeriodDays
          ? { value: Number((hohmann.synodicPeriodDays / 30.4375).toFixed(1)), unit: 'months', secondaryValue: Math.round(hohmann.synodicPeriodDays), secondaryUnit: 'days' }
          : undefined,
        propulsionProfile: 'Ballistic coast with chemical / ion departure and orbital insertion burns',
      },
      stepMetrics: steps.map((s) => ({
        stepIndex: s.stepIndex,
        stepId: s.id,
        fromName: s.from.name,
        toName: s.to.name,
        distance: s.primaryDistance,
        shipTime: { value: Math.round(hohmann.transitDays), unit: 'd' },
        coordinateTime: { value: Math.round(hohmann.transitDays), unit: 'd' },
        oneWayComms: s.oneWayLightTime,
      })),
    },
  ];
}
