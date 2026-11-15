import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { resolveResultDisplayTitle } from '../search/searchCorpusHelpers';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
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

export const buildSystemOrbitalSchematic = (
  systemBodies: SystemOrbitalSchematicInput | null,
  corpusInput: readonly CompactSearchEntry[] = [],
): OrbitalSchematicSummary | null => {
  if (!systemBodies) {
    return null;
  }

  const corpus: readonly CompactSearchEntry[] =
    corpusInput.length > 0 ? corpusInput : (systemBodies.corpus ?? []);

  const {
    systemId,
    systemName,
    focusedEntityId,
    selectedEntityIds,
    stars,
    planets,
    disks = [],
    moonsAndDwarfPlanets: inputMoonsAndDwarfPlanets,
  } = systemBodies;

  const rawMoonsAndDwarfPlanets = inputMoonsAndDwarfPlanets ?? [];
  const moonsAndDwarfPlanets =
    rawMoonsAndDwarfPlanets.length > 0
      ? rawMoonsAndDwarfPlanets
      : corpus
          .filter((e) => e.s === systemId && (e.k === 3 || e.k === 4))
          .map((e) => ({
            id: e.i,
            name: resolveResultDisplayTitle(e),
            href: buildSystemElementFocusHref(
              systemName || systemId,
              resolveResultDisplayTitle(e) || e.i,
            ),
            categoryKey: e.k === 3 ? 'moon' as const : 'dwarf-planet' as const,
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
  const corpusById = new Map<string, CompactSearchEntry>();
  const corpusBySlug = new Map<string, CompactSearchEntry>();
  for (const entry of corpus) {
    if (!corpusById.has(entry.i)) {
      corpusById.set(entry.i, entry);
    }
    const slug = toUrlSlug(entry.i);
    if (slug && !corpusBySlug.has(slug)) {
      corpusBySlug.set(slug, entry);
    }
  }
  const getCorpusEntry = (id: string): CompactSearchEntry | undefined =>
    corpusById.get(id) ?? corpusBySlug.get(toUrlSlug(id));

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
