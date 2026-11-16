import type { SpatialEntityDefinition } from '../../types/spatial';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import {
  findFocusedEntryInCorpus,
  resolveResultDisplayTitle,
} from '../search/searchCorpusHelpers';
import { formatSlugFallbackTitle } from '../../utils/starNaming';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';
import { toCoordinatesTuple } from './detailsHazards';

export interface GalaxyFocusContext {
  readonly focusedSystemId?: string;
  readonly focusedSystemName?: string;
  readonly focusedSystemCoords?: readonly [number, number, number];
  readonly focusedSysSlug?: string;
}

export function resolveGalaxyFocusContext(
  focusedEntity: SpatialEntityDefinition | null | undefined,
  urlSystemSlug: string | null | undefined,
  corpus: readonly CompactSearchEntry[],
): GalaxyFocusContext {
  if (focusedEntity) {
    const matched = findFocusedEntryInCorpus(focusedEntity.id, corpus);
    if (matched?.s) {
      const parentSys = findFocusedEntryInCorpus(matched.s, corpus);
      return {
        focusedSystemId: matched.s,
        focusedSystemName: parentSys
          ? resolveResultDisplayTitle(parentSys)
          : formatSlugFallbackTitle(matched.s),
        focusedSystemCoords: parentSys?.p
          ? [parentSys.p[0], parentSys.p[1], parentSys.p[2]]
          : toCoordinatesTuple(focusedEntity.position),
        focusedSysSlug: toUrlSlug(matched.s),
      };
    }
    return {
      focusedSystemId: focusedEntity.id,
      focusedSystemName: focusedEntity.name,
      focusedSystemCoords: matched?.p
        ? [matched.p[0], matched.p[1], matched.p[2]]
        : toCoordinatesTuple(focusedEntity.position),
      focusedSysSlug: toUrlSlug(focusedEntity.id),
    };
  }
  if (urlSystemSlug) {
    const matched = findFocusedEntryInCorpus(urlSystemSlug, corpus);
    return {
      focusedSystemId: matched?.i ?? urlSystemSlug,
      focusedSystemName: matched
        ? resolveResultDisplayTitle(matched)
        : formatSlugFallbackTitle(urlSystemSlug),
      focusedSystemCoords: matched?.p
        ? [matched.p[0], matched.p[1], matched.p[2]]
        : [0, 0, 0],
      focusedSysSlug: toUrlSlug(urlSystemSlug),
    };
  }
  return {};
}
