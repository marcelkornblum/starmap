import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-wandering-earth',
  title: 'Wandering Earth',
  aliases: 'planetaryengine slingshot fusion liu',
  kind: 'fictional-canon',
  description: 'Interplanetary waypoints in Liu Cixin’s Earth migration saga.',
  version: 1,
  source: {
    summary:
      'Novella and blockbuster film franchise depicting humanity propelling planet Earth away from an expanding red giant Sun toward Alpha Centauri.',
    creator: 'Liu Cixin',
    publicationYear: '2000–2023',
    medium: 'Novella & Film Franchise',
    canonicalReference: 'The Wandering Earth (2000)',
    url: 'https://en.wikipedia.org/wiki/The_Wandering_Earth',
  },
  entries: {
    jupiter: {
      targetId: 'jupiter',
      targetType: 'planet',
      systemId: 'sol',
      subtitle: 'Gravity Slingshot Crisis',
      text: 'Gas giant whose gravitational capture threatens Earth during the acceleration flyby, overcome by igniting Jupiter’s hydrogen-oxygen mix.',
      workTitle: 'The Wandering Earth',
      aliases: 'slingshot hydrogen crisis',
      confidence: 'confirmed',
    },
    'gaia-5853498713190525696': {
      targetId: 'gaia-5853498713190525696',
      targetType: 'system',
      systemId: 'gaia-5853498713190525696',
      subtitle: '2,500-Year Migration Target',
      text: 'Nearest star system and final destination of Earth’s 100-generation interstellar journey propelled by massive fusion thrusters.',
      workTitle: 'The Wandering Earth',
      aliases: 'migration fusion destination',
      confidence: 'confirmed',
    },
  },
};

export default layer;
