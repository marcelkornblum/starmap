import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-ksr-solar',
  title: 'Robinson Solar',
  subtitle: 'Mars, 2312 & Icehenge',
  aliases: 'terraforming underhill terminator robinson',
  kind: 'fictional-canon',
  description: 'Solar System colonisation and terraforming landscapes in Kim Stanley Robinson’s future histories.',
  version: 1,
  source: {
    summary:
      'Definitive hard sci-fi visions of planetary engineering, ecological politics, and human settlement across the Solar System.',
    creator: 'Kim Stanley Robinson',
    publicationYear: '1984–2012',
    medium: 'Novel Series',
    canonicalReference: 'Red Mars (1992), Green Mars (1993), Blue Mars (1996), 2312 (2012), Icehenge (1984)',
    url: 'https://en.wikipedia.org/wiki/Mars_trilogy',
  },
  entries: {
    mars: {
      targetId: 'mars',
      targetType: 'planet',
      systemId: 'sol',
      inUniverseName: 'Underhill & Sheffield',
      subtitle: 'Terraformed Mars',
      text: 'First settlement (Underhill) and the elevator tether city (Sheffield atop Pavonis Mons) chronicled across two centuries of planetary transformation.',
      workTitle: 'Mars Trilogy',
      aliases: 'underhill sheffield pavonismons boone',
      confidence: 'confirmed',
    },
    phobos: {
      targetId: 'phobos',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'mars',
      subtitle: 'Orbital Tether Anchor',
      text: 'Inner Martian moon transformed into an orbital transfer terminal and cable counterweight before its catastrophic de-orbiting in the 2061 revolution.',
      workTitle: 'Red Mars',
      aliases: 'phobos elevator counterweight',
      confidence: 'confirmed',
    },
    mercury: {
      targetId: 'mercury',
      targetType: 'planet',
      systemId: 'sol',
      inUniverseName: 'Terminator',
      subtitle: 'Rolling Sun City',
      text: 'Vast city mounted on thermal-expansion tracks that rolls continuously around Mercury’s equator to stay inside the habitable twilight zone.',
      workTitle: '2312',
      aliases: 'terminator tracks sunwalker',
      confidence: 'confirmed',
    },
    pluto: {
      targetId: 'pluto',
      targetType: 'planet',
      systemId: 'sol',
      subtitle: 'Icehenge Monument',
      text: 'Enigmatic megalithic monument carved from water ice discovered at the north pole of Pluto, standing untouched for over a century.',
      workTitle: 'Icehenge',
      aliases: 'icehenge megalith',
      confidence: 'confirmed',
    },
  },
};

export default layer;
