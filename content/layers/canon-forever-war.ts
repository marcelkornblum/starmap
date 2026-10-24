import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-forever-war',
  title: 'Forever War',
  aliases: 'collapsar tauran mandella haldeman',
  kind: 'fictional-canon',
  description: 'Training stations and relativistic jump points in Joe Haldeman’s The Forever War.',
  version: 1,
  source: {
    summary:
      'Hugo and Nebula award-winning military sci-fi masterpiece examining the psychological alienation and extreme time dilation of interstellar war.',
    creator: 'Joe Haldeman',
    publicationYear: '1974',
    medium: 'Novel',
    canonicalReference: 'The Forever War (1974)',
    url: 'https://en.wikipedia.org/wiki/The_Forever_War',
  },
  entries: {
    charon: {
      targetId: 'charon',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'pluto',
      subtitle: 'Conscript Training Base',
      text: 'Cryogenic proving ground on Charon where recruit William Mandella and the UNEF force endure brutal survival drills in 30 Kelvin conditions.',
      workTitle: 'The Forever War',
      aliases: 'mandella unef training',
      confidence: 'confirmed',
    },
    'hip-21421': {
      targetId: 'hip-21421',
      targetType: 'system',
      systemId: 'hip-21421',
      subtitle: 'Collapsar Jump Portal',
      text: 'Dense collapsar jump point near Aldebaran used for instantaneous relativistic jumps across light-centuries of space.',
      workTitle: 'The Forever War',
      aliases: 'collapsar dilation portal',
      confidence: 'confirmed',
    },
  },
};

export default layer;
