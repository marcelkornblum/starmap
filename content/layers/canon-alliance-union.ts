import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-alliance-union',
  title: 'Alliance–Union',
  subtitle: 'Downbelow & Cyteen',
  aliases: 'downbelow cyteen merchanter azi cherryh',
  kind: 'fictional-canon',
  description: 'Stations and colony systems in C. J. Cherryh’s Alliance–Union universe.',
  version: 1,
  source: {
    summary:
      'Hugo Award-winning hard space opera detailing the Company Wars between corporate Earth and the rebellious Union colonies.',
    creator: 'C. J. Cherryh',
    publicationYear: '1976–2023',
    medium: 'Novel Series',
    canonicalReference: 'Downbelow Station (1981), Cyteen (1988), Rimrunners (1989)',
    url: 'https://en.wikipedia.org/wiki/Alliance%E2%80%93Union_universe',
  },
  entries: {
    'gaia-2452378776434477184': {
      targetId: 'gaia-2452378776434477184',
      targetType: 'system',
      systemId: 'gaia-2452378776434477184',
      inUniverseName: 'Downbelow Station',
      subtitle: 'Pell’s World',
      text: 'Major space station orbiting Pell’s World at Tau Ceti; fulcrum of the Company Wars between Earth Fleet and Union merchanters.',
      workTitle: 'Downbelow Station',
      aliases: 'pell downbelowstation companywars',
      confidence: 'confirmed',
    },
    'gaia-2739689239311660672': {
      targetId: 'gaia-2739689239311660672',
      targetType: 'system',
      systemId: 'gaia-2739689239311660672',
      inUniverseName: 'Cyteen',
      subtitle: 'Union Capital',
      text: 'Harsh, chemically alien capital world of the Union orbiting Gliese 908; home of Reseune and master of azi clone technology.',
      workTitle: 'Cyteen',
      aliases: 'cyteen reseune azi',
      confidence: 'confirmed',
    },
    'gaia-2261614264931057664': {
      targetId: 'gaia-2261614264931057664',
      targetType: 'system',
      systemId: 'gaia-2261614264931057664',
      subtitle: 'Russell’s Station',
      text: 'Major commercial space station in the Sigma Draconis system connecting the Great Circle trade routes.',
      workTitle: 'Alliance–Union',
      aliases: 'russellstation greatcircle',
      confidence: 'confirmed',
    },
  },
};

export default layer;
