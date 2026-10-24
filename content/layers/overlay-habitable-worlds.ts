import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'overlay-habitable-worlds',
  title: 'Habitable Worlds Survey',
  subtitle: 'NASA HWO Tier-A Analogues',
  aliases: 'hwo habitable analogue biosignature exoplanet coronagraph directimaging',
  kind: 'scientific-overlay',
  description: 'NASA Habitable Worlds Observatory (HWO) Tier-A solar analogue targets for direct imaging of Earth-like exoplanets.',
  version: 1,
  source: {
    summary:
      'High-priority solar twin and solar analogue stars shortlisted for NASA Habitable Worlds Observatory direct coronagraphic imaging.',
    creator: 'NASA Habitable Worlds Observatory Science Working Group',
    publicationYear: '2024–present',
    medium: 'Astrophysical Survey',
    canonicalReference: 'HWO Target Lists & Mamajek et al. (2024)',
    url: 'https://science.nasa.gov/astrophysics/programs/habitable-worlds-observatory/',
  },
  entries: {
    'gaia-2452378776434477184': {
      targetId: 'gaia-2452378776434477184',
      targetType: 'system',
      systemId: 'gaia-2452378776434477184',
      subtitle: 'G8.5V Solar Analogue',
      text: 'Single G-dwarf at 11.9 light-years; top-tier HWO target for direct coronagraphic imaging of habitable-zone terrestrial planets.',
      workTitle: 'NASA HWO Survey',
      aliases: 'tauceti hwo solaranalogue',
      confidence: 'confirmed',
    },
    'gaia-5164707970261890560': {
      targetId: 'gaia-5164707970261890560',
      targetType: 'system',
      systemId: 'gaia-5164707970261890560',
      subtitle: 'K2V Young System',
      text: 'Nearby young K-dwarf at 10.5 light-years harboring known giant planet and dual debris disks for disk-planet interaction study.',
      workTitle: 'NASA HWO Survey',
      aliases: 'epsiloneridani ran debrisdisk',
      confidence: 'confirmed',
    },
    'gaia-6427464123776727168': {
      targetId: 'gaia-6427464123776727168',
      targetType: 'system',
      systemId: 'gaia-6427464123776727168',
      subtitle: 'G8IV Solar Twin',
      text: 'Old, quiet solar twin at 19.9 light-years considered one of the highest-priority targets for terrestrial planet direct imaging.',
      workTitle: 'NASA HWO Survey',
      aliases: 'deltapavonis solartwin',
      confidence: 'confirmed',
    },
    'gaia-4847957293278177024': {
      targetId: 'gaia-4847957293278177024',
      targetType: 'system',
      systemId: 'gaia-4847957293278177024',
      subtitle: 'G8V Multi-Planet Host',
      text: 'Bright solar analogue at 19.7 light-years hosting confirmed super-Earths and a prominent circumstellar dust disk.',
      workTitle: 'NASA HWO Survey',
      aliases: '82geridani superearth',
      confidence: 'confirmed',
    },
    'gaia-3195919528989223040': {
      targetId: 'gaia-3195919528989223040',
      targetType: 'system',
      systemId: 'gaia-3195919528989223040',
      subtitle: 'K1V Main Sequence Star',
      text: 'Primary star of the 40 Eridani triple system at 16.3 light-years, prime nearby target for habitable exoplanet searches.',
      workTitle: 'NASA HWO Survey',
      aliases: '40eridani keid triplesystem',
      confidence: 'confirmed',
    },
  },
};

export default layer;
