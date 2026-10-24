import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-avatar',
  title: 'Avatar (Alpha Centauri System)',
  kind: 'fictional-canon',
  description: 'Pandora and Polyphemus in the Alpha Centauri A system from James Cameron’s Avatar.',
  version: 1,
  source: {
    summary:
      'Exomoon Pandora orbiting the gas giant Polyphemus in the habitable zone of Alpha Centauri A, 4.37 light-years from Earth.',
    creator: 'James Cameron',
    publicationYear: '2009–present',
    medium: 'Film Franchise',
    canonicalReference: 'Avatar: An Activist Survival Guide (2009)',
    url: 'https://en.wikipedia.org/wiki/Avatar_(franchise)',
  },
  entries: {
    'canon-avatar:pandora': {
      targetId: 'canon-avatar:pandora',
      targetType: 'fictional-body',
      systemId: 'gaia-5853498713190525696',
      inUniverseName: 'Pandora (Alpha Centauri A Exomoon)',
      text: 'Lush, habitable exomoon of the gas giant Polyphemus in the Alpha Centauri A system; home of the Na’vi and source of unobtanium.',
      workTitle: 'Avatar',
      aliases: 'Pandora Avatar Na’vi Unobtanium',
      confidence: 'confirmed',
    },
    'canon-avatar:polyphemus': {
      targetId: 'canon-avatar:polyphemus',
      targetType: 'fictional-body',
      systemId: 'gaia-5853498713190525696',
      inUniverseName: 'Polyphemus (Alpha Centauri A Gas Giant)',
      text: 'Blue-and-violet gas giant orbiting in the habitable zone of Alpha Centauri A, orbited by fourteen moons including Pandora.',
      workTitle: 'Avatar',
      aliases: 'Polyphemus Avatar Gas Giant',
      confidence: 'confirmed',
    },
  },
};

export default layer;
