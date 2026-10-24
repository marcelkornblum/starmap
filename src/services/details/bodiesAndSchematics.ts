import type { CompactSearchEntry } from '../../utils/compactDataCodec';
import type { DecodedEntityAnnotation } from '../../utils/datasetLayerCodec';
import {
  findFocusedEntryInCorpus,
  formatSlugFallbackTitle,
  isArtificialSpacecraftEntry,
  resolveResultDisplayTitle,
  toUrlSlug,
} from '../searchService';
import {
  formatDiskKindLabel,
  isDwarfPlanetInDisk,
  resolveCorpusEntryComposition,
  resolveDirectTargetCanonAnnotations,
  resolveFocusedCanonAnnotations,
  resolveMinorBodyCategoryLabel,
} from './hazardsAndComposition';
import {
  buildPlanetDetailsHref,
  buildPlanetElementFocusHref,
  buildSystemDetailsHref,
  buildSystemElementFocusHref,
} from './navigationAndCamera';
import type {
  BuildPlanetaryBodiesSummaryInput,
  BuildSystemBodiesSummaryInput,
  FocusedPlanetDetail,
  OrbitalSchematicEntityKind,
  OrbitalSchematicItem,
  OrbitalSchematicRegion,
  OrbitalSchematicSummary,
  PlanetaryBodiesSummary,
  SystemBodiesSummary,
  SystemElementBodyItem,
  SystemOrbitalSchematicInput,
} from './types';

/**
 * Pure domain builder assembling a `SystemBodiesSummary` showing all elements in the host system
 * broken into sections (`Stars`, `Planets`, `Moons & Dwarf Planets`, `Minor Bodies & Spacecraft`, `Canon Layers`).
 */
export const buildSystemBodiesSummary = (
  input: BuildSystemBodiesSummaryInput,
): SystemBodiesSummary | null => {
  const { details, corpus = [], canonRecords = [], selectedEntityIds } = input;
  if (!details) {
    return null;
  }

  const { systemId, systemName, stars, planets, disks } = details;
  const focusedEntityId =
    'focusedEntityId' in input ? input.focusedEntityId : details.id;
  const systemHref = buildSystemDetailsHref(systemName || systemId);

  const moonsAndDwarfPlanets: SystemElementBodyItem[] = [];
  const minorBodiesAndSpacecraft: SystemElementBodyItem[] = [];

  for (const entry of corpus) {
    if (entry.s !== systemId) {
      continue;
    }
    const name = resolveResultDisplayTitle(entry);
    const isMoon = entry.k === 3 || (Boolean(entry.o) && entry.o !== systemId && entry.o !== 'sol');
    const href = isMoon && entry.o
      ? buildPlanetElementFocusHref(entry.o, name || entry.i)
      : buildSystemElementFocusHref(
          systemName || systemId,
          name || entry.i,
        );
    if (entry.k === 3 || entry.k === 4) {
      moonsAndDwarfPlanets.push({
        id: entry.i,
        name,
        href,
        categoryKey: entry.k === 3 ? 'moon' : 'dwarf-planet',
        categoryLabel: entry.k === 3 ? 'Moon' : 'Dwarf Planet',
      });
    } else if (entry.k === 6) {
      const isSpacecraft = isArtificialSpacecraftEntry(entry);
      minorBodiesAndSpacecraft.push({
        id: entry.i,
        name,
        href,
        categoryKey: isSpacecraft ? 'spacecraft' : 'asteroid',
        categoryLabel: isSpacecraft ? 'Spacecraft' : 'Minor Body',
      });
    }
  }

  const systemCanonAnnotations = resolveFocusedCanonAnnotations(
    systemId,
    systemId,
    canonRecords,
  );

  return {
    scope: 'system',
    systemId,
    systemName,
    systemHref,
    focusedEntityId,
    ...(selectedEntityIds ? { selectedEntityIds } : {}),
    stars,
    planets,
    disks,
    moonsAndDwarfPlanets,
    minorBodiesAndSpacecraft,
    canonAnnotations: systemCanonAnnotations,
  };
};

/**
 * Pure domain builder assembling a `PlanetaryBodiesSummary` showing the host planet and all
 * catalogued bodies in orbit around it (`Planet`, `Moons`, `Minor Bodies & Spacecraft`, `Canon Layers`).
 */
export const buildPlanetaryBodiesSummary = (
  input: BuildPlanetaryBodiesSummaryInput,
): PlanetaryBodiesSummary | null => {
  const {
    details,
    urlPlanetSlug,
    planetEntityDetail,
    corpus = [],
    canonRecords = [],
    selectedEntityIds,
  } = input;
  if (!details && !urlPlanetSlug) {
    return null;
  }

  const planetCorpusEntry = urlPlanetSlug
    ? findFocusedEntryInCorpus(urlPlanetSlug, corpus)
    : details?.focusedKind === 'planet'
      ? findFocusedEntryInCorpus(details.id, corpus)
      : undefined;

  const planetId =
    planetCorpusEntry?.i ??
    (details?.focusedKind === 'planet'
      ? details.id
      : (urlPlanetSlug ?? details?.id ?? 'earth'));

  const matchedPlanetFromDetails = details?.planets.find((p) => {
    const pId = toUrlSlug(p.id);
    const pName = toUrlSlug(p.name);
    const targetSlug = toUrlSlug(urlPlanetSlug ?? planetId);
    return pId === targetSlug || pName === targetSlug;
  });

  const planetName =
    matchedPlanetFromDetails?.name ??
    (planetCorpusEntry
      ? resolveResultDisplayTitle(planetCorpusEntry)
      : details?.focusedKind === 'planet'
        ? details.name
        : formatSlugFallbackTitle(urlPlanetSlug ?? details?.name ?? 'Earth'));

  const planetHref = buildPlanetDetailsHref(planetName || planetId);
  const systemId = details?.systemId ?? planetCorpusEntry?.s ?? 'sol';
  const systemEntry = findFocusedEntryInCorpus(systemId, corpus);
  const systemName =
    details?.systemName ??
    (systemEntry
      ? resolveResultDisplayTitle(systemEntry)
      : formatSlugFallbackTitle(systemId));
  const systemHref = buildSystemDetailsHref(systemName || systemId);

  const planetSolarRecord =
    planetEntityDetail?.kind === 'solar-body'
      ? planetEntityDetail.record
      : undefined;

  const planetDetail: FocusedPlanetDetail | undefined =
    matchedPlanetFromDetails
      ? {
          ...matchedPlanetFromDetails,
          href: planetHref,
        }
      : details?.focusedKind === 'planet'
        ? {
            id: planetId,
            name: planetName,
            href: planetHref,
            composition: details.planetTelemetry.composition,
            isHabitableCandidate: details.planetTelemetry.isHabitableCandidate,
            ...(details.planetTelemetry.semiMajorAxisAu !== undefined
              ? { semiMajorAxisAu: details.planetTelemetry.semiMajorAxisAu }
              : {}),
            ...(details.planetTelemetry.periodDays !== undefined
              ? { periodDays: details.planetTelemetry.periodDays }
              : {}),
            ...(details.planetTelemetry.eccentricity !== undefined
              ? { eccentricity: details.planetTelemetry.eccentricity }
              : {}),
            ...(details.planetTelemetry.inclinationDeg !== undefined
              ? { inclinationDeg: details.planetTelemetry.inclinationDeg }
              : {}),
            ...(details.planetTelemetry.massMearth !== undefined
              ? { massMearth: details.planetTelemetry.massMearth }
              : {}),
            ...(details.planetTelemetry.radiusRearth !== undefined
              ? { radiusRearth: details.planetTelemetry.radiusRearth }
              : {}),
            ...(details.planetTelemetry.equilibriumTempK !== undefined
              ? { equilibriumTempK: details.planetTelemetry.equilibriumTempK }
              : {}),
          }
        : planetCorpusEntry
          ? {
              id: planetId,
              name: planetName,
              href: planetHref,
              composition: resolveCorpusEntryComposition(planetCorpusEntry),
              isHabitableCandidate: planetCorpusEntry.z === 1,
              ...(planetSolarRecord?.orbit?.semiMajorAxis !== undefined
                ? { semiMajorAxisAu: planetSolarRecord.orbit.semiMajorAxis }
                : {}),
              ...(planetSolarRecord?.orbit?.periodDays !== undefined
                ? { periodDays: planetSolarRecord.orbit.periodDays }
                : {}),
              ...(planetSolarRecord?.orbit?.eccentricity !== undefined
                ? { eccentricity: planetSolarRecord.orbit.eccentricity }
                : {}),
              ...(planetSolarRecord?.orbit?.inclination !== undefined
                ? { inclinationDeg: planetSolarRecord.orbit.inclination }
                : {}),
            }
          : undefined;

  const planetTargetSlugs = new Set<string>(
    [
      toUrlSlug(planetId),
      toUrlSlug(planetName),
      urlPlanetSlug ? toUrlSlug(urlPlanetSlug) : '',
    ].filter((s) => s.length > 0),
  );

  const moons: SystemElementBodyItem[] = [];
  const minorBodiesAndSpacecraft: SystemElementBodyItem[] = [];

  for (const entry of corpus) {
    if (!entry.o) {
      continue;
    }
    const parentSlug = toUrlSlug(entry.o);
    if (!planetTargetSlugs.has(parentSlug)) {
      continue;
    }
    const name = resolveResultDisplayTitle(entry);
    const href = buildPlanetElementFocusHref(
      planetName || planetId,
      name || entry.i,
    );
    if (entry.k === 3 || entry.k === 4) {
      moons.push({
        id: entry.i,
        name,
        href,
        categoryKey: entry.k === 3 ? 'moon' : 'dwarf-planet',
        categoryLabel: entry.k === 3 ? 'Moon' : 'Dwarf Planet',
      });
    } else {
      const isSpacecraft = isArtificialSpacecraftEntry(entry);
      minorBodiesAndSpacecraft.push({
        id: entry.i,
        name,
        href,
        categoryKey: isSpacecraft ? 'spacecraft' : 'asteroid',
        categoryLabel: resolveMinorBodyCategoryLabel(entry),
      });
    }
  }

  const targetIdsForCanon = [
    planetId,
    planetName,
    ...moons.map((m) => m.id),
    ...minorBodiesAndSpacecraft.map((b) => b.id),
  ];
  const canonRecordsByTargetId: Record<string, DecodedEntityAnnotation[]> = {};
  for (const record of canonRecords) {
    (canonRecordsByTargetId[record.targetId] ??= []).push(record);
  }
  const directCanon = resolveDirectTargetCanonAnnotations(
    targetIdsForCanon,
    canonRecordsByTargetId,
  );

  const focusedEntityId =
    'focusedEntityId' in input ? input.focusedEntityId : details?.id;

  return {
    scope: 'planet',
    planetId,
    planetName,
    planetHref,
    systemId,
    systemName,
    systemHref,
    ...(focusedEntityId ? { focusedEntityId } : {}),
    ...(selectedEntityIds ? { selectedEntityIds } : {}),
    ...(planetDetail ? { planetDetail } : {}),
    moons,
    minorBodiesAndSpacecraft,
    canonAnnotations: directCanon,
  };
};

/**
 * Pure domain builder assembling an `OrbitalSchematicSummary` for a star system.
 * Starts with primary stars (orbitRank 0), followed by all system-level orbiting bodies
 * sorted strictly by radial orbital rank (closest to primary first).
 */
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
            categoryKey: e.k === 3 ? 'moon' : 'dwarf-planet',
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

  interface CandidateItem {
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
      let region: OrbitalSchematicRegion | undefined;
      if (childEntry?.e === 'belt' || disk.kind === 'asteroid-belt') {
        region = 'asteroid-belt';
      } else if (childEntry?.e === 'kuiper' || disk.kind === 'kuiper-belt') {
        region = 'kuiper-belt';
      }
      return {
        id: body.id,
        name: body.name,
        href: body.href,
        kind: 'dwarf-planet' as const,
        orbitRank: childEntry?.r ?? rIdx + 1,
        summaryLabel: body.categoryLabel,
        region,
        inHabitableZone: Boolean(childEntry?.z === 1),
        isFocused: focusedEntityId === body.id,
        isSelected: selectedSet.has(body.id),
      };
    });

    const diskKindLabel =
      'kindLabel' in disk && disk.kindLabel
        ? disk.kindLabel
        : formatDiskKindLabel(disk.kind);
    const diskHref =
      ('href' in disk && disk.href ? disk.href : undefined) ??
      buildSystemElementFocusHref(
        systemName || systemId,
        disk.name || disk.id,
      );

    candidates.push({
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
      originalIndex: candidates.length,
      children: residentChildren,
    });
  }

  for (const body of moonsAndDwarfPlanets) {
    const entry = getCorpusEntry(body.id);
    if (entry?.o) {
      continue;
    }
    const isInAnyDisk = disks.some((d) => isDwarfPlanetInDisk(entry, d));
    if (isInAnyDisk) {
      continue;
    }
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

  candidates.sort((a, b) => {
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

  candidates.forEach((c, index) => {
    const inHabitableZone = c.isHabitableCandidate || c.entry?.z === 1;
    let region: OrbitalSchematicRegion | undefined;
    if (c.kind !== 'belt') {
      if (c.entry?.e === 'belt') {
        region = 'asteroid-belt';
      } else if (c.entry?.e === 'kuiper') {
        region = 'kuiper-belt';
      } else if (inHabitableZone) {
        region = 'habitable-zone';
      }
    }

    const matchingMoons = moonsAndDwarfPlanets.filter((moon) => {
      const entry = getCorpusEntry(moon.id);
      if (!entry?.o) {
        return false;
      }
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
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return 0;
    });

    const children: OrbitalSchematicItem[] = matchingMoons.map((moon, mIdx) => {
      const childEntry = getCorpusEntry(moon.id);
      const childInHz = Boolean(childEntry?.z === 1);
      let childRegion: OrbitalSchematicRegion | undefined;
      if (childEntry?.e === 'belt') {
        childRegion = 'asteroid-belt';
      } else if (childEntry?.e === 'kuiper') {
        childRegion = 'kuiper-belt';
      } else if (childInHz) {
        childRegion = 'habitable-zone';
      }
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

/**
 * Pure domain builder assembling an `OrbitalSchematicSummary` for a planetary system.
 * Starts with the host planet (orbitRank 0), followed by all moons and minor bodies
 * in orbit around it sorted strictly by radial orbital rank.
 */
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

  interface CandidateItem {
    readonly id: string;
    readonly name: string;
    readonly href: string;
    readonly kind: OrbitalSchematicEntityKind;
    readonly summaryLabel: string;
    readonly entry?: CompactSearchEntry;
    readonly originalIndex: number;
  }

  const orbitingCandidates: CandidateItem[] = [];

  for (const moon of moons) {
    const entry =
      corpus.find((e) => e.i === moon.id) ||
      corpus.find((e) => toUrlSlug(e.i) === toUrlSlug(moon.id));
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
    let region: OrbitalSchematicRegion | undefined;
    if (c.entry?.e === 'belt') {
      region = 'asteroid-belt';
    } else if (c.entry?.e === 'kuiper') {
      region = 'kuiper-belt';
    } else if (inHabitableZone) {
      region = 'habitable-zone';
    }

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
