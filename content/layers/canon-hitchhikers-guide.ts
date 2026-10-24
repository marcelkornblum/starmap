import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-hitchhikers-guide',
  title: 'Hitchhiker’s Guide',
  subtitle: 'Don’t Panic',
  aliases: 'vogon heartofgold adams',
  kind: 'fictional-canon',
  description: 'Cosmic waypoints from Douglas Adams’s The Hitchhiker’s Guide to the Galaxy series.',
  version: 1,
  source: {
    summary:
      'Cult science-fiction comedy following Arthur Dent, Ford Prefect, and the Hitchhiker’s Guide across space following the demolition of Earth.',
    creator: 'Douglas Adams',
    publicationYear: '1978–1992',
    medium: 'Radio, Novel & Film Series',
    canonicalReference: 'The Hitchhiker’s Guide to the Galaxy (1979) & The Restaurant at the End of the Universe (1980)',
    url: 'https://en.wikipedia.org/wiki/The_Hitchhiker%27s_Guide_to_the_Galaxy',
  },
  entries: {
    'gaia-5853498713190525696': {
      targetId: 'gaia-5853498713190525696',
      targetType: 'system',
      systemId: 'gaia-5853498713190525696',
      subtitle: 'Planning Office',
      text: 'Demolition orders for Earth were on display in the local planning department at Alpha Centauri for fifty Earth years.',
      workTitle: 'The Hitchhiker’s Guide to the Galaxy',
      aliases: 'vogon demolition planning',
      confidence: 'confirmed',
    },
    'gaia-4472832130942575872': {
      targetId: 'gaia-4472832130942575872',
      targetType: 'system',
      systemId: 'gaia-4472832130942575872',
      inUniverseName: 'Brontitall',
      subtitle: 'Shoe Event Horizon',
      text: 'Planet orbiting Barnard’s Star that fell victim to the Shoe Event Horizon, where Arthur Dent encounters the bird-people.',
      workTitle: 'The Restaurant at the End of the Universe',
      aliases: 'shoeeventhorizon birdpeople',
      confidence: 'confirmed',
    },
    'hip-27989': {
      targetId: 'hip-27989',
      targetType: 'system',
      systemId: 'hip-27989',
      subtitle: 'Betelgeuse V & VII',
      text: 'Origin system of Ford Prefect (Betelgeuse VII) and Zaphod Beeblebrox (Betelgeuse V), 640 light-years distant.',
      workTitle: 'The Hitchhiker’s Guide to the Galaxy',
      aliases: 'fordprefect zaphod beeblebrox',
      confidence: 'confirmed',
    },
  },
};

export default layer;
