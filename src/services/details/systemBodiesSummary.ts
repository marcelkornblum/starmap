import {
  isArtificialSpacecraftEntry,
  resolveResultDisplayTitle,
} from '../search/searchCorpusHelpers';
import { resolveFocusedCanonAnnotations } from './detailsCanonAnnotations';
import {
  buildPlanetElementFocusHref,
  buildSystemDetailsHref,
  buildSystemElementFocusHref,
} from './detailsNavigation';
import type {
  BuildSystemBodiesSummaryInput,
  SystemBodiesSummary,
  SystemElementBodyItem,
} from './detailsHierarchyTypes';

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
    const isMoon = entry.k === 3 || (Boolean(entry.o) && entry.o !== systemId);
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
