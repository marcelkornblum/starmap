/**
 * DEC-033: Dedicated Journey Service
 * Authoritative service for route finding, relativistic interstellar transits,
 * intra-system brachistochrone torches, Hohmann transfer orbits, and 3D chord representation.
 */

import {
  PARSEC_TO_LY,
  AU_TO_KM,
  AU_TO_LIGHT_MINUTES,
  computeEuclideanDistance3D,
  computeInterstellarRelativisticTransit,
  computeInterstellarConstantBetaTransit,
  computeIntraSystemBrachistochroneTransit,
  computeHohmannTransferOrbit,
} from '../utils/astroMath';
import type { JourneyChordLeg } from '../components/canvas/cartography/journeyChordGeometry';
import {
  getCachedDetailRecord,
  getCachedSummaryNode,
} from '../data/detailsRepository';
import type { CompactSearchEntry } from '../utils/compactDataCodec';
import type { SystemSummaryNode } from '../types/astro';
import { toUrlSlug } from './searchService';

export const DEFAULT_INTERSTELLAR_ORIGIN_ID = 'sol';
export const DEFAULT_INTRA_SYSTEM_ORIGIN_ID = 'earth';

export type JourneyDomain = 'interstellar' | 'intra-system';

export interface JourneyEndpoint {
  readonly id: string;
  readonly name: string;
  readonly systemId: string;
  readonly systemName: string;
  readonly entityKind: 'system' | 'star' | 'planet' | 'minor-body' | 'structure';
  readonly coordinatesPc: readonly [number, number, number];
  readonly semiMajorAxisAu?: number;
  readonly periodDays?: number;
  readonly position3D: readonly [number, number, number];
}

export interface JourneyStep {
  readonly stepIndex: number;
  readonly id: string;
  readonly domain: JourneyDomain;
  readonly from: JourneyEndpoint;
  readonly to: JourneyEndpoint;
  readonly distancePc?: number;
  readonly distanceLy?: number;
  readonly deltaZPc?: number;
  readonly deltaZLy?: number;
  readonly distanceAuMean?: number;
  readonly distanceAuMin?: number;
  readonly distanceAuMax?: number;
  readonly oneWayLightTimeLabel: string;
  readonly roundTripLightTimeLabel: string;
  readonly primaryDistanceLabel: string;
  readonly secondaryGeometryLabel: string;
}

export interface JourneyStepOptionMetrics {
  readonly stepIndex: number;
  readonly stepId: string;
  readonly fromName: string;
  readonly toName: string;
  readonly distanceLabel: string;
  readonly shipTimeLabel: string;
  readonly coordinateTimeLabel: string;
  readonly oneWayCommsLabel: string;
}

export interface JourneyOptionStats {
  readonly originLabel: string;
  readonly destinationLabel: string;
  readonly distancePrimaryLabel: string;
  readonly elevationOrRangeLabel: string;
  readonly shipTimeLabel: string;
  readonly coordinateTimeLabel: string;
  readonly oneWayCommsLabel: string;
  readonly roundTripCommsLabel: string;
  readonly peakVelocityLabel: string;
  readonly lorentzFactorLabel?: string;
  readonly turnaroundPointLabel?: string;
  readonly deltaVLabel?: string;
  readonly synodicPeriodLabel?: string;
  readonly propulsionProfile: string;
}

export interface JourneyOption {
  readonly id: string;
  readonly domain: JourneyDomain;
  readonly title: string;
  readonly methodBadge: string;
  readonly topSummaryTime: string;
  readonly shortDescription: string;
  readonly selectHref: string;
  readonly stats: JourneyOptionStats;
  readonly stepMetrics: readonly JourneyStepOptionMetrics[];
}

export interface JourneyPlan {
  readonly status: 'ready' | 'coming-soon';
  readonly statusReason?: string;
  readonly domain: JourneyDomain;
  readonly stops: readonly JourneyEndpoint[];
  readonly steps: readonly JourneyStep[];
  readonly chordLegs: readonly JourneyChordLeg[];
  readonly options: readonly JourneyOption[];
  readonly selectedOption: JourneyOption | null;
  readonly title: string;
  readonly totalDistanceLabel: string;
  readonly totalCommsOneWayLabel: string;
  readonly totalCommsRoundTripLabel: string;
  readonly clearOptionHref: string;
  readonly closeHref: string;
  readonly focusedStopIds: readonly string[];
}

/**
 * Extracts route stops from URL search string (?route=sol,tau-ceti).
 * If a single stop is provided, prepends the default Step 1 origin based on scope.
 */
export function extractUrlRouteStops(
  searchString: string,
  viewScope: 'galaxy' | 'system' | 'planet' = 'galaxy',
): readonly string[] | null {
  if (!searchString) return null;
  const query = searchString.startsWith('?') ? searchString.slice(1) : searchString;
  const params = new URLSearchParams(query);
  const routeParam = params.get('route');
  if (!routeParam) return null;

  const rawStops = routeParam
    .split(',')
    .map((s) => toUrlSlug(s.trim()))
    .filter((s) => s.length > 0);

  if (rawStops.length === 0) {
    return null;
  }

  if (rawStops.length === 1) {
    const singleStop = rawStops[0];
    const defaultOrigin =
      viewScope === 'system' || viewScope === 'planet'
        ? DEFAULT_INTRA_SYSTEM_ORIGIN_ID
        : DEFAULT_INTERSTELLAR_ORIGIN_ID;
    return [defaultOrigin, singleStop];
  }

  return rawStops;
}

/**
 * Extracts journeyOption ID from URL search string (?journeyOption=torchship-1g).
 */
export function extractUrlJourneyOptionId(searchString: string): string | null {
  if (!searchString) return null;
  const query = searchString.startsWith('?') ? searchString.slice(1) : searchString;
  const params = new URLSearchParams(query);
  const optionId = params.get('journeyOption');
  return optionId && optionId.trim().length > 0 ? optionId.trim() : null;
}

/**
 * Builds the Directions trigger URL when a user clicks the Directions button.
 * Only defaults the Step 1 origin to Sol (galaxy) or Earth (system/planet).
 * Preserves the current top-level view pathname and existing search parameters.
 */
export function buildDirectionsTriggerHref(input: {
  readonly viewScope: 'galaxy' | 'system' | 'planet';
  readonly focusedId: string;
  readonly systemId?: string;
  readonly focusedKind?: 'system' | 'star' | 'planet' | 'belt' | 'minor-body' | 'structure';
  readonly currentPathname?: string;
  readonly currentSearch?: string;
  readonly hasExplicitFocus?: boolean;
  readonly explicitOriginId?: string;
}): string {
  const {
    viewScope,
    focusedId,
    systemId,
    currentPathname,
    currentSearch = '',
    hasExplicitFocus = false,
    explicitOriginId,
  } = input;

  const targetId = toUrlSlug(focusedId || systemId || '');

  const originId =
    explicitOriginId ??
    (viewScope === 'galaxy'
      ? DEFAULT_INTERSTELLAR_ORIGIN_ID
      : DEFAULT_INTRA_SYSTEM_ORIGIN_ID);

  const basePath =
    currentPathname && currentPathname.length > 0
      ? currentPathname
      : viewScope === 'galaxy'
        ? `/galaxy/${encodeURIComponent(systemId || targetId)}`
        : viewScope === 'system'
          ? `/system/${encodeURIComponent(systemId || targetId)}`
          : `/planet/${encodeURIComponent(targetId)}`;

  const searchParams = new URLSearchParams(
    currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch,
  );

  if (
    hasExplicitFocus &&
    targetId &&
    toUrlSlug(systemId ?? '') !== targetId &&
    !searchParams.has('focus')
  ) {
    searchParams.set('focus', targetId);
  }

  searchParams.set('route', `${originId},${targetId}`);
  searchParams.delete('journeyOption');

  const queryString = searchParams.toString().replace(/%2C/gi, ',');
  return `${basePath}${queryString ? `?${queryString}` : ''}`;
}

export interface BuildJourneyPlanInput {
  readonly routeStopIds?: readonly string[];
  readonly stops?: readonly string[];
  readonly selectedOptionId?: string | null;
  readonly viewScope?: 'galaxy' | 'system' | 'planet';
  readonly domainOverride?: JourneyDomain;
  readonly currentPathname?: string;
  readonly currentSearch?: string;
  readonly corpusEntries?: readonly CompactSearchEntry[];
  readonly corpus?: readonly CompactSearchEntry[];
  readonly systemDetail?: { kind: string; record?: unknown } | null;
  readonly summaryNode?: SystemSummaryNode | null;
  readonly systemNodes?: readonly SystemSummaryNode[];
}

/**
 * Resolves a stop ID into a strongly typed JourneyEndpoint using runtime catalog data,
 * cached summary/detail shards, and standard astronomical fixtures.
 */
function resolveEndpoint(
  stopId: string,
  corpusEntries?: readonly CompactSearchEntry[],
  systemDetail?: { kind: string; record?: unknown } | null,
  summaryNode?: SystemSummaryNode | null,
): JourneyEndpoint {
  const slug = toUrlSlug(stopId);

  const corpusMatch = corpusEntries?.find(
    (e) => toUrlSlug(e.i) === slug || toUrlSlug(e.n) === slug,
  );
  const rawMatch = corpusMatch as Record<string, unknown> | undefined;

  const cachedSummary =
    summaryNode?.id === slug ? summaryNode : getCachedSummaryNode(slug);
  const cachedDetail = getCachedDetailRecord(slug);

  const sysRecord = (
    systemDetail?.kind === 'system'
      ? systemDetail.record
      : cachedDetail?.kind === 'system'
        ? cachedDetail.record
        : undefined
  ) as
    | {
        id?: string;
        name?: string;
        x?: number;
        y?: number;
        z?: number;
        planets?: Array<{
          id: string;
          name: string;
          orbit?: { semiMajorAxis?: number; periodDays?: number };
        }>;
      }
    | undefined;

  const parentSystemId = corpusMatch?.s ? toUrlSlug(corpusMatch.s) : undefined;
  const parentDetail =
    !sysRecord && parentSystemId ? getCachedDetailRecord(parentSystemId) : undefined;
  const parentSysRecord =
    parentDetail?.kind === 'system' ? parentDetail.record : sysRecord;

  const planetMatch = parentSysRecord?.planets?.find(
    (p) => toUrlSlug(p.id) === slug || toUrlSlug(p.name) === slug,
  );

  const solarBodyRecord =
    cachedDetail?.kind === 'solar-body' ? cachedDetail.record : undefined;

  const name =
    planetMatch?.name ??
    solarBodyRecord?.name ??
    corpusMatch?.n ??
    cachedSummary?.name ??
    (slug === DEFAULT_INTERSTELLAR_ORIGIN_ID
      ? 'Sol'
      : slug === DEFAULT_INTRA_SYSTEM_ORIGIN_ID
        ? 'Earth'
        : slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));

  const isPlanet =
    Boolean(planetMatch) ||
    solarBodyRecord?.classification === 'Planet' ||
    corpusMatch?.k === 2 ||
    rawMatch?.k === 'planet' ||
    slug === DEFAULT_INTRA_SYSTEM_ORIGIN_ID;

  const isMinorBody =
    (solarBodyRecord?.classification !== undefined &&
      solarBodyRecord.classification !== 'Planet' &&
      solarBodyRecord.classification !== 'Star') ||
    corpusMatch?.k === 3 ||
    corpusMatch?.k === 4 ||
    corpusMatch?.k === 6 ||
    rawMatch?.k === 'minor-body';

  const isStructure =
    cachedDetail?.kind === 'structure' ||
    corpusMatch?.k === 5 ||
    rawMatch?.k === 'structure';

  const entityKind: JourneyEndpoint['entityKind'] = isPlanet
    ? 'planet'
    : isMinorBody
      ? 'minor-body'
      : isStructure
        ? 'structure'
        : 'system';

  const systemId =
    parentSystemId ??
    (solarBodyRecord || slug === DEFAULT_INTRA_SYSTEM_ORIGIN_ID
      ? DEFAULT_INTERSTELLAR_ORIGIN_ID
      : undefined) ??
    (planetMatch && parentSysRecord?.id ? toUrlSlug(parentSysRecord.id) : undefined) ??
    (cachedSummary ? toUrlSlug(cachedSummary.id) : undefined) ??
    slug;

  const systemName =
    parentSysRecord?.name ??
    cachedSummary?.name ??
    (systemId === DEFAULT_INTERSTELLAR_ORIGIN_ID ? 'Sol' : name);

  const coordinatesPc: readonly [number, number, number] = corpusMatch?.p
    ? corpusMatch.p
    : typeof rawMatch?.x === 'number' &&
        typeof rawMatch?.y === 'number' &&
        typeof rawMatch?.z === 'number'
      ? [rawMatch.x, rawMatch.y, rawMatch.z]
      : cachedSummary && Number.isFinite(cachedSummary.x)
        ? [cachedSummary.x, cachedSummary.y, cachedSummary.z]
        : sysRecord &&
            typeof sysRecord.x === 'number' &&
            typeof sysRecord.y === 'number' &&
            typeof sysRecord.z === 'number'
          ? [sysRecord.x, sysRecord.y, sysRecord.z]
          : [0, 0, 0];

  const semiMajorAxisAu =
    corpusMatch?.A ??
    (typeof rawMatch?.a === 'number' ? rawMatch.a : undefined) ??
    planetMatch?.orbit?.semiMajorAxis ??
    solarBodyRecord?.orbit?.semiMajorAxis;

  const periodDays =
    corpusMatch?.P ??
    (typeof rawMatch?.P === 'number' ? rawMatch.P : undefined) ??
    planetMatch?.orbit?.periodDays ??
    solarBodyRecord?.orbit?.periodDays;

  const position3D: readonly [number, number, number] =
    semiMajorAxisAu !== undefined
      ? [semiMajorAxisAu, 0, 0]
      : coordinatesPc;

  return {
    id: slug,
    name,
    systemId,
    systemName,
    entityKind,
    coordinatesPc,
    semiMajorAxisAu,
    periodDays,
    position3D,
  };
}

/**
 * Pure domain builder constructing a JourneyPlan from route stops and active view state.
 */
export function buildJourneyPlan(input: BuildJourneyPlanInput): JourneyPlan | null {
  const routeStopIds = input.stops ?? input.routeStopIds ?? [];
  const corpusEntries = input.corpus ?? input.corpusEntries;
  const {
    selectedOptionId,
    domainOverride,
    currentPathname = '',
    currentSearch = '',
    systemDetail,
    summaryNode,
  } = input;

  if (!routeStopIds || routeStopIds.length < 2) {
    return null;
  }

  const stops = routeStopIds.map((id) =>
    resolveEndpoint(id, corpusEntries, systemDetail, summaryNode),
  );

  // Determine domain
  const allSameSystem = stops.every((s) => s.systemId === stops[0].systemId);
  const domain: JourneyDomain =
    domainOverride ??
    (((input.viewScope === 'system' || input.viewScope === 'planet') && allSameSystem) ||
    (allSameSystem && stops.some((s) => s.entityKind === 'planet' || s.entityKind === 'minor-body'))
      ? 'intra-system'
      : 'interstellar');

  const viewScope = input.viewScope ?? (domain === 'intra-system' ? 'system' : 'galaxy');

  const clearOptionHref = (() => {
    const params = new URLSearchParams(
      currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch,
    );
    params.set('route', routeStopIds.join(','));
    params.delete('journeyOption');
    const qs = params.toString().replace(/%2C/gi, ',');
    return `${currentPathname}${qs ? `?${qs}` : ''}`;
  })();

  const closeHref = (() => {
    const params = new URLSearchParams(
      currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch,
    );
    params.delete('route');
    params.delete('journeyOption');
    const qs = params.toString().replace(/%2C/gi, ',');
    return `${currentPathname}${qs ? `?${qs}` : ''}`;
  })();

  // Gating evaluation
  let status: 'ready' | 'coming-soon' = 'ready';
  let statusReason: string | undefined = undefined;

  const hasSelfLoop = stops.some((s, idx) => idx > 0 && s.id === stops[idx - 1].id);
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
      totalDistanceLabel: 'Routing unavailable',
      totalCommsOneWayLabel: 'N/A',
      totalCommsRoundTripLabel: 'N/A',
      clearOptionHref,
      closeHref,
      focusedStopIds: [],
    };
  }

  // Build steps
  const steps: JourneyStep[] = [];
  let totalDistanceLy = 0;
  let totalDistanceAu = 0;

  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to = stops[i + 1];
    const stepIndex = i;
    const stepId = `${from.id}-${to.id}`;

    if (domain === 'interstellar') {
      const { distance: distancePc, dz } = computeEuclideanDistance3D(
        from.coordinatesPc,
        to.coordinatesPc,
      );
      const distanceLy = distancePc * PARSEC_TO_LY;
      totalDistanceLy += distanceLy;

      const deltaZPc = dz;
      const deltaZLy = dz * PARSEC_TO_LY;

      const oneWayLightTimeLabel = `${distanceLy.toFixed(1)} yr`;
      const roundTripLightTimeLabel = `${(distanceLy * 2).toFixed(1)} yr`;
      const primaryDistanceLabel = `${distanceLy.toFixed(1)} ly (${distancePc.toFixed(2)} pc)`;
      const secondaryGeometryLabel = `Δz = ${deltaZPc >= 0 ? '+' : ''}${deltaZPc.toFixed(2)} pc (${deltaZLy >= 0 ? '+' : ''}${deltaZLy.toFixed(1)} ly)`;

      steps.push({
        stepIndex,
        id: stepId,
        domain,
        from,
        to,
        distancePc,
        distanceLy,
        deltaZPc,
        deltaZLy,
        oneWayLightTimeLabel,
        roundTripLightTimeLabel,
        primaryDistanceLabel,
        secondaryGeometryLabel,
      });
    } else {
      // Intra-system
      const r1 = from.semiMajorAxisAu ?? 1.0;
      const r2 = to.semiMajorAxisAu ?? 1.524;
      const dMin = Math.abs(r1 - r2);
      const dMax = r1 + r2;
      const dMean = Math.sqrt(r1 * r1 + r2 * r2);
      totalDistanceAu += dMean;

      const lightMinMin = dMin * AU_TO_LIGHT_MINUTES;
      const lightMinMax = dMax * AU_TO_LIGHT_MINUTES;

      const oneWayLightTimeLabel = `${lightMinMin.toFixed(1)}–${lightMinMax.toFixed(1)} min`;
      const roundTripLightTimeLabel = `${(lightMinMin * 2).toFixed(1)}–${(lightMinMax * 2).toFixed(1)} min`;
      const primaryDistanceLabel = `${dMean.toFixed(2)} AU (${((dMean * AU_TO_KM) / 1e6).toFixed(1)}M km)`;
      const secondaryGeometryLabel = `Range: ${dMin.toFixed(2)}–${dMax.toFixed(2)} AU (${((dMin * AU_TO_KM) / 1e6).toFixed(1)}–${((dMax * AU_TO_KM) / 1e6).toFixed(1)}M km)`;

      steps.push({
        stepIndex,
        id: stepId,
        domain,
        from,
        to,
        distanceAuMean: dMean,
        distanceAuMin: dMin,
        distanceAuMax: dMax,
        oneWayLightTimeLabel,
        roundTripLightTimeLabel,
        primaryDistanceLabel,
        secondaryGeometryLabel,
      });
    }
  }

  // URL helpers
  const makeOptionHref = (optionId: string): string => {
    const params = new URLSearchParams(
      currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch,
    );
    params.set('route', routeStopIds.join(','));
    params.set('journeyOption', optionId);
    const qs = params.toString().replace(/%2C/gi, ',');
    return `${currentPathname}${qs ? `?${qs}` : ''}`;
  };

  const options: JourneyOption[] = [];

  if (domain === 'interstellar') {
    const totalDistancePc = totalDistanceLy / PARSEC_TO_LY;
    const originLabel = stops[0].name;
    const destinationLabel = stops[stops.length - 1].name;
    const distancePrimaryLabel = `${totalDistanceLy.toFixed(1)} ly (${totalDistancePc.toFixed(2)} pc)`;
    const elevationOrRangeLabel = steps.length === 1 ? steps[0].secondaryGeometryLabel : `${steps.length} sequential legs`;

    // 1. Light-speed
    options.push({
      id: 'light-speed',
      domain,
      title: 'Light-Speed Signal (1.0c)',
      methodBadge: 'Signal (1.0c)',
      topSummaryTime: `${totalDistanceLy.toFixed(1)} yr`,
      shortDescription: 'Electromagnetic laser / RF carrier at universal light speed c.',
      selectHref: makeOptionHref('light-speed'),
      stats: {
        originLabel,
        destinationLabel,
        distancePrimaryLabel,
        elevationOrRangeLabel,
        shipTimeLabel: 'Instantaneous (photon frame)',
        coordinateTimeLabel: `${totalDistanceLy.toFixed(1)} yr`,
        oneWayCommsLabel: `${totalDistanceLy.toFixed(1)} yr`,
        roundTripCommsLabel: `${(totalDistanceLy * 2).toFixed(1)} yr`,
        peakVelocityLabel: '1.000c (299,792 km/s)',
        lorentzFactorLabel: 'Infinite (singular)',
        propulsionProfile: 'High-gain phased optical laser array / interstellar carrier',
      },
      stepMetrics: steps.map((s) => ({
        stepIndex: s.stepIndex,
        stepId: s.id,
        fromName: s.from.name,
        toName: s.to.name,
        distanceLabel: s.primaryDistanceLabel,
        shipTimeLabel: '0 yr',
        coordinateTimeLabel: `${(s.distanceLy ?? 0).toFixed(1)} yr`,
        oneWayCommsLabel: `${(s.distanceLy ?? 0).toFixed(1)} yr`,
      })),
    });

    // 2. Torchship 1g
    const rel1g = computeInterstellarRelativisticTransit(totalDistanceLy, 1.0);
    options.push({
      id: 'torchship-1g',
      domain,
      title: '1g Relativistic Torchship',
      methodBadge: '1g Continuous Burn',
      topSummaryTime: `${rel1g.shipProperTimeYears.toFixed(1)} yr ship · ${rel1g.coordinateTimeYears.toFixed(1)} yr coord`,
      shortDescription: 'Continuous 1.0g acceleration to midpoint followed by flip-and-burn deceleration.',
      selectHref: makeOptionHref('torchship-1g'),
      stats: {
        originLabel,
        destinationLabel,
        distancePrimaryLabel,
        elevationOrRangeLabel,
        shipTimeLabel: `${rel1g.shipProperTimeYears.toFixed(2)} years`,
        coordinateTimeLabel: `${rel1g.coordinateTimeYears.toFixed(2)} years`,
        oneWayCommsLabel: `${totalDistanceLy.toFixed(1)} yr`,
        roundTripCommsLabel: `${(totalDistanceLy * 2).toFixed(1)} yr`,
        peakVelocityLabel: `${(rel1g.peakBetaC * 100).toFixed(2)}% c (${Math.round(rel1g.peakBetaC * 299792).toLocaleString()} km/s)`,
        lorentzFactorLabel: `γ = ${rel1g.peakLorentzGamma.toFixed(2)}`,
        turnaroundPointLabel: `Midpoint at ${rel1g.turnaroundDistanceLy.toFixed(2)} ly`,
        propulsionProfile: 'Antimatter-catalyzed fusion / magnetic scoop continuous 1g torch',
      },
      stepMetrics: steps.map((s) => {
        const stepTransit = computeInterstellarRelativisticTransit(s.distanceLy ?? 0, 1.0);
        return {
          stepIndex: s.stepIndex,
          stepId: s.id,
          fromName: s.from.name,
          toName: s.to.name,
          distanceLabel: s.primaryDistanceLabel,
          shipTimeLabel: `${stepTransit.shipProperTimeYears.toFixed(1)} yr`,
          coordinateTimeLabel: `${stepTransit.coordinateTimeYears.toFixed(1)} yr`,
          oneWayCommsLabel: s.oneWayLightTimeLabel,
        };
      }),
    });

    // 3. Torchship 0.5g
    const rel05g = computeInterstellarRelativisticTransit(totalDistanceLy, 0.5);
    options.push({
      id: 'torchship-0.5g',
      domain,
      title: '0.5g High-Efficiency Torchship',
      methodBadge: '0.5g Economy Burn',
      topSummaryTime: `${rel05g.shipProperTimeYears.toFixed(1)} yr ship · ${rel05g.coordinateTimeYears.toFixed(1)} yr coord`,
      shortDescription: 'Sustained 0.5g continuous burn balancing reaction mass consumption and transit time.',
      selectHref: makeOptionHref('torchship-0.5g'),
      stats: {
        originLabel,
        destinationLabel,
        distancePrimaryLabel,
        elevationOrRangeLabel,
        shipTimeLabel: `${rel05g.shipProperTimeYears.toFixed(2)} years`,
        coordinateTimeLabel: `${rel05g.coordinateTimeYears.toFixed(2)} years`,
        oneWayCommsLabel: `${totalDistanceLy.toFixed(1)} yr`,
        roundTripCommsLabel: `${(totalDistanceLy * 2).toFixed(1)} yr`,
        peakVelocityLabel: `${(rel05g.peakBetaC * 100).toFixed(2)}% c (${Math.round(rel05g.peakBetaC * 299792).toLocaleString()} km/s)`,
        lorentzFactorLabel: `γ = ${rel05g.peakLorentzGamma.toFixed(2)}`,
        turnaroundPointLabel: `Midpoint at ${rel05g.turnaroundDistanceLy.toFixed(2)} ly`,
        propulsionProfile: 'Dual-mode fusion pulse drive with 0.5g constant acceleration',
      },
      stepMetrics: steps.map((s) => {
        const stepTransit = computeInterstellarRelativisticTransit(s.distanceLy ?? 0, 0.5);
        return {
          stepIndex: s.stepIndex,
          stepId: s.id,
          fromName: s.from.name,
          toName: s.to.name,
          distanceLabel: s.primaryDistanceLabel,
          shipTimeLabel: `${stepTransit.shipProperTimeYears.toFixed(1)} yr`,
          coordinateTimeLabel: `${stepTransit.coordinateTimeYears.toFixed(1)} yr`,
          oneWayCommsLabel: s.oneWayLightTimeLabel,
        };
      }),
    });

    // 4. Antimatter 0.10c
    const am10 = computeInterstellarConstantBetaTransit(totalDistanceLy, 0.10);
    options.push({
      id: 'antimatter-0.1c',
      domain,
      title: '0.10c Antimatter / Beamed Sail',
      methodBadge: '0.10c Cruise',
      topSummaryTime: `${am10.coordinateTimeYears.toFixed(1)} yr`,
      shortDescription: 'Laser-pushed relativistic sail or antimatter rocket cruising at 10% light speed.',
      selectHref: makeOptionHref('antimatter-0.1c'),
      stats: {
        originLabel,
        destinationLabel,
        distancePrimaryLabel,
        elevationOrRangeLabel,
        shipTimeLabel: `${am10.shipProperTimeYears.toFixed(1)} years`,
        coordinateTimeLabel: `${am10.coordinateTimeYears.toFixed(1)} years`,
        oneWayCommsLabel: `${totalDistanceLy.toFixed(1)} yr`,
        roundTripCommsLabel: `${(totalDistanceLy * 2).toFixed(1)} yr`,
        peakVelocityLabel: '0.100c (29,979 km/s)',
        lorentzFactorLabel: `γ = ${am10.lorentzGamma.toFixed(3)}`,
        propulsionProfile: 'Directed laser sail deployment with magnetodynamic deceleration',
      },
      stepMetrics: steps.map((s) => {
        const stepTransit = computeInterstellarConstantBetaTransit(s.distanceLy ?? 0, 0.10);
        return {
          stepIndex: s.stepIndex,
          stepId: s.id,
          fromName: s.from.name,
          toName: s.to.name,
          distanceLabel: s.primaryDistanceLabel,
          shipTimeLabel: `${stepTransit.shipProperTimeYears.toFixed(1)} yr`,
          coordinateTimeLabel: `${stepTransit.coordinateTimeYears.toFixed(1)} yr`,
          oneWayCommsLabel: s.oneWayLightTimeLabel,
        };
      }),
    });

    // 5. Fusion 0.05c
    const fus05 = computeInterstellarConstantBetaTransit(totalDistanceLy, 0.05);
    options.push({
      id: 'fusion-0.05c',
      domain,
      title: '0.05c Fusion Drive',
      methodBadge: '0.05c Cruise',
      topSummaryTime: `${Math.round(fus05.coordinateTimeYears)} yr`,
      shortDescription: 'Inertial confinement magnetic fusion torch cruising at 5% light speed.',
      selectHref: makeOptionHref('fusion-0.05c'),
      stats: {
        originLabel,
        destinationLabel,
        distancePrimaryLabel,
        elevationOrRangeLabel,
        shipTimeLabel: `${fus05.shipProperTimeYears.toFixed(1)} years`,
        coordinateTimeLabel: `${fus05.coordinateTimeYears.toFixed(1)} years`,
        oneWayCommsLabel: `${totalDistanceLy.toFixed(1)} yr`,
        roundTripCommsLabel: `${(totalDistanceLy * 2).toFixed(1)} yr`,
        peakVelocityLabel: '0.050c (14,990 km/s)',
        lorentzFactorLabel: `γ = ${fus05.lorentzGamma.toFixed(3)}`,
        propulsionProfile: 'Deuterium-Helium-3 pulsed magnetic fusion rocket',
      },
      stepMetrics: steps.map((s) => {
        const stepTransit = computeInterstellarConstantBetaTransit(s.distanceLy ?? 0, 0.05);
        return {
          stepIndex: s.stepIndex,
          stepId: s.id,
          fromName: s.from.name,
          toName: s.to.name,
          distanceLabel: s.primaryDistanceLabel,
          shipTimeLabel: `${stepTransit.shipProperTimeYears.toFixed(1)} yr`,
          coordinateTimeLabel: `${stepTransit.coordinateTimeYears.toFixed(1)} yr`,
          oneWayCommsLabel: s.oneWayLightTimeLabel,
        };
      }),
    });
  } else {
    // Intra-System options
    const originLabel = stops[0].name;
    const destinationLabel = stops[stops.length - 1].name;
    const distancePrimaryLabel = `${totalDistanceAu.toFixed(2)} AU (${((totalDistanceAu * AU_TO_KM) / 1e6).toFixed(1)}M km)`;
    const elevationOrRangeLabel = steps.length === 1 ? steps[0].secondaryGeometryLabel : `${steps.length} planetary transfers`;

    // 1. Light-speed
    const totalLightMinMin = steps.reduce((sum, s) => sum + ((s.distanceAuMin ?? 0) * AU_TO_LIGHT_MINUTES), 0);
    const totalLightMinMax = steps.reduce((sum, s) => sum + ((s.distanceAuMax ?? 0) * AU_TO_LIGHT_MINUTES), 0);

    options.push({
      id: 'light-speed',
      domain,
      title: 'Light-Speed Signal (1.0c)',
      methodBadge: 'RF/Laser Comms',
      topSummaryTime: `${totalLightMinMin.toFixed(1)}–${totalLightMinMax.toFixed(1)} min`,
      shortDescription: 'Planetary optical / microwave telemetry at light speed.',
      selectHref: makeOptionHref('light-speed'),
      stats: {
        originLabel,
        destinationLabel,
        distancePrimaryLabel,
        elevationOrRangeLabel,
        shipTimeLabel: '0 s',
        coordinateTimeLabel: `${totalLightMinMin.toFixed(1)}–${totalLightMinMax.toFixed(1)} min`,
        oneWayCommsLabel: `${totalLightMinMin.toFixed(1)}–${totalLightMinMax.toFixed(1)} min`,
        roundTripCommsLabel: `${(totalLightMinMin * 2).toFixed(1)}–${(totalLightMinMax * 2).toFixed(1)} min`,
        peakVelocityLabel: '1.000c (299,792 km/s)',
        propulsionProfile: 'Interplanetary laser relay array',
      },
      stepMetrics: steps.map((s) => ({
        stepIndex: s.stepIndex,
        stepId: s.id,
        fromName: s.from.name,
        toName: s.to.name,
        distanceLabel: s.primaryDistanceLabel,
        shipTimeLabel: '0 s',
        coordinateTimeLabel: s.oneWayLightTimeLabel,
        oneWayCommsLabel: s.oneWayLightTimeLabel,
      })),
    });

    // 2. Torchship 1g
    const b1g = computeIntraSystemBrachistochroneTransit(totalDistanceAu, 1.0);
    const minD1g = steps.reduce((sum, s) => sum + (s.distanceAuMin ?? 0), 0);
    const maxD1g = steps.reduce((sum, s) => sum + (s.distanceAuMax ?? 0), 0);
    const b1gMin = computeIntraSystemBrachistochroneTransit(minD1g, 1.0);
    const b1gMax = computeIntraSystemBrachistochroneTransit(maxD1g, 1.0);

    options.push({
      id: 'torchship-1g',
      domain,
      title: '1g Brachistochrone Torchship',
      methodBadge: '1g Continuous Burn',
      topSummaryTime: `${b1g.transitDays.toFixed(1)} days (${b1gMin.transitDays.toFixed(1)}–${b1gMax.transitDays.toFixed(1)} d)`,
      shortDescription: 'High-thrust continuous 1.0g flip-and-burn brachistochrone trajectory.',
      selectHref: makeOptionHref('torchship-1g'),
      stats: {
        originLabel,
        destinationLabel,
        distancePrimaryLabel,
        elevationOrRangeLabel,
        shipTimeLabel: `${b1g.transitDays.toFixed(2)} days (${b1g.transitHours.toFixed(1)} hours)`,
        coordinateTimeLabel: `${b1g.transitDays.toFixed(2)} days`,
        oneWayCommsLabel: `${totalLightMinMin.toFixed(1)}–${totalLightMinMax.toFixed(1)} min`,
        roundTripCommsLabel: `${(totalLightMinMin * 2).toFixed(1)}–${(totalLightMinMax * 2).toFixed(1)} min`,
        peakVelocityLabel: `${Math.round(b1g.peakVelocityKms).toLocaleString()} km/s`,
        turnaroundPointLabel: `Midpoint at ${(totalDistanceAu / 2).toFixed(2)} AU`,
        deltaVLabel: `Δv = ${Math.round(b1g.deltaVKms).toLocaleString()} km/s`,
        propulsionProfile: 'High-density antimatter torch / magnetic pinch drive',
      },
      stepMetrics: steps.map((s) => {
        const stepTransit = computeIntraSystemBrachistochroneTransit(s.distanceAuMean ?? 0, 1.0);
        return {
          stepIndex: s.stepIndex,
          stepId: s.id,
          fromName: s.from.name,
          toName: s.to.name,
          distanceLabel: s.primaryDistanceLabel,
          shipTimeLabel: `${stepTransit.transitDays.toFixed(1)} d`,
          coordinateTimeLabel: `${stepTransit.transitDays.toFixed(1)} d`,
          oneWayCommsLabel: s.oneWayLightTimeLabel,
        };
      }),
    });

    // 3. Torchship 0.1g
    const b01g = computeIntraSystemBrachistochroneTransit(totalDistanceAu, 0.1);
    const b01gMin = computeIntraSystemBrachistochroneTransit(minD1g, 0.1);
    const b01gMax = computeIntraSystemBrachistochroneTransit(maxD1g, 0.1);

    options.push({
      id: 'torchship-0.1g',
      domain,
      title: '0.1g Continuous Fusion Torch',
      methodBadge: '0.1g Economy Burn',
      topSummaryTime: `${b01g.transitDays.toFixed(1)} days (${b01gMin.transitDays.toFixed(1)}–${b01gMax.transitDays.toFixed(1)} d)`,
      shortDescription: 'Continuous 0.1g acceleration for cargo and commercial passenger liners.',
      selectHref: makeOptionHref('torchship-0.1g'),
      stats: {
        originLabel,
        destinationLabel,
        distancePrimaryLabel,
        elevationOrRangeLabel,
        shipTimeLabel: `${b01g.transitDays.toFixed(2)} days`,
        coordinateTimeLabel: `${b01g.transitDays.toFixed(2)} days`,
        oneWayCommsLabel: `${totalLightMinMin.toFixed(1)}–${totalLightMinMax.toFixed(1)} min`,
        roundTripCommsLabel: `${(totalLightMinMin * 2).toFixed(1)}–${(totalLightMinMax * 2).toFixed(1)} min`,
        peakVelocityLabel: `${Math.round(b01g.peakVelocityKms).toLocaleString()} km/s`,
        turnaroundPointLabel: `Midpoint at ${(totalDistanceAu / 2).toFixed(2)} AU`,
        deltaVLabel: `Δv = ${Math.round(b01g.deltaVKms).toLocaleString()} km/s`,
        propulsionProfile: 'Magnetoplasmadynamic gas-core nuclear fusion torch',
      },
      stepMetrics: steps.map((s) => {
        const stepTransit = computeIntraSystemBrachistochroneTransit(s.distanceAuMean ?? 0, 0.1);
        return {
          stepIndex: s.stepIndex,
          stepId: s.id,
          fromName: s.from.name,
          toName: s.to.name,
          distanceLabel: s.primaryDistanceLabel,
          shipTimeLabel: `${stepTransit.transitDays.toFixed(1)} d`,
          coordinateTimeLabel: `${stepTransit.transitDays.toFixed(1)} d`,
          oneWayCommsLabel: s.oneWayLightTimeLabel,
        };
      }),
    });

    // 4. Hohmann Ballistic Transfer
    const r1 = stops[0].semiMajorAxisAu ?? 1.0;
    const r2 = stops[stops.length - 1].semiMajorAxisAu ?? 1.524;
    const hohmann = computeHohmannTransferOrbit(r1, r2, 1.0);

    options.push({
      id: 'hohmann-transfer',
      domain,
      title: 'Hohmann Ballistic Transfer',
      methodBadge: 'Ballistic Hohmann',
      topSummaryTime: `${Math.round(hohmann.transitDays)} days (${hohmann.transitMonths.toFixed(1)} mo)`,
      shortDescription: 'Minimum-energy semi-elliptical Keplerian orbit connecting planetary spheres.',
      selectHref: makeOptionHref('hohmann-transfer'),
      stats: {
        originLabel,
        destinationLabel,
        distancePrimaryLabel,
        elevationOrRangeLabel,
        shipTimeLabel: `${Math.round(hohmann.transitDays)} days (${hohmann.transitMonths.toFixed(1)} months)`,
        coordinateTimeLabel: `${Math.round(hohmann.transitDays)} days`,
        oneWayCommsLabel: `${totalLightMinMin.toFixed(1)}–${totalLightMinMax.toFixed(1)} min`,
        roundTripCommsLabel: `${(totalLightMinMin * 2).toFixed(1)}–${(totalLightMinMax * 2).toFixed(1)} min`,
        peakVelocityLabel: `Departure: ${hohmann.deltaVDepartureKms.toFixed(2)} km/s · Arrival: ${hohmann.deltaVArrivalKms.toFixed(2)} km/s`,
        turnaroundPointLabel: `Transfer a = ${hohmann.semiMajorAxisTransferAu.toFixed(3)} AU`,
        deltaVLabel: `Total Δv = ${hohmann.totalDeltaVKms.toFixed(2)} km/s`,
        synodicPeriodLabel: hohmann.synodicPeriodDays
          ? `${(hohmann.synodicPeriodDays / 30.4375).toFixed(1)} months (${Math.round(hohmann.synodicPeriodDays)} days)`
          : undefined,
        propulsionProfile: 'Ballistic coast with chemical / ion departure and orbital insertion burns',
      },
      stepMetrics: steps.map((s) => ({
        stepIndex: s.stepIndex,
        stepId: s.id,
        fromName: s.from.name,
        toName: s.to.name,
        distanceLabel: s.primaryDistanceLabel,
        shipTimeLabel: `${Math.round(hohmann.transitDays)} d`,
        coordinateTimeLabel: `${Math.round(hohmann.transitDays)} d`,
        oneWayCommsLabel: s.oneWayLightTimeLabel,
      })),
    });
  }

  const normalizedOptionId = selectedOptionId
    ? selectedOptionId === 'rel-1g' || selectedOptionId === 'brach-1g'
      ? 'torchship-1g'
      : selectedOptionId === 'fusion-01c'
        ? 'antimatter-0.1c'
        : selectedOptionId === 'hohmann'
          ? 'hohmann-transfer'
          : selectedOptionId
    : null;

  const selectedOption = normalizedOptionId
    ? (options.find((opt) => opt.id === normalizedOptionId) ?? null)
    : null;

  // Build chord legs
  const chordLegs: JourneyChordLeg[] = steps.map((step) => {
    const fromPos = domain === 'interstellar' ? step.from.coordinatesPc : step.from.position3D;
    const toPos = domain === 'interstellar' ? step.to.coordinatesPc : step.to.position3D;

    return {
      id: step.id,
      stepIndex: step.stepIndex,
      fromId: step.from.id,
      fromName: step.from.name,
      fromPosition: fromPos,
      toId: step.to.id,
      toName: step.to.name,
      toPosition: toPos,
      distanceLabel: step.primaryDistanceLabel,
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

  const totalDistanceLabel =
    domain === 'interstellar'
      ? `${totalDistanceLy.toFixed(1)} ly (${(totalDistanceLy / PARSEC_TO_LY).toFixed(2)} pc)`
      : `${totalDistanceAu.toFixed(2)} AU (${((totalDistanceAu * AU_TO_KM) / 1e6).toFixed(1)}M km)`;

  const totalCommsOneWayLabel =
    domain === 'interstellar'
      ? `${totalDistanceLy.toFixed(1)} yr`
      : `${(steps.reduce((sum, s) => sum + (s.distanceAuMin ?? 0) * AU_TO_LIGHT_MINUTES, 0)).toFixed(1)}–${(steps.reduce((sum, s) => sum + (s.distanceAuMax ?? 0) * AU_TO_LIGHT_MINUTES, 0)).toFixed(1)} min`;

  const totalCommsRoundTripLabel =
    domain === 'interstellar'
      ? `${(totalDistanceLy * 2).toFixed(1)} yr`
      : `${(steps.reduce((sum, s) => sum + (s.distanceAuMin ?? 0) * AU_TO_LIGHT_MINUTES, 0) * 2).toFixed(1)}–${(steps.reduce((sum, s) => sum + (s.distanceAuMax ?? 0) * AU_TO_LIGHT_MINUTES, 0) * 2).toFixed(1)} min`;

  return {
    status: 'ready',
    domain,
    stops,
    steps,
    chordLegs,
    options,
    selectedOption,
    title: stops.map((s) => s.name).join(' → '),
    totalDistanceLabel,
    totalCommsOneWayLabel,
    totalCommsRoundTripLabel,
    clearOptionHref,
    closeHref,
    focusedStopIds: stops.map((s) => s.id),
  };
}
