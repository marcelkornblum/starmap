import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-clarke-deep-space',
  title: 'Clarke Deep Space',
  subtitle: 'Rama, Titan & Canopus',
  aliases: 'rama spaceguard titan overlord clarke',
  kind: 'fictional-canon',
  description: 'First-contact and outer-system landmarks from Arthur C. Clarke’s standalone classics.',
  version: 1,
  source: {
    summary:
      'Milestone speculative works depicting humanity’s encounters with transcendent alien intelligence and outer solar colonisation.',
    creator: 'Arthur C. Clarke',
    publicationYear: '1953–1975',
    medium: 'Novel Series',
    canonicalReference: 'Childhood’s End (1953), Rendezvous with Rama (1973), Imperial Earth (1975)',
    url: 'https://en.wikipedia.org/wiki/Rendezvous_with_Rama',
  },
  entries: {
    mercury: {
      targetId: 'mercury',
      targetType: 'planet',
      systemId: 'sol',
      subtitle: 'Rama Perihelion Monitor',
      text: 'Scientific observation base and headquarters of Project Spaceguard tracking the 50-kilometer alien cylinder Rama during its perihelion slingshot.',
      workTitle: 'Rendezvous with Rama',
      aliases: 'rama spaceguard hermian',
      confidence: 'confirmed',
    },
    titan: {
      targetId: 'titan',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'saturn',
      inUniverseName: 'Oasis Colony',
      subtitle: 'Hydrogen Refuelling Hub',
      text: 'Commercial hydrogen mining colony on Saturn’s moon Titan supplying reaction mass across the Solar System in Imperial Earth.',
      workTitle: 'Imperial Earth',
      aliases: 'oasis hydrogen titan',
      confidence: 'confirmed',
    },
    'hip-30438': {
      targetId: 'hip-30438',
      targetType: 'system',
      systemId: 'hip-30438',
      subtitle: 'Overlord Homeworld',
      text: 'F0Ib supergiant star 310 light-years away; home system of Karellen and the Overlords overseeing humanity’s evolutionary culmination in Childhood’s End.',
      workTitle: 'Childhood’s End',
      aliases: 'karellen overlord canopus',
      confidence: 'confirmed',
    },
  },
};

export default layer;
