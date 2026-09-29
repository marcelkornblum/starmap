/**
 * Core representation of an astronomical node (star, stellar remnant, or celestial object)
 * designed for consumption by 2D atlas views and 3D WebGL visualizations.
 */
export interface StarmapNode {
  /** Unique catalog identifier (typically HYG database id) */
  id: number;
  /** Primary display name (proper name if available, else catalog identifier) */
  name: string;
  /** Proper common name (e.g., 'Sirius', 'Sol', 'Vega'), if known */
  properName?: string;
  /** Hipparcos catalog number */
  hip?: number | null;
  /** Henry Draper catalog number */
  hd?: number | null;
  /** Harvard Revised / Bright Star catalog number */
  hr?: number | null;
  /** Gliese catalog identifier */
  gl?: string | null;
  /** Bayer designation (e.g., 'Alp', 'Bet') */
  bayer?: string | null;
  /** Flamsteed number */
  flam?: number | null;
  /** Standard 3-letter IAU constellation abbreviation (e.g., 'Ori', 'CMa') */
  con?: string | null;
  /** Right Ascension in decimal hours [0, 24) */
  ra: number;
  /** Declination in decimal degrees [-90, +90] */
  dec: number;
  /** Distance from Sol in parsecs */
  dist: number;
  /** Apparent visual magnitude (lower/negative = brighter) */
  mag: number;
  /** Absolute visual magnitude (intrinsic brightness at 10 parsecs) */
  absmag: number;
  /** Morgan-Keenan spectral classification (e.g., 'G2V', 'A1V', 'M5.5Ve') */
  spect?: string;
  /** Color index (B-V photometric index) */
  ci?: number | null;
  /** Cartesian X coordinate in parsecs (Equatorial frame, epoch J2000) */
  x: number;
  /** Cartesian Y coordinate in parsecs (Equatorial frame, epoch J2000) */
  y: number;
  /** Cartesian Z coordinate in parsecs (Equatorial frame, epoch J2000) */
  z: number;
  /** Luminosity relative to the Sun (L☉) */
  lum?: number;
}

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
