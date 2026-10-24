import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-cowboy-bebop',
  title: 'Cowboy Bebop',
  aliases: 'bebop spiegel bounty astral gate syndicate',
  kind: 'fictional-canon',
  description: 'Post-gate colonies and interplanetary havens from Shinichirō Watanabe’s Cowboy Bebop.',
  version: 1,
  source: {
    summary:
      'Classic space-western anime following bounty hunters across a colonised Solar System following the catastrophic 2022 Astral Gate explosion on the Moon.',
    creator: 'Sunrise / Shinichirō Watanabe',
    publicationYear: '1998–1999',
    medium: 'Television Series & Film',
    canonicalReference: 'Cowboy Bebop (1998) & Knockin’ on Heaven’s Door (2001)',
    url: 'https://en.wikipedia.org/wiki/Cowboy_Bebop',
  },
  entries: {
    mars: {
      targetId: 'mars',
      targetType: 'planet',
      systemId: 'sol',
      inUniverseName: 'Alba City',
      subtitle: 'Crater Megalopolis',
      text: 'Thriving crater metropolis on Mars serving as humanity’s primary commercial and cultural capital after the devastation of Earth.',
      workTitle: 'Cowboy Bebop',
      aliases: 'albacity craters spike',
      confidence: 'confirmed',
    },
    ganymede: {
      targetId: 'ganymede',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'jupiter',
      subtitle: 'Ocean Seaport Colony',
      text: 'Terraformed oceanic moon of Jupiter dominated by fishing docks and coastal ports; homeworld of former ISSP officer Jet Black.',
      workTitle: 'Cowboy Bebop',
      aliases: 'jetblack seaport issp',
      confidence: 'confirmed',
    },
    callisto: {
      targetId: 'callisto',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'jupiter',
      subtitle: 'Frozen Industrial Outpost',
      text: 'Frigid, sparsely populated Jovian moon with snowy domed cities and desolate industrial compounds.',
      workTitle: 'Cowboy Bebop',
      aliases: 'gren outback snow',
      confidence: 'confirmed',
    },
  },
};

export default layer;
