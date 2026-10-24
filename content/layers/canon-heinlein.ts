import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-heinlein',
  title: 'Heinlein',
  subtitle: 'Future History & Classics',
  aliases: 'loonies lunas lunan commonwealth terrestrial transport',
  kind: 'fictional-canon',
  description: 'Iconic worlds and off-Earth outposts from the foundational science-fiction novels of Robert A. Heinlein.',
  version: 1,
  source: {
    summary:
      'Key Solar System and stellar destinations across Robert A. Heinlein’s Future History and standalone classics, from the lunar penal colony in The Moon Is a Harsh Mistress to Mars in Stranger in a Strange Land and Pluto in Have Space Suit—Will Travel.',
    creator: 'Robert A. Heinlein',
    publicationYear: '1950–1966',
    medium: 'Novel Series',
    canonicalReference: 'The Moon Is a Harsh Mistress (1966) & Stranger in a Strange Land (1961)',
    url: 'https://en.wikipedia.org/wiki/Robert_A._Heinlein_bibliography',
  },
  entries: {
    moon: {
      targetId: 'moon',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'earth',
      inUniverseName: 'Luna City',
      subtitle: 'Loonie Republic',
      text: 'Subterranean lunar penal colony and revolutionary settlement beneath Mare Crisium, governed with the aid of the sentient supercomputer Mike (HOLMES IV).',
      workTitle: 'The Moon Is a Harsh Mistress',
      aliases: 'loonie tychounder mann hyderabad holmes mike mycroft crisium',
      confidence: 'confirmed',
    },
    mars: {
      targetId: 'mars',
      targetType: 'planet',
      systemId: 'sol',
      inUniverseName: 'Marsopolis',
      subtitle: 'Martian Nests',
      text: 'Desert home of the ancient non-human Martian Old Ones in Stranger in a Strange Land, and capital city Marsopolis in Double Star.',
      workTitle: 'Stranger in a Strange Land',
      aliases: 'smith valentine grok bonforte nest',
      confidence: 'confirmed',
    },
    pluto: {
      targetId: 'pluto',
      targetType: 'planet',
      systemId: 'sol',
      inUniverseName: 'Tombaugh Station',
      subtitle: 'Wormface Outpost',
      text: 'Remote scientific outpost and alien staging ground in Have Space Suit—Will Travel, and fleet monitoring post in Starship Troopers.',
      workTitle: 'Have Space Suit—Will Travel',
      aliases: 'wormface peewee clifford',
      confidence: 'confirmed',
    },
    'hip-91262': {
      targetId: 'hip-91262',
      targetType: 'system',
      systemId: 'hip-91262',
      subtitle: 'Mother-Thing Homeworld',
      text: 'Vega system, home to the benign advanced alien civilization of the Mother-Thing and station of the Three Galaxies federation tribunal.',
      workTitle: 'Have Space Suit—Will Travel',
      aliases: 'motherthing federation tribunal',
      confidence: 'confirmed',
    },
  },
};

export default layer;
