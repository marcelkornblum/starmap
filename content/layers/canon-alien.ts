import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-alien',
  title: 'Alien',
  aliases: 'xenomorph nostromo hadleyshope lv426 engineer',
  kind: 'fictional-canon',
  description: 'Survey systems and derelict discovery sites in the Alien franchise.',
  version: 1,
  source: {
    summary:
      'Sci-fi horror franchise launched by Ridley Scott, centering on corporate deep-space surveys and encounters with the predatory Xenomorph XX121.',
    creator: 'Dan O’Bannon / Ronald Shusett / Ridley Scott',
    publicationYear: '1979–present',
    medium: 'Film & Media Franchise',
    canonicalReference: 'Alien (1979) & Aliens (1986)',
    url: 'https://en.wikipedia.org/wiki/Alien_(franchise)',
  },
  entries: {
    'gaia-4722135642226902656': {
      targetId: 'gaia-4722135642226902656',
      targetType: 'system',
      systemId: 'gaia-4722135642226902656',
      inUniverseName: 'LV-426',
      subtitle: 'Acheron',
      text: 'Exomoon of Calpamos in the Zeta-2 Reticuli system where USCSS Nostromo discovers the derelict Engineer vessel and Xenomorph eggs in Alien (1979) and Hadley’s Hope in Aliens (1986).',
      workTitle: 'Alien / Aliens',
      aliases: 'acheron nostromo hadleyshope calpamos weylandyutani',
      confidence: 'confirmed',
    },
  },
};

export default layer;
