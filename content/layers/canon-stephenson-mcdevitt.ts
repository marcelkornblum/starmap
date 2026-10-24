import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-stephenson-mcdevitt',
  title: 'Seveneves & Engines of God',
  subtitle: 'Stephenson & McDevitt Archeology',
  aliases: 'cleft cloudark agent priscilla hutchins monumental monument academy omega',
  kind: 'fictional-canon',
  description: 'Monumental lunar survival engineering and interstellar xenological archaeology by Neal Stephenson and Jack McDevitt.',
  version: 1,
  source: {
    summary:
      'Depicting the fragmentation of the Moon and survival of humanity aboard the Cloud Ark in Neal Stephenson’s Seveneves, alongside the mysterious extraterrestrial monuments on Iapetus and Beta Hydri in Jack McDevitt’s The Engines of God.',
    creator: 'Neal Stephenson, Jack McDevitt',
    publicationYear: '1994–2015',
    medium: 'Novel Series',
    canonicalReference: 'The Engines of God (1994) and Seveneves (2015)',
    url: 'https://en.wikipedia.org/wiki/Seveneves',
  },
  entries: {
    moon: {
      targetId: 'moon',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'earth',
      inUniverseName: 'The Cleft',
      subtitle: 'Shattered Lunar Cradle',
      text: 'The Moon, fractured into seven major fragments by an unknown Agent, where survivors carve the Cleft habitat into an iron core chunk to weather the five-thousand-year Hard Rain.',
      workTitle: 'Seveneves',
      aliases: 'cleft hardrain cloudark amalathea seveneves stephenson',
      confidence: 'confirmed',
    },
    iapetus: {
      targetId: 'iapetus',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'saturn',
      subtitle: 'Iapetus Ice Monument',
      text: 'Saturnian moon where archaeological survey teams discover an artificial ice tower carved by an ancient extraterrestrial intelligence with an ominous warning glyph.',
      workTitle: 'The Engines of God',
      aliases: 'monument academy hutchins glyph ice tower',
      confidence: 'confirmed',
    },
    'gaia-4683897617110115200': {
      targetId: 'gaia-4683897617110115200',
      targetType: 'system',
      systemId: 'gaia-4683897617110115200',
      inUniverseName: 'Quraqua',
      subtitle: 'Beta Hydri Extinct Civilization',
      text: 'Colony world orbiting the subgiant Beta Hydri where human Academy archaeologists study the tragic ruined cities of the vanished amphibious Quraquans.',
      workTitle: 'The Engines of God',
      aliases: 'quraqua academy ruins archaeology betahydri',
      confidence: 'confirmed',
    },
  },
};

export default layer;
