import type { SystemSummaryNode } from './astro';

/**
 * 3D Cartesian coordinates tuple [x, y, z] in parsecs.
 */
export type CartesianTuple = [x: number, y: number, z: number];

/**
 * 3D Cartesian coordinate point.
 */
export interface CartesianCoordinates {
  x: number;
  y: number;
  z: number;
}

/**
 * Astronomical Equatorial coordinate system definition.
 */
export interface EquatorialCoordinates {
  /** Right Ascension in decimal hours [0, 24) */
  ra: number;
  /** Declination in decimal degrees [-90, +90] */
  dec: number;
  /** Distance from origin in parsecs */
  dist: number;
}

/**
 * Orbital plane parameters defining an orientation in 3D space.
 */
export interface OrbitalPlaneOrientation {
  /** Inclination angle in radians (tilt relative to reference plane) */
  inclination: number;
  /** Longitude of the ascending node in radians (orientation of tilt axis) */
  ascendingNode: number;
}

/**
 * Flat interleaved TypedArray buffer representing bulk 3D coordinates:
 * [x0, y0, z0, x1, y1, z1, ..., xN, yN, zN]
 * Length is always 3 * N.
 */
export type BulkCoordinateBuffer = Float32Array;

/**
 * Bounded spatial partition manifest for a single sector.
 */
export interface SectorPartitionManifest {
  sectorId: string;
  bounds: {
    min: CartesianCoordinates;
    max: CartesianCoordinates;
  };
  count: number;
  systems: SystemSummaryNode[];
}

/**
 * Header metadata for formal catalog files.
 */
export interface CatalogManifestHeader {
  catalogId: string;
  name: string;
  description: string;
  epoch: string;
  count: number;
  timestamp: string;
}
