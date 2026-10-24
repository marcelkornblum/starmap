import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-forbidden-planet',
  title: 'Forbidden Planet',
  aliases: 'krell robby c57d morbius id',
  kind: 'fictional-canon',
  description: 'The lost Krell civilisation on Altair IV from Forbidden Planet.',
  version: 1,
  source: {
    summary:
      'Groundbreaking 1956 sci-fi film following the crew of United Planets Cruiser C-57D investigating the vanished colony on Altair IV.',
    creator: 'Fred M. Wilcox / Cyril Hume',
    publicationYear: '1956',
    medium: 'Film',
    canonicalReference: 'Forbidden Planet (1956)',
    url: 'https://en.wikipedia.org/wiki/Forbidden_Planet',
  },
  entries: {
    'hip-97649': {
      targetId: 'hip-97649',
      targetType: 'system',
      systemId: 'hip-97649',
      inUniverseName: 'Altair IV',
      subtitle: 'Krell Homeworld',
      text: 'Fourth planet of Altair visited by United Planets Cruiser C-57D, housing the subterranean Great Machine of the extinct Krell in Forbidden Planet (1956).',
      workTitle: 'Forbidden Planet',
      aliases: 'altairiv krell greatmachine robby',
      confidence: 'confirmed',
    },
  },
};

export default layer;
