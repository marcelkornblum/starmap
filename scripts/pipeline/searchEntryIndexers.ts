import type {
  SystemManifest,
  SystemSummaryNode,
} from '../../src/types/astro';
import type { GalacticStructureRecord } from '../../src/types/astroStructures';
import type {
  CompactSearchEntry,
  SearchSummaryTuple,
} from '../../src/utils/compactDataTypes';
import {
  classifyPlanetPhysical,
  computePlanetSurfaceGravityG,
  isPlanetHabitableCandidate,
} from '../../src/utils/planetaryPhysics';
import { computePlanetHazardMask } from '../../src/utils/astroHazards';
import {
  buildCleanKeys,
  pruneDerivableAliases,
} from '../../src/utils/nomenclature';
import {
  isCoreSearchStarSystem,
  isCoreSearchStructure,
  isSearchableStarSystem,
  resolveStellarClassificationFromSpectrum,
} from '../../src/utils/astroPrecalculation';
import { encodeTagsMask } from './compactDataEncoder';

export function indexStarSystems(
  systems: SystemSummaryNode[],
  starAliasesById: Map<string, string[]> | undefined,
  coreEntries: CompactSearchEntry[],
  starsEntries: CompactSearchEntry[],
): void {
  for (const sys of systems) {
    if (!isSearchableStarSystem(sys)) continue;

    const rawAliases = starAliasesById?.get(sys.id) ?? [
      sys.name,
      ...(sys.properName ? [sys.properName] : []),
    ];
    const cleanKeys = pruneDerivableAliases(sys.id, sys.name, buildCleanKeys(rawAliases));

    const summaryTuple: SearchSummaryTuple = sys.hasHabitableCandidate
      ? [sys.mag, sys.spect || 'Unknown', sys.planetCount, 1]
      : [sys.mag, sys.spect || 'Unknown', sys.planetCount];

    const entry: CompactSearchEntry = {
      i: sys.id,
      n: sys.name,
      m: summaryTuple,
    };
    if (sys.x !== 0 || sys.y !== 0 || sys.z !== 0) entry.p = [sys.x, sys.y, sys.z];
    if (sys.id === 'sol' || sys.name === 'Sol') entry.h = 1;
    const tagsMask = encodeTagsMask(sys.tags);
    if (tagsMask !== undefined) entry.g = tagsMask;
    if (
      sys.planetCompositionCounts &&
      ((sys.planetCompositionCounts[0] ?? 0) > 0 ||
        (sys.planetCompositionCounts[1] ?? 0) > 0 ||
        (sys.planetCompositionCounts[2] ?? 0) > 0 ||
        (sys.planetCompositionCounts[3] !== undefined && sys.planetCompositionCounts[3] > 0))
    ) {
      entry.b = sys.planetCompositionCounts;
    }
    if (sys.hazardMask && sys.hazardMask > 0) entry.H = sys.hazardMask;
    entry.u =
      sys.classification && sys.classification !== 'star'
        ? sys.classification
        : resolveStellarClassificationFromSpectrum(sys.spect);
    if (cleanKeys) entry.a = cleanKeys;

    starsEntries.push(entry);
    if (isCoreSearchStarSystem(sys)) coreEntries.push(entry);
  }
}

export function comparePlanetsByOrbit(
  a: { id: string; orbit?: { semiMajorAxis?: number } },
  b: { id: string; orbit?: { semiMajorAxis?: number } },
): number {
  const smaA = a.orbit?.semiMajorAxis;
  const smaB = b.orbit?.semiMajorAxis;
  const finA = smaA !== undefined && Number.isFinite(smaA);
  const finB = smaB !== undefined && Number.isFinite(smaB);
  if (finA && finB && smaA !== smaB) return smaA - smaB;
  if (finA !== finB) return finA ? -1 : 1;
  return a.id.localeCompare(b.id);
}

export function indexExoplanets(
  manifests: SystemManifest[],
  starAliasesById: Map<string, string[]> | undefined,
  coreEntries: CompactSearchEntry[],
  planetsEntries: CompactSearchEntry[],
): void {
  for (const manifest of manifests) {
    if (manifest.id === 'sol') continue;
    const hostAliases = starAliasesById?.get(manifest.id) ?? [];
    const sortedPlanets = [...manifest.planets].sort(comparePlanetsByOrbit);
    const exoplanetRankMap = new Map<string, number>();
    sortedPlanets.forEach((p, idx) => {
      if (p.orbit?.semiMajorAxis !== undefined && Number.isFinite(p.orbit.semiMajorAxis)) {
        exoplanetRankMap.set(p.id, idx + 1);
      }
    });

    for (const planet of manifest.planets) {
      const cleanKeys = pruneDerivableAliases(
        planet.id,
        planet.name,
        buildCleanKeys([
          planet.name,
          `${manifest.name} ${planet.letter}`,
          ...(manifest.properName ? [`${manifest.properName} ${planet.letter}`] : []),
          ...hostAliases.map((alias) => `${alias} ${planet.letter}`),
        ]),
      );

      const comp = planet.composition ?? classifyPlanetPhysical(planet);
      const isHz =
        planet.isHabitableCandidate ??
        isPlanetHabitableCandidate(
          {
            equilibriumTempK: planet.equilibriumTempK,
            esi: planet.esi,
            semiMajorAxis: planet.orbit?.semiMajorAxis,
          },
          manifest.stars[0]?.luminosityLsun,
        );

      const planetEntry: CompactSearchEntry = {
        i: planet.id,
        k: 2,
        n: planet.name,
        s: manifest.id,
        p: [manifest.x, manifest.y, manifest.z],
        ...(cleanKeys ? { a: cleanKeys } : {}),
      };
      if (exoplanetRankMap.has(planet.id)) planetEntry.r = exoplanetRankMap.get(planet.id);
      if (planet.orbit?.semiMajorAxis !== undefined && Number.isFinite(planet.orbit.semiMajorAxis)) {
        planetEntry.A = Math.round(planet.orbit.semiMajorAxis * 10000) / 10000;
      }
      if (planet.orbit?.periodDays !== undefined && Number.isFinite(planet.orbit.periodDays)) {
        planetEntry.P = Math.round(planet.orbit.periodDays * 1000) / 1000;
      }
      if (comp === 'super-earth') planetEntry.u = 'super-earth';
      else if (comp === 'ice-giant') planetEntry.u = 'ice-giant';
      else if (comp === 'gas-giant') planetEntry.u = 'gas-giant';
      else planetEntry.u = 'terrestrial';
      if (isHz) planetEntry.z = 1;

      const surfaceGravityG = planet.surfaceGravityG ?? computePlanetSurfaceGravityG(planet);
      const hazardMask =
        planet.hazardMask ??
        computePlanetHazardMask({
          equilibriumTempK: planet.equilibriumTempK,
          surfaceGravityG,
          periodDays: planet.orbit?.periodDays,
          semiMajorAxisAu: planet.orbit?.semiMajorAxis,
          eccentricity: planet.orbit?.eccentricity,
        });
      if (hazardMask > 0) planetEntry.H = hazardMask;

      planetsEntries.push(planetEntry);
      coreEntries.push(planetEntry);
    }
  }
}

export function indexStructures(
  structures: GalacticStructureRecord[],
  coreEntries: CompactSearchEntry[],
  structuresEntries: CompactSearchEntry[],
): void {
  for (const struct of structures) {
    const cleanKeys = pruneDerivableAliases(
      struct.id,
      struct.name,
      buildCleanKeys([struct.name, ...struct.designations]),
    );
    const entry: CompactSearchEntry = {
      i: struct.id,
      k: 5,
      n: struct.name,
      p: [
        Math.round(struct.x * 100) / 100,
        Math.round(struct.y * 100) / 100,
        Math.round(struct.z * 100) / 100,
      ],
      ...(cleanKeys ? { a: cleanKeys } : {}),
      u: struct.type === 'Pulsar' || struct.type === 'SupernovaRemnant' ? 'hazard' : 'stellar-cluster',
    };

    structuresEntries.push(entry);
    if (isCoreSearchStructure(struct)) coreEntries.push(entry);
  }
}
