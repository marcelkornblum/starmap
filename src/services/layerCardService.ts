import type {
  DatasetLayerEntry,
  DatasetLayerIndexEntry,
  DatasetLayerKind,
  DatasetLayerManifest,
  DatasetLayerSourceMeta,
  ObservationalConfidence,
} from '../types/astro';
import type { CompactSearchEntry } from '../utils/compactDataCodec';
import {
  findCanonLayerById,
  getOrderedLayerEntries,
  splitAliases,
  toCanonicalLayerSlug,
  toUrlSlug,
} from '../utils/datasetLayerCodec';
import {
  buildEntityOrbitTargetHref,
  type OrbitTargetView,
} from './details/navigationAndCamera';
import {
  findFocusedEntryInCorpus,
  formatSlugFallbackTitle,
  resolveResultDisplayTitle,
} from './searchService';

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
 * Pure parser extracting `{ layerSlug, itemSlug? }` from a URL `?layer=` query parameter.
 * Examples:
 * - 'recent-discoveries' -> { layerSlug: 'recent-discoveries' }
 * - 'overlay-recent-discoveries' -> { layerSlug: 'recent-discoveries' }
 * - 'recent-discoveries:lhs-1140-b' -> { layerSlug: 'recent-discoveries', itemSlug: 'lhs-1140-b' }
 * - 'layer:project-hail-mary:tau-ceti' -> { layerSlug: 'project-hail-mary', itemSlug: 'tau-ceti' }
 */
export function parseLayerQueryParam(
  rawLayerParam?: string | null,
): { layerSlug: string; itemSlug?: string } | null {
  if (!rawLayerParam || typeof rawLayerParam !== 'string') {
    return null;
  }
  const trimmed = rawLayerParam.trim();
  if (!trimmed) {
    return null;
  }

  // Strip leading 'layer:' or 'overlay:'
  const withoutPrefix = trimmed.replace(/^(?:layer|overlay):/i, '');
  const colonIndex = withoutPrefix.indexOf(':');

  if (colonIndex === -1) {
    const layerSlug = toCanonicalLayerSlug(withoutPrefix);
    return layerSlug ? { layerSlug } : null;
  }

  const layerPart = withoutPrefix.slice(0, colonIndex);
  const itemPart = withoutPrefix.slice(colonIndex + 1);

  const layerSlug = toCanonicalLayerSlug(layerPart);
  if (!layerSlug) {
    return null;
  }

  const itemSlug = toUrlSlug(itemPart);
  return itemSlug ? { layerSlug, itemSlug } : { layerSlug };
}

/**
 * Random exploration picker excluding the currently active layer.
 * Returns `/galaxy?select=layer:${layerSlug}&layer=${layerSlug}`.
 */
export function pickRandomLayerOverviewHref(
  currentLayerParam: string | null | undefined,
  randomFn: () => number,
  layers: readonly DatasetLayerIndexEntry[],
): string {
  if (layers.length === 0) {
    return '/galaxy';
  }

  const parsedCurrent = parseLayerQueryParam(currentLayerParam);
  const activeSlug = parsedCurrent?.layerSlug;

  const candidates = activeSlug
    ? layers.filter((l) => toCanonicalLayerSlug(l.layerId) !== activeSlug)
    : layers;

  const pool = candidates.length > 0 ? candidates : layers;
  const pickedIndex = Math.min(
    Math.floor(randomFn() * pool.length),
    pool.length - 1,
  );
  const chosen = pool[pickedIndex] ?? pool[0];
  const chosenSlug = toCanonicalLayerSlug(chosen.layerId);

  return `/galaxy?select=layer:${chosenSlug}&layer=${chosenSlug}`;
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

  const itemName = entry.inUniverseName || entry.resolvedName || cleanId;

  const result = buildEntityOrbitTargetHref({
    id: entry.targetId,
    name: itemName,
    entityKind: entry.targetType,
    systemId: entry.systemId,
    systemName,
    parentBodyId: entry.parentBodyId,
    layerId: layer.layerId,
    isSolarSystem: entry.systemId === 'sol' || entry.targetId === 'sol',
    currentPathname,
  });

  return {
    itemSlug,
    targetView: result.targetView,
    href: result.href,
  };
}

/**
 * Pure helper building the close/dismiss href that strips the active layer from `layer`
 * and `select` query parameters while preserving pathname and all other parameters.
 */
export function buildLayerCloseHref(
  currentPathname: string,
  currentSearch: string,
): string {
  const params = new URLSearchParams(currentSearch);
  const layerParam = params.get('layer');
  const parsed = parseLayerQueryParam(layerParam);

  params.delete('layer');

  if (parsed?.layerSlug) {
    const select = params.get('select');
    if (select) {
      const remainingTokens = select
        .split(',')
        .map((t) => t.trim())
        .filter((token) => {
          const match = /^layer:(.+)$/i.exec(token);
          if (match?.[1]) {
            return toCanonicalLayerSlug(match[1]) !== parsed.layerSlug;
          }
          return true;
        });

      if (remainingTokens.length > 0) {
        params.set('select', remainingTokens.join(','));
      } else {
        params.delete('select');
      }
    }
  }

  const qs = params.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ',');
  return `${currentPathname}${qs.length > 0 ? `?${qs}` : ''}`;
}

/**
 * Pure domain resolver that constructs an `ActiveLayerCardModel` (Overview or Item)
 * from the active URL query parameters and layer manifests.
 */
export function resolveActiveLayerCard(
  input: ResolveActiveLayerCardInput,
): ActiveLayerCardModel | null {
  const parsed = parseLayerQueryParam(input.layerParam);
  if (!parsed) {
    return null;
  }

  const activeLayers = input.layers;
  const layer = findCanonLayerById(parsed.layerSlug, activeLayers);
  if (!layer) {
    return null;
  }

  const layerSlug = toCanonicalLayerSlug(layer.layerId);
  const kindLabel =
    layer.kind === 'scientific-overlay'
      ? 'Scientific Layer'
      : layer.kind === 'custom-user'
        ? 'Custom Layer'
        : 'Fictional Canon';

  const closeHref = buildLayerCloseHref(
    input.currentPathname,
    input.currentSearch,
  );
  const orderedEntries = getOrderedLayerEntries(layer);
  const overviewHref = `/galaxy?select=layer:${layerSlug}&layer=${layerSlug}`;

  // Mode 1: Overview mode when itemSlug is absent
  if (!parsed.itemSlug) {
    const firstEntry = orderedEntries[0];
    const firstItemTitle = firstEntry
      ? firstEntry.inUniverseName ||
        firstEntry.resolvedName ||
        formatSlugFallbackTitle(firstEntry.targetId)
      : undefined;
    const startHref = firstEntry
      ? resolveLayerItemTargetHref(
          layer,
          firstEntry,
          input.corpus,
          input.currentPathname,
        ).href
      : input.currentPathname;

    return {
      mode: 'overview',
      layerId: layer.layerId,
      layerSlug,
      title: layer.title,
      ...(layer.subtitle ? { subtitle: layer.subtitle } : {}),
      kind: layer.kind,
      kindLabel,
      description: layer.description,
      itemCount: orderedEntries.length,
      ...(layer.source ? { source: layer.source } : {}),
      ...(firstItemTitle ? { firstItemTitle } : {}),
      startHref,
      closeHref,
    };
  }

  // Mode 2: Item mode when itemSlug is present
  const targetItemSlug = parsed.itemSlug;
  const entryIndex = orderedEntries.findIndex((entry) => {
    const rawTargetSlug = toUrlSlug(entry.targetId);
    const cleanTargetSlug = toUrlSlug(
      entry.targetId.includes(':')
        ? entry.targetId.split(':').slice(1).join(':')
        : entry.targetId,
    );
    const systemSlug = entry.systemId ? toUrlSlug(entry.systemId) : '';
    const nameSlug = entry.inUniverseName ? toUrlSlug(entry.inUniverseName) : '';
    const aliasSlugs = splitAliases(entry.aliases).map(toUrlSlug);

    return (
      rawTargetSlug === targetItemSlug ||
      cleanTargetSlug === targetItemSlug ||
      systemSlug === targetItemSlug ||
      nameSlug === targetItemSlug ||
      aliasSlugs.includes(targetItemSlug)
    );
  });

  // If itemSlug does not match any entry in this layer, fallback to overview
  if (entryIndex === -1) {
    const firstEntry = orderedEntries[0];
    const firstItemTitle = firstEntry
      ? firstEntry.inUniverseName ||
        firstEntry.resolvedName ||
        formatSlugFallbackTitle(firstEntry.targetId)
      : undefined;
    const startHref = firstEntry
      ? resolveLayerItemTargetHref(
          layer,
          firstEntry,
          input.corpus,
          input.currentPathname,
        ).href
      : input.currentPathname;

    return {
      mode: 'overview',
      layerId: layer.layerId,
      layerSlug,
      title: layer.title,
      ...(layer.subtitle ? { subtitle: layer.subtitle } : {}),
      kind: layer.kind,
      kindLabel,
      description: layer.description,
      itemCount: orderedEntries.length,
      ...(layer.source ? { source: layer.source } : {}),
      ...(firstItemTitle ? { firstItemTitle } : {}),
      startHref,
      closeHref,
    };
  }

  const activeEntry = orderedEntries[entryIndex];
  const totalItems = orderedEntries.length;
  const stepIndex = entryIndex + 1;

  const prevHref =
    entryIndex === 0
      ? overviewHref
      : resolveLayerItemTargetHref(
          layer,
          orderedEntries[entryIndex - 1],
          input.corpus,
          input.currentPathname,
        ).href;
  const prevLabel = entryIndex === 0 ? 'Overview' : 'Previous';

  const nextEntry =
    entryIndex === totalItems - 1
      ? orderedEntries[0]
      : orderedEntries[entryIndex + 1];
  const nextHref = resolveLayerItemTargetHref(
    layer,
    nextEntry,
    input.corpus,
    input.currentPathname,
  ).href;
  const nextLabel = 'Next';

  const itemTitle =
    activeEntry.inUniverseName ||
    activeEntry.resolvedName ||
    formatSlugFallbackTitle(activeEntry.targetId);

  return {
    mode: 'item',
    layerId: layer.layerId,
    layerSlug,
    layerTitle: layer.title,
    ...(activeEntry.subtitle ? { subtitle: activeEntry.subtitle } : {}),
    kind: layer.kind,
    kindLabel,
    overviewHref,
    stepIndex,
    totalItems,
    itemSlug: parsed.itemSlug,
    itemTitle,
    text: activeEntry.text,
    ...(activeEntry.confidence ? { confidence: activeEntry.confidence } : {}),
    prevHref,
    prevLabel,
    nextHref,
    nextLabel,
    closeHref,
  };
}
