export type SearchCategoryKey =
  | 'stars'
  | 'planets'
  | 'structures'
  | 'minor-bodies'
  | 'layers';

export type SearchCategoryFilter = 'all' | SearchCategoryKey;

export interface SearchCategoryMeta {
  readonly key: SearchCategoryKey;
  readonly heading: string;
  readonly label: string;
  readonly shard: string;
}

export const SEARCH_CATEGORIES: readonly SearchCategoryMeta[] = [
  { key: 'stars', heading: 'Stars & Stellar Systems', label: 'Stars & Stellar Systems', shard: 'stars.json' },
  { key: 'planets', heading: 'Planets, Exoplanets & Moons', label: 'Planets, Exoplanets & Moons', shard: 'planets.json' },
  { key: 'structures', heading: 'Galactic Structures & Deep Sky', label: 'Galactic Structures & Deep Sky', shard: 'structures.json' },
  { key: 'minor-bodies', heading: 'Solar System Minor Bodies', label: 'Solar System Minor Bodies', shard: 'minor-bodies.json' },
  { key: 'layers', heading: 'Curated Layers & Canons', label: 'Curated Layers & Canons', shard: 'layers.json' },
];
