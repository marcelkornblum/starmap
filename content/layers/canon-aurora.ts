import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-aurora',
  title: 'Aurora',
  aliases: 'generationship bioprinting robinson',
  kind: 'fictional-canon',
  description: 'Generation starship destination in Kim Stanley Robinson’s Aurora.',
  version: 1,
  source: {
    summary:
      'Realistic hard science-fiction novel examining the biological and psychological ordeal of a 170-year interstellar voyage to Tau Ceti.',
    creator: 'Kim Stanley Robinson',
    publicationYear: '2015',
    medium: 'Novel',
    canonicalReference: 'Aurora (2015)',
    url: 'https://en.wikipedia.org/wiki/Aurora_(novel)',
  },
  entries: {
    'gaia-2452378776434477184': {
      targetId: 'gaia-2452378776434477184',
      targetType: 'system',
      systemId: 'gaia-2452378776434477184',
      inUniverseName: 'Aurora',
      subtitle: 'Tau Ceti e Moon',
      text: 'Habitable moon of Tau Ceti e reached after a 170-year journey by a generation starship in Kim Stanley Robinson’s Aurora (2015).',
      workTitle: 'Aurora',
      aliases: 'taucetie generationship ship',
      confidence: 'confirmed',
    },
  },
};

export default layer;
