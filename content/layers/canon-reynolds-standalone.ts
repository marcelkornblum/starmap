import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-reynolds-standalone',
  title: 'Poseidon’s Children & Pushing Ice',
  subtitle: 'Alastair Reynolds Standalones',
  aliases: 'akinya rockhopper janus mandala spica crucible elephant',
  kind: 'fictional-canon',
  description: 'Far-future solar and deep-space hard science fiction novels by astrophysicist Alastair Reynolds.',
  version: 1,
  source: {
    summary:
      'Key settings from Alastair Reynolds’s Poseidon’s Children trilogy across the Akinya family saga to Gliese 667 C, and the rogue moonship Janus heading for Spica in Pushing Ice.',
    creator: 'Alastair Reynolds',
    publicationYear: '2005–2015',
    medium: 'Novel Series',
    canonicalReference: 'Blue Remembered Earth (2012) & Pushing Ice (2005)',
    url: 'https://en.wikipedia.org/wiki/Alastair_Reynolds_bibliography',
  },
  entries: {
    'gliese-667-c': {
      targetId: 'gliese-667-c',
      targetType: 'system',
      systemId: 'gliese-667-c',
      inUniverseName: 'Crucible',
      subtitle: 'Mandala Colony',
      text: 'Temperate colony planet orbiting the red dwarf Gliese 667 C, destination of the generation ship flotillas where humans encounter the enigmatic Mandala artifacts.',
      workTitle: 'On the Steel Breeze',
      aliases: 'crucible mandala akinya flotilla chiku',
      confidence: 'confirmed',
    },
    saturn: {
      targetId: 'saturn',
      targetType: 'planet',
      systemId: 'sol',
      inUniverseName: 'Janus',
      subtitle: 'Alien Moonship',
      text: 'Saturnian moon revealed to be an ancient camouflaged interstellar vehicle that suddenly ignites and accelerates out of the Solar System.',
      workTitle: 'Pushing Ice',
      aliases: 'janus rockhopper bella svetlana moonship',
      confidence: 'confirmed',
    },
    'hip-65474': {
      targetId: 'hip-65474',
      targetType: 'system',
      systemId: 'hip-65474',
      inUniverseName: 'Structure',
      subtitle: 'Spica Megastructure',
      text: 'Massive artificial megastructure near Spica where the moonship Janus arrives across cosmic distances to encounter diverse interstellar civilizations.',
      workTitle: 'Pushing Ice',
      aliases: 'spica structure megastructure fountainhead',
      confidence: 'confirmed',
    },
    moon: {
      targetId: 'moon',
      targetType: 'moon',
      systemId: 'sol',
      parentBodyId: 'earth',
      subtitle: 'Akinya Estate',
      text: 'Lunar headquarters and vast underground installations of the Akinya family industrial empire in Blue Remembered Earth.',
      workTitle: 'Blue Remembered Earth',
      aliases: 'akinya eunice geoffrey sunday',
      confidence: 'confirmed',
    },
  },
};

export default layer;
