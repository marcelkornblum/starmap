import type { ExoplanetRecord } from '../../../types/astro';
import type { SpatialEntityDefinition } from '../entity';
import { classifyPlanet } from '../cartography/reticleGeometry';
import { resolveCorpusEntryComposition } from '../../../services/details/hazardsAndComposition';
import type { CompactSearchEntry } from '../../../utils/compactDataCodec';
import { calculateKeplerianPosition } from '../math/kepler';

const finiteOr = (val: number | undefined, fallback: number): number =>
  typeof val === 'number' && Number.isFinite(val) ? val : fallback;

const positiveFiniteOr = (val: number | undefined): number | undefined =>
  typeof val === 'number' && Number.isFinite(val) && val > 0 ? val : undefined;

export function resolveSystemPlanetEntity(
  planet: ExoplanetRecord,
  index: number,
  primaryStarMassMsun?: number,
): SpatialEntityDefinition {
  const cataloguedA = positiveFiniteOr(planet.orbit?.semiMajorAxis);
  const cataloguedP = positiveFiniteOr(planet.orbit?.periodDays);
  const parsedMass = positiveFiniteOr(primaryStarMassMsun);
  const starMass = parsedMass !== undefined ? parsedMass : 1.0;

  const a =
    cataloguedA ??
    (cataloguedP
      ? Math.round(Math.cbrt((cataloguedP / 365.25) ** 2 * starMass) * 10000) / 10000
      : Math.round((0.4 + index * 0.6) * 1000) / 1000);

  const e = finiteOr(planet.orbit?.eccentricity, 0);
  const inc = finiteOr(planet.orbit?.inclination, 0);
  const node = finiteOr(planet.orbit?.ascendingNode, 0);
  const peri = finiteOr(planet.orbit?.argumentOfPeriapsis, 0);
  const meanAnomaly = finiteOr(planet.orbit?.meanAnomaly, (index * 60) % 360);
  const period = cataloguedP ?? Math.round(Math.pow(a, 1.5) * 365.25);

  return {
    id: planet.id,
    name: planet.name,
    position: calculateKeplerianPosition(a, e, inc, node, peri, meanAnomaly),
    classification: planet.composition ?? classifyPlanet(planet),
    orbit: {
      semiMajorAxis: a,
      eccentricity: e,
      inclination: inc,
      ascendingNode: node,
      argumentOfPeriapsis: peri,
      period,
      meanAnomaly,
      lineStyle: cataloguedA ? 'dashed' : 'dotted',
    },
  };
}

export function resolveCorpusPlanetEntity(
  entry: CompactSearchEntry,
  index: number,
): SpatialEntityDefinition {
  const cataloguedA = positiveFiniteOr(entry.A);
  const a = cataloguedA ?? Math.round((0.4 + index * 0.6) * 1000) / 1000;
  const meanAnomaly = (index * 60) % 360;

  return {
    id: entry.i,
    name: entry.n ?? entry.i,
    position: calculateKeplerianPosition(a, 0, 0, 0, 0, meanAnomaly),
    classification: resolveCorpusEntryComposition(entry),
    orbit: {
      semiMajorAxis: a,
      eccentricity: 0,
      inclination: 0,
      ascendingNode: 0,
      argumentOfPeriapsis: 0,
      period: Math.round(Math.pow(a, 1.5) * 365.25),
      meanAnomaly,
      lineStyle: cataloguedA ? 'dashed' : 'dotted',
    },
  };
}
