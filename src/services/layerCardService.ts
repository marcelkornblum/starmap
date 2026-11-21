import type {
  DatasetLayerIndexEntry,
  DatasetLayerManifest,
} from '../types/datasetLayers';
import { getOrderedLayerEntries } from '../utils/datasetLayerCodec';
import {
  findCanonLayerById,
  splitAliases,
  toCanonicalLayerSlug,
  toUrlSlug,
} from '../utils/datasetLayerSlugs';
import { parseLayerQueryParam } from '../utils/url';
import {
  buildLayerCloseHref,
  resolveLayerItemTargetHref,
  type ActiveLayerCardModel,
  type ActiveLayerOverviewCardModel,
  type ResolveActiveLayerCardInput,
} from './layerCardNavigation';
import {
  findFocusedEntryInCorpus,
  resolveResultDisplayTitle,
} from './search/searchCorpusHelpers';
import { formatSlugFallbackTitle } from '../utils/starNaming';

/**
 * Random exploration picker excluding the currently active layer.
 * Returns `/galaxy?select=layer:${layerSlug}&layer=${layerSlug}`.
 */
export function pickRandomLayerOverviewHref(
  currentLayerParam: string | null | undefined,
  randomFn: () => number,
  layers: readonly DatasetLayerIndexEntry[],
): string {
  if (layers.length === 0) return '/galaxy';
  const parsedCurrent = parseLayerQueryParam(currentLayerParam);
  const activeSlug = parsedCurrent?.layerSlug;

  const multiEntryLayers = layers.filter((l) => (l.entryCount ?? 0) > 1);
  const basePool = multiEntryLayers.length > 0 ? multiEntryLayers : layers;
  const candidates = activeSlug
    ? basePool.filter((l) => toCanonicalLayerSlug(l.layerId) !== activeSlug)
    : basePool;

  const pool = candidates.length > 0 ? candidates : basePool;
  const pickedIndex = Math.min(Math.floor(randomFn() * pool.length), pool.length - 1);
  const chosen = pool[pickedIndex] ?? pool[0];
  if (!chosen) return '/galaxy';
  const chosenSlug = toCanonicalLayerSlug(chosen.layerId);
  return `/galaxy?select=layer:${chosenSlug}&layer=${chosenSlug}`;
}

export function buildLayerOverviewCard(
  layer: DatasetLayerManifest,
  layerSlug: string,
  kindLabel: string,
  input: ResolveActiveLayerCardInput,
  closeHref: string,
): ActiveLayerOverviewCardModel {
  const orderedEntries = getOrderedLayerEntries(layer);
  const firstEntry = orderedEntries[0];
  const firstItemTitle = firstEntry
    ? firstEntry.inUniverseName || firstEntry.resolvedName || formatSlugFallbackTitle(firstEntry.targetId)
    : undefined;
  const startHref = firstEntry
    ? resolveLayerItemTargetHref(layer, firstEntry, input.corpus, input.currentPathname).href
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

export function buildLayerItemCard(
  layer: DatasetLayerManifest,
  layerSlug: string,
  kindLabel: string,
  targetItemSlug: string,
  input: ResolveActiveLayerCardInput,
  closeHref: string,
): ActiveLayerCardModel {
  const orderedEntries = getOrderedLayerEntries(layer);
  const overviewHref = `/galaxy?select=layer:${layerSlug}&layer=${layerSlug}`;

  const entryIndex = orderedEntries.findIndex((entry) => {
    const rawTargetSlug = toUrlSlug(entry.targetId);
    const cleanId = entry.targetId.includes(':') ? entry.targetId.split(':').slice(1).join(':') : entry.targetId;
    const cleanTargetSlug = toUrlSlug(cleanId);
    const systemSlug = entry.systemId ? toUrlSlug(entry.systemId) : '';
    const nameSlug = entry.inUniverseName ? toUrlSlug(entry.inUniverseName) : '';
    const resolvedSlug = entry.resolvedName ? toUrlSlug(entry.resolvedName) : '';
    const aliasSlugs = splitAliases(entry.aliases).map(toUrlSlug);

    let systemDisplaySlug = '';
    if (entry.systemId && input.corpus) {
      const sysEntry = findFocusedEntryInCorpus(entry.systemId, input.corpus);
      if (sysEntry) systemDisplaySlug = toUrlSlug(resolveResultDisplayTitle(sysEntry));
    }

    return (
      rawTargetSlug === targetItemSlug ||
      cleanTargetSlug === targetItemSlug ||
      (systemSlug.length > 0 && systemSlug === targetItemSlug) ||
      (nameSlug.length > 0 && nameSlug === targetItemSlug) ||
      (resolvedSlug.length > 0 && resolvedSlug === targetItemSlug) ||
      (systemDisplaySlug.length > 0 && systemDisplaySlug === targetItemSlug) ||
      aliasSlugs.includes(targetItemSlug) ||
      (cleanTargetSlug.length > 0 && targetItemSlug.startsWith(cleanTargetSlug)) ||
      (systemSlug.length > 0 && targetItemSlug.startsWith(systemSlug))
    );
  });

  const effectiveIndex = entryIndex === -1 && orderedEntries.length === 1 ? 0 : entryIndex;
  if (effectiveIndex === -1) {
    return buildLayerOverviewCard(layer, layerSlug, kindLabel, input, closeHref);
  }

  const activeEntry = orderedEntries[effectiveIndex];
  if (!activeEntry) {
    return buildLayerOverviewCard(layer, layerSlug, kindLabel, input, closeHref);
  }
  const totalItems = orderedEntries.length;
  const stepIndex = effectiveIndex + 1;

  const prevEntry = effectiveIndex > 0 ? orderedEntries[effectiveIndex - 1] : undefined;
  const prevHref = prevEntry
    ? resolveLayerItemTargetHref(layer, prevEntry, input.corpus, input.currentPathname).href
    : overviewHref;

  const nextEntry = (effectiveIndex === totalItems - 1 ? orderedEntries[0] : orderedEntries[effectiveIndex + 1]) ?? activeEntry;
  const nextHref = resolveLayerItemTargetHref(layer, nextEntry, input.corpus, input.currentPathname).href;

  const itemTitle =
    activeEntry.inUniverseName || activeEntry.resolvedName || formatSlugFallbackTitle(activeEntry.targetId);

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
    itemSlug: targetItemSlug,
    itemTitle,
    text: activeEntry.text,
    ...(activeEntry.confidence ? { confidence: activeEntry.confidence } : {}),
    prevHref,
    prevLabel: effectiveIndex === 0 ? 'Overview' : 'Previous',
    nextHref,
    nextLabel: 'Next',
    closeHref,
  };
}

/**
 * Pure domain resolver constructing an ActiveLayerCardModel (Overview or Item).
 */
export function resolveActiveLayerCard(
  input: ResolveActiveLayerCardInput,
): ActiveLayerCardModel | null {
  const parsed = parseLayerQueryParam(input.layerParam);
  if (!parsed) return null;

  const layer = findCanonLayerById(parsed.layerSlug, input.layers);
  if (!layer) return null;

  const layerSlug = toCanonicalLayerSlug(layer.layerId);
  const kindLabel =
    layer.kind === 'scientific-overlay'
      ? 'Scientific Layer'
      : layer.kind === 'custom-user'
        ? 'Custom Layer'
        : 'Fictional Canon';

  const closeHref = buildLayerCloseHref(input.currentPathname, input.currentSearch);

  if (!parsed.itemSlug) {
    return buildLayerOverviewCard(layer, layerSlug, kindLabel, input, closeHref);
  }
  return buildLayerItemCard(layer, layerSlug, kindLabel, parsed.itemSlug, input, closeHref);
}
