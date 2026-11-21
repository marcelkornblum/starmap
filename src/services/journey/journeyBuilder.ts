import { PARSEC_TO_LY, AU_TO_KM, AU_TO_LIGHT_MINUTES } from '../../utils/transitDynamics';
import type { JourneyChordLeg } from '../../types/spatial';
import type {
  BuildJourneyPlanInput,
  JourneyDomain,
  JourneyOption,
  JourneyPlan,
  JourneyStep,
  StructuredQuantity,
} from './journeyTypes';
import {
  buildJourneyClearOptionHref,
  buildJourneyCloseHref,
  buildJourneyOptionHref,
} from './journeyProfilesAndUrls';
import { resolveEndpoint } from './journeyTargetResolution';
import { buildInterstellarOptions, buildInterstellarStep } from './journeyInterstellar';
import { buildIntraSystemOptions, buildIntraSystemStep } from './journeyIntraSystem';

function buildChordLegs(
  domain: JourneyDomain,
  steps: readonly JourneyStep[],
  selectedOption: JourneyOption | null,
): readonly JourneyChordLeg[] {
  return steps.map((step) => {
    const fromPos = domain === 'interstellar' ? step.from.coordinatesPc : step.from.position3D;
    const toPos = domain === 'interstellar' ? step.to.coordinatesPc : step.to.position3D;
    const distText =
      step.primaryDistance.secondaryValue !== undefined && step.primaryDistance.secondaryUnit
        ? `${step.primaryDistance.value} ${step.primaryDistance.unit} (${step.primaryDistance.secondaryValue} ${step.primaryDistance.secondaryUnit})`
        : `${step.primaryDistance.value} ${step.primaryDistance.unit}`;

    return {
      id: step.id,
      stepIndex: step.stepIndex,
      fromId: step.from.id,
      fromName: step.from.name,
      fromPosition: fromPos,
      toId: step.to.id,
      toName: step.to.name,
      toPosition: toPos,
      distanceLabel: distText,
      secondaryLabel: selectedOption?.methodBadge,
      methodId: selectedOption?.id,
      lineStyle: selectedOption?.id.includes('fusion') || selectedOption?.id.includes('antimatter') ? 'dashed' : 'solid',
      originId: step.from.id,
      originName: step.from.name,
      originPos: fromPos,
      targetId: step.to.id,
      targetName: step.to.name,
      targetPos: toPos,
      domain,
      distanceLy: step.distanceLy,
      distanceAu: step.distanceAuMean,
      methodBadge: selectedOption?.methodBadge,
    };
  });
}

/**
 * Pure domain builder constructing a JourneyPlan from route stops and active view state.
 */
export function buildJourneyPlan(input: BuildJourneyPlanInput): JourneyPlan | null {
  const routeStopIds = input.stops ?? input.routeStopIds ?? [];
  const corpusEntries = input.corpus ?? input.corpusEntries;
  const { selectedOptionId, domainOverride, currentPathname = '', currentSearch = '', systemDetail, summaryNode } = input;

  if (!routeStopIds || routeStopIds.length < 2) return null;

  const stops = routeStopIds.map((id) => resolveEndpoint(id, corpusEntries, systemDetail, summaryNode));
  const firstStop = stops[0];
  const lastStop = stops[stops.length - 1];
  if (!firstStop || !lastStop) return null;
  const allSameSystem = stops.every((s) => s.systemId === firstStop.systemId);
  const domain: JourneyDomain =
    domainOverride ??
    (((input.viewScope === 'system' || input.viewScope === 'planet') && allSameSystem) ||
    (allSameSystem && stops.some((s) => s.entityKind === 'planet' || s.entityKind === 'minor-body'))
      ? 'intra-system'
      : 'interstellar');

  const viewScope = input.viewScope ?? (domain === 'intra-system' ? 'system' : 'galaxy');
  const clearOptionHref = buildJourneyClearOptionHref(currentPathname, currentSearch, routeStopIds);
  const closeHref = buildJourneyCloseHref(currentPathname, currentSearch);

  let status: 'ready' | 'coming-soon' = 'ready';
  let statusReason: string | undefined = undefined;

  const hasSelfLoop = stops.some((s, idx) => {
    const prev = idx > 0 ? stops[idx - 1] : undefined;
    return prev !== undefined && s.id === prev.id;
  });
  if (hasSelfLoop) {
    status = 'coming-soon';
    statusReason = 'Origin and destination are identical.';
  } else if (viewScope === 'galaxy') {
    const nonSystemStop = stops.find((s) => s.entityKind !== 'system' && s.entityKind !== 'star');
    if (nonSystemStop) {
      status = 'coming-soon';
      statusReason = 'Routes at the galaxy level are currently supported between star systems only.';
    }
  } else if (viewScope === 'system') {
    if (!allSameSystem) {
      status = 'coming-soon';
      statusReason = 'Cross-system planetary routes and non-Sol/Earth origins are coming soon.';
    }
  } else if (viewScope === 'planet') {
    status = 'coming-soon';
    statusReason = 'Surface planetary routing is coming soon.';
  }

  if (domain === 'intra-system' && status === 'ready') {
    const missingSmaStop = stops.find((s) => typeof s.semiMajorAxisAu !== 'number' || s.semiMajorAxisAu <= 0);
    if (missingSmaStop) {
      status = 'coming-soon';
      statusReason = `Orbital telemetry (semi-major axis) is unavailable for ${missingSmaStop.name}.`;
    }
  }

  if (status === 'coming-soon') {
    return {
      status,
      statusReason,
      domain,
      stops,
      steps: [],
      chordLegs: [],
      options: [],
      selectedOption: null,
      title: stops.map((s) => s.name).join(' → '),
      totalDistance: undefined,
      totalCommsOneWay: undefined,
      totalCommsRoundTrip: undefined,
      clearOptionHref,
      closeHref,
      focusedStopIds: [],
    };
  }

  const steps: JourneyStep[] = [];
  let totalDistanceLy = 0;
  let totalDistanceAu = 0;

  for (let i = 0; i < stops.length - 1; i++) {
    const fromStop = stops[i];
    const toStop = stops[i + 1];
    if (!fromStop || !toStop) continue;
    const step = domain === 'interstellar'
      ? buildInterstellarStep(fromStop, toStop, i)
      : buildIntraSystemStep(fromStop, toStop, i);
    steps.push(step);
    if (domain === 'interstellar') {
      totalDistanceLy += step.distanceLy ?? 0;
    } else {
      totalDistanceAu += step.distanceAuMean ?? 0;
    }
  }

  const makeOptionHref = (optionId: string) => buildJourneyOptionHref(currentPathname, currentSearch, routeStopIds, optionId);
  const originLabel = firstStop.name;
  const destinationLabel = lastStop.name;

  const options: JourneyOption[] = domain === 'interstellar'
    ? [...buildInterstellarOptions(steps, totalDistanceLy, originLabel, destinationLabel, makeOptionHref)]
    : [...buildIntraSystemOptions(steps, totalDistanceAu, originLabel, destinationLabel, stops, makeOptionHref)];

  const selectedOption = selectedOptionId ? (options.find((opt) => opt.id === selectedOptionId) ?? null) : null;
  const chordLegs = buildChordLegs(domain, steps, selectedOption);

  const totalDistance: StructuredQuantity = domain === 'interstellar'
    ? { value: Number(totalDistanceLy.toFixed(1)), unit: 'ly', secondaryValue: Number((totalDistanceLy / PARSEC_TO_LY).toFixed(2)), secondaryUnit: 'pc' }
    : { value: Number(totalDistanceAu.toFixed(2)), unit: 'AU', secondaryValue: Number(((totalDistanceAu * AU_TO_KM) / 1e6).toFixed(1)), secondaryUnit: 'M km' };

  const totalCommsOneWay: StructuredQuantity = domain === 'interstellar'
    ? { value: Number(totalDistanceLy.toFixed(1)), unit: 'yr' }
    : { value: Number((totalDistanceAu * AU_TO_LIGHT_MINUTES).toFixed(1)), unit: 'min' };

  const totalCommsRoundTrip: StructuredQuantity = domain === 'interstellar'
    ? { value: Number((totalDistanceLy * 2).toFixed(1)), unit: 'yr' }
    : { value: Number((totalDistanceAu * AU_TO_LIGHT_MINUTES * 2).toFixed(1)), unit: 'min' };

  return {
    status: 'ready',
    domain,
    stops,
    steps,
    chordLegs,
    options,
    selectedOption,
    title: stops.map((s) => s.name).join(' → '),
    totalDistance,
    totalCommsOneWay,
    totalCommsRoundTrip,
    clearOptionHref,
    closeHref,
    focusedStopIds: stops.map((s) => s.id),
  };
}
