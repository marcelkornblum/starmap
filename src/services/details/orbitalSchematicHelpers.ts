import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import type { CircumstellarDiskRecord } from '../../types/astro';
import { formatDiskKindLabel } from './detailsHazards';
import { buildSystemElementFocusHref } from './detailsNavigation';
import type { FocusedDiskDetail } from './detailsEntityTypes';
import type {
  OrbitalSchematicEntityKind,
  OrbitalSchematicItem,
  OrbitalSchematicRegion,
} from './detailsHierarchyTypes';

export interface CandidateItem {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly kind: OrbitalSchematicEntityKind;
  readonly summaryLabel: string;
  readonly semiMajorAxisAu?: number;
  readonly isHabitableCandidate: boolean;
  readonly entry?: CompactSearchEntry;
  readonly originalIndex: number;
  readonly radialSpanAu?: readonly [number, number];
  readonly composition?: string;
  readonly children?: readonly OrbitalSchematicItem[];
}

export function buildDiskSchematicCandidate(
  disk: CircumstellarDiskRecord | FocusedDiskDetail,
  systemNameOrId: string,
  index: number,
  residentChildren?: readonly OrbitalSchematicItem[],
): CandidateItem {
  const diskKindLabel =
    'kindLabel' in disk && disk.kindLabel
      ? disk.kindLabel
      : formatDiskKindLabel(disk.kind);
  const diskHref =
    ('href' in disk && disk.href ? disk.href : undefined) ??
    buildSystemElementFocusHref(
      systemNameOrId,
      disk.name || disk.id,
    );

  return {
    id: disk.id,
    name: disk.name,
    href: diskHref,
    kind: 'belt',
    summaryLabel: diskKindLabel,
    semiMajorAxisAu:
      disk.semiMajorAxisAu ?? (disk.innerRadiusAu + disk.outerRadiusAu) / 2,
    radialSpanAu: [disk.innerRadiusAu, disk.outerRadiusAu],
    composition: disk.composition,
    isHabitableCandidate: false,
    originalIndex: index,
    children: residentChildren,
  };
}

export function resolveSchematicRegion(
  entry: CompactSearchEntry | undefined,
  inHabitableZone: boolean,
): OrbitalSchematicRegion | undefined {
  if (entry?.e === 'belt') return 'asteroid-belt';
  if (entry?.e === 'kuiper') return 'kuiper-belt';
  if (inHabitableZone) return 'habitable-zone';
  return undefined;
}

export function sortSchematicCandidates(candidates: CandidateItem[]): CandidateItem[] {
  return [...candidates].sort((a, b) => {
    if (a.semiMajorAxisAu !== undefined && b.semiMajorAxisAu !== undefined) {
      if (a.semiMajorAxisAu !== b.semiMajorAxisAu) {
        return a.semiMajorAxisAu - b.semiMajorAxisAu;
      }
    }
    const rankA = a.entry?.r;
    const rankB = b.entry?.r;
    if (rankA !== undefined && rankB !== undefined) {
      if (rankA !== rankB) return rankA - rankB;
    }
    if (a.semiMajorAxisAu !== undefined && b.semiMajorAxisAu === undefined) return -1;
    if (b.semiMajorAxisAu !== undefined && a.semiMajorAxisAu === undefined) return 1;
    return a.originalIndex - b.originalIndex;
  });
}

export function buildCandidateMoonChildren(
  matchingMoons: readonly { id: string; name: string; href: string; categoryLabel: string }[],
  getCorpusEntry: (id: string) => CompactSearchEntry | undefined,
  focusedEntityId: string | undefined,
  selectedSet: ReadonlySet<string>,
): OrbitalSchematicItem[] {
  return matchingMoons.map((moon, mIdx) => {
    const childEntry = getCorpusEntry(moon.id);
    const childInHz = Boolean(childEntry?.z === 1);
    const childRegion = resolveSchematicRegion(childEntry, childInHz);
    return {
      id: moon.id,
      name: moon.name,
      href: moon.href,
      kind: 'moon' as const,
      orbitRank: childEntry?.r ?? mIdx + 1,
      summaryLabel: moon.categoryLabel,
      inHabitableZone: childInHz,
      ...(childRegion ? { region: childRegion } : {}),
      isFocused: focusedEntityId === moon.id,
      isSelected: selectedSet.has(moon.id),
    };
  });
}
