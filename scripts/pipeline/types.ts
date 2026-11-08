import type {
  CatalogManifestHeader,
  SystemManifest,
  SystemSummaryNode,
} from '../../src/types/astro';

export interface HygCrossMatch {
  id: number;
  hip?: number | null;
  hd?: number | null;
  hr?: number | null;
  gl?: string;
  bf?: string;
  proper?: string;
  bayer?: string;
  flam?: number;
  con?: string;
  comp?: number;
  compPrimary?: number;
  base?: string;
  spect?: string;
  ci?: number;
  lum?: number;
  ra?: number;
  dec?: number;
  dist?: number;
  mag?: number;
  absmag?: number;
  pmra?: number;
  pmdec?: number;
  rv?: number;
  raDegJ2016?: number;
  decDegJ2016?: number;
}

export interface BuildPipelineOptions {
  catalogsDir?: string;
  partitionsDir?: string;
  systemsDir?: string;
  overlaysDir?: string;
  solDir?: string;
  summariesDir?: string;
  detailsDir?: string;
  searchDir?: string;
  compactFormat?: boolean;
  exoplanetsCsvPath?: string;
  maxPartitionDistancePc?: number;
}

export interface PipelineSummary {
  totalStars: number;
  totalRows?: number;
  validStars: number;
  skippedRows: number;
  outputPath: string;
  kinematicCount: number;
  totalKinematics?: number;
  localVolume10pcCount?: number;
  local10pcCount?: number;
  referenceBrightCount?: number;
  sectorPartitionCount?: number;
  exoplanetSystemCount?: number;
  totalExoplanets?: number;
  totalExoplanetsAttached?: number;
  galacticStructuresCount?: number;
  solarSystemBodiesCount?: number;
}

export interface CatalogPayload {
  header: CatalogManifestHeader;
  systems: SystemSummaryNode[];
}

export interface ConsolidateMultiStarSystemsParams {
  cataloguedSummaries?: SystemSummaryNode[];
  sectorMap?: Map<string, SystemSummaryNode[]>;
  sectorManifestsMap?: Map<string, SystemManifest[]>;
  allSystemManifests?: SystemManifest[];
  local10pcSystems?: SystemSummaryNode[];
  referenceBrightSystems?: SystemSummaryNode[];
  exoplanetHostSummaries?: SystemSummaryNode[];
  starAliasesById?: Map<string, string[]>;
}
