import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-gaming-landmarks',
  title: 'Sci-Fi Gaming',
  subtitle: 'Alpha Centauri & Dead Space',
  aliases: 'chiron sidmeier unity necromorph marker sprawl ishimura aegis evenson',
  kind: 'fictional-canon',
  description: 'Iconic gaming landmarks from Sid Meier’s Alpha Centauri to the cosmic-horror Necromorph outbreaks of Dead Space.',
  version: 1,
  source: {
    summary:
      'Celebrated gaming milestones spanning humanity’s ideological faction colonization of Chiron in Sid Meier’s Alpha Centauri, and the visceral Necromorph horror on Titan Station (The Sprawl) in Dead Space.',
    creator: 'Brian Evenson',
    publicationYear: '1999–2011',
    medium: 'Game Series',
    canonicalReference: 'Sid Meier’s Alpha Centauri (1999) & Dead Space 2 (2011)',
    url: 'https://en.wikipedia.org/wiki/Sid_Meier%27s_Alpha_Centauri',
  },
  entries: {
    'hip-71683': {
      targetId: 'hip-71683',
      targetType: 'system',
      systemId: 'hip-71683',
      inUniverseName: 'Chiron (Planet)',
      subtitle: 'Unity Colonization World',
      text: 'Bioluminescent alien biosphere orbiting Alpha Centauri A colonized by ideological factions following the catastrophic malfunction and breakup of the colony ship UNS Unity.',
      workTitle: 'Sid Meier’s Alpha Centauri',
      aliases: 'chiron planet unity miriam gaian spartan zakharov mindworm',
      confidence: 'confirmed',
    },
    titan: {
      targetId: 'titan',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'saturn',
      inUniverseName: 'Titan Station (The Sprawl)',
      subtitle: 'Necromorph Outbreak',
      text: 'Massive metropolis built on the shattered remnant of Titan where the Church of Unitology and EarthGov inadvertently trigger a horrific Necromorph convergence around the Site 12 Marker.',
      workTitle: 'Dead Space 2',
      aliases: 'sprawl isaac clarke necromorph marker unitology tiedemann',
      confidence: 'confirmed',
    },
    moon: {
      targetId: 'moon',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'earth',
      subtitle: 'Lunar Black Marker Facility',
      text: 'Early Sovereign Colonies research site on the Moon studying the alien Black Marker signal, leading to the secretive creation of the Red Markers.',
      workTitle: 'Dead Space: Martyr',
      aliases: 'blackmarker altman convergence sovereign',
      confidence: 'confirmed',
    },
  },
};

export default layer;
