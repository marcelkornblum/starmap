import { SYSTEM_TAG_BITS } from '../../utils/compactDataConstants';
import { toUrlSlug } from '../../utils/datasetLayerSlugs';

export const KNOWN_SYSTEM_TAGS = [
  'HomeSystem',
  'SolarNeighborhood10pc',
  'NakedEye',
  'ExoplanetHost',
  'HabitableCandidate',
  'VariableStar',
  'RECONSGroundTruth',
] as const;

export const TAG_BIT_BY_LOWER: Readonly<Record<string, number>> = {
  homesystem: SYSTEM_TAG_BITS.HomeSystem,
  solarneighborhood10pc: SYSTEM_TAG_BITS.SolarNeighborhood10pc,
  nakedeye: SYSTEM_TAG_BITS.NakedEye,
  exoplanethost: SYSTEM_TAG_BITS.ExoplanetHost,
  habitablecandidate: SYSTEM_TAG_BITS.HabitableCandidate,
  variablestar: SYSTEM_TAG_BITS.VariableStar,
  reconsgroundtruth: SYSTEM_TAG_BITS.RECONSGroundTruth,
};

export const QUERY_CLEAN_KEY_TO_TAG_SLUG: Readonly<Record<string, string>> = {
  habitable: 'habitable-candidate',
  habitablecandidate: 'habitable-candidate',
  habitablehost: 'habitable-candidate',
  habitablezone: 'habitable-candidate',
  nakedeye: 'naked-eye',
  solarneighborhood: 'solar-neighborhood-10pc',
  solarneighborhood10pc: 'solar-neighborhood-10pc',
  exoplanethost: 'exoplanet-host',
  variablestar: 'variable-star',
  reconsgroundtruth: 'recons-ground-truth',
  homesystem: 'home-system',
};

export const normaliseTagKey = (tag: string): string =>
  tag
    .trim()
    .replace(/^tag:/i, '')
    .replace(/[-_\s]+/g, '')
    .toLowerCase();

/**
 * Pure slugifier converting PascalCase or kebab-case catalog/canon tags into
 * clean kebab-case slugs (`'HabitableCandidate'` -> `'habitable-candidate'`).
 */
export const toTagSlug = (tag: string): string =>
  toUrlSlug(
    tag
      .trim()
      .replace(/^tag:/i, '')
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      .replace(/([a-zA-Z])([0-9])/g, '$1-$2'),
  );

/**
 * Pure unit function checking whether a candidate string matches a known catalog system tag
 * (pipeline bitmask tags; supports both PascalCase and kebab-case slugs).
 */
export const isCatalogTag = (candidateTag: string): boolean => {
  const key = normaliseTagKey(candidateTag);
  if (!key) {
    return false;
  }
  return key in TAG_BIT_BY_LOWER;
};
