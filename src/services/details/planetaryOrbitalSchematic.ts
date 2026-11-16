import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import { resolveSchematicRegion } from './orbitalSchematicHelpers';
import { getOrBuildSchematicCorpusIndex } from './systemOrbitalSchematic';
import type {
  OrbitalSchematicEntityKind,
  OrbitalSchematicItem,
  OrbitalSchematicSummary,
  PlanetaryBodiesSummary,
} from './detailsHierarchyTypes';

interface CandidateItem {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly kind: OrbitalSchematicEntityKind;
  readonly summaryLabel: string;
  readonly entry?: CompactSearchEntry;
  readonly originalIndex: number;
}

export const buildPlanetaryOrbitalSchematic = (
  planetaryBodies: PlanetaryBodiesSummary | null,
  corpus: readonly CompactSearchEntry[] = [],
): OrbitalSchematicSummary | null => {
  if (!planetaryBodies) {
    return null;
  }

  const {
    systemId,
    systemName,
    planetId,
    planetName,
    planetHref,
    focusedEntityId,
    selectedEntityIds,
    planetDetail,
    moons,
  } = planetaryBodies;

  const selectedSet = new Set(selectedEntityIds ?? []);
  const items: OrbitalSchematicItem[] = [];

  const hostInHz = Boolean(planetDetail?.isHabitableCandidate);
  items.push({
    id: planetId,
    name: planetName,
    href: planetHref,
    kind: 'planet',
    orbitRank: 0,
    summaryLabel: planetDetail?.composition ?? 'Planet',
    inHabitableZone: hostInHz,
    ...(hostInHz ? { region: 'habitable-zone' as const } : {}),
    isFocused: focusedEntityId === planetId,
    isSelected: selectedSet.has(planetId),
  });

  const orbitingCandidates: CandidateItem[] = [];
  const { byId, bySlug } = getOrBuildSchematicCorpusIndex(corpus);
  const getCorpusEntry = (id: string): CompactSearchEntry | undefined =>
    byId.get(id) ?? bySlug.get(toUrlSlug(id));

  for (const moon of moons) {
    const entry = getCorpusEntry(moon.id);
    const isDwarf = entry?.k === 4 || moon.categoryLabel === 'Dwarf Planet';
    orbitingCandidates.push({
      id: moon.id,
      name: moon.name,
      href: moon.href,
      kind: isDwarf ? 'dwarf-planet' : 'moon',
      summaryLabel: moon.categoryLabel,
      entry,
      originalIndex: orbitingCandidates.length,
    });
  }

  orbitingCandidates.sort((a, b) => {
    const rankA = a.entry?.r ?? Number.POSITIVE_INFINITY;
    const rankB = b.entry?.r ?? Number.POSITIVE_INFINITY;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return a.originalIndex - b.originalIndex;
  });

  orbitingCandidates.forEach((c, index) => {
    const inHabitableZone = Boolean(c.entry?.z === 1);
    const region = resolveSchematicRegion(c.entry, inHabitableZone);

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
    });
  });

  return {
    scope: 'planet',
    systemId,
    systemName,
    planetId,
    planetName,
    items,
  };
};
