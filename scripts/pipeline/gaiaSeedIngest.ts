import type { StarmapNode, SystemManifest, SystemSummaryNode, SystemTag } from '../../src/types/astro';
import { equatorialToCartesian } from '../../src/utils/astroCoordinates';
import { computeSystemHazardMask } from '../../src/utils/astroHazards';
import { resolveStellarClassificationFromSpectrum, resolveStellarReticleType } from '../../src/utils/astroPrecalculation';
import { collectStarLookupKeys } from '../../src/utils/nomenclature';
import { computePlanetCompositionCounts } from '../../src/utils/planetaryPhysics';
import { formatSectorId } from '../../src/utils/sectorMath';
import { enrichPlanetsWithPrecalculatedFields, getPlanetCensus, matchExoplanetsForStar } from './exoplanets';
import { FULL_SOLAR_SYSTEM_BODIES, RECONS_10PC_SUPPLEMENT } from './seedCatalogs';
import { buildSolSystemManifest, matchCircumstellarDisksForStar } from './solAndSummary';
import type { ExoplanetRecord } from '../../src/types/astro';

export const round3 = (n: number) => {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? 0 : r;
};

export const round2 = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
};

export function createSolPipelineEntries() {
  const solSeed = FULL_SOLAR_SYSTEM_BODIES.find((b) => b.id === 'sol');
  const solManifest = buildSolSystemManifest();
  const solPrimaryStar = solManifest.stars[0];
  if (!solPrimaryStar || !solSeed) {
    throw new Error('Sol manifest or seed entry is missing required primary star attributes');
  }
  const solMag = solPrimaryStar.mag ?? solSeed.mag ?? 0;
  const solAbsMag = solPrimaryStar.absmag ?? solSeed.absmag ?? 0;
  const solSpect = solPrimaryStar.spectralType;
  const solCi = solSeed.colorIndex ?? 0;
  const solLum = solPrimaryStar.luminosityLsun ?? solSeed.luminosityLsun ?? 1;
  const solNode: StarmapNode = {
    id: 0, name: solManifest.name, properName: solManifest.name, dist: solManifest.dist,
    ra: 0, dec: 0, mag: solMag, absmag: solAbsMag, spect: solSpect, ci: solCi,
    x: solManifest.x, y: solManifest.y, z: solManifest.z, lum: solLum,
    velocity: { vx: 0, vy: 0, vz: 0, speed: 0, radialVelocity: 0 },
  };
  const solClassification = resolveStellarClassificationFromSpectrum(solSpect);
  const solSummary: SystemSummaryNode = {
    id: solManifest.id, name: solManifest.name, properName: solManifest.properName,
    x: solManifest.x, y: solManifest.y, z: solManifest.z, dist: solManifest.dist,
    mag: solMag, absmag: solAbsMag, spect: solSpect, classification: solClassification,
    reticleType: solPrimaryStar.reticleType ?? resolveStellarReticleType(solClassification, false),
    ci: solCi, starCount: solManifest.stars.length, planetCount: solManifest.planets.length,
    planetCensus: getPlanetCensus(solManifest.planets),
    planetCompositionCounts: solManifest.planetCompositionCounts,
    hasHabitableCandidate: Boolean(solManifest.hasHabitableCandidate),
    ...(solManifest.hazardMask && solManifest.hazardMask > 0 ? { hazardMask: solManifest.hazardMask } : {}),
    sectorId: solManifest.sectorId, tags: solManifest.tags, velocity: solNode.velocity,
  };
  return { solManifest, solNode, solSummary };
}

export function ingestReconsSupplement(params: {
  maxPartitionDist: number;
  includeDetails: boolean;
  exoplanetHostMap: Map<string, ExoplanetRecord[]>;
  matchedExoplanetIds: Set<string>;
  cataloguedSummaries: SystemSummaryNode[];
  starAliasesById: Map<string, string[]>;
  local10pcSystems: SystemSummaryNode[];
  exoplanetHostSummaries: SystemSummaryNode[];
  sectorMap: Map<string, SystemSummaryNode[]>;
  sectorManifestsMap: Map<string, SystemManifest[]>;
  allSystemManifests: SystemManifest[];
  getTotalStars: () => number;
  onEmitNode: (nodeJson: string) => void;
}): { addedLocal10pc: number; addedExoplanets: number } {
  let addedLocal10pc = 0;
  let addedExoplanets = 0;
  const {
    maxPartitionDist, includeDetails, exoplanetHostMap, matchedExoplanetIds,
    cataloguedSummaries, starAliasesById, local10pcSystems, exoplanetHostSummaries,
    sectorMap, sectorManifestsMap, allSystemManifests, getTotalStars, onEmitNode,
  } = params;

  for (const recons of RECONS_10PC_SUPPLEMENT) {
    if (cataloguedSummaries.some((s) => s.id === recons.id || s.name.toLowerCase() === recons.name.toLowerCase())) continue;
    const [rawRx, rawRy, rawRz] = equatorialToCartesian(recons.ra, recons.dec, recons.dist);
    const [rx, ry, rz] = [round3(rawRx), round3(rawRy), round3(rawRz)];
    const rSectorId = formatSectorId(rx, ry, rz);
    const reconsLookup = {
      id: getTotalStars(), name: recons.name, properName: recons.properName, aliases: recons.aliases,
      ra: recons.ra, dec: recons.dec, dist: recons.dist, mag: recons.mag, absmag: recons.absmag, x: rx, y: ry, z: rz,
    };
    const matchedPlanets = enrichPlanetsWithPrecalculatedFields(matchExoplanetsForStar(reconsLookup, exoplanetHostMap));
    for (const p of matchedPlanets) matchedExoplanetIds.add(p.id);
    const matchedDisks = matchCircumstellarDisksForStar(reconsLookup);
    if (matchedPlanets.length > 0) addedExoplanets += matchedPlanets.length;
    const hasHabitableCandidate = matchedPlanets.some((p) => Boolean(p.isHabitableCandidate));
    const rTags: SystemTag[] = [
      ...(recons.dist <= 10 ? (['SolarNeighborhood10pc', 'RECONSGroundTruth'] as const) : []),
      ...(matchedPlanets.length > 0 ? (['ExoplanetHost'] as const) : []),
      ...(hasHabitableCandidate ? (['HabitableCandidate'] as const) : []),
    ];
    const rClass = resolveStellarClassificationFromSpectrum(recons.spect);
    const rReticle = resolveStellarReticleType(rClass, (recons.starCount ?? 1) > 1);
    const rStarReticle = resolveStellarReticleType(rClass, false);
    const rHazardMask = computeSystemHazardMask({ spect: recons.spect, tags: rTags });

    const rSummary: SystemSummaryNode = {
      id: recons.id, name: recons.name, properName: recons.properName,
      x: rx, y: ry, z: rz, dist: round3(recons.dist), mag: round2(recons.mag), absmag: round2(recons.absmag),
      spect: recons.spect, starCount: recons.starCount, classification: rClass, reticleType: rReticle,
      planetCount: matchedPlanets.length, planetCensus: getPlanetCensus(matchedPlanets),
      planetCompositionCounts: computePlanetCompositionCounts(matchedPlanets), hasHabitableCandidate,
      sectorId: rSectorId, confidence: 'confirmed',
      ...(rTags.length > 0 ? { tags: rTags } : {}),
      ...(rHazardMask > 0 ? { hazardMask: rHazardMask } : {}),
    };
    cataloguedSummaries.push(rSummary);
    starAliasesById.set(recons.id, collectStarLookupKeys(reconsLookup));
    if (recons.dist <= 10) { local10pcSystems.push(rSummary); addedLocal10pc++; }
    if (matchedPlanets.length > 0) exoplanetHostSummaries.push(rSummary);
    if (recons.dist <= maxPartitionDist) {
      let sectorBucket = sectorMap.get(rSectorId);
      if (!sectorBucket) sectorMap.set(rSectorId, (sectorBucket = []));
      sectorBucket.push(rSummary);
    }
    if (includeDetails) {
      let sectorManifests = sectorManifestsMap.get(rSectorId);
      if (!sectorManifests) sectorManifestsMap.set(rSectorId, (sectorManifests = []));
      const manifest: SystemManifest = {
        id: recons.id, name: recons.name, properName: recons.properName,
        x: rx, y: ry, z: rz, dist: round3(recons.dist),
        velocity: { vx: 0, vy: 0, vz: 0, speed: 0 }, sectorId: rSectorId,
        stars: [{
          id: `${recons.id}-A`, name: recons.name, componentDesignation: 'A',
          spectralType: recons.spect, mag: round2(recons.mag), absmag: round2(recons.absmag), reticleType: rStarReticle,
        }],
        planets: matchedPlanets, ...(matchedDisks.length > 0 ? { disks: matchedDisks } : {}),
        planetCompositionCounts: computePlanetCompositionCounts(matchedPlanets), hasHabitableCandidate,
        ...(rTags.length > 0 ? { tags: rTags } : {}),
        ...(rHazardMask > 0 ? { hazardMask: rHazardMask } : {}),
      };
      sectorManifests.push(manifest);
      allSystemManifests.push(manifest);
    }
    onEmitNode(JSON.stringify({
      id: getTotalStars(), name: recons.name, properName: recons.properName, ra: round3(recons.ra), dec: round3(recons.dec),
      dist: round3(recons.dist), mag: round2(recons.mag), absmag: round2(recons.absmag), spect: recons.spect, x: rx, y: ry, z: rz,
    }));
  }
  return { addedLocal10pc, addedExoplanets };
}
