import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { resolveResultDisplayTitle } from '../search/searchCorpusHelpers';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import { getCorpusSystemChildrenIndex } from './focusedChildrenResolver';
import { getMergedCorpusParts } from './activeStarsCorpus';
import { isDwarfPlanetInDisk } from './detailsHazards';
import {
  buildPlanetDetailsHref,
  buildSystemElementFocusHref,
} from './detailsNavigation';
import {
  buildCandidateMoonChildren,
  buildDiskSchematicCandidate,
  resolveSchematicRegion,
  sortSchematicCandidates,
  type CandidateItem,
} from './orbitalSchematicHelpers';
import type {
  OrbitalSchematicItem,
  OrbitalSchematicSummary,
  SystemOrbitalSchematicInput,
} from './detailsHierarchyTypes';

export interface SchematicCorpusLookup {
  readonly byId: ReadonlyMap<string, CompactSearchEntry>;
  readonly bySlug: ReadonlyMap<string, CompactSearchEntry>;
}

const schematicCorpusIndexCache = new WeakMap<
  readonly CompactSearchEntry[],
  SchematicCorpusLookup
>();

export function getOrBuildSchematicCorpusIndex(
  corpus: readonly CompactSearchEntry[],
): SchematicCorpusLookup {
  let cached = schematicCorpusIndexCache.get(corpus);
  if (!cached) {
    const parts = getMergedCorpusParts(corpus);
    if (parts) {
      const baseIndex = getOrBuildSchematicCorpusIndex(parts.base);
      if (parts.extras.length === 0) {
        schematicCorpusIndexCache.set(corpus, baseIndex);
        return baseIndex;
      }
      const byId = new Map<string, CompactSearchEntry>(baseIndex.byId);
      const bySlug = new Map<string, CompactSearchEntry>(baseIndex.bySlug);
      for (const entry of parts.extras) {
        if (!byId.has(entry.i)) byId.set(entry.i, entry);
        const slug = toUrlSlug(entry.i);
        if (slug && !bySlug.has(slug)) bySlug.set(slug, entry);
      }
      cached = { byId, bySlug };
      schematicCorpusIndexCache.set(corpus, cached);
      return cached;
    }

    const byId = new Map<string, CompactSearchEntry>();
    const bySlug = new Map<string, CompactSearchEntry>();
    for (const entry of corpus) {
      if (!byId.has(entry.i)) {
        byId.set(entry.i, entry);
      }
      const slug = toUrlSlug(entry.i);
      if (slug && !bySlug.has(slug)) {
        bySlug.set(slug, entry);
      }
    }
    cached = { byId, bySlug };
    schematicCorpusIndexCache.set(corpus, cached);
  }
  return cached;
}

export const buildSystemOrbitalSchematic = (
  systemBodies: SystemOrbitalSchematicInput | null,
  corpusInput: readonly CompactSearchEntry[] = [],
): OrbitalSchematicSummary | null => {
  if (!systemBodies) {
    return null;
  }

  const corpus: readonly CompactSearchEntry[] =
    corpusInput.length > 0
      ? corpusInput
      : 'corpus' in systemBodies && systemBodies.corpus
        ? systemBodies.corpus
        : [];

  const { systemId, systemName, stars, planets } = systemBodies;
  const focusedEntityId =
    'focusedEntityId' in systemBodies ? systemBodies.focusedEntityId : undefined;
  const selectedEntityIds =
    'selectedEntityIds' in systemBodies ? systemBodies.selectedEntityIds : undefined;
  const disks = 'disks' in systemBodies ? systemBodies.disks ?? [] : [];
  const inputMoonsAndDwarfPlanets =
    'moonsAndDwarfPlanets' in systemBodies
      ? systemBodies.moonsAndDwarfPlanets
      : undefined;

  const rawMoonsAndDwarfPlanets = inputMoonsAndDwarfPlanets ?? [];
  const systemChildren = getCorpusSystemChildrenIndex(corpus);
  const sysSlug = toUrlSlug(systemId);
  const candidateChildren =
    systemChildren.get(sysSlug) ??
    (systemId !== sysSlug ? systemChildren.get(systemId) : undefined) ??
    [];

  const moonsAndDwarfPlanets =
    rawMoonsAndDwarfPlanets.length > 0
      ? rawMoonsAndDwarfPlanets
      : candidateChildren
          .filter((e) => e.k === 3 || e.k === 4)
          .map((e) => ({
            id: e.i,
            name: resolveResultDisplayTitle(e),
            href: buildSystemElementFocusHref(
              systemName || systemId,
              resolveResultDisplayTitle(e) || e.i,
            ),
            categoryKey: e.k === 3 ? ('moon' as const) : ('dwarf-planet' as const),
            categoryLabel: e.k === 3 ? 'Moon' : 'Dwarf Planet',
          }));

  const selectedSet = new Set(selectedEntityIds ?? []);
  const items: OrbitalSchematicItem[] = [];

  for (const star of stars) {
    items.push({
      id: star.id,
      name: star.name,
      href:
        star.href ??
        buildSystemElementFocusHref(
          systemName || systemId,
          star.name || star.id,
        ),
      kind: 'star',
      orbitRank: 0,
      summaryLabel: `Component ${star.componentDesignation} · ${star.spectralType}`,
      inHabitableZone: false,
      isFocused: focusedEntityId === star.id,
      isSelected: selectedSet.has(star.id),
    });
  }

  const candidates: CandidateItem[] = [];
  const { byId, bySlug } = getOrBuildSchematicCorpusIndex(corpus);
  const getCorpusEntry = (id: string): CompactSearchEntry | undefined =>
    byId.get(id) ?? bySlug.get(toUrlSlug(id));

  for (const planet of planets) {
    const entry = getCorpusEntry(planet.id);
    candidates.push({
      id: planet.id,
      name: planet.name,
      href: planet.href ?? buildPlanetDetailsHref(planet.name || planet.id),
      kind: 'planet',
      summaryLabel: planet.composition ?? 'Planet',
      semiMajorAxisAu: planet.semiMajorAxisAu,
      isHabitableCandidate: Boolean(planet.isHabitableCandidate || entry?.z === 1),
      entry,
      originalIndex: candidates.length,
    });
  }

  for (const disk of disks) {
    const matchingResidents = moonsAndDwarfPlanets.filter((body) => {
      const entry = getCorpusEntry(body.id);
      if (entry?.o) return false;
      return isDwarfPlanetInDisk(entry, disk);
    });

    matchingResidents.sort((a, b) => {
      const entryA = getCorpusEntry(a.id);
      const entryB = getCorpusEntry(b.id);
      const aVal = entryA?.A ?? entryA?.r ?? Number.POSITIVE_INFINITY;
      const bVal = entryB?.A ?? entryB?.r ?? Number.POSITIVE_INFINITY;
      return aVal - bVal;
    });

    const residentChildren: OrbitalSchematicItem[] = matchingResidents.map((body, rIdx) => {
      const childEntry = getCorpusEntry(body.id);
      const region = resolveSchematicRegion(childEntry, Boolean(childEntry?.z === 1));
      return {
        id: body.id,
        name: body.name,
        href: body.href,
        kind: 'dwarf-planet' as const,
        orbitRank: childEntry?.r ?? rIdx + 1,
        summaryLabel: body.categoryLabel,
        ...(region ? { region } : {}),
        inHabitableZone: Boolean(childEntry?.z === 1),
        isFocused: focusedEntityId === body.id,
        isSelected: selectedSet.has(body.id),
      };
    });

    candidates.push(
      buildDiskSchematicCandidate(
        disk,
        systemName || systemId,
        candidates.length,
        residentChildren,
      ),
    );
  }

  for (const body of moonsAndDwarfPlanets) {
    const entry = getCorpusEntry(body.id);
    if (entry?.o) continue;
    if (disks.some((d) => isDwarfPlanetInDisk(entry, d))) continue;
    const isDwarf = entry?.k === 4 || body.categoryLabel === 'Dwarf Planet';
    candidates.push({
      id: body.id,
      name: body.name,
      href: body.href,
      kind: isDwarf ? 'dwarf-planet' : 'moon',
      summaryLabel: body.categoryLabel,
      semiMajorAxisAu: entry?.A,
      isHabitableCandidate: Boolean(entry?.z === 1),
      entry,
      originalIndex: candidates.length,
    });
  }

  const sortedCandidates = sortSchematicCandidates(candidates);

  sortedCandidates.forEach((c, index) => {
    const inHabitableZone = c.isHabitableCandidate || c.entry?.z === 1;
    const region = c.kind === 'belt' ? undefined : resolveSchematicRegion(c.entry, inHabitableZone);

    const matchingMoons = moonsAndDwarfPlanets.filter((moon) => {
      const entry = getCorpusEntry(moon.id);
      if (!entry?.o) return false;
      return (
        entry.o === c.id ||
        toUrlSlug(entry.o) === toUrlSlug(c.id) ||
        toUrlSlug(entry.o) === toUrlSlug(c.name)
      );
    });

    matchingMoons.sort((a, b) => {
      const entryA = getCorpusEntry(a.id);
      const entryB = getCorpusEntry(b.id);
      const rankA = entryA?.r ?? Number.POSITIVE_INFINITY;
      const rankB = entryB?.r ?? Number.POSITIVE_INFINITY;
      return rankA - rankB;
    });

    const children = buildCandidateMoonChildren(
      matchingMoons,
      getCorpusEntry,
      focusedEntityId,
      selectedSet,
    );

    const effectiveChildren =
      c.children && c.children.length > 0
        ? c.children
        : children.length > 0
          ? children
          : undefined;

    items.push({
      id: c.id,
      name: c.name,
      href: c.href,
      kind: c.kind,
      orbitRank: c.entry?.r ?? index + 1,
      summaryLabel: c.summaryLabel,
      inHabitableZone,
      ...(region ? { region } : {}),
      isFocused: focusedEntityId === c.id,
      isSelected: selectedSet.has(c.id),
      ...(c.radialSpanAu ? { radialSpanAu: c.radialSpanAu } : {}),
      ...(c.composition ? { composition: c.composition } : {}),
      ...(effectiveChildren ? { children: effectiveChildren } : {}),
    });
  });

  return {
    scope: 'system',
    systemId,
    systemName,
    items,
  };
};
