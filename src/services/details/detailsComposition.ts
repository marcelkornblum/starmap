import type { ExoplanetRecord } from '../../types/astro';
import {
  classifyPlanetPhysical,
  isPlanetHabitableCandidate,
  computePlanetCompositionCounts,
} from '../../utils/planetaryPhysics';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import type {
  FocusedPlanetDetail,
  PlanetCompositionClass,
  PlanetCompositionCount,
} from './detailsEntityTypes';

export const classifyExoplanetComposition = (planet: {
  readonly massMearth?: number;
  readonly radiusRearth?: number;
  readonly composition?: PlanetCompositionClass;
}): PlanetCompositionClass => {
  return planet.composition ?? classifyPlanetPhysical(planet);
};

export const isExoplanetHabitableCandidate = (
  planet: Pick<
    ExoplanetRecord,
    'equilibriumTempK' | 'esi' | 'isHabitableCandidate'
  >,
): boolean => isPlanetHabitableCandidate(planet);

export const buildPlanetCompositionBreakdown = (
  planets: readonly FocusedPlanetDetail[],
  fallbackCount: number,
  fallbackCensus?: readonly PlanetCompositionClass[],
  precalculatedCounts?: readonly [number, number, number, number],
): readonly PlanetCompositionCount[] => {
  const totalCount = Math.max(planets.length, fallbackCount);
  if (totalCount <= 0) {
    return [];
  }

  const hasPrecalculated =
    precalculatedCounts !== undefined &&
    (precalculatedCounts[0] > 0 ||
      precalculatedCounts[1] > 0 ||
      precalculatedCounts[2] > 0 ||
      precalculatedCounts[3] > 0);

  if (hasPrecalculated && precalculatedCounts) {
    const items: PlanetCompositionCount[] = [];
    const [terrestrial, superEarth, iceGiant, gasGiant] = precalculatedCounts;
    if (terrestrial > 0) {
      items.push({ composition: 'terrestrial', count: terrestrial });
    }
    if (superEarth > 0) {
      items.push({ composition: 'super-earth', count: superEarth });
    }
    if (iceGiant > 0) {
      items.push({ composition: 'ice-giant', count: iceGiant });
    }
    if (gasGiant > 0) {
      items.push({ composition: 'gas-giant', count: gasGiant });
    }
    return items;
  }

  if (planets.length > 0 && planets.length >= totalCount) {
    const counts = computePlanetCompositionCounts(planets) ?? [0, 0, 0, 0];
    const [terrestrial, superEarth, iceGiant, gasGiant] = counts;
    const items: PlanetCompositionCount[] = [];
    if (terrestrial > 0) {
      items.push({ composition: 'terrestrial', count: terrestrial });
    }
    if (superEarth > 0) {
      items.push({ composition: 'super-earth', count: superEarth });
    }
    if (iceGiant > 0) {
      items.push({ composition: 'ice-giant', count: iceGiant });
    }
    if (gasGiant > 0) {
      items.push({ composition: 'gas-giant', count: gasGiant });
    }
    return items;
  }

  if (fallbackCensus && fallbackCensus.length > 0) {
    return fallbackCensus.map((composition) => ({ composition }));
  }

  return [{ composition: 'terrestrial' }];
};

export const buildPlanetCompositionSummary = (
  planets: readonly FocusedPlanetDetail[],
  fallbackCount: number,
  hasHabitableCandidate: boolean,
  fallbackCensus?: readonly PlanetCompositionClass[],
  precalculatedCounts?: readonly [number, number, number, number],
): string => {
  const totalCount = Math.max(planets.length, fallbackCount);
  if (totalCount <= 0) {
    return '0 confirmed planets';
  }

  const countLabel = `${totalCount} ${totalCount === 1 ? 'planet' : 'planets'}`;
  const breakdown = buildPlanetCompositionBreakdown(
    planets,
    fallbackCount,
    fallbackCensus,
    precalculatedCounts,
  );

  const hasNumericCounts = breakdown.some((b) => b.count !== undefined);
  const breakdownParts: string[] = [];

  if (hasNumericCounts) {
    for (const item of breakdown) {
      breakdownParts.push(`${item.count} ${item.composition}`);
    }
  } else if (breakdown.length > 0) {
    breakdownParts.push(breakdown.map((item) => item.composition).join(', '));
  }

  if (hasHabitableCandidate) {
    breakdownParts.push('Habitable zone candidate');
  }

  return `${countLabel} (${breakdownParts.join(' · ')})`;
};

export const resolveCorpusEntryComposition = (
  entry?: CompactSearchEntry,
): PlanetCompositionClass => {
  if (
    entry?.u === 'gas-giant' ||
    entry?.u === 'ice-giant' ||
    entry?.u === 'super-earth'
  ) {
    return entry.u;
  }
  return 'terrestrial';
};
