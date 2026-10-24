import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-greg-egan',
  title: 'Greg Egan',
  subtitle: 'Diaspora & Schild’s Ladder',
  aliases: 'posthuman polis novovacuum carterzimmerman transhuman software',
  kind: 'fictional-canon',
  description: 'Rigorous post-human hard science fiction universes exploring digital consciousness, topology, and cosmic physics by Greg Egan.',
  version: 1,
  source: {
    summary:
      'Ultra-hard SF settings from Greg Egan including the software polises in Diaspora exploring Vega and 61 Cygni, the expanding novovacuum at Mimosa in Schild’s Ladder, and the enveloped Sol system in Quarantine.',
    creator: 'Greg Egan',
    publicationYear: '1992–2002',
    medium: 'Novel Series',
    canonicalReference: 'Diaspora (1997) & Schild’s Ladder (2002)',
    url: 'https://en.wikipedia.org/wiki/Greg_Egan_bibliography',
  },
  entries: {
    'hip-91262': {
      targetId: 'hip-91262',
      targetType: 'system',
      systemId: 'hip-91262',
      inUniverseName: 'Orpheus',
      subtitle: 'Carpenters Polis',
      text: 'Water-rich planet orbiting Vega where post-human explorer polises discover the oceanic microscopic Wang’s Carpets alien molecular computers.',
      workTitle: 'Diaspora',
      aliases: 'wangcarpets polises yatima vega',
      confidence: 'confirmed',
    },
    'gaia-1872046609345556480': {
      targetId: 'gaia-1872046609345556480',
      targetType: 'system',
      systemId: 'gaia-1872046609345556480',
      subtitle: 'Carter-Zimmerman Clone Fleet',
      text: 'Stellar waypoint at 61 Cygni visited by the post-biological Carter-Zimmerman polis during their diaspora to escape the Lacerta supernova.',
      workTitle: 'Diaspora',
      aliases: 'lacerta carter zimmerman polis',
      confidence: 'confirmed',
    },
    'hip-62434': {
      targetId: 'hip-62434',
      targetType: 'system',
      systemId: 'hip-62434',
      inUniverseName: 'Mimosa Station',
      subtitle: 'Novo-Vacuum Border',
      text: 'Research station orbiting Beta Crucis (Mimosa) where an experimental quantum graph test triggers the catastrophic, expanding novo-vacuum border bubble.',
      workTitle: 'Schild’s Ladder',
      aliases: 'novovacuum quantumgraph schild cassette mimosa',
      confidence: 'confirmed',
    },
    moon: {
      targetId: 'moon',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'earth',
      subtitle: 'The Bubble Enclosure',
      text: 'Lunar observatories witnessing the 2034 sudden cosmic quarantine that enclosed the entire Solar System in an impenetrable black sphere.',
      workTitle: 'Quarantine',
      aliases: 'bubble enclosure quantum collapse',
      confidence: 'confirmed',
    },
  },
};

export default layer;
