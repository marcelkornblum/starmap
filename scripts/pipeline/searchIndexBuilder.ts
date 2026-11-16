import type {
  SystemManifest,
  SystemSummaryNode,
} from '../../src/types/astro';
import type {
  GalacticStructureRecord,
  SolarSystemBodyRecord,
} from '../../src/types/astroStructures';
import { COMPACT_SCHEMA_VERSION } from '../../src/utils/compactDataConstants';
import type {
  CompactSearchEntry,
  SearchIndexEnvelope,
} from '../../src/utils/compactDataTypes';
import {
  indexExoplanets,
  indexStarSystems,
  indexStructures,
} from './searchEntryIndexers';
import { indexSolarBodies } from './solarSearchIndexer';

export function buildSearchIndexEnvelope(
  id: string,
  name: string,
  entries: CompactSearchEntry[],
  timestamp: string,
): SearchIndexEnvelope {
  return {
    v: COMPACT_SCHEMA_VERSION,
    i: id,
    n: name,
    c: entries.length,
    t: timestamp,
    d: entries,
  };
}

export function buildSearchIndices(
  input: {
    systems: SystemSummaryNode[];
    manifests: SystemManifest[];
    structures: GalacticStructureRecord[];
    solarBodies: SolarSystemBodyRecord[];
    starAliasesById?: Map<string, string[]>;
    layerEntries?: CompactSearchEntry[];
  },
  generatedAt = '2026-01-01T00:00:00.000Z',
): {
  core: SearchIndexEnvelope;
  full: SearchIndexEnvelope;
  stars: SearchIndexEnvelope;
  planets: SearchIndexEnvelope;
  structures: SearchIndexEnvelope;
  minorBodies: SearchIndexEnvelope;
  layers: SearchIndexEnvelope;
} {
  const nowIso = generatedAt;
  const coreEntries: CompactSearchEntry[] = [];
  const fullEntries: CompactSearchEntry[] = [];
  const starsEntries: CompactSearchEntry[] = [];
  const planetsEntries: CompactSearchEntry[] = [];
  const structuresEntries: CompactSearchEntry[] = [];
  const minorBodiesEntries: CompactSearchEntry[] = [];
  const layerEntries: CompactSearchEntry[] = input.layerEntries ? [...input.layerEntries] : [];

  indexStarSystems(input.systems, input.starAliasesById, coreEntries, fullEntries, starsEntries);
  indexExoplanets(input.manifests, input.starAliasesById, coreEntries, fullEntries, planetsEntries);
  indexSolarBodies(input.solarBodies, coreEntries, fullEntries, planetsEntries, minorBodiesEntries);
  indexStructures(input.structures, coreEntries, fullEntries, structuresEntries);

  for (const layerEntry of layerEntries) {
    coreEntries.push(layerEntry);
    fullEntries.push(layerEntry);
  }

  return {
    core: buildSearchIndexEnvelope('search-core', 'Starmap Core Search Index', coreEntries, nowIso),
    full: buildSearchIndexEnvelope('search-full', 'Starmap Full Search Index', fullEntries, nowIso),
    stars: buildSearchIndexEnvelope('search-stars', 'Stars & Stellar Systems Search Index', starsEntries, nowIso),
    planets: buildSearchIndexEnvelope('search-planets', 'Planets, Exoplanets & Moons Search Index', planetsEntries, nowIso),
    structures: buildSearchIndexEnvelope('search-structures', 'Galactic Structures & Deep Sky Search Index', structuresEntries, nowIso),
    minorBodies: buildSearchIndexEnvelope('search-minor-bodies', 'Solar System Minor Bodies Search Index', minorBodiesEntries, nowIso),
    layers: buildSearchIndexEnvelope('search-layers', 'Curated Layers & Canons Search Index', layerEntries, nowIso),
  };
}
