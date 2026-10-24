import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-classic-pioneers',
  title: 'Classic Space Pioneers',
  subtitle: 'Bradbury, Wells & Verne',
  aliases: 'columbiad selenite tripod martian chronicler canal cavorite barbiere',
  kind: 'fictional-canon',
  description: 'Victorian and early twentieth-century foundational journeys to the Moon and Mars by Ray Bradbury, H. G. Wells, and Jules Verne.',
  version: 1,
  source: {
    summary:
      'The earliest masterpieces of space exploration: Jules Verne’s space-cannon Columbiad, H. G. Wells’ Selenite moon and invading Martian cylinders, and Ray Bradbury’s haunting Martian crystal cities.',
    creator: 'Ray Bradbury, H. G. Wells, Jules Verne',
    publicationYear: '1865–1950',
    medium: 'Novel Series',
    canonicalReference: 'From the Earth to the Moon (1865), The War of the Worlds (1898), and The Martian Chronicles (1950)',
    url: 'https://en.wikipedia.org/wiki/Science_fiction',
  },
  entries: {
    mars: {
      targetId: 'mars',
      targetType: 'planet',
      systemId: 'sol',
      subtitle: 'Dead Seas & Martian Cylinders',
      text: 'Poetic canals, dying seas, and telepathic crystal cities in Ray Bradbury’s Martian Chronicles, and the desiccated red home of the ruthless tripod-launching invaders in H. G. Wells’ War of the Worlds.',
      workTitle: 'The Martian Chronicles',
      aliases: 'bradbury canal crystal tripods cylinder heatray spender',
      confidence: 'confirmed',
    },
    moon: {
      targetId: 'moon',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'earth',
      subtitle: 'Selenite Realm & Columbiad Orbit',
      text: 'Underground caverns of the insectoid Selenites and the Grand Lunar in H. G. Wells’ First Men in the Moon, and the circumlunar trajectory of the Gun Club’s hollow artillery projectile in Jules Verne’s From the Earth to the Moon.',
      workTitle: 'The First Men in the Moon',
      aliases: 'selenite cavorite bedford cavor columbiad gunclub verne barbicane',
      confidence: 'confirmed',
    },
  },
};

export default layer;
