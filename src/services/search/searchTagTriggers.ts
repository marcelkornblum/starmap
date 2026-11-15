import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { isInsideAperture } from '../../utils/spatialMath';
import { resolveEntryCategory } from './searchCorpusHelpers';
import { normaliseTagKey, TAG_BIT_BY_LOWER } from './searchTagDefinitions';

const ORIGIN_3D: readonly [number, number, number] = [0, 0, 0];

/**
 * Pure predicate determining whether a star-system `CompactSearchEntry` satisfies
 * a catalog system tag (`SolarNeighborhood10pc`, `NakedEye`, `ExoplanetHost`, etc.).
 * Reads the precalculated `entry.g` tag bitmask when available and falls back to
 * entry telemetry for synthetic unit test fixtures.
 */
export const doesSystemEntryMatchTag = (
  entry: CompactSearchEntry,
  tag: string,
): boolean => {
  if (resolveEntryCategory(entry) !== 'stars') {
    return false;
  }
  const tagKey = normaliseTagKey(tag);
  if (!tagKey) {
    return false;
  }

  const tagBit = TAG_BIT_BY_LOWER[tagKey];
  if (entry.g !== undefined && tagBit !== undefined) {
    return (entry.g & tagBit) !== 0;
  }

  if (tagKey === 'homesystem') {
    return entry.h === 1;
  }
  if (
    tagKey === 'solarneighborhood10pc' ||
    tagKey === 'reconsgroundtruth'
  ) {
    if (entry.h === 1) {
      return true;
    }
    if (!entry.p) {
      return false;
    }
    return isInsideAperture(entry.p, ORIGIN_3D, 10);
  }
  if (tagKey === 'nakedeye') {
    return (
      entry.h === 1 ||
      (entry.m?.[0] !== undefined && entry.m[0] <= 6.5)
    );
  }
  if (tagKey === 'exoplanethost') {
    return (entry.m?.[2] ?? 0) > 0;
  }
  if (tagKey === 'habitablecandidate') {
    return entry.m?.[3] === 1;
  }
  if (tagKey === 'variablestar') {
    return Boolean(entry.a && /\bvar\b/i.test(entry.a));
  }
  return false;
};
