import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import zlib from 'node:zlib';
import type { StarmapNode, SystemManifest, SystemSummaryNode, SystemTag } from '../../src/types/astro';
import { equatorialToCartesian } from '../../src/utils/astroCoordinates';
import { computePlanetCompositionCounts } from '../../src/utils/planetaryPhysics';
import { computeSystemHazardMask } from '../../src/utils/astroHazards';
import { formatSectorId } from '../../src/utils/sectorMath';
import { resolveStellarClassificationFromSpectrum, resolveStellarReticleType } from '../../src/utils/astroPrecalculation';
import { collectStarLookupKeys } from '../../src/utils/nomenclature';
import { resolveStarDisplayName, resolveStarProperName } from '../../src/utils/starNaming';
import { enrichPlanetsWithPrecalculatedFields, getPlanetCensus, loadAllExoplanetCatalogs, matchExoplanetsForStar } from './exoplanets';
import { writePipelineArtifacts } from './gaiaArtifactWriter';
import { computeGaiaKinematics, findBestHygMatch, loadHygCrossMatch, loadIauStarNames } from './hygCrossMatch';
import { consolidateMultiStarSystems } from './multiStarConsolidation';
import { FULL_SOLAR_SYSTEM_BODIES, OFFICIAL_IAU_STAR_NAMES, RECONS_10PC_SUPPLEMENT } from './seedCatalogs';
import { buildSolSystemManifest, matchCircumstellarDisksForStar } from './solAndSummary';
import type { BuildPipelineOptions, HygCrossMatch, PipelineSummary } from './types';

export async function buildGaiaDataPipeline(
  gcnsGzPath: string,
  outputJsonPath: string,
  options?: BuildPipelineOptions,
): Promise<PipelineSummary> {
  const [resolvedGcns, resolvedOutput] = [path.resolve(gcnsGzPath), path.resolve(outputJsonPath)];
  const maxPartitionDist = options?.maxPartitionDistancePc ?? 100;
  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });

  console.log('Loading cross-match reference catalogs...');
  const iauProperStars = loadIauStarNames('data/raw/iau_proper_stars.csv');
  const hygCrossMatch = loadHygCrossMatch('data/hygdata_v3.csv');
  const exoplanetHostMap = options?.exoplanetsCsvPath
    ? loadAllExoplanetCatalogs(options.exoplanetsCsvPath, '', '')
    : loadAllExoplanetCatalogs('data/raw/open_exoplanet_catalogue.csv', 'data/raw/nasa_exoplanet_archive.csv', 'data/raw/exoplanet_eu.csv');

  return new Promise((resolve, reject) => {
    let totalStars = 0; let totalKinematics = 0; let local10pcCount = 0; let referenceBrightCount = 0; let totalExoplanets = 0;
    const local10pcSystems: SystemSummaryNode[] = []; const referenceBrightSystems: SystemSummaryNode[] = [];
    const exoplanetHostSummaries: SystemSummaryNode[] = []; const cataloguedSummaries: SystemSummaryNode[] = [];
    const allSystemManifests: SystemManifest[] = []; const starAliasesById = new Map<string, string[]>();
    const sectorMap = new Map<string, SystemSummaryNode[]>(); const sectorManifestsMap = new Map<string, SystemManifest[]>();

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
      id: 0,
      name: solManifest.name,
      properName: solManifest.name,
      dist: solManifest.dist,
      ra: 0,
      dec: 0,
      mag: solMag,
      absmag: solAbsMag,
      spect: solSpect,
      ci: solCi,
      x: solManifest.x,
      y: solManifest.y,
      z: solManifest.z,
      lum: solLum,
      velocity: { vx: 0, vy: 0, vz: 0, speed: 0, radialVelocity: 0 },
    };
    const solClassification = resolveStellarClassificationFromSpectrum(solSpect);
    const solSummary: SystemSummaryNode = {
      id: solManifest.id,
      name: solManifest.name,
      properName: solManifest.properName,
      x: solManifest.x,
      y: solManifest.y,
      z: solManifest.z,
      dist: solManifest.dist,
      mag: solMag,
      absmag: solAbsMag,
      spect: solSpect,
      classification: solClassification,
      reticleType: solPrimaryStar.reticleType ?? resolveStellarReticleType(solClassification, false),
      ci: solCi,
      starCount: solManifest.stars.length,
      planetCount: solManifest.planets.length,
      planetCensus: getPlanetCensus(solManifest.planets),
      planetCompositionCounts: solManifest.planetCompositionCounts,
      hasHabitableCandidate: Boolean(solManifest.hasHabitableCandidate),
      ...(solManifest.hazardMask && solManifest.hazardMask > 0 ? { hazardMask: solManifest.hazardMask } : {}),
      sectorId: solManifest.sectorId,
      tags: solManifest.tags,
      velocity: solNode.velocity,
    };

    local10pcSystems.push(solSummary); referenceBrightSystems.push(solSummary); cataloguedSummaries.push(solSummary);
    starAliasesById.set('sol', ['Sol', 'Sun', 'Solar System']); sectorMap.set('sector_+000_+000_+000', [solSummary]);
    if (options?.detailsDir || options?.searchDir || options?.dataDir) {
      sectorManifestsMap.set('sector_+000_+000_+000', [solManifest]); allSystemManifests.push(solManifest);
    }

    const writeStream = fs.createWriteStream(resolvedOutput, { encoding: 'utf-8' });
    writeStream.write(`[${JSON.stringify(solNode)}`); totalStars++; totalKinematics++;

    const matchedHygIds = new Set<number>();
    const round3 = (n: number) => {
      const r = Math.round(n * 1000) / 1000;
      return Object.is(r, -0) ? 0 : r;
    };
    const round2 = (n: number) => {
      const r = Math.round(n * 100) / 100;
      return Object.is(r, -0) ? 0 : r;
    };

    const findOfficialStarName = (h?: HygCrossMatch) => {
      if (!h) return undefined;
      if (h.hip && OFFICIAL_IAU_STAR_NAMES[`hip-${h.hip}`]) return OFFICIAL_IAU_STAR_NAMES[`hip-${h.hip}`];
      if (h.gl) {
        if (OFFICIAL_IAU_STAR_NAMES[`gl-${h.gl}`]) return OFFICIAL_IAU_STAR_NAMES[`gl-${h.gl}`];
        const k = `gl-${h.gl.toLowerCase().replace(/^(?:gl|gj|gliese)\s*/i, '').replace(/\s+/g, '')}`;
        if (OFFICIAL_IAU_STAR_NAMES[k]) return OFFICIAL_IAU_STAR_NAMES[k];
      }
      return undefined;
    };

    function ingestStarEntry(
      sysId: string, sourceId: string, ra: number, dec: number, dist: number,
      pmra: number, pmdec: number, rv: number | null, gmag: number, bpmag: number, rpmag: number,
      hygMatch: HygCrossMatch | undefined, ePlx?: number,
    ) {
      const [rawX, rawY, rawZ] = equatorialToCartesian(ra / 15, dec, dist);
      const x = round3(rawX);
      const y = round3(rawY);
      const z = round3(rawZ);
      const velocity = computeGaiaKinematics(ra, dec, dist, isNaN(pmra) ? 0 : pmra, isNaN(pmdec) ? 0 : pmdec, rv);
      totalKinematics++;

      const iauName = hygMatch?.hip && iauProperStars.has(hygMatch.hip) ? iauProperStars.get(hygMatch.hip) : undefined;
      const official = findOfficialStarName(hygMatch);
      const properName = resolveStarProperName({
        properName: official?.properName,
        hygProperName: hygMatch?.proper,
        iauProperName: iauName,
      });
      const extraAliases: string[] = [];
      if (official?.properName) extraAliases.push(official.properName);
      if (official?.aliases) extraAliases.push(...official.aliases);
      if (iauName) extraAliases.push(iauName);
      if (hygMatch?.proper) extraAliases.push(hygMatch.proper);

      const name = resolveStarDisplayName({
        properName, bayer: hygMatch?.bayer, con: hygMatch?.con, flam: hygMatch?.flam,
        gl: hygMatch?.gl, hip: hygMatch?.hip, hd: hygMatch?.hd, sourceId,
      });

      const mag = !isNaN(gmag) ? gmag : hygMatch?.mag ?? 15.0;
      const ci = !isNaN(bpmag) && !isNaN(rpmag) ? bpmag - rpmag : hygMatch?.ci ?? null;
      const absmag = mag - 5 * (Math.log10(dist) - 1);
      let theoreticalFlags = 0;
      let spect = hygMatch?.spect;
      if (!spect && ci !== null) {
        theoreticalFlags |= 1;
        spect = ci < 0.0 ? 'O/B' : ci < 0.3 ? 'A' : ci < 0.6 ? 'F' : ci < 0.9 ? 'G' : ci < 1.4 ? 'K' : 'M';
      }
      if (rv === null || isNaN(rv)) theoreticalFlags |= 2;

      const plxMas = dist > 0 ? 1000.0 / dist : 0;
      const isCandidateParallax = ePlx !== undefined && !isNaN(ePlx) && plxMas > 0 && ePlx / plxMas >= 0.1;
      const lookupInput = {
        id: totalStars, name, properName, hip: hygMatch?.hip, hd: hygMatch?.hd, hr: hygMatch?.hr,
        gl: hygMatch?.gl, bayer: hygMatch?.bayer, flam: hygMatch?.flam, con: hygMatch?.con, bf: hygMatch?.bf,
        aliases: extraAliases.length > 0 ? extraAliases : undefined, ra: ra / 15, dec, dist, mag, absmag, x, y, z,
      };

      const matchedPlanets = enrichPlanetsWithPrecalculatedFields(matchExoplanetsForStar(lookupInput, exoplanetHostMap));
      const matchedDisks = matchCircumstellarDisksForStar(lookupInput);
      if (matchedPlanets.length > 0) totalExoplanets += matchedPlanets.length;

      const hasHabitableCandidate = matchedPlanets.some((p) => Boolean(p.isHabitableCandidate));
      const planetCompositionCounts = computePlanetCompositionCounts(matchedPlanets);
      const sectorId = formatSectorId(x, y, z);
      const tags: SystemTag[] = [];
      if (dist <= 10) tags.push('SolarNeighborhood10pc');
      if (mag <= 6.5) tags.push('NakedEye');
      if (matchedPlanets.length > 0) tags.push('ExoplanetHost');
      if (hasHabitableCandidate) tags.push('HabitableCandidate');
      const hazardMask = computeSystemHazardMask({ spect, lum: hygMatch?.lum !== undefined && !isNaN(hygMatch.lum) ? hygMatch.lum : undefined, tags });
      const stellarClass = resolveStellarClassificationFromSpectrum(spect);
      const stellarReticle = resolveStellarReticleType(stellarClass, false);

      const summary: SystemSummaryNode = {
        id: sysId, name, x: round3(x), y: round3(y), z: round3(z), dist: round3(dist), mag: round2(mag), absmag: round2(absmag),
        spect: spect || 'Unknown', classification: stellarClass,
        reticleType: stellarReticle, starCount: 1, planetCount: matchedPlanets.length,
        planetCensus: getPlanetCensus(matchedPlanets), planetCompositionCounts, hasHabitableCandidate, sectorId,
        confidence: isCandidateParallax ? 'candidate' : 'confirmed',
        ...(theoreticalFlags > 0 ? { theoreticalFlags } : {}), ...(properName ? { properName } : {}),
        ...(ci !== null && !isNaN(ci) ? { ci: round2(ci) } : {}), ...(tags.length > 0 ? { tags } : {}),
        ...(hazardMask > 0 ? { hazardMask } : {}),
        ...(velocity ? { velocity: { vx: round2(velocity.vx), vy: round2(velocity.vy), vz: round2(velocity.vz), speed: round2(velocity.speed) } } : {}),
      };

      if (dist <= 10) { local10pcSystems.push(summary); local10pcCount++; }
      if (mag <= 6.5) { referenceBrightSystems.push(summary); referenceBrightCount++; }
      if (matchedPlanets.length > 0) exoplanetHostSummaries.push(summary);
      if (hygMatch || dist <= 10 || mag <= 6.5 || matchedPlanets.length > 0) {
        cataloguedSummaries.push(summary); starAliasesById.set(sysId, collectStarLookupKeys(lookupInput));
      }
      let bucket = sectorMap.get(sectorId);
      if (!bucket) sectorMap.set(sectorId, (bucket = []));
      bucket.push(summary);

      if ((options?.detailsDir || options?.searchDir || options?.dataDir) && (matchedPlanets.length > 0 || matchedDisks.length > 0 || mag <= 4.0)) {
        let mb = sectorManifestsMap.get(sectorId);
        if (!mb) sectorManifestsMap.set(sectorId, (mb = []));
        mb.push({
          id: sysId, name, properName, x: round3(x), y: round3(y), z: round3(z), dist: round3(dist),
          velocity: { vx: round2(velocity.vx), vy: round2(velocity.vy), vz: round2(velocity.vz), speed: round2(velocity.speed) },
          sectorId,
          stars: [{
            id: `${sourceId}-A`,
            name,
            componentDesignation: 'A',
            spectralType: spect || 'Unknown',
            mag: round2(mag),
            absmag: round2(absmag),
            reticleType: stellarReticle,
          }],
          planets: matchedPlanets, ...(matchedDisks.length > 0 ? { disks: matchedDisks } : {}),
          planetCompositionCounts, hasHabitableCandidate, ...(tags.length > 0 ? { tags } : {}), ...(hazardMask > 0 ? { hazardMask } : {}),
        });
        allSystemManifests.push(mb[mb.length - 1]!);
      }

      writeStream.write(`,${JSON.stringify({
        id: totalStars, name, ra: round3(ra / 15), dec: round3(dec), dist: round3(dist), mag: round2(mag), absmag: round2(absmag),
        x: round3(x), y: round3(y), z: round3(z), properName, hip: hygMatch?.hip, hd: hygMatch?.hd, hr: hygMatch?.hr,
        gl: hygMatch?.gl, bayer: hygMatch?.bayer, flam: hygMatch?.flam, con: hygMatch?.con, spect,
        ci: ci !== null && !isNaN(ci) ? round2(ci) : undefined,
        velocity: velocity ? { vx: round2(velocity.vx), vy: round2(velocity.vy), vz: round2(velocity.vz), speed: round2(velocity.speed) } : undefined,
      })}`);
      totalStars++;
    }

    let multiStarConsolidationResult: ReturnType<typeof consolidateMultiStarSystems> | null = null;
    const rl = readline.createInterface({ input: fs.createReadStream(resolvedGcns).pipe(zlib.createGunzip()), crlfDelay: Infinity });

    rl.on('line', (line: string) => {
      if (line.length < 130) return;
      const sourceId = line.substring(2, 21).trim();
      const [ra, dec, plx] = [parseFloat(line.substring(22, 36)), parseFloat(line.substring(45, 59)), parseFloat(line.substring(68, 77))];
      if (isNaN(ra) || isNaN(dec) || isNaN(plx) || plx <= 0 || 1000.0 / plx > maxPartitionDist) return;
      const dist = 1000.0 / plx;
      const [ePlx, pmra, pmdec, gmag, bpmag, rpmag] = [
        parseFloat(line.substring(78, 85)), parseFloat(line.substring(86, 95)), parseFloat(line.substring(104, 113)),
        parseFloat(line.substring(122, 130)), parseFloat(line.substring(141, 149)), parseFloat(line.substring(160, 168)),
      ];
      const rvStr = line.substring(198, 206).trim();
      const hygMatch = findBestHygMatch(ra, dec, dist, !isNaN(gmag) ? gmag : 15.0, hygCrossMatch.byCoordCandidates, matchedHygIds);
      ingestStarEntry(`gaia-${sourceId}`, sourceId, ra, dec, dist, pmra, pmdec, rvStr ? parseFloat(rvStr) : null, gmag, bpmag, rpmag, hygMatch, ePlx);
    });

    rl.on('close', () => {
      for (const hyg of hygCrossMatch.allItems) {
        if (hyg.id === 0 || matchedHygIds.has(hyg.id) || !hyg.dist || hyg.dist <= 0 || hyg.ra === undefined || hyg.dec === undefined) continue;
        const officialMatch = findOfficialStarName(hyg);
        if (hyg.dist > maxPartitionDist && !officialMatch) continue;
        if (!officialMatch && (hyg.mag === undefined || hyg.mag > 6.5) && hyg.dist > 10 && !hyg.proper && !hyg.bayer && !hyg.flam) continue;

        matchedHygIds.add(hyg.id);
        const [sysId, sourceId] = hyg.hip ? [`hip-${hyg.hip}`, String(hyg.hip)] : [`hyg-${hyg.id}`, String(hyg.id)];
        ingestStarEntry(sysId, sourceId, hyg.ra * 15, hyg.dec, hyg.dist, hyg.pmra ?? 0, hyg.pmdec ?? 0, hyg.rv ?? 0, hyg.mag ?? 6.5, NaN, NaN, hyg);
      }

      for (const recons of RECONS_10PC_SUPPLEMENT) {
        if (cataloguedSummaries.some((s) => s.id === recons.id || s.name.toLowerCase() === recons.name.toLowerCase())) continue;
        const [rawRx, rawRy, rawRz] = equatorialToCartesian(recons.ra, recons.dec, recons.dist);
        const rx = round3(rawRx);
        const ry = round3(rawRy);
        const rz = round3(rawRz);
        const rSectorId = formatSectorId(rx, ry, rz);
        const reconsLookup = {
          id: totalStars, name: recons.name, properName: recons.properName, aliases: recons.aliases,
          ra: recons.ra, dec: recons.dec, dist: recons.dist, mag: recons.mag, absmag: recons.absmag, x: rx, y: ry, z: rz,
        };
        const matchedPlanets = enrichPlanetsWithPrecalculatedFields(matchExoplanetsForStar(reconsLookup, exoplanetHostMap));
        const matchedDisks = matchCircumstellarDisksForStar(reconsLookup);
        if (matchedPlanets.length > 0) totalExoplanets += matchedPlanets.length;
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
          x: round3(rx), y: round3(ry), z: round3(rz), dist: round3(recons.dist), mag: round2(recons.mag), absmag: round2(recons.absmag),
          spect: recons.spect, starCount: recons.starCount, classification: rClass,
          reticleType: rReticle,
          planetCount: matchedPlanets.length, planetCensus: getPlanetCensus(matchedPlanets),
          planetCompositionCounts: computePlanetCompositionCounts(matchedPlanets), hasHabitableCandidate,
          sectorId: rSectorId, confidence: 'confirmed',
          ...(rTags.length > 0 ? { tags: rTags } : {}),
          ...(rHazardMask > 0 ? { hazardMask: rHazardMask } : {}),
        };
        cataloguedSummaries.push(rSummary); starAliasesById.set(recons.id, collectStarLookupKeys(reconsLookup));
        if (recons.dist <= 10) { local10pcSystems.push(rSummary); local10pcCount++; }
        if (matchedPlanets.length > 0) exoplanetHostSummaries.push(rSummary);
        if (recons.dist <= maxPartitionDist) {
          let b = sectorMap.get(rSectorId);
          if (!b) sectorMap.set(rSectorId, (b = []));
          b.push(rSummary);
        }
        if (options?.detailsDir || options?.searchDir || options?.dataDir) {
          let mb = sectorManifestsMap.get(rSectorId);
          if (!mb) sectorManifestsMap.set(rSectorId, (mb = []));
          mb.push({
            id: recons.id, name: recons.name, properName: recons.properName,
            x: round3(rx), y: round3(ry), z: round3(rz), dist: round3(recons.dist),
            velocity: { vx: 0, vy: 0, vz: 0, speed: 0 }, sectorId: rSectorId,
            stars: [{
              id: `${recons.id}-A`,
              name: recons.name,
              componentDesignation: 'A',
              spectralType: recons.spect,
              mag: round2(recons.mag),
              absmag: round2(recons.absmag),
              reticleType: rStarReticle,
            }],
            planets: matchedPlanets, ...(matchedDisks.length > 0 ? { disks: matchedDisks } : {}),
            planetCompositionCounts: computePlanetCompositionCounts(matchedPlanets), hasHabitableCandidate,
            ...(rTags.length > 0 ? { tags: rTags } : {}),
            ...(rHazardMask > 0 ? { hazardMask: rHazardMask } : {}),
          });
          allSystemManifests.push(mb[mb.length - 1]!);
        }
        writeStream.write(`,${JSON.stringify({
          id: totalStars, name: recons.name, properName: recons.properName, ra: round3(recons.ra), dec: round3(recons.dec),
          dist: round3(recons.dist), mag: round2(recons.mag), absmag: round2(recons.absmag), spect: recons.spect, x: round3(rx), y: round3(ry), z: round3(rz),
        })}`);
        totalStars++;
      }

      multiStarConsolidationResult = consolidateMultiStarSystems({
        cataloguedSummaries, sectorMap, sectorManifestsMap, allSystemManifests,
        local10pcSystems, referenceBrightSystems, exoplanetHostSummaries, starAliasesById,
      });
      console.log(`Consolidated ${multiStarConsolidationResult.consolidatedCount} systems (reduced ${multiStarConsolidationResult.totalSystemsReduced} nodes).`);
      writeStream.write(']'); writeStream.end();
    });

    writeStream.on('finish', () => {
      try {
        const { galacticCount, solarBodiesCount } = writePipelineArtifacts({
          options, sectorMap, cataloguedSummaries, allSystemManifests, starAliasesById,
          multiStarConsolidationResult: multiStarConsolidationResult ?? undefined,
        });

        resolve({
          totalStars, totalRows: totalStars, validStars: totalStars, skippedRows: 0,
          kinematicCount: totalKinematics, totalKinematics, localVolume10pcCount: local10pcCount, local10pcCount,
          referenceBrightCount, sectorPartitionCount: sectorMap.size, exoplanetSystemCount: exoplanetHostSummaries.length,
          totalExoplanets, totalExoplanetsAttached: totalExoplanets,
          galacticStructuresCount: galacticCount, solarSystemBodiesCount: solarBodiesCount, outputPath: resolvedOutput,
        });
      } catch (err) {
        reject(err);
      }
    });

    writeStream.on('error', reject);
    rl.on('error', reject);
  });
}

export async function buildStarDataPipeline(
  inputPath: string,
  outputJsonPath: string,
  options?: BuildPipelineOptions,
): Promise<PipelineSummary> {
  return buildGaiaDataPipeline(path.resolve(inputPath), outputJsonPath, options);
}
