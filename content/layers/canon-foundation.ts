import type { DatasetLayerManifest } from '../../src/types/astro';

const layer: DatasetLayerManifest = {
  layerId: 'canon-foundation',
  title: 'Foundation',
  subtitle: 'Robots & Empire',
  aliases: 'psychohistory seldon spacers hari asimov',
  kind: 'fictional-canon',
  description: 'Core worlds and early Spacer sectors in Isaac Asimov’s Robot and Foundation universe.',
  version: 1,
  source: {
    summary:
      'Epic science-fiction saga chronicling humanity’s expansion from early Spacer worlds through the rise and fall of the Galactic Empire.',
    creator: 'Isaac Asimov',
    publicationYear: '1951–1993',
    medium: 'Novel Series',
    canonicalReference: 'The Caves of Steel (1954), The Robots of Dawn (1983), Foundation (1951)',
    url: 'https://en.wikipedia.org/wiki/Foundation_series',
  },
  entries: {
    'hip-32349': {
      targetId: 'hip-32349',
      targetType: 'system',
      systemId: 'hip-32349',
      subtitle: 'Sirius Sector',
      text: 'Core administrative sector of the Galactic Empire and early Spacer settlement hub in Isaac Asimov’s Robots and Foundation series.',
      workTitle: 'Foundation',
      aliases: 'siriussector spacers galacticempire',
      confidence: 'confirmed',
    },
    'gaia-2452378776434477184': {
      targetId: 'gaia-2452378776434477184',
      targetType: 'system',
      systemId: 'gaia-2452378776434477184',
      inUniverseName: 'Aurora',
      subtitle: 'First Spacer World',
      text: 'First extrasolar world colonised by Spacers from Earth; homeworld of roboticist Han Fastolfe and R. Daneel Olivaw in Asimov’s Robot and Foundation universe.',
      workTitle: 'The Robots of Dawn',
      aliases: 'aurora fastolfe daneel spacer',
      confidence: 'confirmed',
    },
  },
};

export default layer;
