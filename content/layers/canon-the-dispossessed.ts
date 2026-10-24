import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-the-dispossessed',
  title: 'The Dispossessed',
  subtitle: 'Hainish Cycle',
  aliases: 'anarres urras shevek leguin',
  kind: 'fictional-canon',
  description: 'Twin worlds of Tau Ceti in Ursula K. Le Guin’s The Dispossessed.',
  version: 1,
  source: {
    summary:
      'Hugo and Nebula award-winning novel exploring the contrasting anarchist and capitalist societies on twin worlds orbiting Tau Ceti.',
    creator: 'Ursula K. Le Guin',
    publicationYear: '1974',
    medium: 'Novel',
    canonicalReference: 'The Dispossessed: An Ambiguous Utopia (1974)',
    url: 'https://en.wikipedia.org/wiki/The_Dispossessed',
  },
  entries: {
    'gaia-2452378776434477184': {
      targetId: 'gaia-2452378776434477184',
      targetType: 'system',
      systemId: 'gaia-2452378776434477184',
      inUniverseName: 'Urras & Anarres',
      subtitle: 'Twin Habitable Worlds',
      text: 'Twin worlds orbiting Tau Ceti: the lush, resource-rich Urras and its arid, moon-like companion Anarres where physicist Shevek develops instantaneous ansible communications.',
      workTitle: 'The Dispossessed',
      aliases: 'anarres urras shevek ansible utopia',
      confidence: 'confirmed',
    },
  },
};

export default layer;
