import type {
  DatasetLayerEntry,
  DatasetLayerKind,
  DatasetLayerSourceMeta,
  DatasetLayerTargetType,
} from '../types/datasetLayers';

export const LAYER_KIND_TO_CODE: Record<DatasetLayerKind, number> = {
  'fictional-canon': 1,
  'custom-user': 2,
  'scientific-overlay': 3,
};

export const CODE_TO_LAYER_KIND: Record<number, DatasetLayerKind> = {
  1: 'fictional-canon',
  2: 'custom-user',
  3: 'scientific-overlay',
};

export const TARGET_TYPE_TO_CODE: Record<DatasetLayerTargetType, number> = {
  system: 1,
  planet: 2,
  moon: 3,
  structure: 4,
  'minor-body': 5,
  'fictional-body': 6,
};

export const CODE_TO_TARGET_TYPE: Record<number, DatasetLayerTargetType> = {
  1: 'system',
  2: 'planet',
  3: 'moon',
  4: 'structure',
  5: 'minor-body',
  6: 'fictional-body',
};

export interface CompactLayerSourceMeta {
  s: string;
  a: string;
  y?: string;
  m?: string;
  r?: string;
  u?: string;
}

export interface CompactLayerEntry {
  k?: number;
  s?: string;
  o?: number;
  p?: string;
  u?: string;
  t?: string;
  x: string;
  w?: string;
  a?: string;
  c?: 2 | 3 | 4;
  r?: string;
}

export interface CompactLayerManifest {
  i: string;
  n: string;
  t?: string;
  k: number;
  d: string;
  v: number;
  a?: string;
  b?: CompactLayerSourceMeta;
  e: Record<string, CompactLayerEntry>;
}

export interface CompactEntityAnnotation {
  i: string;
  n: string;
  k?: number;
  t: string;
  y?: number;
  s?: string;
  p?: string;
  u?: string;
  b?: string;
  w?: string;
  x: string;
  o?: number;
  a?: string;
  r?: string;
  d?: string;
}

export interface DecodedEntityAnnotation {
  readonly layerId: string;
  readonly layerTitle: string;
  readonly kind: DatasetLayerKind;
  readonly targetId: string;
  readonly targetType: DatasetLayerTargetType;
  readonly systemId: string;
  readonly parentBodyId?: string;
  readonly inUniverseName?: string;
  readonly resolvedName?: string;
  readonly subtitle?: string;
  readonly workTitle?: string;
  readonly text: string;
  readonly order?: number;
  readonly creator?: string;
  readonly publicationYear?: string;
}

export interface ResolvedLayerAnnotation {
  layerId: string;
  layerTitle: string;
  kind: DatasetLayerKind;
  source?: DatasetLayerSourceMeta;
  entry: DatasetLayerEntry;
}

export interface UnresolvedLayerTarget {
  readonly layerId: string;
  readonly targetId: string;
  readonly systemId: string;
}
