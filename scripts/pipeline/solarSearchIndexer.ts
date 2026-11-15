import type { SolarSystemBodyRecord } from '../../src/types/astroStructures';
import type { CompactSearchEntry } from '../../src/utils/compactDataTypes';
import {
  classifyPlanetPhysical,
  computePlanetSurfaceGravityG,
} from '../../src/utils/planetaryPhysics';
import { computePlanetHazardMask } from '../../src/utils/astroHazards';
import { buildCleanKeys } from '../../src/utils/nomenclature';
import {
  isCoreSearchMinorBody,
  precalculateSolarSystemBodyFlags,
} from '../../src/utils/astroPrecalculation';

export function indexSolarBodies(
  solarBodies: SolarSystemBodyRecord[],
  coreEntries: CompactSearchEntry[],
  fullEntries: CompactSearchEntry[],
  planetsEntries: CompactSearchEntry[],
  minorBodiesEntries: CompactSearchEntry[],
): void {
  const orbitRankMap = new Map<string, number>();
  const solarBodiesByParent = new Map<string, SolarSystemBodyRecord[]>();

  for (const rawBody of solarBodies) {
    if (rawBody.classification === 'Star') continue;
    const body =
      rawBody.reticleType !== undefined && rawBody.targetStarId !== undefined
        ? rawBody
        : precalculateSolarSystemBodyFlags(rawBody);

    if (body.orbit?.semiMajorAxis !== undefined && body.orbit.semiMajorAxis > 0) {
      const parentKey = body.parentBodyId && body.parentBodyId !== 'sol' ? body.parentBodyId : 'sol';
      let list = solarBodiesByParent.get(parentKey);
      if (!list) {
        list = [];
        solarBodiesByParent.set(parentKey, list);
      }
      list.push(body);
    }
  }

  for (const [, bodies] of solarBodiesByParent) {
    bodies.sort((a, b) => {
      const diff = (a.orbit?.semiMajorAxis ?? 0) - (b.orbit?.semiMajorAxis ?? 0);
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    });
    bodies.forEach((b, idx) => {
      orbitRankMap.set(b.id, idx + 1);
    });
  }

  for (const rawBody of solarBodies) {
    if (rawBody.classification === 'Star') continue;
    const body =
      rawBody.reticleType !== undefined && rawBody.targetStarId !== undefined
        ? rawBody
        : precalculateSolarSystemBodyFlags(rawBody);

    const cleanKeys = buildCleanKeys([body.name, body.id, ...(body.tags ?? [])]);

    if (
      body.classification === 'Planet' ||
      body.classification === 'DwarfPlanet' ||
      body.classification === 'Moon'
    ) {
      const kindCode = body.classification === 'Planet' ? 2 : body.classification === 'Moon' ? 3 : 4;
      const entry: CompactSearchEntry = {
        i: body.id,
        k: kindCode,
        n: body.name,
        s: 'sol',
        h: 1,
        a: cleanKeys,
      };
      if (body.parentBodyId && body.parentBodyId !== 'sol') entry.o = body.parentBodyId;
      if (orbitRankMap.has(body.id)) entry.r = orbitRankMap.get(body.id);
      if (body.orbit?.semiMajorAxis !== undefined) {
        entry.A = Math.round(body.orbit.semiMajorAxis * 10000) / 10000;
      }
      if (body.orbit?.periodDays !== undefined) {
        entry.P = Math.round(body.orbit.periodDays * 1000) / 1000;
      }
      if (body.isHabitableCandidate) entry.z = 1;
      if (body.beltZone) entry.e = body.beltZone;

      if (body.classification === 'Planet') {
        const mEarth = body.massKg !== undefined ? body.massKg / 5.97237e24 : undefined;
        const rEarth = body.meanRadiusKm / 6371.0;
        const comp = classifyPlanetPhysical({
          massMearth: mEarth,
          radiusRearth: rEarth,
          classification: body.tags?.join(' '),
        });
        if (comp === 'super-earth') entry.u = 'super-earth';
        else if (comp === 'ice-giant') entry.u = 'ice-giant';
        else if (comp === 'gas-giant') entry.u = 'gas-giant';
        else entry.u = 'terrestrial';

        const surfaceGravityG =
          mEarth !== undefined && rEarth > 0
            ? computePlanetSurfaceGravityG({ massMearth: mEarth, radiusRearth: rEarth })
            : undefined;
        const hazardMask = computePlanetHazardMask({
          surfaceGravityG,
          periodDays: body.orbit?.periodDays,
          semiMajorAxisAu: body.orbit?.semiMajorAxis,
          eccentricity: body.orbit?.eccentricity,
        });
        if (hazardMask > 0) entry.H = hazardMask;
      } else {
        entry.u = 'terrestrial';
      }
      planetsEntries.push(entry);
      coreEntries.push(entry);
      fullEntries.push(entry);
    } else {
      const entry: CompactSearchEntry = {
        i: body.id,
        k: 6,
        n: body.name,
        s: 'sol',
        h: 1,
        a: cleanKeys,
      };
      if (body.parentBodyId && body.parentBodyId !== 'sol') entry.o = body.parentBodyId;
      if (orbitRankMap.has(body.id)) entry.r = orbitRankMap.get(body.id);
      if (body.orbit?.semiMajorAxis !== undefined) {
        entry.A = Math.round(body.orbit.semiMajorAxis * 10000) / 10000;
      }
      if (body.orbit?.periodDays !== undefined) {
        entry.P = Math.round(body.orbit.periodDays * 1000) / 1000;
      }
      if (body.isHabitableCandidate) entry.z = 1;
      if (body.beltZone) entry.e = body.beltZone;
      entry.u = body.tags?.includes('Spacecraft') ? 'construct' : 'terrestrial';

      minorBodiesEntries.push(entry);
      fullEntries.push(entry);
      if (body.isCoreSearch ?? isCoreSearchMinorBody(body)) coreEntries.push(entry);
    }
  }
}
