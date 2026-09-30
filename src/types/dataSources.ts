/**
 * Declarative specification and metadata schema for all astronomical data sources
 * ingested by the Starmap data pipeline.
 */

export type AstronomicalDataLayer =
  | 'stellar-neighborhood'
  | 'exoplanetary-systems'
  | 'galactic-structures'
  | 'solar-system-bodies';

export type SourceDataFormat = 'csv' | 'json' | 'tsv' | 'declarative-seed';

/**
 * Declares a specific scientific contribution or domain of attributes
 * that a source provides to the unified catalog.
 */
export interface DataSourceContribution {
  /** Domain area (e.g. 'astrometry', 'kinematics', 'orbital-elements', 'physical-properties') */
  domain: string;
  /** Specific attribute keys contributed */
  fields: string[];
  /** Detailed human-readable description of the contribution */
  description: string;
}

/**
 * Declarative definition of an authoritative astronomical data source.
 */
export interface DataSourceDefinition {
  /** Unique machine-readable identifier (e.g., 'stellar-neighborhood-hyg') */
  id: string;
  /** Formal human-readable name of the catalog or dataset */
  name: string;
  /** Target architectural layer this source supplies */
  layer: AstronomicalDataLayer;
  /** Publishing scientific authority or maintaining organization */
  authority: string;
  /** Detailed summary of what this dataset provides */
  description: string;
  /** Scientific paper, DOI, or official citation */
  citation?: string;
  /** Data license or terms of use */
  license?: string;
  /** Serialization format of the raw source file */
  format: SourceDataFormat;
  /** Primary remote download URL */
  remoteUrl?: string;
  /** Secondary or mirror remote download URL */
  fallbackUrl?: string;
  /** Local cache path relative to project root (e.g., 'data/raw/exoplanets.csv') */
  localCachePath: string;
  /** Ingestion integration lifecycle status */
  status: 'integrated' | 'staged' | 'planned';
  /** Whether this source is actively executed in the build pipeline */
  enabled: boolean;
  /** Estimated size of dataset in memory or on disk */
  sizeEstimate?: string;
  /** Frequency at which upstream authority updates this dataset */
  updateFrequency?: string;
  /** Declarative list of scientific contributions provided by this source */
  contributions: DataSourceContribution[];
  /** Expected target artifact paths emitted into public/data/ */
  targetArtifacts: string[];
}

/**
 * Top-level declarative registry of all data sources in the Starmap pipeline.
 */
export interface DataSourceRegistry {
  /** Registry schema version */
  version: string;
  /** Timestamp of last registry schema review */
  updatedAt: string;
  /** List of all defined astronomical data sources */
  sources: DataSourceDefinition[];
}
