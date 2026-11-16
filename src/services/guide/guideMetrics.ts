/**
 * DEC-027 / Phase 3.3A-1: Guide Telemetry Metrics & Comparative View-Models
 * Metric resolution and comparative evaluations against standard reference baselines.
 */

import {
  METRIC_GUIDE_ENTRIES,
  METRIC_ALIASES,
  type MetricGuideEntry,
} from '../../content/guide';
import {
  getCachedDetailRecord,
  fetchDetailRecord,
} from '../../data/detailsRepository';
import {
  getCachedCorpusForFilter,
  loadSearchCorpusForFilter,
} from '../../data/searchRepository';
import { findFocusedEntryInCorpus } from '../search/searchCorpusHelpers';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import { formatSlugFallbackTitle } from '../../utils/starNaming';
import type { SystemManifest, StellarComponent, ExoplanetRecord } from '../../types/astro';
import {
  SOL_REFERENCE_TARGET,
  EARTH_REFERENCE_TARGET,
  DEFAULT_GUIDE_BENCHMARKS,
} from '../../config/referenceTargets';
import type {
  MetricComparison,
  MetricTargetComparison,
} from './guideTypes';
import {
  evaluateMetricForTarget,
  getMetricBaseline,
  createUncataloguedComparison,
} from './guideMetricBenchmarks';

export const resolveMetricGuideEntry = (
  rawSlug: string,
): MetricGuideEntry | null => {
  if (!rawSlug) return null;
  const trimmed = rawSlug.trim().toLowerCase();
  if (!trimmed) return null;

  const canonicalId = METRIC_ALIASES[trimmed] ?? trimmed;
  const entry = METRIC_GUIDE_ENTRIES.find((e) => e.id === canonicalId);
  return entry ?? null;
};

export const resolveMetricGuideEntries = (
  rawSlug: string,
): MetricGuideEntry[] => {
  if (!rawSlug) return [];
  const tokens = rawSlug
    .split(/[,+]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const seen = new Set<string>();
  const results: MetricGuideEntry[] = [];
  for (const token of tokens) {
    const entry = resolveMetricGuideEntry(token);
    if (entry && !seen.has(entry.id)) {
      seen.add(entry.id);
      results.push(entry);
    }
  }
  return results;
};

function resolveManifestForToken(token: string): SystemManifest | null {
  const norm = toUrlSlug(token);
  const cached =
    getCachedDetailRecord(token) ??
    (norm !== token ? getCachedDetailRecord(norm) : undefined);
  if (cached?.kind === 'system') return cached.record;

  const corpus = getCachedCorpusForFilter('all') ?? [];
  const entry =
    findFocusedEntryInCorpus(token, corpus) ??
    (norm !== token ? findFocusedEntryInCorpus(norm, corpus) : undefined);
  if (entry?.s) {
    const parent = getCachedDetailRecord(entry.s);
    if (parent?.kind === 'system') return parent.record;
  }
  if (entry?.i) {
    const matched = getCachedDetailRecord(entry.i);
    if (matched?.kind === 'system') return matched.record;
  }

  return null;
}

export async function hydrateMetricComparison(
  rawMetricSlug: string,
  focusedEntityId?: string,
): Promise<void> {
  const entries = resolveMetricGuideEntries(rawMetricSlug);
  const hasOrbital = entries.some((e) => e.category === 'Orbital & Planetary Telemetry');
  const tokens =
    focusedEntityId && focusedEntityId.trim()
      ? focusedEntityId.split(',').map((t) => t.trim()).filter(Boolean)
      : [hasOrbital ? DEFAULT_GUIDE_BENCHMARKS.orbitalBenchmarkId : DEFAULT_GUIDE_BENCHMARKS.stellarBenchmarkId];

  const corpus =
    getCachedCorpusForFilter('all') ??
    (await loadSearchCorpusForFilter('all').catch(() => undefined));

  const fetchPromises: Promise<unknown>[] = [];
  for (const token of tokens) {
    fetchPromises.push(fetchDetailRecord(token).catch(() => undefined));
    if (corpus) {
      const entry =
        findFocusedEntryInCorpus(token, corpus) ??
        findFocusedEntryInCorpus(toUrlSlug(token), corpus);
      if (entry?.s) fetchPromises.push(fetchDetailRecord(entry.s).catch(() => undefined));
      if (entry?.i && entry.i !== token) fetchPromises.push(fetchDetailRecord(entry.i).catch(() => undefined));
    }
  }
  await Promise.all(fetchPromises);
}

export const resolveMetricComparison = (
  rawMetricSlug: string,
  focusedEntityId?: string,
): MetricComparison | null => {
  const metric = resolveMetricGuideEntry(rawMetricSlug);
  if (!metric) return null;

  const isFromFocusedContext = Boolean(focusedEntityId && focusedEntityId.trim());
  const isOrbitalOrPlanetary = metric.category === 'Orbital & Planetary Telemetry';
  const isStellar = metric.category === 'Stellar Telemetry';

  const tokens =
    focusedEntityId && focusedEntityId.trim()
      ? focusedEntityId.split(',').map((t) => t.trim()).filter(Boolean)
      : [isOrbitalOrPlanetary ? DEFAULT_GUIDE_BENCHMARKS.orbitalBenchmarkId : DEFAULT_GUIDE_BENCHMARKS.stellarBenchmarkId];

  const targetComparisons: MetricTargetComparison[] = [];

  for (const token of tokens) {
    const norm = toUrlSlug(token);
    const manifest = resolveManifestForToken(token);
    const matchedStar = manifest?.stars.find((s) => toUrlSlug(s.id) === norm || toUrlSlug(s.name) === norm);
    const matchedPlanet = manifest?.planets.find((p) => toUrlSlug(p.id) === norm || toUrlSlug(p.name) === norm);

    const isSystemLevel =
      manifest &&
      !matchedStar &&
      !matchedPlanet &&
      (norm === toUrlSlug(manifest.id) ||
        norm === toUrlSlug(manifest.name) ||
        norm === SOL_REFERENCE_TARGET.id ||
        norm === DEFAULT_GUIDE_BENCHMARKS.stellarBenchmarkId ||
        manifest.stars.length > 0 ||
        manifest.planets.length > 0);

    if (isSystemLevel && manifest) {
      const systemHref = `/system/${encodeURIComponent(manifest.id)}`;
      const items = isStellar ? manifest.stars : isOrbitalOrPlanetary ? manifest.planets : null;
      if (items !== null) {
        if (items.length > 0) {
          for (const item of items) {
            const targetHref = isStellar && items.length === 1 ? systemHref : `${systemHref}?focus=${encodeURIComponent(item.id)}`;
            const ctx = isStellar
              ? { targetId: item.id, targetName: item.name, targetHref, manifest, targetStar: item as StellarComponent }
              : { targetId: item.id, targetName: item.name, targetHref, manifest, targetPlanet: item as ExoplanetRecord };
            targetComparisons.push(evaluateMetricForTarget(metric.id, ctx));
          }
        } else {
          targetComparisons.push(createUncataloguedComparison(token, manifest.name, systemHref));
        }
      } else {
        targetComparisons.push(evaluateMetricForTarget(metric.id, { targetId: manifest.id, targetName: manifest.name, targetHref: systemHref, manifest }));
      }
    } else {
      const star = matchedStar ?? (isStellar ? manifest?.stars[0] : undefined);
      const planet = matchedPlanet ?? (isOrbitalOrPlanetary ? manifest?.planets[0] : undefined);
      const name = (isOrbitalOrPlanetary ? planet?.name : (star?.name ?? manifest?.name)) ?? formatSlugFallbackTitle(token);
      const href = isOrbitalOrPlanetary
        ? `/system/${encodeURIComponent(manifest?.id ?? token)}?focus=${encodeURIComponent(token)}`
        : `/system/${encodeURIComponent(manifest?.id ?? token)}`;

      targetComparisons.push(
        evaluateMetricForTarget(metric.id, {
          targetId: token,
          targetName: name,
          targetHref: href,
          manifest,
          targetStar: star,
          targetPlanet: planet,
        }),
      );
    }
  }

  const primaryTarget =
    targetComparisons[0] ??
    createUncataloguedComparison(
      tokens[0] ?? DEFAULT_GUIDE_BENCHMARKS.stellarBenchmarkId,
      formatSlugFallbackTitle(tokens[0] ?? DEFAULT_GUIDE_BENCHMARKS.stellarBenchmarkName),
      `/system/${encodeURIComponent(tokens[0] ?? DEFAULT_GUIDE_BENCHMARKS.stellarBenchmarkId)}`,
    );

  const baselineName = metric.comparisonBaselineLabel as
    | typeof SOL_REFERENCE_TARGET.name
    | typeof EARTH_REFERENCE_TARGET.name;
  const baselineHref =
    baselineName === SOL_REFERENCE_TARGET.name ? SOL_REFERENCE_TARGET.href : EARTH_REFERENCE_TARGET.href;

  const { baselineValue, baselineFamiliar } = getMetricBaseline(metric.id);

  return {
    metricId: metric.id,
    baselineName,
    baselineHref,
    baselineValue,
    baselineFamiliar,
    baselineReticleType: baselineName === SOL_REFERENCE_TARGET.name ? 'star' : 'terrestrial',
    targetId: primaryTarget.targetId,
    targetName: primaryTarget.targetName,
    targetHref: primaryTarget.targetHref,
    targetValue: primaryTarget.targetValue,
    targetFamiliar: primaryTarget.targetFamiliar,
    targetNumericValue: primaryTarget.numericValue,
    targetUnit: primaryTarget.unit,
    targetReticleType: primaryTarget.reticleType,
    relativeRatioLabel: primaryTarget.relativeRatioLabel,
    isFromFocusedContext,
    isCatalogued: primaryTarget.isCatalogued,
    targets: targetComparisons,
  };
};
