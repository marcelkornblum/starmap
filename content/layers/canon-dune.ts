import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-dune',
  title: 'Dune',
  aliases: 'imperium melange fremen herbert',
  kind: 'fictional-canon',
  description: 'Imperial fiefdom star systems from Frank Herbert’s Dune Chronicles.',
  version: 1,
  source: {
    summary:
      'Feudal interstellar empire spanning real navigational stars in Frank Herbert’s Dune appendix and the Dune Encyclopedia, centred on Arrakis (Canopus III), Caladan (Delta Pavonis III), and Giedi Prime (36 Ophiuchi B).',
    creator: 'Frank Herbert',
    publicationYear: '1965',
    medium: 'Novel Series',
    canonicalReference: 'Dune (Chilton Books, 1965) — Appendix: Terminology of the Imperium',
    url: 'https://en.wikipedia.org/wiki/Dune_(franchise)',
  },
  entries: {
    'hip-30438': {
      targetId: 'hip-30438',
      targetType: 'system',
      systemId: 'hip-30438',
      inUniverseName: 'Arrakis',
      subtitle: 'Spice World',
      text: 'Third planet of Canopus; harsh desert world and sole source of the geriatric spice melange in the Known Universe.',
      workTitle: 'Dune',
      aliases: 'rakis melange fremen',
      confidence: 'confirmed',
    },
    'gaia-6427464123776727168': {
      targetId: 'gaia-6427464123776727168',
      targetType: 'system',
      systemId: 'gaia-6427464123776727168',
      inUniverseName: 'Caladan',
      subtitle: 'House Atreides Fief',
      text: 'Oceanic third planet of Delta Pavonis and ancestral fiefdom of House Atreides for twenty-six generations.',
      workTitle: 'Dune',
      aliases: 'atreides',
      confidence: 'confirmed',
    },
    'gaia-4109030160308317312': {
      targetId: 'gaia-4109030160308317312',
      targetType: 'system',
      systemId: 'gaia-4109030160308317312',
      inUniverseName: 'Giedi Prime',
      subtitle: 'House Harkonnen Fief',
      text: 'Industrialised, low-photosynthesis homeworld of House Harkonnen orbiting 36 Ophiuchi B.',
      workTitle: 'Dune',
      aliases: 'gammu harkonnen',
      confidence: 'confirmed',
    },
    'canon-dune:kaitain': {
      targetId: 'canon-dune:kaitain',
      targetType: 'fictional-body',
      systemId: 'gaia-6427464123776727168',
      inUniverseName: 'Kaitain',
      subtitle: 'Imperial Capital',
      text: 'Seat of the Padishah Emperor and House Corrino following the devastation of Salusa Secundus.',
      workTitle: 'Dune',
      aliases: 'corrino salusa',
      confidence: 'candidate',
    },
  },
};

export default layer;
