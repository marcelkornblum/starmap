import {
  PARSEC_TO_LY,
  computeEuclideanDistance3D,
  computeInterstellarRelativisticTransit,
  computeInterstellarConstantBetaTransit,
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

export function buildInterstellarStep(from: JourneyEndpoint, to: JourneyEndpoint, stepIndex: number): JourneyStep {
  const { distance: distancePc, dz } = computeEuclideanDistance3D(from.coordinatesPc, to.coordinatesPc);
  const distanceLy = distancePc * PARSEC_TO_LY;
  const deltaZPc = dz;
  const deltaZLy = dz * PARSEC_TO_LY;
  return {
    stepIndex,
    id: `${from.id}-${to.id}`,
    domain: 'interstellar',
    from,
    to,
    distancePc,
    distanceLy,
    deltaZPc,
    deltaZLy,
    oneWayLightTime: { value: Number(distanceLy.toFixed(1)), unit: 'yr' },
    roundTripLightTime: { value: Number((distanceLy * 2).toFixed(1)), unit: 'yr' },
    primaryDistance: {
      value: Number(distanceLy.toFixed(1)),
      unit: 'ly',
      secondaryValue: Number(distancePc.toFixed(2)),
      secondaryUnit: 'pc',
    },
    secondaryGeometry: {
      kind: 'elevation',
      deltaZ: {
        value: Number(deltaZPc.toFixed(2)),
        unit: 'pc',
        secondaryValue: Number(deltaZLy.toFixed(1)),
        secondaryUnit: 'ly',
      },
    },
  };
}

function mapInterstellarStepMetrics(
  steps: readonly JourneyStep[],
  calc: (distanceLy: number) => { shipTime: number; coordTime: number },
): readonly JourneyStepOptionMetrics[] {
  return steps.map((s) => {
    const t = calc(s.distanceLy ?? 0);
    return {
      stepIndex: s.stepIndex,
      stepId: s.id,
      fromName: s.from.name,
      toName: s.to.name,
      distance: s.primaryDistance,
      shipTime: { value: Number(t.shipTime.toFixed(1)), unit: 'yr' },
      coordinateTime: { value: Number(t.coordTime.toFixed(1)), unit: 'yr' },
      oneWayComms: s.oneWayLightTime,
    };
  });
}

type CommonInterstellarStats = Pick<
  JourneyOptionStats,
  'originLabel' | 'destinationLabel' | 'distancePrimary' | 'elevationOrRange' | 'oneWayComms' | 'roundTripComms'
>;

interface TorchshipConfig {
  readonly accelG: number;
  readonly id: string;
  readonly title: string;
  readonly methodBadge: string;
  readonly shortDesc: string;
  readonly profile: string;
}

function buildTorchshipOption(
  cfg: TorchshipConfig,
  totalDistanceLy: number,
  commonStats: CommonInterstellarStats,
  steps: readonly JourneyStep[],
  makeOptionHref: (optionId: string) => string,
): JourneyOption {
  const rel = computeInterstellarRelativisticTransit(totalDistanceLy, cfg.accelG);
  return {
    id: cfg.id,
    domain: 'interstellar',
    title: cfg.title,
    methodBadge: cfg.methodBadge,
    topSummaryTime: {
      value: Number(rel.shipProperTimeYears.toFixed(1)),
      unit: 'yr ship',
      secondaryValue: Number(rel.coordinateTimeYears.toFixed(1)),
      secondaryUnit: 'yr coord',
    },
    shortDescription: cfg.shortDesc,
    selectHref: makeOptionHref(cfg.id),
    stats: {
      ...commonStats,
      shipTime: { value: Number(rel.shipProperTimeYears.toFixed(2)), unit: 'years' },
      coordinateTime: { value: Number(rel.coordinateTimeYears.toFixed(2)), unit: 'years' },
      peakVelocity: {
        value: Number((rel.peakBetaC * 100).toFixed(2)),
        unit: '% c',
        secondaryValue: Math.round(rel.peakBetaC * 299792),
        secondaryUnit: 'km/s',
      },
      lorentzFactor: { value: Number(rel.peakLorentzGamma.toFixed(2)), unit: 'γ' },
      turnaroundPoint: { value: Number(rel.turnaroundDistanceLy.toFixed(2)), unit: 'ly' },
      propulsionProfile: cfg.profile,
    },
    stepMetrics: mapInterstellarStepMetrics(steps, (d) => {
      const stepTransit = computeInterstellarRelativisticTransit(d, cfg.accelG);
      return { shipTime: stepTransit.shipProperTimeYears, coordTime: stepTransit.coordinateTimeYears };
    }),
  };
}

interface ConstantBetaConfig {
  readonly betaC: number;
  readonly id: string;
  readonly title: string;
  readonly methodBadge: string;
  readonly shortDesc: string;
  readonly profile: string;
  readonly topTime: StructuredQuantity;
  readonly peakSec: number;
}

function buildConstantBetaOption(
  cfg: ConstantBetaConfig,
  totalDistanceLy: number,
  commonStats: CommonInterstellarStats,
  steps: readonly JourneyStep[],
  makeOptionHref: (optionId: string) => string,
): JourneyOption {
  const cruise = computeInterstellarConstantBetaTransit(totalDistanceLy, cfg.betaC);
  return {
    id: cfg.id,
    domain: 'interstellar',
    title: cfg.title,
    methodBadge: cfg.methodBadge,
    topSummaryTime: cfg.topTime,
    shortDescription: cfg.shortDesc,
    selectHref: makeOptionHref(cfg.id),
    stats: {
      ...commonStats,
      shipTime: { value: Number(cruise.shipProperTimeYears.toFixed(1)), unit: 'years' },
      coordinateTime: { value: Number(cruise.coordinateTimeYears.toFixed(1)), unit: 'years' },
      peakVelocity: { value: cfg.betaC, unit: 'c', secondaryValue: cfg.peakSec, secondaryUnit: 'km/s' },
      lorentzFactor: { value: Number(cruise.lorentzGamma.toFixed(3)), unit: 'γ' },
      propulsionProfile: cfg.profile,
    },
    stepMetrics: mapInterstellarStepMetrics(steps, (d) => {
      const stepTransit = computeInterstellarConstantBetaTransit(d, cfg.betaC);
      return { shipTime: stepTransit.shipProperTimeYears, coordTime: stepTransit.coordinateTimeYears };
    }),
  };
}

export function buildInterstellarOptions(
  steps: readonly JourneyStep[],
  totalDistanceLy: number,
  originLabel: string,
  destinationLabel: string,
  makeOptionHref: (optionId: string) => string,
): readonly JourneyOption[] {
  const totalDistancePc = totalDistanceLy / PARSEC_TO_LY;
  const distancePrimary: StructuredQuantity = {
    value: Number(totalDistanceLy.toFixed(1)),
    unit: 'ly',
    secondaryValue: Number(totalDistancePc.toFixed(2)),
    secondaryUnit: 'pc',
  };
  const firstStep = steps[0];
  const elevationOrRange: JourneyOptionElevationOrRange =
    steps.length === 1 && firstStep
      ? { kind: 'single-leg', geometry: firstStep.secondaryGeometry }
      : { kind: 'multi-leg', legCount: steps.length, domain: 'interstellar' };

  const commonStats: CommonInterstellarStats = {
    originLabel,
    destinationLabel,
    distancePrimary,
    elevationOrRange,
    oneWayComms: { value: Number(totalDistanceLy.toFixed(1)), unit: 'yr' },
    roundTripComms: { value: Number((totalDistanceLy * 2).toFixed(1)), unit: 'yr' },
  };

  const am10 = computeInterstellarConstantBetaTransit(totalDistanceLy, 0.10);
  const fus05 = computeInterstellarConstantBetaTransit(totalDistanceLy, 0.05);

  return [
    {
      id: 'light-speed',
      domain: 'interstellar',
      title: 'Light-Speed Signal (1.0c)',
      methodBadge: 'Signal (1.0c)',
      topSummaryTime: { value: Number(totalDistanceLy.toFixed(1)), unit: 'yr' },
      shortDescription: 'Electromagnetic laser / RF carrier at universal light speed c.',
      selectHref: makeOptionHref('light-speed'),
      stats: {
        ...commonStats,
        shipTime: { value: 'instantaneous', unit: '(photon frame)' },
        coordinateTime: { value: Number(totalDistanceLy.toFixed(1)), unit: 'yr' },
        peakVelocity: { value: 1.0, unit: 'c', secondaryValue: 299792, secondaryUnit: 'km/s' },
        lorentzFactor: { value: 'infinite', unit: '(singular)' },
        propulsionProfile: 'High-gain phased optical laser array / interstellar carrier',
      },
      stepMetrics: mapInterstellarStepMetrics(steps, (d) => ({ shipTime: 0, coordTime: d })),
    },
    buildTorchshipOption(
      { accelG: 1.0, id: 'torchship-1g', title: '1g Relativistic Torchship', methodBadge: '1g Continuous Burn', shortDesc: 'Continuous 1.0g acceleration to midpoint followed by flip-and-burn deceleration.', profile: 'Antimatter-catalyzed fusion / magnetic scoop continuous 1g torch' },
      totalDistanceLy, commonStats, steps, makeOptionHref,
    ),
    buildTorchshipOption(
      { accelG: 0.5, id: 'torchship-0.5g', title: '0.5g High-Efficiency Torchship', methodBadge: '0.5g Economy Burn', shortDesc: 'Sustained 0.5g continuous burn balancing reaction mass consumption and transit time.', profile: 'Dual-mode fusion pulse drive with 0.5g constant acceleration' },
      totalDistanceLy, commonStats, steps, makeOptionHref,
    ),
    buildConstantBetaOption(
      { betaC: 0.10, id: 'antimatter-0.1c', title: '0.10c Antimatter / Beamed Sail', methodBadge: '0.10c Cruise', shortDesc: 'Laser-pushed relativistic sail or antimatter rocket cruising at 10% light speed.', profile: 'Directed laser sail deployment with magnetodynamic deceleration', topTime: { value: Number(am10.coordinateTimeYears.toFixed(1)), unit: 'yr' }, peakSec: 29979 },
      totalDistanceLy, commonStats, steps, makeOptionHref,
    ),
    buildConstantBetaOption(
      { betaC: 0.05, id: 'fusion-0.05c', title: '0.05c Fusion Drive', methodBadge: '0.05c Cruise', shortDesc: 'Inertial confinement magnetic fusion torch cruising at 5% light speed.', profile: 'Deuterium-Helium-3 pulsed magnetic fusion rocket', topTime: { value: Math.round(fus05.coordinateTimeYears), unit: 'yr' }, peakSec: 14990 },
      totalDistanceLy, commonStats, steps, makeOptionHref,
    ),
  ];
}
