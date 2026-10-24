import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-space-odyssey',
  title: 'Space Odyssey',
  subtitle: '2001 & 2010',
  aliases: 'monolith hal9000 clarke',
  kind: 'fictional-canon',
  description: 'Monolith discovery sites and transformation worlds in Arthur C. Clarke’s Space Odyssey series.',
  version: 1,
  source: {
    summary:
      'Hard science-fiction milestone following humanity’s evolution and contact with enigmatic alien monoliths across the Solar System.',
    creator: 'Arthur C. Clarke',
    publicationYear: '1968–1997',
    medium: 'Novel & Film Series',
    canonicalReference: '2001: A Space Odyssey (1968) & 2010: Odyssey Two (1982)',
    url: 'https://en.wikipedia.org/wiki/Space_Odyssey',
  },
  entries: {
    moon: {
      targetId: 'moon',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'earth',
      subtitle: 'TMA-1 Tycho Monolith',
      text: 'Excavation site of the Tycho Magnetic Anomaly 1 (TMA-1) monolith on the Moon, beaming a radio signal toward Saturn and Jupiter upon exposure to sunlight.',
      workTitle: '2001: A Space Odyssey',
      aliases: 'tma1 tycho monolith clarke',
      confidence: 'confirmed',
    },
    jupiter: {
      targetId: 'jupiter',
      targetType: 'planet',
      systemId: 'sol',
      subtitle: 'Lucifer Ignited',
      text: 'Giant planet converted into a miniature sun named Lucifer by self-replicating monoliths in 2010: Odyssey Two.',
      workTitle: '2010: Odyssey Two',
      aliases: 'lucifer minisun monolith',
      confidence: 'confirmed',
    },
    europa: {
      targetId: 'europa',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'jupiter',
      subtitle: 'Monolith Sanctuary',
      text: 'Jovian ocean moon transformed into a nascent sun-warmed biosphere in 2010: Odyssey Two ("All these worlds are yours except Europa. Attempt no landing there.").',
      workTitle: '2010: Odyssey Two',
      aliases: 'monolith sanctuary biosphere',
      confidence: 'confirmed',
    },
    iapetus: {
      targetId: 'iapetus',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'saturn',
      subtitle: 'Star Gate Monolith',
      text: 'Two-tone Saturnian moon whose bright equatorial oval houses the TMA-2 Star Gate monolith in the 1968 novel 2001: A Space Odyssey.',
      workTitle: '2001: A Space Odyssey',
      aliases: 'japetus stargate tma2',
      confidence: 'confirmed',
    },
  },
};

export default layer;
