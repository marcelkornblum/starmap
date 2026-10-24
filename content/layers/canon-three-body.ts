import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-three-body',
  title: 'Remembrance of Earth’s Past (Three-Body)',
  kind: 'fictional-canon',
  description: 'Systems featured in Liu Cixin’s The Three-Body Problem trilogy.',
  version: 1,
  source: {
    summary:
      'Hard science-fiction trilogy beginning with first contact between Earth and the chaotic triple-star system of Alpha Centauri (Trisolaris), 4.2 light-years away.',
    creator: 'Liu Cixin',
    publicationYear: '2006–2010',
    medium: 'Novel Trilogy',
    canonicalReference: 'The Three-Body Problem / The Dark Forest / Death’s End',
    url: 'https://en.wikipedia.org/wiki/Remembrance_of_Earth%27s_Past',
  },
  entries: {
    'gaia-5853498713190525696': {
      targetId: 'gaia-5853498713190525696',
      targetType: 'system',
      systemId: 'gaia-5853498713190525696',
      inUniverseName: 'Trisolaris (Alpha Centauri)',
      text: 'Chaotic triple-star system 4.2 light-years from Sol housing the Trisolaran civilization.',
      workTitle: 'The Three-Body Problem',
      aliases: 'Trisolaris Three-Body Problem San-Ti Sophon',
      confidence: 'confirmed',
    },
    'canon-three-body:dx3906': {
      targetId: 'canon-three-body:dx3906',
      targetType: 'fictional-body',
      systemId: 'gaia-5853498713190525696',
      inUniverseName: 'DX3906 (Planet Blue / Our Star)',
      text: 'Dim red dwarf system gifted to Cheng Xin by Yun Tianming in Death’s End, orbiting two terrestrial worlds (Planet Blue and Planet Gray) where Cheng Xin and Guan Yifan experience curvature-propulsion death lines.',
      workTitle: 'Death’s End',
      aliases: 'DX3906 Planet Blue Our Star Death’s End',
      confidence: 'candidate',
    },
  },
};

export default layer;
