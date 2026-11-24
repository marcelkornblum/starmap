import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import zlib from 'node:zlib';
import type { SystemManifest, SystemSummaryNode, SystemTag } from '../../src/types/astro';
import { equatorialToCartesian } from '../../src/utils/astroCoordinates';
import { computeSystemHazardMask } from '../../src/utils/astroHazards';
import { resolveStellarClassificationFromSpectrum, resolveStellarReticleType } from '../../src/utils/astroPrecalculation';
import { collectStarLookupKeys } from '../../src/utils/nomenclature';
import { computePlanetCompositionCounts } from '../../src/utils/planetaryPhysics';
import { formatSectorId } from '../../src/utils/sectorMath';
import { resolveStarDisplayName, resolveStarProperName } from '../../src/utils/starNaming';
import {
  enrichPlanetsWithPrecalculatedFields,
  getPlanetCensus,
  inferSpectralClassFromTeff,
  loadAllExoplanetCatalogsWithHosts,
  matchExoplanetsForStar,
} from './exoplanets';
import { writePipelineArtifacts } from './gaiaArtifactWriter';
import { createSolPipelineEntries, ingestReconsSupplement, round2, round3 } from './gaiaSeedIngest';
import { computeGaiaKinematics, findBestHygMatch, loadHygCrossMatch, loadIauStarNames } from './hygCrossMatch';
import { consolidateMultiStarSystems } from './multiStarConsolidation';
import { matchCircumstellarDisksForStar } from './solAndSummary';
import {
  attachPlanetsToCataloguedSystem,
  emitStandaloneExoplanetHosts,
  findOfficialStarName,
  hasHygExoplanetMatch,
  type ExoHostIngestOverride,
} from './standaloneExoHostIngest';
import type { BuildPipelineOptions, HygCrossMatch, PipelineSummary } from './types';

export async function buildGaiaDataPipeline(
  gcnsGzPath: string,
  outputJsonPath: string,
  options?: BuildPipelineOptions,
): Promise<PipelineSummary> {
  const shouldWriteStarsJson = options?.writeStarsJson ?? Boolean(outputJsonPath);
  const resolvedGcns = path.resolve(gcnsGzPath);
  const resolvedOutput = shouldWriteStarsJson ? path.resolve(outputJsonPath) : '';
  const maxPartitionDist = options?.maxPartitionDistancePc ?? 100;
  if (shouldWriteStarsJson) {
    fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
  }

  console.log('Loading cross-match reference catalogs...');
  const iauProperStars = loadIauStarNames(options?.iauCsvPath ?? 'data/raw/iau_proper_stars.csv');
  const hygCrossMatch = loadHygCrossMatch(options?.hygCsvPath ?? 'data/hygdata_v3.csv');
  const oecPath = options?.exoplanetsCsvPath ?? options?.oecCsvPath ?? 'data/raw/open_exoplanet_catalogue.csv';
  const nasaPath = options?.exoplanetsCsvPath ? (options.nasaCsvPath ?? '') : (options?.nasaCsvPath ?? 'data/raw/nasa_exoplanet_archive.csv');
  const euPath = options?.exoplanetsCsvPath ? (options.euCsvPath ?? '') : (options?.euCsvPath ?? 'data/raw/exoplanet_eu.csv');
  const { hostMap: exoplanetHostMap, canonicalHosts } = loadAllExoplanetCatalogsWithHosts(oecPath, nasaPath, euPath);

  return new Promise((resolve, reject) => {
    let totalStars = 0; let totalKinematics = 0; let local10pcCount = 0; let referenceBrightCount = 0; let totalExoplanets = 0;
    const local10pcSystems: SystemSummaryNode[] = []; const referenceBrightSystems: SystemSummaryNode[] = [];
    const exoplanetHostSummaries: SystemSummaryNode[] = []; const cataloguedSummaries: SystemSummaryNode[] = [];
    const allSystemManifests: SystemManifest[] = []; const starAliasesById = new Map<string, string[]>();
    const sectorMap = new Map<string, SystemSummaryNode[]>(); const sectorManifestsMap = new Map<string, SystemManifest[]>();
    const matchedExoplanetIds = new Set<string>();

    const { solManifest, solNode, solSummary } = createSolPipelineEntries();
    for (const p of solManifest.planets) matchedExoplanetIds.add(p.id);
    local10pcSystems.push(solSummary); referenceBrightSystems.push(solSummary); cataloguedSummaries.push(solSummary);
    starAliasesById.set('sol', ['Sol', 'Sun', 'Solar System']); sectorMap.set('sector_+000_+000_+000', [solSummary]);
    if (options?.detailsDir || options?.searchDir || options?.dataDir) {
      sectorManifestsMap.set('sector_+000_+000_+000', [solManifest]); allSystemManifests.push(solManifest);
    }

    const writeStream = shouldWriteStarsJson
      ? fs.createWriteStream(resolvedOutput, { encoding: 'utf-8' })
      : null;
    writeStream?.write(`[${JSON.stringify(solNode)}`); totalStars++; totalKinematics++;
    const matchedHygIds = new Set<number>();

    function ingestStarEntry(
      sysId: string, sourceId: string, ra: number, dec: number, dist: number,
      pmra: number, pmdec: number, rv: number | null, gmag: number, bpmag: number, rpmag: number,
      hygMatch: HygCrossMatch | undefined, ePlx?: number, exoHostOverride?: ExoHostIngestOverride,
    ) {
      const [rawX, rawY, rawZ] = equatorialToCartesian(ra / 15, dec, dist);
      const [x, y, z] = [round3(rawX), round3(rawY), round3(rawZ)];
      const velocity = computeGaiaKinematics(ra, dec, dist, isNaN(pmra) ? 0 : pmra, isNaN(pmdec) ? 0 : pmdec, rv);
      totalKinematics++;

      const iauName = hygMatch?.hip && iauProperStars.has(hygMatch.hip) ? iauProperStars.get(hygMatch.hip) : undefined;
      const official = findOfficialStarName(hygMatch);
      const properName = exoHostOverride ? undefined : resolveStarProperName({
        properName: official?.properName, hygProperName: hygMatch?.proper, iauProperName: iauName,
      });
      const extraAliases: string[] = [];
      if (official?.properName) extraAliases.push(official.properName);
      if (official?.aliases) extraAliases.push(...official.aliases);
      if (iauName) extraAliases.push(iauName);
      if (hygMatch?.proper) extraAliases.push(hygMatch.proper);
      if (exoHostOverride?.aliases) extraAliases.push(...exoHostOverride.aliases);

      const name = exoHostOverride ? exoHostOverride.hostName : resolveStarDisplayName({
        properName, bayer: hygMatch?.bayer, con: hygMatch?.con, flam: hygMatch?.flam,
        gl: hygMatch?.gl, hip: hygMatch?.hip, hd: hygMatch?.hd, sourceId,
      });

      const mag = exoHostOverride ? (exoHostOverride.mag ?? 14.0) : (!isNaN(gmag) ? gmag : hygMatch?.mag ?? 15.0);
      const ci = exoHostOverride ? null : (!isNaN(bpmag) && !isNaN(rpmag) ? bpmag - rpmag : hygMatch?.ci ?? null);
      const absmag = mag - 5 * (Math.log10(dist) - 1);
      let theoreticalFlags = 0;
      let spect = exoHostOverride ? exoHostOverride.spect : hygMatch?.spect;
      if (!spect && exoHostOverride?.teffK !== undefined) {
        spect = inferSpectralClassFromTeff(exoHostOverride.teffK);
        if (spect) theoreticalFlags |= 1;
      } else if (!spect && ci !== null) {
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

      const matchedPlanets = exoHostOverride
        ? enrichPlanetsWithPrecalculatedFields(exoHostOverride.planets, exoHostOverride.lumLsun)
        : enrichPlanetsWithPrecalculatedFields(matchExoplanetsForStar(lookupInput, exoplanetHostMap));
      for (const p of matchedPlanets) matchedExoplanetIds.add(p.id);
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
      const starLum = exoHostOverride?.lumLsun ?? (hygMatch?.lum !== undefined && !isNaN(hygMatch.lum) ? hygMatch.lum : undefined);
      const hazardMask = computeSystemHazardMask({ spect, lum: starLum, effectiveTempK: exoHostOverride?.teffK, tags });
      const stellarClass = resolveStellarClassificationFromSpectrum(spect);
      const stellarReticle = resolveStellarReticleType(stellarClass, false);

      const summary: SystemSummaryNode = {
        id: sysId, name, x, y, z, dist: round3(dist), mag: round2(mag), absmag: round2(absmag),
        spect: spect || 'Unknown', classification: stellarClass, reticleType: stellarReticle,
        starCount: 1, planetCount: matchedPlanets.length, planetCensus: getPlanetCensus(matchedPlanets),
        planetCompositionCounts, hasHabitableCandidate, sectorId,
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
        let sectorManifests = sectorManifestsMap.get(sectorId);
        if (!sectorManifests) sectorManifestsMap.set(sectorId, (sectorManifests = []));
        const manifest: SystemManifest = {
          id: sysId, name, properName, x, y, z, dist: round3(dist),
          velocity: { vx: round2(velocity.vx), vy: round2(velocity.vy), vz: round2(velocity.vz), speed: round2(velocity.speed) },
          sectorId,
          stars: [{
            id: `${sourceId}-A`, name, componentDesignation: 'A', spectralType: spect || 'Unknown',
            mag: round2(mag), absmag: round2(absmag), reticleType: stellarReticle,
            ...(exoHostOverride?.lumLsun !== undefined ? { luminosityLsun: exoHostOverride.lumLsun } : {}),
            ...(exoHostOverride?.massMsun !== undefined ? { massMsun: exoHostOverride.massMsun } : {}),
            ...(exoHostOverride?.radiusRsun !== undefined ? { radiusRsun: exoHostOverride.radiusRsun } : {}),
            ...(exoHostOverride?.teffK !== undefined ? { effectiveTempK: exoHostOverride.teffK } : {}),
          }],
          planets: matchedPlanets, ...(matchedDisks.length > 0 ? { disks: matchedDisks } : {}),
          planetCompositionCounts, hasHabitableCandidate, ...(tags.length > 0 ? { tags } : {}), ...(hazardMask > 0 ? { hazardMask } : {}),
        };
        sectorManifests.push(manifest);
        allSystemManifests.push(manifest);
      }

      writeStream?.write(`,${JSON.stringify({
        id: totalStars, name, ra: round3(ra / 15), dec: round3(dec), dist: round3(dist), mag: round2(mag), absmag: round2(absmag),
        x, y, z, properName, hip: hygMatch?.hip, hd: hygMatch?.hd, hr: hygMatch?.hr,
        gl: hygMatch?.gl, bayer: hygMatch?.bayer, flam: hygMatch?.flam, con: hygMatch?.con, spect,
        ci: ci !== null && !isNaN(ci) ? round2(ci) : undefined,
        velocity: velocity ? { vx: round2(velocity.vx), vy: round2(velocity.vy), vz: round2(velocity.vz), speed: round2(velocity.speed) } : undefined,
      })}`);
      totalStars++;
    }

    let settled = false;
    const readStream = fs.createReadStream(resolvedGcns);
    const gunzipStream = zlib.createGunzip();
    const rl = readline.createInterface({ input: readStream.pipe(gunzipStream), crlfDelay: Infinity });

    const failPipeline = (err: Error) => {
      if (settled) return;
      settled = true;
      rl.close();
      readStream.destroy();
      gunzipStream.destroy();
      writeStream?.destroy();
      reject(err);
    };

    readStream.on('error', failPipeline);
    gunzipStream.on('error', failPipeline);
    rl.on('error', failPipeline);
    writeStream?.on('error', failPipeline);

    let multiStarConsolidationResult: ReturnType<typeof consolidateMultiStarSystems> | null = null;
    const finalizeArtifacts = () => {
      if (settled) return;
      try {
        const { galacticCount, solarBodiesCount } = writePipelineArtifacts({
          options, sectorMap, cataloguedSummaries, allSystemManifests, starAliasesById,
          multiStarConsolidationResult: multiStarConsolidationResult ?? undefined,
        });
        settled = true;
        resolve({
          totalStars, totalRows: totalStars, validStars: totalStars, skippedRows: 0,
          kinematicCount: totalKinematics, totalKinematics, localVolume10pcCount: local10pcCount, local10pcCount,
          referenceBrightCount, sectorPartitionCount: sectorMap.size, exoplanetSystemCount: exoplanetHostSummaries.length,
          totalExoplanets, totalExoplanetsAttached: totalExoplanets,
          galacticStructuresCount: galacticCount, solarSystemBodiesCount: solarBodiesCount, outputPath: resolvedOutput,
        });
      } catch (err) {
        settled = true;
        reject(err);
      }
    };

    rl.on('line', (line: string) => {
      if (settled || line.length < 130) return;
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
      if (settled) return;
      const emittedHygSystemIds = new Set<string>();
      for (const hyg of hygCrossMatch.allItems) {
        if (hyg.id === 0 || matchedHygIds.has(hyg.id) || !hyg.dist || hyg.dist <= 0 || hyg.dist >= 10000 || hyg.ra === undefined || hyg.dec === undefined) continue;
        const officialMatch = findOfficialStarName(hyg);
        const hasExoplanets = hasHygExoplanetMatch(hyg, iauProperStars, exoplanetHostMap);
        if (!officialMatch && !hasExoplanets && (hyg.mag === undefined || hyg.mag > 6.5) && hyg.dist > 10 && !hyg.proper && !hyg.bayer && !hyg.flam) continue;

        matchedHygIds.add(hyg.id);
        const hipSysId = hyg.hip ? `hip-${hyg.hip}` : undefined;
        const useHipId = Boolean(hipSysId && !emittedHygSystemIds.has(hipSysId));
        const sysId = useHipId ? hipSysId! : `hyg-${hyg.id}`;
        const sourceId = useHipId ? String(hyg.hip) : String(hyg.id);
        emittedHygSystemIds.add(sysId);
        ingestStarEntry(sysId, sourceId, hyg.ra * 15, hyg.dec, hyg.dist, hyg.pmra ?? 0, hyg.pmdec ?? 0, hyg.rv ?? 0, hyg.mag ?? 6.5, NaN, NaN, hyg);
      }

      const includeDetails = Boolean(options?.detailsDir || options?.searchDir || options?.dataDir);
      const reconsCounts = ingestReconsSupplement({
        maxPartitionDist,
        includeDetails,
        exoplanetHostMap, matchedExoplanetIds, cataloguedSummaries, starAliasesById,
        local10pcSystems, exoplanetHostSummaries, sectorMap, sectorManifestsMap, allSystemManifests,
        getTotalStars: () => totalStars,
        onEmitNode: (nodeJson) => { writeStream?.write(`,${nodeJson}`); totalStars++; },
      });
      local10pcCount += reconsCounts.addedLocal10pc;
      totalExoplanets += reconsCounts.addedExoplanets;

      let manifestById: Map<string, SystemManifest> | null = null;
      emitStandaloneExoplanetHosts({
        canonicalHosts, matchedExoplanetIds, cataloguedSummaries, starAliasesById,
        emitHost: (sysId, group, planets) => {
          const { host, aliases } = group;
          ingestStarEntry(sysId, sysId, host.raDeg, host.decDeg, host.distPc, 0, 0, null, host.mag ?? 14.0, NaN, NaN, undefined, undefined, {
            hostName: host.hostName, spect: host.spect, teffK: host.teffK, mag: host.mag,
            radiusRsun: host.radiusRsun, massMsun: host.massMsun, lumLsun: host.lumLsun, planets, aliases,
          });
        },
        attachPlanetsToExisting: (existingSummary, group, planets) => {
          if (!manifestById) {
            manifestById = new Map(allSystemManifests.map((m) => [m.id, m]));
          }
          totalExoplanets += attachPlanetsToCataloguedSystem({
            existingSummary, group, planets, includeDetails, allSystemManifests, manifestById,
            sectorManifestsMap, exoplanetHostSummaries, starAliasesById, matchedExoplanetIds,
          });
        },
      });

      multiStarConsolidationResult = consolidateMultiStarSystems({
        cataloguedSummaries, sectorMap, sectorManifestsMap, allSystemManifests,
        local10pcSystems, referenceBrightSystems, exoplanetHostSummaries, starAliasesById,
      });
      console.log(`Consolidated ${multiStarConsolidationResult.consolidatedCount} systems (reduced ${multiStarConsolidationResult.totalSystemsReduced} nodes).`);
      if (writeStream) {
        writeStream.write(']');
        writeStream.end();
      } else {
        finalizeArtifacts();
      }
    });

    if (writeStream) {
      writeStream.on('finish', finalizeArtifacts);
    }
  });
}
