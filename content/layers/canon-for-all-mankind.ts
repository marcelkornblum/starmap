import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-for-all-mankind',
  title: 'For All Mankind',
  aliases: 'jamestown zvezda helios happyvalley baldwin',
  kind: 'fictional-canon',
  description: 'Lunar and Martian bases in Ronald D. Moore’s alternate-history space race.',
  version: 1,
  source: {
    summary:
      'Alternate-history television drama imagining an unyielding global space race after the Soviet Union achieves the first crewed Moon landing.',
    creator: 'Ronald D. Moore / Matt Wolpert / Ben Nedivi',
    publicationYear: '2019–present',
    medium: 'Television Series',
    canonicalReference: 'For All Mankind (2019–present)',
    url: 'https://en.wikipedia.org/wiki/For_All_Mankind_(TV_series)',
  },
  entries: {
    moon: {
      targetId: 'moon',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'earth',
      inUniverseName: 'Jamestown & Zvezda',
      subtitle: 'Shackleton Crater Outposts',
      text: 'Permanent lunar research and water-mining installations established by NASA and the Soviet space program at the lunar south pole.',
      workTitle: 'For All Mankind',
      aliases: 'jamestown zvezda shackleton waterice',
      confidence: 'confirmed',
    },
    mars: {
      targetId: 'mars',
      targetType: 'planet',
      systemId: 'sol',
      inUniverseName: 'Happy Valley',
      subtitle: 'Martian Base',
      text: 'First permanent Martian research colony founded in 1995 during the competitive tri-party expedition between NASA, Helios, and the USSR.',
      workTitle: 'For All Mankind',
      aliases: 'happyvalley helios baldwin',
      confidence: 'confirmed',
    },
  },
};

export default layer;
