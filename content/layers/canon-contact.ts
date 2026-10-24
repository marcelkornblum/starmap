import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-contact',
  title: 'Contact',
  aliases: 'seti arroway arecibo wormhole sagan',
  kind: 'fictional-canon',
  description: 'The Vega transmission and interstellar relay network in Carl Sagan’s Contact.',
  version: 1,
  source: {
    summary:
      'Hard science-fiction novel exploring humanity’s detection of an intelligent extraterrestrial radio message from Vega.',
    creator: 'Carl Sagan',
    publicationYear: '1985',
    medium: 'Novel & Film',
    canonicalReference: 'Contact (1985)',
    url: 'https://en.wikipedia.org/wiki/Contact_(novel)',
  },
  entries: {
    'hip-91262': {
      targetId: 'hip-91262',
      targetType: 'system',
      systemId: 'hip-91262',
      subtitle: 'Signal Source & Relay',
      text: 'Bright A0V star 25 light-years from Earth from which Dr. Ellie Arroway detects the prime-number television transmission and Machine blueprints in Carl Sagan’s Contact.',
      workTitle: 'Contact',
      aliases: 'arroway primenumbers machine wormhole',
      confidence: 'confirmed',
    },
  },
};

export default layer;
