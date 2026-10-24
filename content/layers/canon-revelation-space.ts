import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-revelation-space',
  title: 'Revelation Space Universe',
  kind: 'fictional-canon',
  description: 'Lighthugger colonies and Inhibitor artifacts in Alastair Reynolds’s Revelation Space universe.',
  version: 1,
  source: {
    summary:
      'Hard space-opera universe spanning real stars within 50 light-years of Sol, including Yellowstone (Epsilon Eridani), Resurgam (Delta Pavonis), Sky’s Edge (61 Cygni), and Zion (Lacaille 9352).',
    creator: 'Alastair Reynolds',
    publicationYear: '2000–present',
    medium: 'Novel Series',
    canonicalReference: 'Revelation Space (2000) & Chasm City (2001)',
    url: 'https://en.wikipedia.org/wiki/Revelation_Space_universe',
  },
  entries: {
    'gaia-6427464123776727168': {
      targetId: 'gaia-6427464123776727168',
      targetType: 'system',
      systemId: 'gaia-6427464123776727168',
      inUniverseName: 'Resurgam (Delta Pavonis)',
      text: 'Desert archaeological colony orbiting Delta Pavonis containing the extinct avian Amarantin ruins and the Hades Matrix.',
      workTitle: 'Revelation Space',
      aliases: 'Resurgam Revelation Space Amarantin Delta Pavonis',
      confidence: 'confirmed',
    },
    'gaia-5164707970261890560': {
      targetId: 'gaia-5164707970261890560',
      targetType: 'system',
      systemId: 'gaia-5164707970261890560',
      inUniverseName: 'Yellowstone (Chasm City / Epsilon Eridani)',
      text: 'Heart of the Demarchist Glitter Band (10,000 orbital habitats) and Chasm City in the Epsilon Eridani system prior to the Melding Plague.',
      workTitle: 'Chasm City',
      aliases: 'Yellowstone Chasm City Glitter Band Demarchists',
      confidence: 'confirmed',
    },
    'gaia-1872046609345556480': {
      targetId: 'gaia-1872046609345556480',
      targetType: 'system',
      systemId: 'gaia-1872046609345556480',
      inUniverseName: "Sky's Edge (61 Cygni A)",
      text: 'Jungle frontier world orbiting 61 Cygni A settled by generation ships from the Santiago flotilla.',
      workTitle: 'Chasm City',
      aliases: "Sky's Edge 61 Cygni A",
      confidence: 'confirmed',
    },
    'gaia-6385548541499112448': {
      targetId: 'gaia-6385548541499112448',
      targetType: 'system',
      systemId: 'gaia-6385548541499112448',
      inUniverseName: 'Zion (Lacaille 9352)',
      text: 'Oceanic world orbiting the red dwarf Lacaille 9352, home to the Pattern Juggler marine biomass.',
      workTitle: 'Redemption Ark',
      aliases: 'Zion Lacaille 9352 Pattern Jugglers',
      confidence: 'confirmed',
    },
  },
};

export default layer;
