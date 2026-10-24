import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-enders-game',
  title: 'Ender’s Game',
  aliases: 'formic bugger ansible battleschool card',
  kind: 'fictional-canon',
  description: 'Military training orbital stations and asteroid command bunkers in Orson Scott Card’s Enderverse.',
  version: 1,
  source: {
    summary:
      'Classic Hugo and Nebula award-winning novel following tactical prodigy Ender Wiggin in humanity’s desperate defense against the insectoid Formics.',
    creator: 'Orson Scott Card',
    publicationYear: '1985–2013',
    medium: 'Novel & Film',
    canonicalReference: 'Ender’s Game (1985)',
    url: 'https://en.wikipedia.org/wiki/Ender%27s_Game',
  },
  entries: {
    '433-eros': {
      targetId: '433-eros',
      targetType: 'minor-body',
      systemId: 'sol',
      inUniverseName: 'Command School',
      subtitle: 'Formic Tunnel Complex',
      text: 'Asteroid 433 Eros converted into the subterranean International Fleet Command School where Ender conducts the decisive simulation campaigns.',
      workTitle: 'Ender’s Game',
      aliases: 'commandschool formic mazer rackham',
      confidence: 'confirmed',
    },
    moon: {
      targetId: 'moon',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'earth',
      subtitle: 'Battle School Orbit',
      text: 'High lunar orbit sector hosting the International Fleet Battle School where gifted children compete in zero-gravity battle rooms.',
      workTitle: 'Ender’s Game',
      aliases: 'battleschool zerog flashsuit',
      confidence: 'confirmed',
    },
  },
};

export default layer;
