import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-posthuman-solar',
  title: 'Post-Human Solar',
  subtitle: 'Quantum Thief & Accelerando',
  aliases: 'flambeur oubliette zoku matrioshka dyson stross rajaniemi vinge singularity',
  kind: 'fictional-canon',
  description: 'Radical post-human and technological singularity futures across the Solar System by Hannu Rajaniemi and Charles Stross.',
  version: 1,
  source: {
    summary:
      'High-concept transhuman settings across Sol, including Hannu Rajaniemi’s moving Martian city the Oubliette in The Quantum Thief, Charles Stross’s dismantled inner planets and Matrioshka Swarm in Accelerando, and autonomous post-biological android societies in Saturn’s Children.',
    creator: 'Hannu Rajaniemi, Charles Stross',
    publicationYear: '2005–2010',
    medium: 'Novel Series',
    canonicalReference: 'The Quantum Thief (2010), Accelerando (2005), and Saturn’s Children (2008)',
    url: 'https://en.wikipedia.org/wiki/The_Quantum_Thief',
  },
  entries: {
    mars: {
      targetId: 'mars',
      targetType: 'planet',
      systemId: 'sol',
      inUniverseName: 'The Oubliette',
      subtitle: 'Walking Clockwork City',
      text: 'Vast mobile Martian city creeping along tracks across the sands, whose citizens trade memory and lifespans through the cryptographic Time currency.',
      workTitle: 'The Quantum Thief',
      aliases: 'oubliette flambeur gogol gevulot zoku jean',
      confidence: 'confirmed',
    },
    phobos: {
      targetId: 'phobos',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'mars',
      inUniverseName: 'Dilemma Prison',
      subtitle: 'Game-Theoretic Panopticon',
      text: 'Virtual panopticon carved into Phobos where digital minds are subjected to endless iterated Prisoner’s Dilemmas by the Archons.',
      workTitle: 'The Quantum Thief',
      aliases: 'dilemma panopticon archon pellegrini',
      confidence: 'confirmed',
    },
    mercury: {
      targetId: 'mercury',
      targetType: 'planet',
      systemId: 'sol',
      inUniverseName: 'Matrioshka Swarm',
      subtitle: 'Dismantled Inner System',
      text: 'Inner planets dismantled into dense computational nodes and solar-sail smart matter enclosing the Sun as humanity transcends into the Singularity.',
      workTitle: 'Accelerando',
      aliases: 'matrioshka dysonsphere computronium singularity macx',
      confidence: 'confirmed',
    },
    saturn: {
      targetId: 'saturn',
      targetType: 'planet',
      systemId: 'sol',
      inUniverseName: 'Rhea City',
      subtitle: 'Post-Biological Android World',
      text: 'Vast android civilization flourishing in floating Saturnian habitats and airless moons long after the extinction of biological humanity.',
      workTitle: 'Saturn’s Children',
      aliases: 'freya rhea android arHousehold',
      confidence: 'confirmed',
    },
  },
};

export default layer;
