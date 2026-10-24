import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-space-anime',
  title: 'Space Anime',
  subtitle: 'Planetes, Gundam & Yamato',
  aliases: 'gundam newtype vonbraun axis debris hachimaki yamato gamilas iskandar yukimura',
  kind: 'fictional-canon',
  description: 'Pioneering Japanese anime space epics spanning realistic orbital debris salvage in Planetes to grand fleet warfare in Gundam and Yamato.',
  version: 1,
  source: {
    summary:
      'Foundational works of space anime including Makoto Yukimura’s orbital debris clearing and Jupiter mission in Planetes, the Universal Century lunar cities and asteroid fortresses of Mobile Suit Gundam, and the voyage to save Earth in Space Battleship Yamato.',
    creator: 'Makoto Yukimura',
    publicationYear: '1974–2004',
    medium: 'TV Series',
    canonicalReference: 'Planetes (1999–2004), Mobile Suit Gundam (1979), and Space Battleship Yamato (1974)',
    url: 'https://en.wikipedia.org/wiki/Planetes',
  },
  entries: {
    moon: {
      targetId: 'moon',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'earth',
      inUniverseName: 'Von Braun City',
      subtitle: 'Lunar Metropolis & Debris Section',
      text: 'Sprawling lunar metropolis in Planetes, staging ground for the first manned expedition to Jupiter, and the industrial manufacturing heartland of Anaheim Electronics in Mobile Suit Gundam.',
      workTitle: 'Planetes',
      aliases: 'vonbraun hachimaki debris anaheim granada gundam',
      confidence: 'confirmed',
    },
    jupiter: {
      targetId: 'jupiter',
      targetType: 'planet',
      systemId: 'sol',
      subtitle: 'Von Braun Expedition & Energy Fleet',
      text: 'Destination of the nuclear tandem-mirror exploration ship Von Braun in Planetes, and the vital helium-3 harvesting domain of the Jupiter Fleet in Gundam.',
      workTitle: 'Planetes',
      aliases: 'jupiterfleet helium3 tandemmirror locksmith scirocco',
      confidence: 'confirmed',
    },
    ceres: {
      targetId: 'ceres',
      targetType: 'minor-body',
      systemId: 'sol',
      inUniverseName: 'Axis Fortress',
      subtitle: 'Asteroid Stronghold',
      text: 'Hollowed-out asteroid stronghold in the Asteroid Belt serving as the exiled stronghold of Zeon forces before being propelled toward Earth in Char’s Counterattack.',
      workTitle: 'Mobile Suit Gundam',
      aliases: 'axis zeon char asteroidfortress neozeon minovsky',
      confidence: 'confirmed',
    },
    pluto: {
      targetId: 'pluto',
      targetType: 'planet',
      systemId: 'sol',
      subtitle: 'Gamilas Forward Base',
      text: 'Solar System boundary outpost of the invading Gamilas Empire, launching planetary bombs and reflective satellite guns against Earth before being neutralized by the Space Battleship Yamato.',
      workTitle: 'Space Battleship Yamato',
      aliases: 'yamato gamilas planetbomb dessler okita wavemotion',
      confidence: 'confirmed',
    },
  },
};

export default layer;
