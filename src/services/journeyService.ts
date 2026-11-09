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
import type {
  JourneyChordLeg,
  JourneyChordRenderData,
  JourneyChordWaypoint,
} from '../types/spatial';
import { buildJourneyChordRenderData } from '../utils/spatialMath';

export type {
  JourneyChordLeg,
  JourneyChordRenderData,
  JourneyChordWaypoint,
};
export { buildJourneyChordRenderData };
import {
  getCachedDetailRecord,
  getCachedSummaryNode,
  type DecodedDetailRecord,
} from '../data/detailsRepository';
import type { CompactSearchEntry } from '../utils/compactDataCodec';
import type { SystemSummaryNode, SystemManifest, PlanetRecord } from '../types/astro';
import { toUrlSlug } from './searchService';
import {
  DEFAULT_ORIGIN_TARGETS,
  EARTH_REFERENCE_TARGET,
  SOL_REFERENCE_TARGET,
} from '../config/referenceTargets';

export const DEFAULT_INTERSTELLAR_ORIGIN_ID =
  DEFAULT_ORIGIN_TARGETS.interstellarOriginId;
export const DEFAULT_INTRA_SYSTEM_ORIGIN_ID =
  DEFAULT_ORIGIN_TARGETS.intraSystemOriginId;

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

export interface StructuredQuantity {
  readonly value: number | 'infinite' | 'instantaneous';
  readonly unit: string;
  readonly secondaryValue?: number | string;
  readonly secondaryUnit?: string;
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
  readonly oneWayLightTime: StructuredQuantity;
  readonly roundTripLightTime: StructuredQuantity;
  readonly primaryDistance: StructuredQuantity;
  readonly secondaryGeometryLabel: string;
}

export interface JourneyStepOptionMetrics {
  readonly stepIndex: number;
  readonly stepId: string;
  readonly fromName: string;
  readonly toName: string;
  readonly distance: StructuredQuantity;
  readonly shipTime: StructuredQuantity;
  readonly coordinateTime: StructuredQuantity;
  readonly oneWayComms: StructuredQuantity;
}

export interface JourneyOptionStats {
  readonly originLabel: string;
  readonly destinationLabel: string;
  readonly distancePrimary: StructuredQuantity;
  readonly elevationOrRangeLabel: string;
  readonly shipTime: StructuredQuantity;
  readonly coordinateTime: StructuredQuantity;
  readonly oneWayComms: StructuredQuantity;
  readonly roundTripComms: StructuredQuantity;
  readonly peakVelocity: StructuredQuantity;
  readonly departureVelocity?: StructuredQuantity;
  readonly arrivalVelocity?: StructuredQuantity;
  readonly lorentzFactor?: StructuredQuantity;
  readonly turnaroundPoint?: StructuredQuantity;
  readonly deltaV?: StructuredQuantity;
  readonly synodicPeriod?: StructuredQuantity;
  readonly propulsionProfile: string;
}

export interface JourneyOption {
  readonly id: string;
  readonly domain: JourneyDomain;
  readonly title: string;
  readonly methodBadge: string;
  readonly topSummaryTime: StructuredQuantity;
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
  readonly totalDistance?: StructuredQuantity;
  readonly totalCommsOneWay?: StructuredQuantity;
  readonly totalCommsRoundTrip?: StructuredQuantity;
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
    .map((s) => {
      const entityPart = s.split(':')[0] ?? '';
      return toUrlSlug(entityPart.trim());
    })
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
 * Also inspects embedded departure modes on route stops (e.g. ?route=sol:torchship-1g,tau-ceti).
 */
export function extractUrlJourneyOptionId(searchString: string): string | null {
  if (!searchString) return null;
  const query = searchString.startsWith('?') ? searchString.slice(1) : searchString;
  const params = new URLSearchParams(query);
  const optionId = params.get('journeyOption');
  if (optionId && optionId.trim().length > 0) {
    return optionId.trim();
  }

  const routeParam = params.get('route');
  if (routeParam) {
    const stops = routeParam.split(',');
    for (const stop of stops) {
      const parts = stop.split(':');
      if (parts.length > 1 && parts[1]?.trim()) {
        return parts[1].trim();
      }
    }
  }

  return null;
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
    viewScope === 'galaxy' && (!currentPathname || currentPathname.startsWith('/galaxy'))
      ? '/galaxy'
      : currentPathname && currentPathname.length > 0
        ? currentPathname
        : viewScope === 'galaxy'
          ? '/galaxy'
          : viewScope === 'system'
            ? `/system/${encodeURIComponent(systemId || targetId)}`
            : `/planet/${encodeURIComponent(targetId)}`;

  const searchParams = new URLSearchParams(
    currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch,
  );

  if (viewScope === 'galaxy') {
    if (!searchParams.has('focus') && (systemId || targetId)) {
      searchParams.set('focus', toUrlSlug(focusedId || systemId || ''));
    }
  } else {
    if (
      hasExplicitFocus &&
      targetId &&
      toUrlSlug(systemId ?? '') !== targetId &&
      !searchParams.has('focus')
    ) {
      searchParams.set('focus', targetId);
    }
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
  readonly systemDetail?: DecodedDetailRecord | null;
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
  systemDetail?: DecodedDetailRecord | null,
  summaryNode?: SystemSummaryNode | null,
): JourneyEndpoint {
  const slug = toUrlSlug(stopId);

  const corpusMatch = corpusEntries?.find(
    (e) => toUrlSlug(e.i) === slug || toUrlSlug(e.n) === slug,
  );

  const cachedSummary =
    summaryNode?.id === slug ? summaryNode : getCachedSummaryNode(slug);
  const cachedDetail = getCachedDetailRecord(slug);

  const sysRecord: SystemManifest | undefined = (
    systemDetail?.kind === 'system'
      ? systemDetail.record
      : cachedDetail?.kind === 'system'
        ? cachedDetail.record
        : undefined
  );

  const parentSystemId = corpusMatch?.s ? toUrlSlug(corpusMatch.s) : undefined;
  const parentDetail =
    !sysRecord && parentSystemId ? getCachedDetailRecord(parentSystemId) : undefined;
  const parentSysRecord: SystemManifest | undefined =
    parentDetail?.kind === 'system' ? parentDetail.record : sysRecord;

  const planetMatch = parentSysRecord?.planets?.find(
    (p: PlanetRecord) => toUrlSlug(p.id) === slug || toUrlSlug(p.name) === slug,
  );

  const solarBodyRecord =
    cachedDetail?.kind === 'solar-body' ? cachedDetail.record : undefined;

  const name =
    planetMatch?.name ??
    solarBodyRecord?.name ??
    corpusMatch?.n ??
    cachedSummary?.name ??
    (slug === DEFAULT_INTERSTELLAR_ORIGIN_ID
      ? SOL_REFERENCE_TARGET.name
      : slug === DEFAULT_INTRA_SYSTEM_ORIGIN_ID
        ? EARTH_REFERENCE_TARGET.name
        : slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));

  const isPlanet =
    Boolean(planetMatch) ||
    solarBodyRecord?.classification === 'Planet' ||
    corpusMatch?.k === 2 ||
    slug === DEFAULT_INTRA_SYSTEM_ORIGIN_ID;

  const isMinorBody =
    (solarBodyRecord?.classification !== undefined &&
      solarBodyRecord.classification !== 'Planet' &&
      solarBodyRecord.classification !== 'Star') ||
    corpusMatch?.k === 3 ||
    corpusMatch?.k === 4 ||
    corpusMatch?.k === 6;

  const isStructure =
    cachedDetail?.kind === 'structure' ||
    corpusMatch?.k === 5;

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
    (systemId === DEFAULT_INTERSTELLAR_ORIGIN_ID
      ? SOL_REFERENCE_TARGET.name
      : name);

  const coordinatesPc: readonly [number, number, number] = corpusMatch?.p
    ? corpusMatch.p
    : cachedSummary && Number.isFinite(cachedSummary.x)
      ? [cachedSummary.x, cachedSummary.y, cachedSummary.z]
      : sysRecord &&
          typeof sysRecord.x === 'number' &&
          typeof sysRecord.y === 'number' &&
          typeof sysRecord.z === 'number'
        ? [sysRecord.x, sysRecord.y, sysRecord.z]
        : DEFAULT_ORIGIN_TARGETS.galacticOriginCoordinates;

  const semiMajorAxisAu =
    corpusMatch?.A ??
    planetMatch?.orbit?.semiMajorAxis ??
    solarBodyRecord?.orbit?.semiMajorAxis ??
    (slug === DEFAULT_INTRA_SYSTEM_ORIGIN_ID
      ? EARTH_REFERENCE_TARGET.semiMajorAxisAu
      : undefined);

  const periodDays =
    corpusMatch?.P ??
    planetMatch?.orbit?.periodDays ??
    solarBodyRecord?.orbit?.periodDays ??
    (slug === DEFAULT_INTRA_SYSTEM_ORIGIN_ID
      ? EARTH_REFERENCE_TARGET.periodDays
      : undefined);

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

  if (domain === 'intra-system' && status === 'ready') {
    const missingSmaStop = stops.find(
      (s) => typeof s.semiMajorAxisAu !== 'number' || s.semiMajorAxisAu <= 0,
    );
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

      const oneWayLightTime: StructuredQuantity = {
        value: Number(distanceLy.toFixed(1)),
        unit: 'yr',
      };
      const roundTripLightTime: StructuredQuantity = {
        value: Number((distanceLy * 2).toFixed(1)),
        unit: 'yr',
      };
      const primaryDistance: StructuredQuantity = {
        value: Number(distanceLy.toFixed(1)),
        unit: 'ly',
        secondaryValue: Number(distancePc.toFixed(2)),
        secondaryUnit: 'pc',
      };
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
        oneWayLightTime,
        roundTripLightTime,
        primaryDistance,
        secondaryGeometryLabel,
      });
    } else {
      // Intra-system
      if (
        typeof from.semiMajorAxisAu !== 'number' ||
        typeof to.semiMajorAxisAu !== 'number' ||
        from.semiMajorAxisAu <= 0 ||
        to.semiMajorAxisAu <= 0
      ) {
        throw new Error(
          `Missing or non-positive orbital semi-major axis telemetry for intra-system leg between ${from.name} and ${to.name}.`,
        );
      }
      const r1 = from.semiMajorAxisAu;
      const r2 = to.semiMajorAxisAu;
      const dMin = Math.abs(r1 - r2);
      const dMax = r1 + r2;
      const dMean = Math.sqrt(r1 * r1 + r2 * r2);
      totalDistanceAu += dMean;

      const lightMinMean = dMean * AU_TO_LIGHT_MINUTES;

      const oneWayLightTime: StructuredQuantity = {
        value: Number(lightMinMean.toFixed(1)),
        unit: 'min',
      };
      const roundTripLightTime: StructuredQuantity = {
        value: Number((lightMinMean * 2).toFixed(1)),
        unit: 'min',
      };
      const primaryDistance: StructuredQuantity = {
        value: Number(dMean.toFixed(2)),
        unit: 'AU',
        secondaryValue: Number(((dMean * AU_TO_KM) / 1e6).toFixed(1)),
        secondaryUnit: 'M km',
      };
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
        oneWayLightTime,
        roundTripLightTime,
        primaryDistance,
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
    const distancePrimary: StructuredQuantity = {
      value: Number(totalDistanceLy.toFixed(1)),
      unit: 'ly',
      secondaryValue: Number(totalDistancePc.toFixed(2)),
      secondaryUnit: 'pc',
    };
    const elevationOrRangeLabel = steps.length === 1 ? steps[0].secondaryGeometryLabel : `${steps.length} sequential legs`;

    // 1. Light-speed
    options.push({
      id: 'light-speed',
      domain,
      title: 'Light-Speed Signal (1.0c)',
      methodBadge: 'Signal (1.0c)',
      topSummaryTime: { value: Number(totalDistanceLy.toFixed(1)), unit: 'yr' },
      shortDescription: 'Electromagnetic laser / RF carrier at universal light speed c.',
      selectHref: makeOptionHref('light-speed'),
      stats: {
        originLabel,
        destinationLabel,
        distancePrimary,
        elevationOrRangeLabel,
        shipTime: { value: 'instantaneous', unit: '(photon frame)' },
        coordinateTime: { value: Number(totalDistanceLy.toFixed(1)), unit: 'yr' },
        oneWayComms: { value: Number(totalDistanceLy.toFixed(1)), unit: 'yr' },
        roundTripComms: { value: Number((totalDistanceLy * 2).toFixed(1)), unit: 'yr' },
        peakVelocity: { value: 1.0, unit: 'c', secondaryValue: 299792, secondaryUnit: 'km/s' },
        lorentzFactor: { value: 'infinite', unit: '(singular)' },
        propulsionProfile: 'High-gain phased optical laser array / interstellar carrier',
      },
      stepMetrics: steps.map((s) => ({
        stepIndex: s.stepIndex,
        stepId: s.id,
        fromName: s.from.name,
        toName: s.to.name,
        distance: s.primaryDistance,
        shipTime: { value: 0, unit: 'yr' },
        coordinateTime: { value: Number((s.distanceLy ?? 0).toFixed(1)), unit: 'yr' },
        oneWayComms: { value: Number((s.distanceLy ?? 0).toFixed(1)), unit: 'yr' },
      })),
    });

    // 2. Torchship 1g
    const rel1g = computeInterstellarRelativisticTransit(totalDistanceLy, 1.0);
    options.push({
      id: 'torchship-1g',
      domain,
      title: '1g Relativistic Torchship',
      methodBadge: '1g Continuous Burn',
      topSummaryTime: {
        value: Number(rel1g.shipProperTimeYears.toFixed(1)),
        unit: 'yr ship',
        secondaryValue: Number(rel1g.coordinateTimeYears.toFixed(1)),
        secondaryUnit: 'yr coord',
      },
      shortDescription: 'Continuous 1.0g acceleration to midpoint followed by flip-and-burn deceleration.',
      selectHref: makeOptionHref('torchship-1g'),
      stats: {
        originLabel,
        destinationLabel,
        distancePrimary,
        elevationOrRangeLabel,
        shipTime: { value: Number(rel1g.shipProperTimeYears.toFixed(2)), unit: 'years' },
        coordinateTime: { value: Number(rel1g.coordinateTimeYears.toFixed(2)), unit: 'years' },
        oneWayComms: { value: Number(totalDistanceLy.toFixed(1)), unit: 'yr' },
        roundTripComms: { value: Number((totalDistanceLy * 2).toFixed(1)), unit: 'yr' },
        peakVelocity: {
          value: Number((rel1g.peakBetaC * 100).toFixed(2)),
          unit: '% c',
          secondaryValue: Math.round(rel1g.peakBetaC * 299792),
          secondaryUnit: 'km/s',
        },
        lorentzFactor: { value: Number(rel1g.peakLorentzGamma.toFixed(2)), unit: 'γ' },
        turnaroundPoint: { value: Number(rel1g.turnaroundDistanceLy.toFixed(2)), unit: 'ly' },
        propulsionProfile: 'Antimatter-catalyzed fusion / magnetic scoop continuous 1g torch',
      },
      stepMetrics: steps.map((s) => {
        const stepTransit = computeInterstellarRelativisticTransit(s.distanceLy ?? 0, 1.0);
        return {
          stepIndex: s.stepIndex,
          stepId: s.id,
          fromName: s.from.name,
          toName: s.to.name,
          distance: s.primaryDistance,
          shipTime: { value: Number(stepTransit.shipProperTimeYears.toFixed(1)), unit: 'yr' },
          coordinateTime: { value: Number(stepTransit.coordinateTimeYears.toFixed(1)), unit: 'yr' },
          oneWayComms: s.oneWayLightTime,
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
      topSummaryTime: {
        value: Number(rel05g.shipProperTimeYears.toFixed(1)),
        unit: 'yr ship',
        secondaryValue: Number(rel05g.coordinateTimeYears.toFixed(1)),
        secondaryUnit: 'yr coord',
      },
      shortDescription: 'Sustained 0.5g continuous burn balancing reaction mass consumption and transit time.',
      selectHref: makeOptionHref('torchship-0.5g'),
      stats: {
        originLabel,
        destinationLabel,
        distancePrimary,
        elevationOrRangeLabel,
        shipTime: { value: Number(rel05g.shipProperTimeYears.toFixed(2)), unit: 'years' },
        coordinateTime: { value: Number(rel05g.coordinateTimeYears.toFixed(2)), unit: 'years' },
        oneWayComms: { value: Number(totalDistanceLy.toFixed(1)), unit: 'yr' },
        roundTripComms: { value: Number((totalDistanceLy * 2).toFixed(1)), unit: 'yr' },
        peakVelocity: {
          value: Number((rel05g.peakBetaC * 100).toFixed(2)),
          unit: '% c',
          secondaryValue: Math.round(rel05g.peakBetaC * 299792),
          secondaryUnit: 'km/s',
        },
        lorentzFactor: { value: Number(rel05g.peakLorentzGamma.toFixed(2)), unit: 'γ' },
        turnaroundPoint: { value: Number(rel05g.turnaroundDistanceLy.toFixed(2)), unit: 'ly' },
        propulsionProfile: 'Dual-mode fusion pulse drive with 0.5g constant acceleration',
      },
      stepMetrics: steps.map((s) => {
        const stepTransit = computeInterstellarRelativisticTransit(s.distanceLy ?? 0, 0.5);
        return {
          stepIndex: s.stepIndex,
          stepId: s.id,
          fromName: s.from.name,
          toName: s.to.name,
          distance: s.primaryDistance,
          shipTime: { value: Number(stepTransit.shipProperTimeYears.toFixed(1)), unit: 'yr' },
          coordinateTime: { value: Number(stepTransit.coordinateTimeYears.toFixed(1)), unit: 'yr' },
          oneWayComms: s.oneWayLightTime,
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
      topSummaryTime: { value: Number(am10.coordinateTimeYears.toFixed(1)), unit: 'yr' },
      shortDescription: 'Laser-pushed relativistic sail or antimatter rocket cruising at 10% light speed.',
      selectHref: makeOptionHref('antimatter-0.1c'),
      stats: {
        originLabel,
        destinationLabel,
        distancePrimary,
        elevationOrRangeLabel,
        shipTime: { value: Number(am10.shipProperTimeYears.toFixed(1)), unit: 'years' },
        coordinateTime: { value: Number(am10.coordinateTimeYears.toFixed(1)), unit: 'years' },
        oneWayComms: { value: Number(totalDistanceLy.toFixed(1)), unit: 'yr' },
        roundTripComms: { value: Number((totalDistanceLy * 2).toFixed(1)), unit: 'yr' },
        peakVelocity: { value: 0.1, unit: 'c', secondaryValue: 29979, secondaryUnit: 'km/s' },
        lorentzFactor: { value: Number(am10.lorentzGamma.toFixed(3)), unit: 'γ' },
        propulsionProfile: 'Directed laser sail deployment with magnetodynamic deceleration',
      },
      stepMetrics: steps.map((s) => {
        const stepTransit = computeInterstellarConstantBetaTransit(s.distanceLy ?? 0, 0.10);
        return {
          stepIndex: s.stepIndex,
          stepId: s.id,
          fromName: s.from.name,
          toName: s.to.name,
          distance: s.primaryDistance,
          shipTime: { value: Number(stepTransit.shipProperTimeYears.toFixed(1)), unit: 'yr' },
          coordinateTime: { value: Number(stepTransit.coordinateTimeYears.toFixed(1)), unit: 'yr' },
          oneWayComms: s.oneWayLightTime,
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
      topSummaryTime: { value: Math.round(fus05.coordinateTimeYears), unit: 'yr' },
      shortDescription: 'Inertial confinement magnetic fusion torch cruising at 5% light speed.',
      selectHref: makeOptionHref('fusion-0.05c'),
      stats: {
        originLabel,
        destinationLabel,
        distancePrimary,
        elevationOrRangeLabel,
        shipTime: { value: Number(fus05.shipProperTimeYears.toFixed(1)), unit: 'years' },
        coordinateTime: { value: Number(fus05.coordinateTimeYears.toFixed(1)), unit: 'years' },
        oneWayComms: { value: Number(totalDistanceLy.toFixed(1)), unit: 'yr' },
        roundTripComms: { value: Number((totalDistanceLy * 2).toFixed(1)), unit: 'yr' },
        peakVelocity: { value: 0.05, unit: 'c', secondaryValue: 14990, secondaryUnit: 'km/s' },
        lorentzFactor: { value: Number(fus05.lorentzGamma.toFixed(3)), unit: 'γ' },
        propulsionProfile: 'Deuterium-Helium-3 pulsed magnetic fusion rocket',
      },
      stepMetrics: steps.map((s) => {
        const stepTransit = computeInterstellarConstantBetaTransit(s.distanceLy ?? 0, 0.05);
        return {
          stepIndex: s.stepIndex,
          stepId: s.id,
          fromName: s.from.name,
          toName: s.to.name,
          distance: s.primaryDistance,
          shipTime: { value: Number(stepTransit.shipProperTimeYears.toFixed(1)), unit: 'yr' },
          coordinateTime: { value: Number(stepTransit.coordinateTimeYears.toFixed(1)), unit: 'yr' },
          oneWayComms: s.oneWayLightTime,
        };
      }),
    });
  } else {
    // Intra-System options
    const originLabel = stops[0].name;
    const destinationLabel = stops[stops.length - 1].name;
    const distancePrimary: StructuredQuantity = {
      value: Number(totalDistanceAu.toFixed(2)),
      unit: 'AU',
      secondaryValue: Number(((totalDistanceAu * AU_TO_KM) / 1e6).toFixed(1)),
      secondaryUnit: 'M km',
    };
    const elevationOrRangeLabel = steps.length === 1 ? steps[0].secondaryGeometryLabel : `${steps.length} planetary transfers`;

    // 1. Light-speed
    const totalLightMinMean = totalDistanceAu * AU_TO_LIGHT_MINUTES;

    options.push({
      id: 'light-speed',
      domain,
      title: 'Light-Speed Signal (1.0c)',
      methodBadge: 'RF/Laser Comms',
      topSummaryTime: { value: Number(totalLightMinMean.toFixed(1)), unit: 'min' },
      shortDescription: 'Planetary optical / microwave telemetry at light speed.',
      selectHref: makeOptionHref('light-speed'),
      stats: {
        originLabel,
        destinationLabel,
        distancePrimary,
        elevationOrRangeLabel,
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
    });

    // 2. Torchship 1g
    const b1g = computeIntraSystemBrachistochroneTransit(totalDistanceAu, 1.0);

    options.push({
      id: 'torchship-1g',
      domain,
      title: '1g Brachistochrone Torchship',
      methodBadge: '1g Continuous Burn',
      topSummaryTime: {
        value: Number(b1g.transitDays.toFixed(1)),
        unit: 'days',
      },
      shortDescription: 'High-thrust continuous 1.0g flip-and-burn brachistochrone trajectory.',
      selectHref: makeOptionHref('torchship-1g'),
      stats: {
        originLabel,
        destinationLabel,
        distancePrimary,
        elevationOrRangeLabel,
        shipTime: {
          value: Number(b1g.transitDays.toFixed(2)),
          unit: 'days',
          secondaryValue: Number(b1g.transitHours.toFixed(1)),
          secondaryUnit: 'hours',
        },
        coordinateTime: { value: Number(b1g.transitDays.toFixed(2)), unit: 'days' },
        oneWayComms: { value: Number(totalLightMinMean.toFixed(1)), unit: 'min' },
        roundTripComms: { value: Number((totalLightMinMean * 2).toFixed(1)), unit: 'min' },
        peakVelocity: { value: Math.round(b1g.peakVelocityKms), unit: 'km/s' },
        turnaroundPoint: { value: Number((totalDistanceAu / 2).toFixed(2)), unit: 'AU' },
        deltaV: { value: Math.round(b1g.deltaVKms), unit: 'km/s' },
        propulsionProfile: 'High-density antimatter torch / magnetic pinch drive',
      },
      stepMetrics: steps.map((s) => {
        const stepTransit = computeIntraSystemBrachistochroneTransit(s.distanceAuMean ?? 0, 1.0);
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
      }),
    });

    // 3. Torchship 0.1g
    const b01g = computeIntraSystemBrachistochroneTransit(totalDistanceAu, 0.1);

    options.push({
      id: 'torchship-0.1g',
      domain,
      title: '0.1g Continuous Fusion Torch',
      methodBadge: '0.1g Economy Burn',
      topSummaryTime: {
        value: Number(b01g.transitDays.toFixed(1)),
        unit: 'days',
      },
      shortDescription: 'Continuous 0.1g acceleration for cargo and commercial passenger liners.',
      selectHref: makeOptionHref('torchship-0.1g'),
      stats: {
        originLabel,
        destinationLabel,
        distancePrimary,
        elevationOrRangeLabel,
        shipTime: { value: Number(b01g.transitDays.toFixed(2)), unit: 'days' },
        coordinateTime: { value: Number(b01g.transitDays.toFixed(2)), unit: 'days' },
        oneWayComms: { value: Number(totalLightMinMean.toFixed(1)), unit: 'min' },
        roundTripComms: { value: Number((totalLightMinMean * 2).toFixed(1)), unit: 'min' },
        peakVelocity: { value: Math.round(b01g.peakVelocityKms), unit: 'km/s' },
        turnaroundPoint: { value: Number((totalDistanceAu / 2).toFixed(2)), unit: 'AU' },
        deltaV: { value: Math.round(b01g.deltaVKms), unit: 'km/s' },
        propulsionProfile: 'Magnetoplasmadynamic gas-core nuclear fusion torch',
      },
      stepMetrics: steps.map((s) => {
        const stepTransit = computeIntraSystemBrachistochroneTransit(s.distanceAuMean ?? 0, 0.1);
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
      }),
    });

    // 4. Hohmann Ballistic Transfer
    const r1 = stops[0].semiMajorAxisAu;
    const r2 = stops[stops.length - 1].semiMajorAxisAu;
    if (
      typeof r1 !== 'number' ||
      typeof r2 !== 'number' ||
      r1 <= 0 ||
      r2 <= 0
    ) {
      throw new Error(
        `Missing or non-positive orbital semi-major axis telemetry for Hohmann transfer between ${stops[0].name} and ${stops[stops.length - 1].name}.`,
      );
    }
    const hohmann = computeHohmannTransferOrbit(r1, r2, 1.0);

    options.push({
      id: 'hohmann-transfer',
      domain,
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
        originLabel,
        destinationLabel,
        distancePrimary,
        elevationOrRangeLabel,
        shipTime: {
          value: Math.round(hohmann.transitDays),
          unit: 'days',
          secondaryValue: Number(hohmann.transitMonths.toFixed(1)),
          secondaryUnit: 'months',
        },
        coordinateTime: { value: Math.round(hohmann.transitDays), unit: 'days' },
        oneWayComms: { value: Number(totalLightMinMean.toFixed(1)), unit: 'min' },
        roundTripComms: { value: Number((totalLightMinMean * 2).toFixed(1)), unit: 'min' },
        peakVelocity: {
          value: Number(Math.max(hohmann.deltaVDepartureKms, hohmann.deltaVArrivalKms).toFixed(2)),
          unit: 'km/s',
        },
        departureVelocity: {
          value: Number(hohmann.deltaVDepartureKms.toFixed(2)),
          unit: 'km/s',
        },
        arrivalVelocity: {
          value: Number(hohmann.deltaVArrivalKms.toFixed(2)),
          unit: 'km/s',
        },
        turnaroundPoint: { value: Number(hohmann.semiMajorAxisTransferAu.toFixed(3)), unit: 'AU' },
        deltaV: { value: Number(hohmann.totalDeltaVKms.toFixed(2)), unit: 'km/s' },
        synodicPeriod: hohmann.synodicPeriodDays
          ? {
              value: Number((hohmann.synodicPeriodDays / 30.4375).toFixed(1)),
              unit: 'months',
              secondaryValue: Math.round(hohmann.synodicPeriodDays),
              secondaryUnit: 'days',
            }
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
    });
  }

  const selectedOption = selectedOptionId
    ? (options.find((opt) => opt.id === selectedOptionId) ?? null)
    : null;

  // Build chord legs
  const chordLegs: JourneyChordLeg[] = steps.map((step) => {
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

  const totalDistance: StructuredQuantity =
    domain === 'interstellar'
      ? {
          value: Number(totalDistanceLy.toFixed(1)),
          unit: 'ly',
          secondaryValue: Number((totalDistanceLy / PARSEC_TO_LY).toFixed(2)),
          secondaryUnit: 'pc',
        }
      : {
          value: Number(totalDistanceAu.toFixed(2)),
          unit: 'AU',
          secondaryValue: Number(((totalDistanceAu * AU_TO_KM) / 1e6).toFixed(1)),
          secondaryUnit: 'M km',
        };

  const totalCommsOneWay: StructuredQuantity =
    domain === 'interstellar'
      ? { value: Number(totalDistanceLy.toFixed(1)), unit: 'yr' }
      : {
          value: Number((totalDistanceAu * AU_TO_LIGHT_MINUTES).toFixed(1)),
          unit: 'min',
        };

  const totalCommsRoundTrip: StructuredQuantity =
    domain === 'interstellar'
      ? { value: Number((totalDistanceLy * 2).toFixed(1)), unit: 'yr' }
      : {
          value: Number((totalDistanceAu * AU_TO_LIGHT_MINUTES * 2).toFixed(1)),
          unit: 'min',
        };

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
