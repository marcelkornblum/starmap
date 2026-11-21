import fs from 'node:fs';
import path from 'node:path';
import type {
  ExoplanetRecord,
  StellarComponent,
  SystemManifest,
  SystemSummaryNode,
} from '../../src/types/astro';
import type { SolarSystemBodyRecord } from '../../src/types/astroStructures';
import type {
  GuideExampleSeedItem,
  GuideExamplesDataset,
  GuideExamplesSeedFile,
  GuideSectionKey,
  MetricBaselineSummary,
  ReferenceBaselinesDataset,
  ResolvedGuideExampleItem,
} from '../../src/types/guideData';
import {
  buildGalaxySystemNavigationHref,
  buildPlanetDetailsHref,
  buildPlanetElementFocusHref,
  buildSystemDetailsHref,
  buildSystemElementFocusHref,
} from '../../src/services/details/detailsNavigation';
import { toUrlSlug } from '../../src/utils/datasetLayerSlugs';
import { FULL_SOLAR_SYSTEM_BODIES } from './seedCatalogs';

const PARSEC_TO_LY = 3.2616;
const KELVIN_TO_CELSIUS = 273.15;
const STANDARD_GRAVITY_MS2 = 9.81;
const AU_LIGHT_MINUTES = 8.3167;
const AU_MILLION_KM = 149.598;
const MSUN_TO_MEARTH = 332950;
const MSUN_KG_E30 = 1.9885;
const RSUN_KM = 696340;
const RSUN_TO_REARTH = 109.2;
const LSUN_W_E26 = 3.828;
const MEARTH_KG_E24 = 5.972;
const REARTH_KM = 6371;

type ResolvedEntity =
  | {
      readonly kind: 'system';
      readonly id: string;
      readonly name: string;
      readonly systemId: string;
      readonly systemName: string;
      readonly manifest?: SystemManifest;
      readonly summary?: SystemSummaryNode;
      readonly primaryStar?: StellarComponent;
    }
  | {
      readonly kind: 'star';
      readonly id: string;
      readonly name: string;
      readonly systemId: string;
      readonly systemName: string;
      readonly star: StellarComponent;
      readonly manifest: SystemManifest;
    }
  | {
      readonly kind: 'exoplanet';
      readonly id: string;
      readonly name: string;
      readonly systemId: string;
      readonly systemName: string;
      readonly planet: ExoplanetRecord;
      readonly manifest: SystemManifest;
    }
  | {
      readonly kind: 'solar-body';
      readonly id: string;
      readonly name: string;
      readonly systemId: string;
      readonly systemName: string;
      readonly body: SolarSystemBodyRecord;
      readonly planetRecord?: ExoplanetRecord;
    };

export interface BuildGuideAndBaselinesInput {
  readonly solManifest: SystemManifest;
  readonly solarBodies: readonly SolarSystemBodyRecord[];
  readonly allSummaries: readonly SystemSummaryNode[];
  readonly systemManifests: readonly SystemManifest[];
  readonly generatedAt: string;
  readonly displayNameOverrides?: ReadonlyMap<string, string>;
}

function resolveDefaultDisplayNameOverrides(): Map<string, string> {
  const map = new Map<string, string>();
  for (const body of FULL_SOLAR_SYSTEM_BODIES) {
    if (body.displayName) {
      map.set(body.id, body.displayName);
    }
  }
  return map;
}

function formatSlugArg(name: string, id: string): string {
  return name.includes('(') ? id : name;
}

function toCelsius(kelvin: number): number {
  return Math.round(kelvin - KELVIN_TO_CELSIUS);
}

function toFahrenheit(kelvin: number): number {
  return Math.round(((kelvin - KELVIN_TO_CELSIUS) * 9) / 5 + 32);
}

function formatNumber(n: number, decimals: number): string {
  return n.toFixed(decimals);
}

export function buildReferenceBaselinesDataset(
  input: BuildGuideAndBaselinesInput,
): ReferenceBaselinesDataset {
  const { solManifest, solarBodies, systemManifests, allSummaries, generatedAt } = input;
  const overrides = input.displayNameOverrides ?? resolveDefaultDisplayNameOverrides();

  const solStar = solManifest.stars[0];
  if (!solStar) {
    throw new Error('Cannot emit reference-baselines.json: Sol manifest has no primary star');
  }

  const earthPlanet = solManifest.planets.find((p) => p.id === 'earth');
  const earthBody = solarBodies.find((b) => b.id === 'earth');
  if (!earthPlanet || !earthBody?.orbit) {
    throw new Error('Cannot emit reference-baselines.json: Earth record missing from Sol dataset');
  }

  const solName = overrides.get('sol') ?? solManifest.name;
  const solHref = buildSystemDetailsHref(solManifest.id);
  const solCoords: readonly [number, number, number] = [solManifest.x, solManifest.y, solManifest.z];
  const solTempK = solStar.effectiveTempK ?? 5778;
  const solMassMsun = solStar.massMsun ?? 1.0;
  const solRadiusRsun = solStar.radiusRsun ?? 1.0;
  const solLumLsun = solStar.luminosityLsun ?? 1.0;
  const solMag = solStar.mag ?? 0;
  const solAbsMag = solStar.absmag ?? 0;

  const earthName = overrides.get('earth') ?? earthPlanet.name;
  const earthHref = buildPlanetDetailsHref(earthPlanet.id);
  const earthMassMearth = earthPlanet.massMearth ?? 1.0;
  const earthRadiusRearth = earthPlanet.radiusRearth ?? 1.0;
  const earthSmaAu = Number((earthPlanet.orbit?.semiMajorAxis ?? earthBody.orbit.semiMajorAxis).toFixed(3));
  const earthPeriodDays = Number((earthPlanet.orbit?.periodDays ?? earthBody.orbit.periodDays).toFixed(2));
  const earthInclinationDeg = Number((earthPlanet.orbit?.inclination ?? earthBody.orbit.inclination).toFixed(2));
  const earthEqTempK = Math.round(earthPlanet.equilibriumTempK ?? 255);
  const earthGravityG = earthPlanet.surfaceGravityG ?? 1.0;

  const tauCetiManifest =
    systemManifests.find(
      (m) =>
        m.id === 'tau-ceti' ||
        toUrlSlug(m.name) === 'tau-ceti' ||
        m.planets.some((p) => p.id === 'tau-ceti-e'),
    ) ?? null;
  const tauCetiSummary =
    allSummaries.find((s) => s.id === (tauCetiManifest?.id ?? 'tau-ceti') || toUrlSlug(s.name) === 'tau-ceti') ??
    null;
  const tauCetiStar = tauCetiManifest?.stars[0];
  const tauCetiE = tauCetiManifest?.planets.find((p) => p.id === 'tau-ceti-e');
  if (!tauCetiManifest || !tauCetiE) {
    throw new Error('Cannot emit reference-baselines.json: Tau Ceti / tau-ceti-e benchmark missing');
  }

  const solReticle = solStar.reticleType ?? 'stellar-system';
  const earthReticle = earthPlanet.reticleType ?? 'terrestrial';

  const metrics: Record<string, MetricBaselineSummary> = {
    'galactic-coordinates': {
      baselineId: solManifest.id,
      baselineName: solName,
      baselineHref: solHref,
      baselineReticleType: solReticle,
      value: `${solCoords[0].toFixed(2)} pc`,
      familiar: '0.00 light-years (ly)',
      numericValue: 0,
      unit: 'pc',
    },
    'stellar-magnitude': {
      baselineId: solManifest.id,
      baselineName: solName,
      baselineHref: solHref,
      baselineReticleType: solReticle,
      value: `${solMag.toFixed(2)} V / +${solAbsMag.toFixed(2)} M_V`,
      familiar: `Brightest celestial body from ${earthName}`,
      numericValue: solMag,
      unit: 'V',
    },
    'stellar-mass': {
      baselineId: solManifest.id,
      baselineName: solName,
      baselineHref: solHref,
      baselineReticleType: solReticle,
      value: `${solMassMsun.toFixed(2)} M☉`,
      familiar: `${Math.round(solMassMsun * MSUN_TO_MEARTH).toLocaleString('en-US')} M⊕ (${(solMassMsun * MSUN_KG_E30).toFixed(3)} × 10³⁰ kg)`,
      numericValue: solMassMsun,
      unit: 'M☉',
    },
    'stellar-radius': {
      baselineId: solManifest.id,
      baselineName: solName,
      baselineHref: solHref,
      baselineReticleType: solReticle,
      value: `${solRadiusRsun.toFixed(2)} R☉`,
      familiar: `${(solRadiusRsun * RSUN_TO_REARTH).toFixed(1)} R⊕ (${Math.round(solRadiusRsun * RSUN_KM).toLocaleString('en-US')} km)`,
      numericValue: solRadiusRsun,
      unit: 'R☉',
    },
    'stellar-luminosity': {
      baselineId: solManifest.id,
      baselineName: solName,
      baselineHref: solHref,
      baselineReticleType: solReticle,
      value: `${solLumLsun.toFixed(2)} L☉`,
      familiar: `${(solLumLsun * LSUN_W_E26).toFixed(3)} × 10²⁶ W (${solLumLsun.toFixed(1)}× Solar bolometric output)`,
      numericValue: solLumLsun,
      unit: 'L☉',
    },
    'effective-temperature': {
      baselineId: solManifest.id,
      baselineName: solName,
      baselineHref: solHref,
      baselineReticleType: solReticle,
      value: `${solTempK.toLocaleString('en-US')} K`,
      familiar: `${toCelsius(solTempK).toLocaleString('en-US')} °C (${toFahrenheit(solTempK).toLocaleString('en-US')} °F)`,
      numericValue: solTempK,
      unit: 'K',
    },
    'semi-major-axis': {
      baselineId: earthPlanet.id,
      baselineName: earthName,
      baselineHref: earthHref,
      baselineReticleType: earthReticle,
      value: `${earthSmaAu.toFixed(3)} AU`,
      familiar: `${(earthSmaAu * AU_LIGHT_MINUTES).toFixed(2)} light-minutes (${(earthSmaAu * AU_MILLION_KM).toFixed(1)}M km)`,
      numericValue: earthSmaAu,
      unit: 'AU',
    },
    'orbital-period': {
      baselineId: earthPlanet.id,
      baselineName: earthName,
      baselineHref: earthHref,
      baselineReticleType: earthReticle,
      value: `${earthPeriodDays.toFixed(2)} d`,
      familiar: `1.00 ${earthName} year (12 months)`,
      numericValue: earthPeriodDays,
      unit: 'd',
    },
    'orbital-inclination': {
      baselineId: earthPlanet.id,
      baselineName: earthName,
      baselineHref: earthHref,
      baselineReticleType: earthReticle,
      value: `${earthInclinationDeg.toFixed(2)}°`,
      familiar: 'Coplanar ecliptic reference',
      numericValue: earthInclinationDeg,
      unit: '°',
    },
    'planetary-mass': {
      baselineId: earthPlanet.id,
      baselineName: earthName,
      baselineHref: earthHref,
      baselineReticleType: earthReticle,
      value: `${earthMassMearth.toFixed(2)} M⊕`,
      familiar: `${(earthMassMearth * MEARTH_KG_E24).toFixed(3)} × 10²⁴ kg (1.0× ${earthName} mass)`,
      numericValue: earthMassMearth,
      unit: 'M⊕',
    },
    'planetary-radius': {
      baselineId: earthPlanet.id,
      baselineName: earthName,
      baselineHref: earthHref,
      baselineReticleType: earthReticle,
      value: `${earthRadiusRearth.toFixed(2)} R⊕`,
      familiar: `${Math.round(earthRadiusRearth * REARTH_KM).toLocaleString('en-US')} km radius (${Math.round(earthRadiusRearth * REARTH_KM * 2).toLocaleString('en-US')} km dia)`,
      numericValue: earthRadiusRearth,
      unit: 'R⊕',
    },
    'equilibrium-temperature': {
      baselineId: earthPlanet.id,
      baselineName: earthName,
      baselineHref: earthHref,
      baselineReticleType: earthReticle,
      value: `${earthEqTempK} K`,
      familiar: `${toCelsius(earthEqTempK)} °C (${toFahrenheit(earthEqTempK)} °F)`,
      numericValue: earthEqTempK,
      unit: 'K',
    },
    'surface-gravity': {
      baselineId: earthPlanet.id,
      baselineName: earthName,
      baselineHref: earthHref,
      baselineReticleType: earthReticle,
      value: `${earthGravityG.toFixed(2)} g`,
      familiar: `${earthGravityG.toFixed(2)} g (${(earthGravityG * STANDARD_GRAVITY_MS2).toFixed(2)} m/s²)`,
      numericValue: earthGravityG,
      unit: 'g',
    },
  };

  return {
    version: 1,
    generatedAt,
    targets: {
      sol: {
        id: solManifest.id,
        name: solName,
        properName: solManifest.properName,
        systemId: solManifest.id,
        href: solHref,
        spectralType: solStar.spectralType,
        coordinatesPc: solCoords,
        massMsun: { value: solMassMsun, unit: 'M☉' },
        radiusRsun: { value: solRadiusRsun, unit: 'R☉' },
        luminosityLsun: { value: solLumLsun, unit: 'L☉' },
        effectiveTempK: { value: solTempK, unit: 'K' },
        visualMagnitude: { value: solMag, unit: 'V' },
        absoluteMagnitude: { value: solAbsMag, unit: 'M_V' },
        reticleType: solReticle,
      },
      earth: {
        id: earthPlanet.id,
        name: earthName,
        systemId: solManifest.id,
        systemName: solName,
        href: earthHref,
        coordinatesPc: solCoords,
        massMearth: { value: earthMassMearth, unit: 'M⊕' },
        radiusRearth: { value: earthRadiusRearth, unit: 'R⊕' },
        semiMajorAxisAu: { value: earthSmaAu, unit: 'AU' },
        periodDays: { value: earthPeriodDays, unit: 'd' },
        inclinationDeg: { value: earthInclinationDeg, unit: '°' },
        equilibriumTempK: { value: earthPlanet.equilibriumTempK ?? earthEqTempK, unit: 'K' },
        surfaceGravityG: { value: earthGravityG, unit: 'g' },
        reticleType: earthReticle,
      },
      stellarBenchmark: {
        id: toUrlSlug(tauCetiManifest.name) || tauCetiManifest.id,
        systemId: tauCetiManifest.id,
        name: tauCetiManifest.name,
        href: buildSystemDetailsHref(formatSlugArg(tauCetiManifest.name, tauCetiManifest.id)),
        spectralType: tauCetiStar?.spectralType ?? tauCetiSummary?.spect,
        coordinatesPc: [tauCetiManifest.x, tauCetiManifest.y, tauCetiManifest.z],
        ...(tauCetiStar?.mag !== undefined
          ? { visualMagnitude: { value: tauCetiStar.mag, unit: 'V' } }
          : {}),
        ...(tauCetiStar?.absmag !== undefined
          ? { absoluteMagnitude: { value: tauCetiStar.absmag, unit: 'M_V' } }
          : {}),
        reticleType: tauCetiStar?.reticleType ?? tauCetiSummary?.reticleType ?? 'stellar-system',
      },
      orbitalBenchmark: {
        id: tauCetiE.id,
        systemId: tauCetiManifest.id,
        systemName: tauCetiManifest.name,
        name: tauCetiE.name,
        href: buildSystemElementFocusHref(
          formatSlugArg(tauCetiManifest.name, tauCetiManifest.id),
          tauCetiE.id,
        ),
        ...(tauCetiE.orbit?.semiMajorAxis !== undefined
          ? { semiMajorAxisAu: { value: tauCetiE.orbit.semiMajorAxis, unit: 'AU' } }
          : {}),
        ...(tauCetiE.orbit?.periodDays !== undefined
          ? { periodDays: { value: tauCetiE.orbit.periodDays, unit: 'd' } }
          : {}),
        ...(tauCetiE.massMearth !== undefined
          ? { massMearth: { value: tauCetiE.massMearth, unit: 'M⊕' } }
          : {}),
        ...(tauCetiE.radiusRearth !== undefined
          ? { radiusRearth: { value: tauCetiE.radiusRearth, unit: 'R⊕' } }
          : {}),
        ...(tauCetiE.equilibriumTempK !== undefined
          ? { equilibriumTempK: { value: tauCetiE.equilibriumTempK, unit: 'K' } }
          : {}),
        ...(tauCetiE.surfaceGravityG !== undefined
          ? { surfaceGravityG: { value: tauCetiE.surfaceGravityG, unit: 'g' } }
          : {}),
        reticleType: tauCetiE.reticleType ?? 'super-earth',
      },
    },
    metrics,
  };
}

function resolveExampleEntity(
  item: GuideExampleSeedItem,
  indexes: {
    solManifest: SystemManifest;
    solarBodiesById: Map<string, SolarSystemBodyRecord>;
    solPlanetsById: Map<string, ExoplanetRecord>;
    manifestsById: Map<string, SystemManifest>;
    summariesById: Map<string, SystemSummaryNode>;
    starsById: Map<string, { star: StellarComponent; manifest: SystemManifest }>;
    planetsById: Map<string, { planet: ExoplanetRecord; manifest: SystemManifest }>;
    overrides: ReadonlyMap<string, string>;
  },
): ResolvedEntity {
  const { entityId } = item;
  const {
    solManifest,
    solarBodiesById,
    solPlanetsById,
    manifestsById,
    summariesById,
    starsById,
    planetsById,
    overrides,
  } = indexes;

  const solName = overrides.get('sol') ?? solManifest.name;

  if (entityId === solManifest.id) {
    return {
      kind: 'system',
      id: solManifest.id,
      name: solName,
      systemId: solManifest.id,
      systemName: solName,
      manifest: solManifest,
      summary: summariesById.get(solManifest.id),
      primaryStar: solManifest.stars[0],
    };
  }

  const solarBody = solarBodiesById.get(entityId);
  if (solarBody) {
    return {
      kind: 'solar-body',
      id: solarBody.id,
      name: overrides.get(solarBody.id) ?? solarBody.name,
      systemId: solManifest.id,
      systemName: solName,
      body: solarBody,
      planetRecord: solPlanetsById.get(solarBody.id),
    };
  }

  const starMatch = starsById.get(entityId);
  if (starMatch) {
    return {
      kind: 'star',
      id: starMatch.star.id,
      name: starMatch.star.name,
      systemId: starMatch.manifest.id,
      systemName: starMatch.manifest.name,
      star: starMatch.star,
      manifest: starMatch.manifest,
    };
  }

  const planetMatch = planetsById.get(entityId);
  if (planetMatch) {
    return {
      kind: 'exoplanet',
      id: planetMatch.planet.id,
      name: planetMatch.planet.name,
      systemId: planetMatch.manifest.id,
      systemName: planetMatch.manifest.name,
      planet: planetMatch.planet,
      manifest: planetMatch.manifest,
    };
  }

  const manifest = manifestsById.get(entityId);
  const summary = summariesById.get(entityId);
  if (manifest || summary) {
    const sysName = manifest?.name ?? summary?.name ?? entityId;
    return {
      kind: 'system',
      id: entityId,
      name: sysName,
      systemId: entityId,
      systemName: sysName,
      manifest,
      summary,
      primaryStar: manifest?.stars[0],
    };
  }

  throw new Error(`Guide example seed entity "${entityId}" could not be resolved in built dataset`);
}

function buildCanonicalExampleHref(item: GuideExampleSeedItem, entity: ResolvedEntity): string {
  const sysArg = formatSlugArg(entity.systemName, entity.systemId);
  if (item.scope === 'galaxy') {
    if (entity.kind === 'system') {
      return buildGalaxySystemNavigationHref(formatSlugArg(entity.name, entity.id));
    }
    return buildGalaxySystemNavigationHref(entity.id);
  }
  if (item.scope === 'planet') {
    if (entity.kind === 'solar-body' && entity.body.parentBodyId && entity.body.parentBodyId !== entity.systemId) {
      return buildPlanetElementFocusHref(entity.body.parentBodyId, entity.id);
    }
    if (entity.kind === 'exoplanet') {
      return buildSystemElementFocusHref(sysArg, entity.id);
    }
    return buildPlanetDetailsHref(entity.id);
  }
  if (entity.kind === 'system') {
    return buildSystemDetailsHref(sysArg);
  }
  return buildSystemElementFocusHref(sysArg, entity.id);
}

function formatExampleTelemetryNote(
  section: GuideSectionKey,
  entryId: string,
  entity: ResolvedEntity,
  framing?: string,
): string {
  const parts: string[] = [];

  if (section === 'starTypes') {
    if (entity.kind === 'star') {
      parts.push(entity.star.spectralType);
      if (Number.isFinite(entity.manifest.dist) && entity.manifest.dist > 0) {
        parts.push(`${formatNumber(entity.manifest.dist, 2)} pc`);
      }
      if (entity.star.mag !== undefined) {
        parts.push(`${formatNumber(entity.star.mag, 2)} V`);
      }
    } else if (entity.kind === 'system') {
      const spect = entity.primaryStar?.spectralType ?? entity.summary?.spect;
      const dist = entity.manifest?.dist ?? entity.summary?.dist;
      const mag = entity.primaryStar?.mag ?? entity.summary?.mag;
      if (spect) parts.push(spect);
      if (dist !== undefined && dist > 0) parts.push(`${formatNumber(dist, 2)} pc`);
      if (mag !== undefined) parts.push(`${formatNumber(mag, 2)} V`);
    }
  } else if (section === 'planetTypes') {
    const planet = entity.kind === 'exoplanet' ? entity.planet : entity.kind === 'solar-body' ? entity.planetRecord : undefined;
    if (planet) {
      if (planet.massMearth !== undefined) parts.push(`${formatNumber(planet.massMearth, 2)} M⊕`);
      if (planet.radiusRearth !== undefined) parts.push(`${formatNumber(planet.radiusRearth, 2)} R⊕`);
      if (planet.orbit?.semiMajorAxis && planet.orbit.semiMajorAxis > 0) {
        parts.push(`a = ${formatNumber(planet.orbit.semiMajorAxis, 3)} AU`);
      }
      if (planet.equilibriumTempK !== undefined) parts.push(`T_eq ${Math.round(planet.equilibriumTempK)} K`);
    }
  } else if (section === 'metricTypes') {
    const star = entity.kind === 'star' ? entity.star : entity.kind === 'system' ? entity.primaryStar : undefined;
    const planet = entity.kind === 'exoplanet' ? entity.planet : entity.kind === 'solar-body' ? entity.planetRecord : undefined;
    const orbit = planet?.orbit ?? (entity.kind === 'solar-body' ? entity.body.orbit : undefined);

    if (entryId === 'galactic-coordinates') {
      const m = entity.kind === 'system' ? entity.manifest ?? entity.summary : undefined;
      if (m) {
        const distLy = (m.dist * PARSEC_TO_LY).toFixed(2);
        parts.push(`[${formatNumber(m.x, 2)}, ${formatNumber(m.y, 2)}, ${formatNumber(m.z, 2)}] pc (${formatNumber(m.dist, 2)} pc / ${distLy} ly)`);
      }
    } else if (entryId === 'stellar-magnitude') {
      const mag = star?.mag ?? (entity.kind === 'system' ? entity.summary?.mag : undefined);
      const absmag = star?.absmag ?? (entity.kind === 'system' ? entity.summary?.absmag : undefined);
      if (mag !== undefined) parts.push(`${formatNumber(mag, 2)} V`);
      if (absmag !== undefined) parts.push(`${absmag >= 0 ? '+' : ''}${formatNumber(absmag, 2)} M_V`);
    } else if (entryId === 'stellar-mass' && star?.massMsun !== undefined) {
      parts.push(`${formatNumber(star.massMsun, 3)} M☉`);
    } else if (entryId === 'stellar-radius' && star?.radiusRsun !== undefined) {
      parts.push(`${formatNumber(star.radiusRsun, 3)} R☉`);
    } else if (entryId === 'stellar-luminosity' && star?.luminosityLsun !== undefined) {
      parts.push(`${formatNumber(star.luminosityLsun, 3)} L☉`);
    } else if (entryId === 'effective-temperature') {
      if (star?.effectiveTempK !== undefined) parts.push(`${star.effectiveTempK.toLocaleString('en-US')} K`);
      if (star?.spectralType) parts.push(star.spectralType);
    } else if (entryId === 'semi-major-axis' && orbit?.semiMajorAxis) {
      parts.push(`${formatNumber(orbit.semiMajorAxis, 3)} AU`);
    } else if (entryId === 'orbital-period' && orbit?.periodDays) {
      parts.push(`${formatNumber(orbit.periodDays, 2)} d`);
    } else if (entryId === 'orbital-inclination' && orbit) {
      parts.push(`${formatNumber(orbit.inclination, 2)}°`);
    } else if (entryId === 'planetary-mass' && planet?.massMearth !== undefined) {
      parts.push(`${formatNumber(planet.massMearth, 2)} M⊕`);
    } else if (entryId === 'planetary-radius' && planet?.radiusRearth !== undefined) {
      parts.push(`${formatNumber(planet.radiusRearth, 2)} R⊕`);
    } else if (entryId === 'equilibrium-temperature' && planet?.equilibriumTempK !== undefined) {
      parts.push(`${Math.round(planet.equilibriumTempK)} K`);
    } else if (entryId === 'surface-gravity' && planet?.surfaceGravityG !== undefined) {
      parts.push(`${formatNumber(planet.surfaceGravityG, 2)} g`);
    }
    if (parts.length === 0 && star?.spectralType) {
      parts.push(star.spectralType);
    }
  } else if (section === 'hazardTypes') {
    const star = entity.kind === 'star' ? entity.star : entity.kind === 'system' ? entity.primaryStar : undefined;
    const planet = entity.kind === 'exoplanet' ? entity.planet : entity.kind === 'solar-body' ? entity.planetRecord : undefined;
    const orbit = planet?.orbit ?? (entity.kind === 'solar-body' ? entity.body.orbit : undefined);
    if (star) {
      parts.push(star.spectralType);
      if (star.mag !== undefined) parts.push(`${formatNumber(star.mag, 2)} V`);
    } else if (entity.kind === 'system' && entity.summary) {
      if (entity.summary.spect) parts.push(entity.summary.spect);
      parts.push(`${formatNumber(entity.summary.mag, 2)} V`);
    } else {
      if (planet?.equilibriumTempK !== undefined) parts.push(`T_eq ${Math.round(planet.equilibriumTempK)} K`);
      if (planet?.surfaceGravityG !== undefined) parts.push(`${formatNumber(planet.surfaceGravityG, 2)} g`);
      if (orbit?.periodDays && orbit.periodDays > 0) parts.push(`P = ${formatNumber(orbit.periodDays, 2)} d`);
      if (orbit && orbit.eccentricity > 0.1) parts.push(`e = ${formatNumber(orbit.eccentricity, 2)}`);
      if (entity.kind === 'solar-body' && !planet && orbit) {
        parts.push(`a = ${formatNumber(orbit.semiMajorAxis, 3)} AU`);
      }
    }
  }

  const telemetry = parts.join(' · ');
  if (framing && telemetry) {
    return `${framing} (${telemetry}).`;
  }
  if (framing) {
    return `${framing}.`;
  }
  return telemetry || entity.name;
}

function resolveReticleType(entity: ResolvedEntity) {
  if (entity.kind === 'star') return entity.star.reticleType ?? 'star';
  if (entity.kind === 'exoplanet') return entity.planet.reticleType ?? entity.planet.composition;
  if (entity.kind === 'solar-body') {
    return entity.planetRecord?.reticleType ?? entity.body.reticleType ?? 'terrestrial';
  }
  return entity.primaryStar?.reticleType ?? entity.summary?.reticleType ?? 'star';
}

export interface BuildGuideExamplesInput extends BuildGuideAndBaselinesInput {
  readonly seed: GuideExamplesSeedFile;
}

export function buildGuideExamplesDataset(
  input: BuildGuideExamplesInput,
): GuideExamplesDataset {
  const { seed, solManifest, solarBodies, allSummaries, systemManifests, generatedAt } = input;
  const overrides = input.displayNameOverrides ?? resolveDefaultDisplayNameOverrides();

  const solarBodiesById = new Map<string, SolarSystemBodyRecord>();
  for (const b of solarBodies) solarBodiesById.set(b.id, b);

  const solPlanetsById = new Map<string, ExoplanetRecord>();
  for (const p of solManifest.planets) solPlanetsById.set(p.id, p);

  const manifestsById = new Map<string, SystemManifest>();
  const starsById = new Map<string, { star: StellarComponent; manifest: SystemManifest }>();
  const planetsById = new Map<string, { planet: ExoplanetRecord; manifest: SystemManifest }>();

  for (const m of [solManifest, ...systemManifests]) {
    manifestsById.set(m.id, m);
    for (const star of m.stars) {
      starsById.set(star.id, { star, manifest: m });
    }
    for (const planet of m.planets) {
      planetsById.set(planet.id, { planet, manifest: m });
    }
  }

  const summariesById = new Map<string, SystemSummaryNode>();
  for (const s of allSummaries) summariesById.set(s.id, s);

  const sections: Record<GuideSectionKey, Record<string, readonly ResolvedGuideExampleItem[]>> = {
    starTypes: {},
    planetTypes: {},
    metricTypes: {},
    hazardTypes: {},
  };

  for (const section of Object.keys(seed) as GuideSectionKey[]) {
    for (const [entryId, items] of Object.entries(seed[section])) {
      sections[section][entryId] = items.map((item) => {
        const entity = resolveExampleEntity(item, {
          solManifest,
          solarBodiesById,
          solPlanetsById,
          manifestsById,
          summariesById,
          starsById,
          planetsById,
          overrides,
        });
        return {
          id: entity.id,
          name: entity.name,
          href: buildCanonicalExampleHref(item, entity),
          note: formatExampleTelemetryNote(section, entryId, entity, item.framing),
          reticleType: resolveReticleType(entity),
        };
      });
    }
  }

  return {
    version: 1,
    generatedAt,
    sections,
  };
}

export function loadGuideExamplesSeed(seedPath = path.resolve(process.cwd(), 'data/seed/guide-examples.json')): GuideExamplesSeedFile {
  return JSON.parse(fs.readFileSync(seedPath, 'utf8')) as GuideExamplesSeedFile;
}

export function writeGuideAndBaselinesArtifacts(
  params: Omit<BuildGuideAndBaselinesInput, 'generatedAt'> & {
    readonly outDir: string;
    readonly generatedAt: string;
  },
): void {
  const { outDir, ...rest } = params;
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const baselines = buildReferenceBaselinesDataset(rest);
  const seed = loadGuideExamplesSeed();
  const examples = buildGuideExamplesDataset({ ...rest, seed });

  fs.writeFileSync(
    path.join(outDir, 'reference-baselines.json'),
    JSON.stringify(baselines),
    'utf-8',
  );
  fs.writeFileSync(
    path.join(outDir, 'guide-examples.json'),
    JSON.stringify(examples),
    'utf-8',
  );
}
