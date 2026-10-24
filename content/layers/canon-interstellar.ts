import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-interstellar',
  title: 'Interstellar',
  aliases: 'gargantua endurance tesseract wormhole cooper',
  kind: 'fictional-canon',
  description: 'Saturnian wormhole gateway and O’Neill habitat in Christopher Nolan’s Interstellar.',
  version: 1,
  source: {
    summary:
      'Academy Award-winning hard sci-fi film following astronauts traversing a wormhole near Saturn in search of a new home for dying humanity.',
    creator: 'Christopher Nolan / Kip Thorne',
    publicationYear: '2014',
    medium: 'Film',
    canonicalReference: 'Interstellar (2014)',
    url: 'https://en.wikipedia.org/wiki/Interstellar_(film)',
  },
  entries: {
    saturn: {
      targetId: 'saturn',
      targetType: 'planet',
      systemId: 'sol',
      subtitle: 'Gargantua Wormhole & Cooper Station',
      text: 'Spherical Einstein-Rosen wormhole orbiting Saturn providing a gateway to the supermassive black hole Gargantua, later orbited by the cylinder habitat Cooper Station.',
      workTitle: 'Interstellar',
      aliases: 'gargantua wormhole cooperstation endurance',
      confidence: 'confirmed',
    },
  },
};

export default layer;
