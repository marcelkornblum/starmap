import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-starfield',
  title: 'Starfield',
  subtitle: 'Settled Systems',
  aliases: 'constellation unitedcolonies freestar newatlantis',
  kind: 'fictional-canon',
  description: 'Capital settlements and historic colonies in Bethesda’s Settled Systems.',
  version: 1,
  source: {
    summary:
      'Open-world sci-fi RPG set 50 light-years around Sol in the year 2330, three centuries after humanity’s evacuation from Earth.',
    creator: 'Bethesda Game Studios / Todd Howard',
    publicationYear: '2023–present',
    medium: 'Video Game Franchise',
    canonicalReference: 'Starfield (2023)',
    url: 'https://en.wikipedia.org/wiki/Starfield_(video_game)',
  },
  entries: {
    'gaia-5853498713190525696': {
      targetId: 'gaia-5853498713190525696',
      targetType: 'system',
      systemId: 'gaia-5853498713190525696',
      inUniverseName: 'New Atlantis',
      subtitle: 'United Colonies Capital',
      text: 'Sprawling capital city of the United Colonies on planet Jemison in Alpha Centauri, headquarters of Constellation and MAST.',
      workTitle: 'Starfield',
      aliases: 'jemison newatlantis mast constellation',
      confidence: 'confirmed',
    },
    mars: {
      targetId: 'mars',
      targetType: 'planet',
      systemId: 'sol',
      inUniverseName: 'Cydonia',
      subtitle: 'Subterranean Mining City',
      text: 'Deep-shaft underground mining city on Mars housing the Deimos Staryards offices and industrial extraction workforce.',
      workTitle: 'Starfield',
      aliases: 'cydonia deimos mining',
      confidence: 'confirmed',
    },
    titan: {
      targetId: 'titan',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'saturn',
      inUniverseName: 'New Homestead',
      subtitle: 'Living History Colony',
      text: 'Historic Saturnian colony beneath Titan’s dense nitrogen atmosphere dedicated to preserving pre-evacuation Earth traditions.',
      workTitle: 'Starfield',
      aliases: 'newhomestead museum titan',
      confidence: 'confirmed',
    },
  },
};

export default layer;
