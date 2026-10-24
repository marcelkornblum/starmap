import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-stephen-baxter',
  title: 'Stephen Baxter',
  subtitle: 'Xeelee Sequence & Proxima',
  aliases: 'xeelee photino baryonic manifold perdurua bolder wormhole',
  kind: 'fictional-canon',
  description: 'Deep-time cosmic hard science fiction sagas by Stephen Baxter, spanning the Xeelee Sequence and the colonization of Proxima Centauri.',
  version: 1,
  source: {
    summary:
      'Sweeping hard SF works from Stephen Baxter encompassing the multi-billion-year war between the baryonic Xeelee and dark-matter Photino Birds, along with the harsh colonization of Per Ardua in Proxima.',
    creator: 'Stephen Baxter',
    publicationYear: '1991–2018',
    medium: 'Novel Series',
    canonicalReference: 'Ring (1994), Proxima (2013), and Manifold: Time (1999)',
    url: 'https://en.wikipedia.org/wiki/Stephen_Baxter_bibliography',
  },
  entries: {
    'gaia-5853498713190525696': {
      targetId: 'gaia-5853498713190525696',
      targetType: 'system',
      systemId: 'gaia-5853498713190525696',
      inUniverseName: 'Per Ardua',
      subtitle: 'Tidally Locked Frontier',
      text: 'Harsh tidally-locked world orbiting Proxima Centauri settled by human penal colonists who discover the alien Roman-era Hatch artifact.',
      workTitle: 'Proxima',
      aliases: 'perardua colin yuri hatch builder',
      confidence: 'confirmed',
    },
    'sagittarius-a-star': {
      targetId: 'sagittarius-a-star',
      targetType: 'structure',
      systemId: 'sagittarius-a-star',
      inUniverseName: 'The Ring',
      subtitle: 'Bolder’s Ring / Xeelee Megastructure',
      text: 'Cosmic-string portal megastructure constructed by the Xeelee near the galactic supermassive black hole to escape into a new universe.',
      workTitle: 'Ring',
      aliases: 'bolderring cosmicstring greatattractor xeeleering',
      confidence: 'confirmed',
    },
    jupiter: {
      targetId: 'jupiter',
      targetType: 'planet',
      systemId: 'sol',
      subtitle: 'Sol Wormhole Interface',
      text: 'Orbital anchor for the relativistic wormhole interface linking the Sol system to distant star systems across the Coalition expansion.',
      workTitle: 'Timelike Infinity',
      aliases: 'wormhole relativistic interface coalition qax',
      confidence: 'confirmed',
    },
    mercury: {
      targetId: 'mercury',
      targetType: 'planet',
      systemId: 'sol',
      subtitle: 'Mercury Hatch Expedition',
      text: 'Expedition site where humans uncover the solar system counterpart to the Proxima Hatch wormhole doorway.',
      workTitle: 'Ultima',
      aliases: 'hatch doorway portal roman',
      confidence: 'confirmed',
    },
  },
};

export default layer;
