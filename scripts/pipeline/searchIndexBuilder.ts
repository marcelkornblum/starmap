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

function stripSearchAliases(entry: CompactSearchEntry): CompactSearchEntry {
  if (entry.a === undefined) {
    return entry;
  }
  const { a: _omitted, ...rest } = entry;
  return rest;
}

export function buildSearchIndices(
  input: {
    systems: SystemSummaryNode[];
    manifests: SystemManifest[];
    structures: GalacticStructureRecord[];
    solarBodies: SolarSystemBodyRecord[];
    starAliasesById?: Map<string, string[]>;
    layerEntries?: CompactSearchEntry[];
    referencedLayerIds?: ReadonlySet<string>;
  },
  generatedAt = '2026-01-01T00:00:00.000Z',
): {
  startup: SearchIndexEnvelope;
  core: SearchIndexEnvelope;
  stars: SearchIndexEnvelope;
  planets: SearchIndexEnvelope;
  structures: SearchIndexEnvelope;
  minorBodies: SearchIndexEnvelope;
  layers: SearchIndexEnvelope;
} {
  const nowIso = generatedAt;
  const coreEntries: CompactSearchEntry[] = [];
  const starsEntries: CompactSearchEntry[] = [];
  const planetsEntries: CompactSearchEntry[] = [];
  const structuresEntries: CompactSearchEntry[] = [];
  const minorBodiesEntries: CompactSearchEntry[] = [];
  const layerEntries: CompactSearchEntry[] = input.layerEntries ? [...input.layerEntries] : [];

  indexStarSystems(input.systems, input.starAliasesById, coreEntries, starsEntries);
  indexExoplanets(input.manifests, input.starAliasesById, coreEntries, planetsEntries);
  indexSolarBodies(input.solarBodies, coreEntries, planetsEntries, minorBodiesEntries);
  indexStructures(input.structures, coreEntries, structuresEntries);

  for (const layerEntry of layerEntries) {
    coreEntries.push(layerEntry);
  }

  const startupEntries: CompactSearchEntry[] = [];
  const seenStartupIds = new Set<string>();
  const addStartupEntry = (entry: CompactSearchEntry) => {
    if (seenStartupIds.has(entry.i)) return;
    seenStartupIds.add(entry.i);
    startupEntries.push(stripSearchAliases(entry));
  };

  for (const entry of coreEntries) {
    if (entry.k !== 6 || Boolean(entry.o) || entry.u === 'construct') {
      addStartupEntry(entry);
    }
  }
  for (const entry of structuresEntries) {
    addStartupEntry(entry);
  }
  for (const entry of layerEntries) {
    addStartupEntry(entry);
  }
  for (const entry of minorBodiesEntries) {
    if (
      Boolean(entry.o) ||
      entry.u === 'construct' ||
      input.referencedLayerIds?.has(entry.i)
    ) {
      addStartupEntry(entry);
    }
  }
  if (input.referencedLayerIds && input.referencedLayerIds.size > 0) {
    for (const entry of starsEntries) {
      if (input.referencedLayerIds.has(entry.i)) addStartupEntry(entry);
    }
    for (const entry of planetsEntries) {
      if (input.referencedLayerIds.has(entry.i)) addStartupEntry(entry);
    }
  }

  return {
    startup: buildSearchIndexEnvelope('search-startup', 'Starmap Startup Focus & Layers Index', startupEntries, nowIso),
    core: buildSearchIndexEnvelope('search-core', 'Starmap Core Search Index', coreEntries, nowIso),
    stars: buildSearchIndexEnvelope('search-stars', 'Stars & Stellar Systems Search Index', starsEntries, nowIso),
    planets: buildSearchIndexEnvelope('search-planets', 'Planets, Exoplanets & Moons Search Index', planetsEntries, nowIso),
    structures: buildSearchIndexEnvelope('search-structures', 'Galactic Structures & Deep Sky Search Index', structuresEntries, nowIso),
    minorBodies: buildSearchIndexEnvelope('search-minor-bodies', 'Solar System Minor Bodies Search Index', minorBodiesEntries, nowIso),
    layers: buildSearchIndexEnvelope('search-layers', 'Curated Layers & Canons Search Index', layerEntries, nowIso),
  };
}
