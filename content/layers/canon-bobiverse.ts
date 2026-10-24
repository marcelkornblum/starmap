import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-bobiverse',
  title: 'Bobiverse',
  subtitle: 'We Are Legion',
  aliases: 'vonneumann replicant taylor',
  kind: 'fictional-canon',
  description: 'Von Neumann replicant probe destinations in Dennis E. Taylor’s Bobiverse series.',
  version: 1,
  source: {
    summary:
      'Hard science-fiction series following Bob Johansson and his Von Neumann replicant descendants exploring Epsilon Eridani, Delta Eridani, 82 Eridani, and Eta Cassiopeiae.',
    creator: 'Dennis E. Taylor',
    publicationYear: '2016–present',
    medium: 'Novel Series',
    canonicalReference: 'We Are Legion (We Are Bob) (2016) – Heaven’s River (2020)',
    url: 'https://en.wikipedia.org/wiki/Dennis_E._Taylor#Bobiverse_series',
  },
  entries: {
    'gaia-5164707970261890560': {
      targetId: 'gaia-5164707970261890560',
      targetType: 'system',
      systemId: 'gaia-5164707970261890560',
      subtitle: 'First Replication Hub',
      text: 'First interstellar target reached by Bob-1 (HEAVEN-1), where he defeats the Brazilian probe and builds Riker, Bill, Milo, and Mario.',
      workTitle: 'We Are Legion',
      aliases: 'heaven1 riker bill milo mario',
      confidence: 'confirmed',
    },
    'gaia-5164120762333028736': {
      targetId: 'gaia-5164120762333028736',
      targetType: 'system',
      systemId: 'gaia-5164120762333028736',
      inUniverseName: 'Rana',
      subtitle: 'Deltan Homeworld',
      text: 'System where Original Bob discovers and shepherds the primitive Deltan species on planet Eden.',
      workTitle: 'We Are Legion',
      aliases: 'deltans archimedes eden',
      confidence: 'confirmed',
    },
    'gaia-4847957293278177024': {
      targetId: 'gaia-4847957293278177024',
      targetType: 'system',
      systemId: 'gaia-4847957293278177024',
      inUniverseName: 'Takama',
      subtitle: 'Vulcan Colony',
      text: 'Nearby G8V star system colonised by human survivors evacuated from Earth by the Bobiverse.',
      workTitle: 'For We Are Many',
      aliases: 'evacuation colony',
      confidence: 'confirmed',
    },
    'gaia-425040000962559616': {
      targetId: 'gaia-425040000962559616',
      targetType: 'system',
      systemId: 'gaia-425040000962559616',
      inUniverseName: "Heaven's River",
      subtitle: 'Topopolis',
      text: "Artificial megastructure (Topopolis) orbiting Eta Cassiopeiae housing the Quinlan civilisation in Heaven's River.",
      workTitle: "Heaven's River",
      aliases: 'topopolis quinlans megastructure',
      confidence: 'confirmed',
    },
  },
};

export default layer;
