import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-project-hail-mary',
  title: 'Hail Mary',
  aliases: 'project astrophage grace rocky weir',
  kind: 'fictional-canon',
  description: 'Stellar systems and worlds featured in Andy Weir’s Project Hail Mary.',
  version: 1,
  source: {
    summary:
      'Hard science-fiction novel in which solar-dimming Astrophage infects local stars within ~20 light-years of Sol except Tau Ceti, prompting humanity to launch the Hail Mary while the Eridian civilization launches the Blip-A from 40 Eridani.',
    creator: 'Andy Weir',
    publicationYear: '2021',
    medium: 'Novel',
    canonicalReference: 'Project Hail Mary (Ballantine Books, 2021)',
    url: 'https://en.wikipedia.org/wiki/Project_Hail_Mary',
  },
  entries: {
    'gaia-2452378776434477184': {
      targetId: 'gaia-2452378776434477184',
      targetType: 'system',
      systemId: 'gaia-2452378776434477184',
      subtitle: 'Astrophage Destination',
      text: 'Only nearby star immune to Astrophage dimming; destination of the Hail Mary and Blip-A.',
      workTitle: 'Project Hail Mary',
      aliases: 'petrova',
      confidence: 'confirmed',
    },
    'tau-ceti-e': {
      targetId: 'tau-ceti-e',
      targetType: 'planet',
      systemId: 'gaia-2452378776434477184',
      inUniverseName: 'Adrian',
      subtitle: 'Taumoeba World',
      text: 'Super-Earth in Tau Ceti where Ryland Grace and Rocky harvest natural Astrophage predators (Taumoeba).',
      workTitle: 'Project Hail Mary',
      aliases: 'taumoeba',
      confidence: 'confirmed',
    },
    'gaia-3195919528989223040': {
      targetId: 'gaia-3195919528989223040',
      targetType: 'system',
      systemId: 'gaia-3195919528989223040',
      inUniverseName: 'Erid',
      subtitle: 'Eridian Homeworld',
      text: 'Home system of Rocky and the Eridian civilization aboard the Blip-A.',
      workTitle: 'Project Hail Mary',
      aliases: 'rocky blipa',
      confidence: 'confirmed',
    },
  },
};

export default layer;
