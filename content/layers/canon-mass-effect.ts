import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-mass-effect',
  title: 'Mass Effect',
  aliases: 'normandy reaper prothean alliance citadel',
  kind: 'fictional-canon',
  description: 'Systems Alliance headquarters, relay gateways, and Prothean dig sites from Mass Effect.',
  version: 1,
  source: {
    summary:
      'Acclaimed space opera action-RPG franchise detailing humanity’s rise into galactic civilization and the existential war against the Reapers.',
    creator: 'BioWare / Casey Hudson',
    publicationYear: '2007–present',
    medium: 'Video Game Franchise',
    canonicalReference: 'Mass Effect (2007), Mass Effect 2 (2010), Mass Effect 3 (2012)',
    url: 'https://en.wikipedia.org/wiki/Mass_Effect',
  },
  entries: {
    charon: {
      targetId: 'charon',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'pluto',
      subtitle: 'Charon Mass Relay',
      text: 'Encased in thick planetary ice, Pluto’s moon Charon is revealed in 2149 to be a dormant mass relay, unlocking instantaneous interstellar transit.',
      workTitle: 'Mass Effect',
      aliases: 'massrelay elementzero eezo',
      confidence: 'confirmed',
    },
    mars: {
      targetId: 'mars',
      targetType: 'planet',
      systemId: 'sol',
      subtitle: 'Prothean Archive',
      text: 'Subterranean alien ruins discovered in Promethei Planitia on Mars, revealing mass-effect physics and interstellar blueprints.',
      workTitle: 'Mass Effect',
      aliases: 'prothean archive promethei',
      confidence: 'confirmed',
    },
    'hip-69673': {
      targetId: 'hip-69673',
      targetType: 'system',
      systemId: 'hip-69673',
      inUniverseName: 'Arcturus Station',
      subtitle: 'Systems Alliance HQ',
      text: 'Capital station of the Systems Alliance situated at a critical mass-relay nexus 36 light-years from Earth in the Arcturus system.',
      workTitle: 'Mass Effect',
      aliases: 'arcturus alliance parliament fifthfleet',
      confidence: 'confirmed',
    },
  },
};

export default layer;
