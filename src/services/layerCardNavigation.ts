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

  if (currentPathname?.startsWith('/system/')) {
    targetView = 'system';
    targetPathname = `/system/${encodeURIComponent(sysSlug)}`;
    params.set('center', itemSlug);
    params.set('focus', itemSlug);
    params.set('select', `layer:${layerSlug}`);
    params.set('layer', `${layerSlug}:${itemSlug}`);
  } else if (currentPathname?.startsWith('/planet/')) {
    targetView = 'planet';
    targetPathname = currentPathname.split('?')[0]?.split('#')[0] ?? '';
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
