import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-bobiverse',
  title: 'Bobiverse (We Are Legion)',
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
      inUniverseName: 'Epsilon Eridani (Bob-1 First Replication Hub)',
      text: 'First interstellar target reached by Bob-1 (HEAVEN-1), where he defeats the Brazilian probe and builds Riker, Bill, Milo, and Mario.',
      workTitle: 'We Are Legion (We Are Bob)',
      aliases: 'Bobiverse We Are Legion We Are Bob HEAVEN-1',
      confidence: 'confirmed',
    },
    'gaia-5164120762333028736': {
      targetId: 'gaia-5164120762333028736',
      targetType: 'system',
      systemId: 'gaia-5164120762333028736',
      inUniverseName: 'Delta Eridani (Rana / Deltan Homeworld)',
      text: 'System where Original Bob discovers and shepherds the primitive Deltan species on planet Eden.',
      workTitle: 'We Are Legion (We Are Bob)',
      aliases: 'Delta Eridani Rana Deltans Archimedes',
      confidence: 'confirmed',
    },
    'gaia-4847957292277399296': {
      targetId: 'gaia-4847957292277399296',
      targetType: 'system',
      systemId: 'gaia-4847957292277399296',
      inUniverseName: '82 G. Eridani (Takama / Vulcan Colony)',
      text: 'Nearby G8V star system colonised by human survivors evacuated from Earth by the Bobiverse.',
      workTitle: 'For We Are Many',
      aliases: '82 Eridani 82 G. Eridani Vulcan Bobiverse',
      confidence: 'confirmed',
    },
    'gaia-425040000962559616': {
      targetId: 'gaia-425040000962559616',
      targetType: 'system',
      systemId: 'gaia-425040000962559616',
      inUniverseName: "Heaven's River (Eta Cassiopeiae Topopolis)",
      text: "Artificial megastructure (Topopolis) orbiting Eta Cassiopeiae housing the Quinlan civilisation in Heaven's River.",
      workTitle: "Heaven's River",
      aliases: "Heaven's River Eta Cassiopeiae Topopolis Quinlans",
      confidence: 'confirmed',
    },
  },
};

export default layer;
