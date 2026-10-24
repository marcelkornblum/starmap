import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-niven-pournelle',
  title: 'Mote & Footfall',
  subtitle: 'Niven & Pournelle Collaborations',
  aliases: 'motie codominium macarthur fithp thuktun orion asteroid michael',
  kind: 'fictional-canon',
  description: 'Seminal first-contact and alien invasion masterpieces co-authored by Larry Niven and Jerry Pournelle.',
  version: 1,
  source: {
    summary:
      'The CoDominium empire’s contact with the Moties in the Coalsack Nebula in The Mote in God’s Eye, and the elephant-like Fithp invasion launched from Alpha Centauri in Footfall.',
    creator: 'Larry Niven, Jerry Pournelle',
    publicationYear: '1974–1985',
    medium: 'Novel Series',
    canonicalReference: 'The Mote in God’s Eye (1974) & Footfall (1985)',
    url: 'https://en.wikipedia.org/wiki/The_Mote_in_God%27s_Eye',
  },
  entries: {
    'coalsack-nebula': {
      targetId: 'coalsack-nebula',
      targetType: 'structure',
      systemId: 'coalsack-nebula',
      inUniverseName: 'Murcheson’s Eye',
      subtitle: 'The Mote / Motie Homeworld',
      text: 'Yellow G-type star silhouetted like a pinpoint pupil against the dark Coalsack Nebula (The Face of God), enclosing the biological hyper-specialized Motie civilization.',
      workTitle: 'The Mote in God’s Eye',
      aliases: 'motie mote murcheson bury rennie horvath',
      confidence: 'confirmed',
    },
    'hip-71683': {
      targetId: 'hip-71683',
      targetType: 'system',
      systemId: 'hip-71683',
      subtitle: 'Fithp Origin System',
      text: 'Home system of the herd-mind, trunked alien conquerors the Fithp, who journey across interstellar space aboard the generational mothership Thuktun Fithp.',
      workTitle: 'Footfall',
      aliases: 'fithp thuktun herd mothership alphacentauri',
      confidence: 'confirmed',
    },
    saturn: {
      targetId: 'saturn',
      targetType: 'planet',
      systemId: 'sol',
      subtitle: 'Thuktun Fithp In-System Staging',
      text: 'Outer Solar System arrival and resource-harvesting staging base for the invading Fithp armada before striking Earth.',
      workTitle: 'Footfall',
      aliases: 'thuktun invasion armada refueling',
      confidence: 'confirmed',
    },
  },
};

export default layer;
