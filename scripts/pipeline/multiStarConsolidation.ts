import type {
  CircumstellarDiskRecord,
  ExoplanetRecord,
  StellarComponent,
  SystemSummaryNode,
} from '../../src/types/astro';
import {
  resolveStellarClassificationFromSpectrum,
  resolveStellarReticleType,
} from '../../src/utils/astroPrecalculation';
import {
  addKeyVariants,
  getStrippedSystemBaseName,
  isDuplicateCatalogRecord,
  mergeSystemAliases,
  pruneAbsorbedCollections,
} from './systemNomenclature';
import type { ConsolidateMultiStarSystemsParams } from './types';

export function consolidateMultiStarSystems(params: ConsolidateMultiStarSystemsParams): {
  consolidatedCount: number;
  totalSystemsReduced: number;
  absorbedIdToPrimary: Map<string, { id: string; name: string }>;
} {
  const summaryMap = new Map<string, SystemSummaryNode>();
  const addAll = (list?: Iterable<SystemSummaryNode>) => {
    if (list) for (const s of list) if (!summaryMap.has(s.id)) summaryMap.set(s.id, s);
  };
  addAll(params.cataloguedSummaries);
  if (params.sectorMap) for (const list of params.sectorMap.values()) addAll(list);
  addAll(params.local10pcSystems);
  addAll(params.referenceBrightSystems);
  addAll(params.exoplanetHostSummaries);

  const summaries = Array.from(summaryMap.values());
  const n = summaries.length;
  if (n <= 1) return { consolidatedCount: 0, totalSystemsReduced: 0, absorbedIdToPrimary: new Map() };

  const isSol = (s: SystemSummaryNode): boolean =>
    s.id === 'sol' || s.id === 'hyg-0' || s.name === 'Sol' || (s.x === 0 && s.y === 0 && s.z === 0);

  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  const union = (i: number, j: number) => { const ri = find(i); const rj = find(j); if (ri !== rj) parent[ri] = rj; };

  const starData: ({ dist: number; ux: number; uy: number; uz: number; decDeg: number; raDeg: number } | null)[] = [];
  const keyToStarIndices = new Map<string, number[]>();

  for (let i = 0; i < n; i++) {
    const s = summaries[i]!;
    if (isSol(s)) { starData.push(null); continue; }
    const dist = s.dist > 0 ? s.dist : Math.hypot(s.x, s.y, s.z);
    const inv = dist > 0 ? 1 / dist : 0;
    const [ux, uy, uz] = [s.x * inv, s.y * inv, s.z * inv];
    const decDeg = Math.asin(Math.max(-1, Math.min(1, uz))) * (180 / Math.PI);
    const raDeg = (Math.atan2(uy, ux) * (180 / Math.PI) + 360) % 360;

    const keys = new Set<string>();
    addKeyVariants(keys, s.name);
    if (s.properName) addKeyVariants(keys, s.properName);
    const aliases = params.starAliasesById?.get(s.id);
    if (aliases) for (const a of aliases) addKeyVariants(keys, a);

    for (const k of keys) {
      let b = keyToStarIndices.get(k);
      if (!b) keyToStarIndices.set(k, (b = []));
      b.push(i);
    }
    starData.push({ dist, ux, uy, uz, decDeg, raDeg });
  }

  // Condition 1: 3D Euclidean distance d <= 0.08 pc
  const DIST_SQ_PROXIMITY = 0.08 * 0.08;
  const CELL_SIZE_3D = 0.08;
  const grid3D = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const s = summaries[i]!;
    if (isSol(s)) continue;
    const k = `${Math.floor(s.x / CELL_SIZE_3D)}_${Math.floor(s.y / CELL_SIZE_3D)}_${Math.floor(s.z / CELL_SIZE_3D)}`;
    let c = grid3D.get(k);
    if (!c) grid3D.set(k, (c = []));
    c.push(i);
  }

  for (let i = 0; i < n; i++) {
    const s1 = summaries[i]!;
    if (isSol(s1)) continue;
    const cx = Math.floor(s1.x / CELL_SIZE_3D); const cy = Math.floor(s1.y / CELL_SIZE_3D); const cz = Math.floor(s1.z / CELL_SIZE_3D);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const list = grid3D.get(`${cx + dx}_${cy + dy}_${cz + dz}`);
          if (list) for (const j of list) {
            if (j > i && !isSol(summaries[j]!)) {
              const [diffX, diffY, diffZ] = [s1.x - summaries[j]!.x, s1.y - summaries[j]!.y, s1.z - summaries[j]!.z];
              if (diffX * diffX + diffY * diffY + diffZ * diffZ <= DIST_SQ_PROXIMITY) union(i, j);
            }
          }
        }
      }
    }
  }

  // Condition 2: Stripped base name key match AND d <= 0.85 pc
  const DIST_SQ_NAME_MATCH = 0.85 * 0.85;
  for (const bucket of keyToStarIndices.values()) {
    if (bucket.length < 2) continue;
    for (let a = 0; a < bucket.length; a++) {
      const s1 = summaries[bucket[a]!]!;
      for (let b = a + 1; b < bucket.length; b++) {
        const s2 = summaries[bucket[b]!]!;
        const [dx, dy, dz] = [s1.x - s2.x, s1.y - s2.y, s1.z - s2.z];
        if (dx * dx + dy * dy + dz * dz <= DIST_SQ_NAME_MATCH) union(bucket[a]!, bucket[b]!);
      }
    }
  }

  // Condition 3: Angular proximity from Sol
  const ANGULAR_BIN_DEG = 0.5;
  const angularGrid = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const data = starData[i];
    if (!data) continue;
    const decBin = Math.min(359, Math.max(0, Math.floor((data.decDeg + 90) / ANGULAR_BIN_DEG)));
    const cosDec = Math.max(0.05, Math.cos(data.decDeg * (Math.PI / 180)));
    const numRaBins = Math.max(1, Math.round((360 * cosDec) / ANGULAR_BIN_DEG));
    const raBin = Math.min(numRaBins - 1, Math.max(0, Math.floor((data.raDeg / 360) * numRaBins)));
    const k = `${decBin}_${raBin}`;
    let c = angularGrid.get(k);
    if (!c) angularGrid.set(k, (c = []));
    c.push(i);
  }

  for (let i = 0; i < n; i++) {
    const d1 = starData[i];
    if (!d1) continue;
    const decBin = Math.min(359, Math.max(0, Math.floor((d1.decDeg + 90) / ANGULAR_BIN_DEG)));
    for (let dDec = -1; dDec <= 1; dDec++) {
      const candDecBin = decBin + dDec;
      if (candDecBin < 0 || candDecBin >= 360) continue;
      const cosCandDec = Math.max(0.05, Math.cos((candDecBin * ANGULAR_BIN_DEG - 90 + ANGULAR_BIN_DEG * 0.5) * (Math.PI / 180)));
      const candNumRaBins = Math.max(1, Math.round((360 * cosCandDec) / ANGULAR_BIN_DEG));
      const centerRaBin = Math.min(candNumRaBins - 1, Math.max(0, Math.floor((d1.raDeg / 360) * candNumRaBins)));
      for (let dRa = -1; dRa <= 1; dRa++) {
        const candRaBin = (centerRaBin + dRa + candNumRaBins) % candNumRaBins;
        const candidates = angularGrid.get(`${candDecBin}_${candRaBin}`);
        if (candidates) for (const j of candidates) {
          if (j > i && starData[j]) {
            const d2 = starData[j]!;
            const cosTheta = d1.ux * d2.ux + d1.uy * d2.uy + d1.uz * d2.uz;
            if (cosTheta >= 0.999995) {
              const minDist = Math.min(d1.dist, d2.dist);
              if (minDist > 0 && Math.abs(d1.dist - d2.dist) / minDist <= 0.12) {
                if (Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta)) * minDist <= 0.025) union(i, j);
              }
            }
          }
        }
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    if (!isSol(summaries[i]!)) {
      const root = find(i);
      let list = groups.get(root);
      if (!list) groups.set(root, (list = []));
      list.push(i);
    }
  }

  let consolidatedCount = 0;
  let totalSystemsReduced = 0;
  const allAbsorbedIds = new Set<string>();
  const absorbedIdToPrimary = new Map<string, { id: string; name: string }>();

  for (const groupIndices of groups.values()) {
    if (groupIndices.length < 2) continue;
    consolidatedCount++;
    totalSystemsReduced += groupIndices.length - 1;

    const components = groupIndices.map((idx) => summaries[idx]!).sort((a, b) => (a.mag ?? 99) - (b.mag ?? 99));
    const primary = components[0]!;
    const secondaries = components.slice(1);
    const canonicalName = getStrippedSystemBaseName(primary.name);

    for (const sec of secondaries) {
      allAbsorbedIds.add(sec.id);
      absorbedIdToPrimary.set(sec.id, { id: primary.id, name: canonicalName });
    }

    let effectiveStarCount = components[0]!.starCount || 1;
    for (let k = 1; k < components.length; k++) {
      if (!components.slice(0, k).some((prev) => isDuplicateCatalogRecord(components[k]!, prev))) {
        effectiveStarCount += components[k]!.starCount || 1;
      }
    }
    primary.starCount = Math.max(1, effectiveStarCount);
    primary.name = canonicalName;
    const properComp = components.find((c) => Boolean(c.properName && c.properName.trim().length > 0));
    primary.properName = properComp?.properName
      ? getStrippedSystemBaseName(properComp.properName)
      : primary.properName ? getStrippedSystemBaseName(primary.properName) : undefined;

    const spects = components.map((c) => c.spect?.trim()).filter((s): s is string => Boolean(s && s !== 'Unknown')).slice(0, 3);
    if (spects.length > 0) primary.spect = spects.join(' + ');

    primary.classification = resolveStellarClassificationFromSpectrum(primary.spect);
    primary.reticleType = resolveStellarReticleType(primary.classification, (primary.starCount ?? 1) > 1);
    primary.planetCount = components.reduce((sum, c) => sum + (c.planetCount || 0), 0);
    primary.hasHabitableCandidate = components.some((c) => Boolean(c.hasHabitableCandidate));

    const mergedCensus = new Set<'terrestrial' | 'super-earth' | 'gas-giant' | 'ice-giant'>();
    for (const c of components) if (Array.isArray(c.planetCensus)) for (const cat of c.planetCensus) mergedCensus.add(cat);
    if (mergedCensus.size > 0) primary.planetCensus = Array.from(mergedCensus);

    let mergedCompCounts: [number, number, number, number] | undefined;
    for (const c of components) {
      if (c.planetCompositionCounts) {
        if (!mergedCompCounts) mergedCompCounts = [0, 0, 0, 0];
        for (let idx = 0; idx < 4; idx++) mergedCompCounts[idx] += c.planetCompositionCounts[idx] || 0;
      }
    }
    if (mergedCompCounts) primary.planetCompositionCounts = mergedCompCounts;

    const mergedTags = new Set<string>();
    for (const c of components) if (c.tags) for (const t of c.tags) mergedTags.add(t);
    if (mergedTags.size > 0) primary.tags = Array.from(mergedTags);

    if (primary.planetCount > 0 && params.exoplanetHostSummaries && !params.exoplanetHostSummaries.some((s) => s.id === primary.id)) {
      params.exoplanetHostSummaries.push(primary);
    }

    mergeSystemAliases(primary, secondaries, params.starAliasesById);

    if (params.allSystemManifests || params.sectorManifestsMap) {
      const allPlanets: ExoplanetRecord[] = [];
      const allDisks: CircumstellarDiskRecord[] = [];
      const seenP = new Set<string>(); const seenD = new Set<string>();

      for (const c of components) {
        const m = params.allSystemManifests?.find((man) => man.id === c.id);
        if (m?.planets) for (const p of m.planets) if (!seenP.has(p.id)) { seenP.add(p.id); allPlanets.push(p); }
        if (m?.disks) for (const d of m.disks) if (!seenD.has(d.id)) { seenD.add(d.id); allDisks.push(d); }
      }

      const distinctComponents = components.filter((comp, idx) =>
        idx === 0 || !components.slice(0, idx).some((prev) => isDuplicateCatalogRecord(comp, prev)),
      );

      const stellarComponents: StellarComponent[] = distinctComponents.map((comp, idx) => {
        const desig = String.fromCharCode(65 + idx);
        const ex = params.allSystemManifests?.find((m) => m.id === comp.id)?.stars
          .find((st) => st.componentDesignation === 'A' || st.id === comp.id || st.name === comp.name);
        return {
          id: `${primary.id}-${desig}`, name: comp.name, componentDesignation: desig,
          spectralType: comp.spect || 'Unknown', mag: comp.mag, absmag: comp.absmag,
          ...(ex?.luminosityLsun !== undefined ? { luminosityLsun: ex.luminosityLsun } : {}),
          ...(ex?.massMsun !== undefined ? { massMsun: ex.massMsun } : {}),
          ...(ex?.radiusRsun !== undefined ? { radiusRsun: ex.radiusRsun } : {}),
          ...(ex?.effectiveTempK !== undefined ? { effectiveTempK: ex.effectiveTempK } : {}),
        };
      });

      let primaryManifest = params.allSystemManifests?.find((m) => m.id === primary.id);
      if (!primaryManifest && params.allSystemManifests) {
        primaryManifest = {
          id: primary.id, name: primary.name, properName: primary.properName,
          x: primary.x, y: primary.y, z: primary.z, dist: primary.dist, sectorId: primary.sectorId,
          stars: stellarComponents, planets: allPlanets,
        };
        params.allSystemManifests.push(primaryManifest);
        const bucket = params.sectorManifestsMap?.get(primary.sectorId);
        if (bucket && !bucket.includes(primaryManifest)) bucket.push(primaryManifest);
      }
      if (primaryManifest) {
        primaryManifest.name = primary.name;
        if (primary.properName) primaryManifest.properName = primary.properName;
        primaryManifest.stars = stellarComponents;
        primaryManifest.planets = allPlanets;
        if (allDisks.length > 0) primaryManifest.disks = allDisks;
        if (primary.planetCompositionCounts) primaryManifest.planetCompositionCounts = primary.planetCompositionCounts;
        if (primary.hasHabitableCandidate !== undefined) primaryManifest.hasHabitableCandidate = primary.hasHabitableCandidate;
        if (primary.tags) primaryManifest.tags = primary.tags;
      }
    }
  }

  if (allAbsorbedIds.size > 0) pruneAbsorbedCollections(params, allAbsorbedIds);

  return { consolidatedCount, totalSystemsReduced, absorbedIdToPrimary };
}
