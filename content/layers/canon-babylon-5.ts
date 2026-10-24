import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-babylon-5',
  title: 'Babylon 5',
  aliases: 'earthalliance minbari vorlon shadow jumpgate',
  kind: 'fictional-canon',
  description: 'Earth Alliance and galactic diplomatic hubs from J. Michael Straczynski’s Babylon 5.',
  version: 1,
  source: {
    summary:
      'Groundbreaking serialized space opera centering on the diplomatic space station Babylon 5 in the Epsilon Eridani system.',
    creator: 'J. Michael Straczynski',
    publicationYear: '1993–1999',
    medium: 'Television Series',
    canonicalReference: 'Babylon 5 (1993–1998)',
    url: 'https://en.wikipedia.org/wiki/Babylon_5',
  },
  entries: {
    'gaia-5164707970261890560': {
      targetId: 'gaia-5164707970261890560',
      targetType: 'system',
      systemId: 'gaia-5164707970261890560',
      inUniverseName: 'Babylon 5',
      subtitle: 'O’Neill Cylinder Station',
      text: 'Five-mile-long O’Neill cylinder space station stationed at the L5 Lagrange point of Epsilon Eridani III (Euphrates), serving as a neutral diplomatic and commerce haven.',
      workTitle: 'Babylon 5',
      aliases: 'babylon5 euphrates oneill',
      confidence: 'confirmed',
    },
    'gaia-5853498713190525696': {
      targetId: 'gaia-5853498713190525696',
      targetType: 'system',
      systemId: 'gaia-5853498713190525696',
      subtitle: 'Proxima III Colony',
      text: 'Major Earth Alliance colony world in the Proxima Centauri system that declared independence during President Clark’s regime.',
      workTitle: 'Babylon 5',
      aliases: 'proximaiii earthalliance clark',
      confidence: 'confirmed',
    },
    io: {
      targetId: 'io',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'jupiter',
      subtitle: 'Jumpgate Sol Gateway',
      text: 'Volcanic Jovian moon hosting the primary Earth Alliance jumpgate providing hyperspace access to the Solar System.',
      workTitle: 'Babylon 5',
      aliases: 'jumpgate hyperspace',
      confidence: 'confirmed',
    },
    mars: {
      targetId: 'mars',
      targetType: 'planet',
      systemId: 'sol',
      subtitle: 'Free Mars Resistance',
      text: 'Subsurface domed settlements and headquarters of the Free Mars movement fighting for independence from Earth.',
      workTitle: 'Babylon 5',
      aliases: 'freemars domes garibaldi',
      confidence: 'confirmed',
    },
  },
};

export default layer;
