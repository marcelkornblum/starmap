import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { isArtificialSpacecraftEntry } from '../search/searchCorpusHelpers';
import { resolveMinorBodyCategoryLabel } from './detailsHazards';
import type {
  FocusedBeltEntityDetails,
  FocusedDiskDetail,
  FocusedEntityDetailsBase,
  FocusedMinorBodyEntityDetails,
} from './detailsEntityTypes';
import type { MinorBodyClassification } from './detailsTelemetryTypes';
import type { SystemElementBodyItem } from './detailsHierarchyTypes';

export function buildFocusedBeltDetails(
  baseDetails: FocusedEntityDetailsBase,
  matchedDiskDetail: FocusedDiskDetail | undefined,
  disks: readonly FocusedDiskDetail[],
  orbitingBodies: readonly SystemElementBodyItem[],
): FocusedBeltEntityDetails {
  const diskSource = matchedDiskDetail ?? disks[0];
  return {
    ...baseDetails,
    focusedKind: 'belt',
    orbitingBodies,
    diskTelemetry: {
      classification: diskSource?.kind ?? 'debris-disk',
      classificationLabel: diskSource?.kindLabel ?? 'Circumstellar Disk',
      innerRadiusAu: diskSource?.innerRadiusAu ?? 0,
      outerRadiusAu: diskSource?.outerRadiusAu ?? 0,
      semiMajorAxisAu: diskSource?.semiMajorAxisAu ?? 0,
      ...(diskSource?.tempK !== undefined ? { tempK: diskSource.tempK } : {}),
      composition: diskSource?.composition ?? 'Silicates & dust',
      ...(diskSource?.confidence ? { confidence: diskSource.confidence } : {}),
    },
  };
}

export function buildFocusedMinorBodyDetails(
  baseDetails: FocusedEntityDetailsBase,
  matchedCorpusEntry: CompactSearchEntry | undefined,
  minorBodyCategoryLabel: string | undefined,
  minorBodyParentName: string | undefined,
  systemName: string,
): FocusedMinorBodyEntityDetails {
  const isSpacecraft = matchedCorpusEntry ? isArtificialSpacecraftEntry(matchedCorpusEntry) : false;
  const isMoon = matchedCorpusEntry?.k === 3 || minorBodyCategoryLabel === 'Moon';
  const isDwarf = matchedCorpusEntry?.k === 4 || minorBodyCategoryLabel === 'Dwarf Planet';
  const isComet = minorBodyCategoryLabel === 'Comet';
  const classification: MinorBodyClassification = isMoon
    ? 'moon'
    : isDwarf
      ? 'dwarf-planet'
      : isSpacecraft
        ? 'construct'
        : isComet
          ? 'comet'
          : 'asteroid';

  return {
    ...baseDetails,
    focusedKind: 'minor-body',
    minorBodyTelemetry: {
      classification,
      categoryLabel: minorBodyCategoryLabel ?? resolveMinorBodyCategoryLabel(matchedCorpusEntry),
      parentBodyName: minorBodyParentName ?? systemName,
    },
  };
}
