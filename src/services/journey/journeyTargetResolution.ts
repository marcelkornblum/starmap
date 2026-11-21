import {
  getCachedDetailRecord,
  getCachedSummaryNode,
  type DecodedDetailRecord,
} from '../../data/detailsRepository';
import { getCachedReferenceBaselines } from '../../data/referenceBaselinesRepository';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import type { SystemSummaryNode, SystemManifest, ExoplanetRecord } from '../../types/astro';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import { formatSlugFallbackTitle } from '../../utils/starNaming';
import { DEFAULT_ORIGIN_TARGETS } from '../../config/referenceTargets';
import {
  DEFAULT_INTERSTELLAR_ORIGIN_ID,
  DEFAULT_INTRA_SYSTEM_ORIGIN_ID,
  type JourneyEndpoint,
} from './journeyTypes';

/**
 * Resolves a stop ID into a strongly typed JourneyEndpoint using runtime catalog data,
 * cached summary/detail shards, and standard astronomical fixtures.
 */
export function resolveEndpoint(
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

  const sysRecord: SystemManifest | undefined =
    systemDetail?.kind === 'system'
      ? systemDetail.record
      : cachedDetail?.kind === 'system'
        ? cachedDetail.record
        : undefined;

  const parentSystemId = corpusMatch?.s ? toUrlSlug(corpusMatch.s) : undefined;
  const parentDetail =
    !sysRecord && parentSystemId ? getCachedDetailRecord(parentSystemId) : undefined;
  const parentSysRecord: SystemManifest | undefined =
    parentDetail?.kind === 'system' ? parentDetail.record : sysRecord;

  const planetMatch = parentSysRecord?.planets?.find(
    (p: ExoplanetRecord) => toUrlSlug(p.id) === slug || toUrlSlug(p.name) === slug,
  );

  const solarBodyRecord =
    cachedDetail?.kind === 'solar-body' ? cachedDetail.record : undefined;

  const baselines = getCachedReferenceBaselines();
  const solBaselineName =
    baselines?.targets.sol.name ?? formatSlugFallbackTitle(DEFAULT_INTERSTELLAR_ORIGIN_ID);
  const earthBaselineName =
    baselines?.targets.earth.name ?? formatSlugFallbackTitle(DEFAULT_INTRA_SYSTEM_ORIGIN_ID);

  const name =
    planetMatch?.name ??
    solarBodyRecord?.name ??
    corpusMatch?.n ??
    cachedSummary?.name ??
    (slug === DEFAULT_INTERSTELLAR_ORIGIN_ID
      ? solBaselineName
      : slug === DEFAULT_INTRA_SYSTEM_ORIGIN_ID
        ? earthBaselineName
        : formatSlugFallbackTitle(slug));

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
      ? solBaselineName
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
      ? baselines?.targets.earth.semiMajorAxisAu.value
      : undefined);

  const periodDays =
    corpusMatch?.P ??
    planetMatch?.orbit?.periodDays ??
    solarBodyRecord?.orbit?.periodDays ??
    (slug === DEFAULT_INTRA_SYSTEM_ORIGIN_ID
      ? baselines?.targets.earth.periodDays.value
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
