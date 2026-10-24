import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-hyperion',
  title: 'Hyperion',
  subtitle: 'Hyperion Cantos',
  aliases: 'cantos shrike worldweb fatline simmons',
  kind: 'fictional-canon',
  description: 'Core Hegemony worlds and web portals in Dan Simmons’s Hyperion Cantos.',
  version: 1,
  source: {
    summary:
      'Far-future space opera tracing interstellar pilgrims to the Time Tombs and the farcaster network of the Hegemony of Man.',
    creator: 'Dan Simmons',
    publicationYear: '1989–1997',
    medium: 'Novel Series',
    canonicalReference: 'Hyperion (1989) & The Fall of Hyperion (1990)',
    url: 'https://en.wikipedia.org/wiki/Hyperion_Cantos',
  },
  entries: {
    'gaia-2452378776434477184': {
      targetId: 'gaia-2452378776434477184',
      targetType: 'system',
      systemId: 'gaia-2452378776434477184',
      inUniverseName: 'Tau Ceti Center',
      subtitle: 'Hegemony Capital',
      text: 'Urban capital world of the Hegemony of Man, seat of the WorldWeb government and River Tethys portal network in Dan Simmons’s Hyperion Cantos.',
      workTitle: 'Hyperion',
      aliases: 'tauceticenter tcc worldweb tethys meina gladstone',
      confidence: 'confirmed',
    },
  },
};

export default layer;
