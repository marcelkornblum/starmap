import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-weir-solar',
  title: 'Weir Solar',
  subtitle: 'The Martian & Artemis',
  aliases: 'watney ares acidalia artemis weir',
  kind: 'fictional-canon',
  description: 'Survival and frontier settlement bases in Andy Weir’s Solar System novels.',
  version: 1,
  source: {
    summary:
      'Rigorous, engineering-focused hard science fiction detailing Mark Watney’s survival on Mars and the lunar city Artemis.',
    creator: 'Andy Weir',
    publicationYear: '2011–2017',
    medium: 'Novel Series',
    canonicalReference: 'The Martian (2011) & Artemis (2017)',
    url: 'https://en.wikipedia.org/wiki/The_Martian_(Weir_novel)',
  },
  entries: {
    mars: {
      targetId: 'mars',
      targetType: 'planet',
      systemId: 'sol',
      inUniverseName: 'Ares III Hab',
      subtitle: 'Acidalia Planitia',
      text: 'Exploration habitat in Acidalia Planitia where botanist Mark Watney survives for 549 sols using potato farming and hydrazine extraction.',
      workTitle: 'The Martian',
      aliases: 'watney acidalia ares aresiii',
      confidence: 'confirmed',
    },
    moon: {
      targetId: 'moon',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'earth',
      inUniverseName: 'Artemis City',
      subtitle: 'Mare Tranquillitatis',
      text: 'Five-sphere pressurized lunar bubble city near Apollo 11, sustained by tourism and solar/nuclear oxygen smelting.',
      workTitle: 'Artemis',
      aliases: 'artemis bashara bubblecity',
      confidence: 'confirmed',
    },
  },
};

export default layer;
