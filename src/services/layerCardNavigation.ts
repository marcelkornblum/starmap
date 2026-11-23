import { DEFAULT_ORIGIN_TARGETS } from '../config/referenceTargets';
import type { ObservationalConfidence } from '../types/astro';
import type {
  DatasetLayerEntry,
  DatasetLayerKind,
  DatasetLayerManifest,
  DatasetLayerSourceMeta,
} from '../types/datasetLayers';
import type { CompactSearchEntry } from '../utils/compactDataTypes';
import { toCanonicalLayerSlug, toUrlSlug } from '../utils/datasetLayerSlugs';
import type { OrbitTargetView } from './details/detailsNavigation';
import {
  findFocusedEntryInCorpus,
  resolveResultDisplayTitle,
} from './search/searchCorpusHelpers';

export interface ActiveLayerOverviewCardModel {
  readonly mode: 'overview';
  readonly layerId: string;
  readonly layerSlug: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly kind: DatasetLayerKind;
  readonly kindLabel: string;
  readonly description: string;
  readonly itemCount: number;
  readonly source?: DatasetLayerSourceMeta;
  readonly firstItemTitle?: string;
  readonly startHref: string;
  readonly closeHref: string;
}

export interface ActiveLayerItemCardModel {
  readonly mode: 'item';
  readonly layerId: string;
  readonly layerSlug: string;
  readonly layerTitle: string;
  readonly subtitle?: string;
  readonly kind: DatasetLayerKind;
  readonly kindLabel: string;
  readonly overviewHref: string;
  readonly stepIndex: number;
  readonly totalItems: number;
  readonly itemSlug: string;
  readonly itemTitle: string;
  readonly text: string;
  readonly confidence?: ObservationalConfidence;
  readonly prevHref: string;
  readonly prevLabel: string;
  readonly nextHref: string;
  readonly nextLabel: string;
  readonly closeHref: string;
}

export type ActiveLayerCardModel =
  | ActiveLayerOverviewCardModel
  | ActiveLayerItemCardModel;

export interface LayerItemTargetResult {
  readonly itemSlug: string;
  readonly targetView: OrbitTargetView;
  readonly href: string;
}

export interface ResolveActiveLayerCardInput {
  readonly layerParam?: string | null;
  readonly currentPathname: string;
  readonly currentSearch: string;
  readonly corpus?: readonly CompactSearchEntry[];
  readonly layers: readonly DatasetLayerManifest[];
}

/**
 * Minimal layer identity needed to build an item target href.
 */
export interface LayerItemTargetLayer {
  readonly layerId: string;
}

/**
 * Entry-like fields needed to build an item target href. Satisfied by both
 * `DatasetLayerEntry` (manifests) and `DecodedEntityAnnotation` (by-entity shards).
 */
export interface LayerItemTargetFields {
  readonly targetId: string;
  readonly targetType: DatasetLayerEntry['targetType'];
  readonly systemId: string;
  readonly inUniverseName?: string;
  readonly resolvedName?: string;
  readonly subtitle?: string;
  readonly parentBodyId?: string;
}

const SYSTEM_SCOPED_TARGET_TYPES: ReadonlySet<string> = new Set(['planet', 'star']);

/**
 * Pure helper resolving the orbit-context navigation target href and view for a layer entry.
 */
export function resolveLayerItemTargetHref(
  layer: LayerItemTargetLayer,
  entry: LayerItemTargetFields,
  corpus?: readonly CompactSearchEntry[],
  currentPathname?: string,
): LayerItemTargetResult {
  const layerSlug = toCanonicalLayerSlug(layer.layerId);
  const cleanId = entry.targetId.includes(':')
    ? entry.targetId.split(':').slice(1).join(':')
    : entry.targetId;
  const itemSlug = toUrlSlug(cleanId);

  let systemName: string | undefined;
  if (entry.systemId && corpus) {
    const sysEntry = findFocusedEntryInCorpus(entry.systemId, corpus);
    if (sysEntry) {
      systemName = resolveResultDisplayTitle(sysEntry);
    }
  }

  const sysSlug = toUrlSlug(systemName || entry.systemId || cleanId);

  let targetView: OrbitTargetView = 'galaxy';
  let targetPathname = '/galaxy';
  const params = new URLSearchParams();

  const isMoonTarget =
    entry.targetType === 'moon' ||
    (Boolean(entry.parentBodyId) && entry.parentBodyId !== entry.systemId);
  const isStarOrPlanetTarget =
    SYSTEM_SCOPED_TARGET_TYPES.has(entry.targetType) ||
    (Boolean(currentPathname?.startsWith('/system/')) && Boolean(entry.systemId));

  if (isMoonTarget) {
    const parentPlanetSlug = toUrlSlug(
      entry.parentBodyId ?? DEFAULT_ORIGIN_TARGETS.intraSystemOriginId,
    );
    targetView = 'planet';
    targetPathname = `/planet/${encodeURIComponent(parentPlanetSlug)}`;
    params.set('center', itemSlug);
    params.set('focus', itemSlug);
    params.set('select', `layer:${layerSlug}`);
    params.set('layer', `${layerSlug}:${itemSlug}`);
  } else if (isStarOrPlanetTarget) {
    targetView = 'system';
    targetPathname = `/system/${encodeURIComponent(sysSlug)}`;
    params.set('center', itemSlug);
    params.set('focus', itemSlug);
    params.set('select', `layer:${layerSlug}`);
    params.set('layer', `${layerSlug}:${itemSlug}`);
  } else {
    targetView = 'galaxy';
    targetPathname = '/galaxy';
    params.set('center', sysSlug);
    params.set('focus', itemSlug);
    params.set('select', `layer:${layerSlug}`);
    params.set('layer', `${layerSlug}:${itemSlug}`);
  }

  const qs = params.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ',');
  const href = `${targetPathname}?${qs}`;

  return {
    itemSlug,
    targetView,
    href,
  };
}

/**
 * Pure helper building the close/dismiss href that strips only the active `layer`
 * query parameter while preserving `select`, pathname, and all other parameters (DEC-R014f).
 */
export function buildLayerCloseHref(
  currentPathname: string,
  currentSearch: string,
): string {
  const params = new URLSearchParams(currentSearch);
  params.delete('layer');

  const qs = params.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ',');
  return `${currentPathname}${qs.length > 0 ? `?${qs}` : ''}`;
}
