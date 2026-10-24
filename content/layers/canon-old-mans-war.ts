import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-old-mans-war',
  title: 'Old Man’s War',
  aliases: 'colonialdefense cdf brainpal perry scalzi',
  kind: 'fictional-canon',
  description: 'Colonial defense hubs and frontier worlds in John Scalzi’s Old Man’s War series.',
  version: 1,
  source: {
    summary:
      'Popular military science-fiction saga chronicling elderly Earth retirees enlisted into genetically engineered clone bodies to protect human colonies.',
    creator: 'John Scalzi',
    publicationYear: '2005–2020',
    medium: 'Novel Series',
    canonicalReference: 'Old Man’s War (2005), The Ghost Brigades (2006), The Last Colony (2007)',
    url: 'https://en.wikipedia.org/wiki/Old_Man%27s_War',
  },
  entries: {
    'gaia-5853498713190525696': {
      targetId: 'gaia-5853498713190525696',
      targetType: 'system',
      systemId: 'gaia-5853498713190525696',
      inUniverseName: 'Phoenix Station',
      subtitle: 'CDF Induction Facility',
      text: 'Orbital transfer terminal at Alpha Centauri where 75-year-old human recruits leave Earth behind to receive genetically augmented clone bodies.',
      workTitle: 'Old Man’s War',
      aliases: 'phoenixstation cdf perry',
      confidence: 'confirmed',
    },
    'gaia-6427464123776727168': {
      targetId: 'gaia-6427464123776727168',
      targetType: 'system',
      systemId: 'gaia-6427464123776727168',
      inUniverseName: 'Roanoke',
      subtitle: 'Contested Frontier World',
      text: 'Secret multi-species human settlement at Delta Pavonis placed at the center of the diplomatic clash between Earth, the CDF, and the alien Conclave.',
      workTitle: 'The Last Colony',
      aliases: 'roanoke conclave settlement',
      confidence: 'confirmed',
    },
  },
};

export default layer;
