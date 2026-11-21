import type { SolarSystemBodyRecord } from '../../src/types/astroStructures';
import type { CompactSearchEntry } from '../../src/utils/compactDataTypes';
import {
  buildCleanKeys,
  pruneDerivableAliases,
} from '../../src/utils/nomenclature';
import {
  isCoreSearchMinorBody,
  precalculateSolarSystemBodyFlags,
} from '../../src/utils/astroPrecalculation';
import { comparePlanetsByOrbit } from './searchEntryIndexers';

export function indexSolarBodies(
  solarBodies: SolarSystemBodyRecord[],
  coreEntries: CompactSearchEntry[],
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
    bodies.sort(comparePlanetsByOrbit);
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

    const cleanKeys = pruneDerivableAliases(
      body.id,
      body.name,
      buildCleanKeys([body.name, body.id, ...(body.tags ?? [])]),
    );

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
        ...(cleanKeys ? { a: cleanKeys } : {}),
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
        entry.u = body.composition ?? 'terrestrial';
        if (body.hazardMask && body.hazardMask > 0) entry.H = body.hazardMask;
      } else {
        entry.u = 'terrestrial';
      }
      planetsEntries.push(entry);
      coreEntries.push(entry);
    } else {
      const entry: CompactSearchEntry = {
        i: body.id,
        k: 6,
        n: body.name,
        s: 'sol',
        h: 1,
        ...(cleanKeys ? { a: cleanKeys } : {}),
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
      if (body.isCoreSearch ?? isCoreSearchMinorBody(body)) coreEntries.push(entry);
    }
  }
}
