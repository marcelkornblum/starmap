import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-pkd-worlds',
  title: 'Philip K. Dick Worlds',
  subtitle: 'Palmer Eldritch & Off-World Colonies',
  aliases: 'eldritch cand chewz replicant ubik recall hovel moratorium dick',
  kind: 'fictional-canon',
  description: 'Paranoid, hallucinatory realities and grim off-world colonies from the visionary science fiction of Philip K. Dick.',
  version: 1,
  source: {
    summary:
      'Iconic dystopian settings from Philip K. Dick spanning the desolate Martian hovels of The Three Stigmata of Palmer Eldritch, the synthetic slave frontiers in Do Androids Dream of Electric Sheep?, and the lunar cold-pack moratoriums of Ubik.',
    creator: 'Philip K. Dick',
    publicationYear: '1965–1969',
    medium: 'Novel Series',
    canonicalReference: 'The Three Stigmata of Palmer Eldritch (1965) & Do Androids Dream of Electric Sheep? (1968)',
    url: 'https://en.wikipedia.org/wiki/Philip_K._Dick_bibliography',
  },
  entries: {
    'gaia-5853498713190525696': {
      targetId: 'gaia-5853498713190525696',
      targetType: 'system',
      systemId: 'gaia-5853498713190525696',
      inUniverseName: 'Prox System',
      subtitle: 'Chew-Z Alien Entity',
      text: 'Deep-space Proxima Centauri system where industrialist Palmer Eldritch encounters an interdimensional godlike alien entity and returns with the reality-altering drug Chew-Z.',
      workTitle: 'The Three Stigmata of Palmer Eldritch',
      aliases: 'chewz eldrich interdimensional hallucination',
      confidence: 'confirmed',
    },
    mars: {
      targetId: 'mars',
      targetType: 'planet',
      systemId: 'sol',
      subtitle: 'Can-D Hovels & Off-World Slave Colony',
      text: 'Bleak, sweltering Martian draft colonies where depressed colonists escape isolation through the shared illusion of Can-D Perky Pat layouts, and the hazardous mining frontier of synthetic Nexus androids.',
      workTitle: 'The Three Stigmata of Palmer Eldritch',
      aliases: 'perkypat cand hovel draft android replicant quaid',
      confidence: 'confirmed',
    },
    moon: {
      targetId: 'moon',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'earth',
      inUniverseName: 'Luna City',
      subtitle: 'Loved Ones Moratorium',
      text: 'Lunar metropolis housing the cryonic cold-pack moratoriums where deceased relatives and psychic operatives are maintained in communicative half-life.',
      workTitle: 'Ubik',
      aliases: 'moratorium halflife runciter chip antiinertial',
      confidence: 'confirmed',
    },
  },
};

export default layer;
