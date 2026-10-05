import * as THREE from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';

/**
 * Standard cartographic screen-space line dimensions in CSS screen pixels.
 */
export const CARTO_LINE_CONSTANTS = {
  /** Screen-space dash length in pixels */
  dashSize: 14.0,
  /** Screen-space gap length in pixels */
  gapSize: 8.0,
  /** Screen-space dot length in pixels for stipple dotted lines */
  dotSize: 2.0,
  /** Screen-space gap length in pixels for stipple dotted lines */
  dotGap: 4.0,
  /** Baseline hairline width */
  hairlineWidth: 1.0,
} as const;

export type CartoLineStyle = 'solid' | 'dashed' | 'dotted';

export interface CartoLineMaterialParameters {
  color?: THREE.Color | string | number;
  opacity?: number;
  lineWidth?: number;
  lineStyle?: CartoLineStyle;
  dashSize?: number;
  gapSize?: number;
  dashOffset?: number;
  transparent?: boolean;
  depthWrite?: boolean;
  depthTest?: boolean;
}

/**
 * Patches LineMaterial's fragment shader to evaluate dashes in perspective-invariant
 * screen-space pixels using gl_FragCoord.w and uResolutionScale, while maintaining
 * zero shader recompilation when toggling between solid, dashed, and dotted styles.
 */
function patchLineMaterialFragmentShader(originalShader: string): string {
  let frag = originalShader;

  // Add uResolutionScale uniform if not present
  if (!frag.includes('uniform float uResolutionScale;')) {
    frag = frag.replace(
      'uniform float gapSize;',
      'uniform float gapSize;\n\t\t\tuniform float uResolutionScale;',
    );
  }

  // Replace world-space dash calculation with perspective-invariant screen pixel distance
  const targetPattern =
    'if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX';
  const replacement = `if ( gapSize > 0.0 && ( dashSize + gapSize ) > 0.0 ) {
\t\t\t\t\tif ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard;
\t\t\t\t\tfloat screenDist = vLineDistance * gl_FragCoord.w * uResolutionScale;
\t\t\t\t\tif ( mod( screenDist + dashOffset, dashSize + gapSize ) > dashSize ) discard;
\t\t\t\t}`;

  if (frag.includes(targetPattern)) {
    // Also remove the standalone endcap discard right above it to avoid double-discard
    const endcapPattern = 'if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps\n\n\t\t\t\t';
    if (frag.includes(endcapPattern + targetPattern)) {
      frag = frag.replace(endcapPattern + targetPattern, replacement);
    } else {
      frag = frag.replace(targetPattern, replacement);
    }
  }

  return frag;
}

/**
 * Wide screen-space line material extending Three.js LineMaterial.
 * Supports arbitrary line widths (in CSS screen pixels) and perspective-invariant
 * solid, dashed, and dotted styles with in-place uniform mutation.
 */
export class CartoLineMaterial extends LineMaterial {
  private _lineStyle: CartoLineStyle;

  constructor(params: CartoLineMaterialParameters = {}) {
    const lineStyle = params.lineStyle ?? 'solid';
    const isDotted = lineStyle === 'dotted';
    const isDashed = lineStyle === 'dashed';

    const defaultDash = isDotted
      ? CARTO_LINE_CONSTANTS.dotSize
      : CARTO_LINE_CONSTANTS.dashSize;
    const defaultGap = isDotted
      ? CARTO_LINE_CONSTANTS.dotGap
      : isDashed
        ? CARTO_LINE_CONSTANTS.gapSize
        : 0.0;

    super({
      color: params.color !== undefined ? new THREE.Color(params.color as THREE.ColorRepresentation).getHex() : 0xffffff,
      opacity: params.opacity ?? 1.0,
      linewidth: params.lineWidth ?? CARTO_LINE_CONSTANTS.hairlineWidth,
      dashed: true, // Always compile USE_DASH so style toggles avoid recompilation
      dashSize: params.dashSize ?? defaultDash,
      gapSize: params.gapSize ?? defaultGap,
      dashOffset: params.dashOffset ?? 0,
      transparent: params.transparent ?? true,
      depthWrite: params.depthWrite ?? false,
      depthTest: params.depthTest ?? true,
    });

    this._lineStyle = lineStyle;
    this.uniforms.uResolutionScale = { value: 1000.0 };
    this.fragmentShader = patchLineMaterialFragmentShader(this.fragmentShader);
  }

  get lineStyle(): CartoLineStyle {
    return this._lineStyle;
  }

  updateResolution(camera: THREE.Camera, widthOrHeight: number, height?: number): void {
    const actualHeight = height ?? widthOrHeight;
    const actualWidth = height !== undefined ? widthOrHeight : actualHeight;
    this.uniforms.resolution.value.set(actualWidth, actualHeight);
    const proj11 = camera.projectionMatrix.elements[5];
    this.uniforms.uResolutionScale.value = proj11 * (actualHeight * 0.5);
  }

  setColor(color: THREE.Color | string | number): void {
    if (color instanceof THREE.Color) {
      this.color.copy(color);
      this.uniforms.diffuse.value.copy(color);
    } else {
      this.color.set(color as THREE.ColorRepresentation);
      this.uniforms.diffuse.value.set(color as THREE.ColorRepresentation);
    }
  }

  setOpacity(opacity: number): void {
    this.opacity = opacity;
    this.uniforms.opacity.value = opacity;
  }

  setLineWidth(width: number): void {
    this.linewidth = width;
    this.uniforms.linewidth.value = width;
  }

  setPattern(dashSize: number, gapSize: number, dashOffset = 0): void {
    this.uniforms.dashSize.value = dashSize;
    this.uniforms.gapSize.value = gapSize;
    this.uniforms.dashOffset.value = dashOffset;
  }

  setStyle(style: CartoLineStyle): void {
    this._lineStyle = style;
    if (style === 'solid') {
      this.uniforms.gapSize.value = 0.0;
    } else if (style === 'dashed') {
      this.uniforms.dashSize.value = CARTO_LINE_CONSTANTS.dashSize;
      this.uniforms.gapSize.value = CARTO_LINE_CONSTANTS.gapSize;
    } else if (style === 'dotted') {
      this.uniforms.dashSize.value = CARTO_LINE_CONSTANTS.dotSize;
      this.uniforms.gapSize.value = CARTO_LINE_CONSTANTS.dotGap;
    }
  }
}

const HAIRLINE_VERT = `
attribute float lineDistance;
varying float vLineDistance;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vLineDistance = lineDistance;
}
`;

const HAIRLINE_FRAG = `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uDashSize;
uniform float uGapSize;
uniform float uDashOffset;
uniform float uResolutionScale;

varying float vLineDistance;

void main() {
  float cycle = uDashSize + uGapSize;
  if (uGapSize > 0.0 && cycle > 0.0) {
    float screenDist = vLineDistance * gl_FragCoord.w * uResolutionScale;
    if (mod(screenDist + uDashOffset, cycle) > uDashSize) {
      discard;
    }
  }
  gl_FragColor = vec4(uColor, uOpacity);
}
`;

/**
 * Lightweight screen-space hairline material for standard THREE.Line / LineSegments.
 * Ideal for high-density 1px lines (graticules, degree ticks, elevation stalks).
 */
export class CartoHairlineMaterial extends THREE.ShaderMaterial {
  private _lineStyle: CartoLineStyle;

  constructor(params: CartoLineMaterialParameters = {}) {
    const lineStyle = params.lineStyle ?? 'solid';
    const isDotted = lineStyle === 'dotted';
    const isDashed = lineStyle === 'dashed';

    const defaultDash = isDotted
      ? CARTO_LINE_CONSTANTS.dotSize
      : CARTO_LINE_CONSTANTS.dashSize;
    const defaultGap = isDotted
      ? CARTO_LINE_CONSTANTS.dotGap
      : isDashed
        ? CARTO_LINE_CONSTANTS.gapSize
        : 0.0;

    const initialColor =
      params.color instanceof THREE.Color
        ? params.color.clone()
        : new THREE.Color((params.color ?? 0xffffff) as THREE.ColorRepresentation);

    super({
      uniforms: {
        uColor: { value: initialColor },
        uOpacity: { value: params.opacity ?? 1.0 },
        uDashSize: { value: params.dashSize ?? defaultDash },
        uGapSize: { value: params.gapSize ?? defaultGap },
        uDashOffset: { value: params.dashOffset ?? 0.0 },
        uResolutionScale: { value: 1000.0 },
      },
      vertexShader: HAIRLINE_VERT,
      fragmentShader: HAIRLINE_FRAG,
      transparent: params.transparent ?? true,
      depthWrite: params.depthWrite ?? false,
      depthTest: params.depthTest ?? true,
    });

    this._lineStyle = lineStyle;
  }

  get lineStyle(): CartoLineStyle {
    return this._lineStyle;
  }

  updateResolution(camera: THREE.Camera, widthOrHeight: number, height?: number): void {
    const actualHeight = height ?? widthOrHeight;
    const proj11 = camera.projectionMatrix.elements[5];
    this.uniforms.uResolutionScale.value = proj11 * (actualHeight * 0.5);
  }

  setColor(color: THREE.Color | string | number): void {
    if (color instanceof THREE.Color) {
      this.uniforms.uColor.value.copy(color);
    } else {
      this.uniforms.uColor.value.set(color as THREE.ColorRepresentation);
    }
  }

  setOpacity(opacity: number): void {
    this.uniforms.uOpacity.value = opacity;
  }

  setLineWidth(_width: number): void {
    // Hairline lines are strictly 1px in WebGL gl.LINES
  }

  setPattern(dashSize: number, gapSize: number, dashOffset = 0.0): void {
    this.uniforms.uDashSize.value = dashSize;
    this.uniforms.uGapSize.value = gapSize;
    this.uniforms.uDashOffset.value = dashOffset;
  }

  setStyle(style: CartoLineStyle): void {
    this._lineStyle = style;
    if (style === 'solid') {
      this.uniforms.uGapSize.value = 0.0;
    } else if (style === 'dashed') {
      this.uniforms.uDashSize.value = CARTO_LINE_CONSTANTS.dashSize;
      this.uniforms.uGapSize.value = CARTO_LINE_CONSTANTS.gapSize;
    } else if (style === 'dotted') {
      this.uniforms.uDashSize.value = CARTO_LINE_CONSTANTS.dotSize;
      this.uniforms.uGapSize.value = CARTO_LINE_CONSTANTS.dotGap;
    }
  }
}

/**
 * Creates a LineGeometry populated with positions and computed distances.
 */
export function createCartoLineGeometry(
  points: THREE.Vector3[] | number[],
): LineGeometry {
  const geom = new LineGeometry();
  if (points.length > 0 && typeof points[0] === 'number') {
    geom.setPositions(points as number[]);
  } else {
    const coords: number[] = [];
    for (const p of points as THREE.Vector3[]) {
      coords.push(p.x, p.y, p.z);
    }
    geom.setPositions(coords);
  }
  return geom;
}

/**
 * Creates a LineSegmentsGeometry populated with positions and computed distances.
 */
export function createCartoLineSegmentsGeometry(
  segments: THREE.Vector3[] | number[],
): LineSegmentsGeometry {
  const geom = new LineSegmentsGeometry();
  if (segments.length > 0 && typeof segments[0] === 'number') {
    geom.setPositions(segments as number[]);
  } else {
    const coords: number[] = [];
    for (const p of segments as THREE.Vector3[]) {
      coords.push(p.x, p.y, p.z);
    }
    geom.setPositions(coords);
  }
  return geom;
}

/**
 * Creates an appropriate Line mesh:
 * Returns `Line2` with `CartoLineMaterial` if lineWidth > 1, or `THREE.Line` with `CartoHairlineMaterial` if lineWidth === 1.
 */
export function createCartoLineMesh(
  points: THREE.Vector3[] | number[],
  params: CartoLineMaterialParameters = {},
): Line2 | THREE.Line {
  const width = params.lineWidth ?? CARTO_LINE_CONSTANTS.hairlineWidth;
  if (width > 1.0) {
    const geom = createCartoLineGeometry(points);
    const mat = new CartoLineMaterial(params);
    const mesh = new Line2(geom, mat);
    mesh.computeLineDistances();
    return mesh;
  }

  const bufGeom = new THREE.BufferGeometry();
  const rawCoords =
    points.length > 0 && typeof points[0] === 'number'
      ? (points as number[])
      : (points as THREE.Vector3[]).flatMap((p) => [p.x, p.y, p.z]);

  bufGeom.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(rawCoords, 3),
  );

  // Compute Euclidean lineDistance attribute
  const distances: number[] = [0];
  let acc = 0;
  for (let i = 3; i < rawCoords.length; i += 3) {
    const dx = rawCoords[i] - rawCoords[i - 3];
    const dy = rawCoords[i + 1] - rawCoords[i - 2];
    const dz = rawCoords[i + 2] - rawCoords[i - 1];
    acc += Math.sqrt(dx * dx + dy * dy + dz * dz);
    distances.push(acc);
  }
  bufGeom.setAttribute(
    'lineDistance',
    new THREE.Float32BufferAttribute(distances, 1),
  );

  const mat = new CartoHairlineMaterial(params);
  return new THREE.Line(bufGeom, mat);
}

/**
 * Creates an appropriate LineSegments mesh:
 * Returns `LineSegments2` with `CartoLineMaterial` if lineWidth > 1, or `THREE.LineSegments` with `CartoHairlineMaterial` if lineWidth === 1.
 */
export function createCartoLineSegmentsMesh(
  segments: THREE.Vector3[] | number[],
  params: CartoLineMaterialParameters = {},
): LineSegments2 | THREE.LineSegments {
  const width = params.lineWidth ?? CARTO_LINE_CONSTANTS.hairlineWidth;
  if (width > 1.0) {
    const geom = createCartoLineSegmentsGeometry(segments);
    const mat = new CartoLineMaterial(params);
    const mesh = new LineSegments2(geom, mat);
    mesh.computeLineDistances();
    return mesh;
  }

  const bufGeom = new THREE.BufferGeometry();
  const rawCoords =
    segments.length > 0 && typeof segments[0] === 'number'
      ? (segments as number[])
      : (segments as THREE.Vector3[]).flatMap((p) => [p.x, p.y, p.z]);

  bufGeom.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(rawCoords, 3),
  );

  const distances: number[] = [];
  for (let i = 0; i < rawCoords.length; i += 6) {
    const dx = rawCoords[i + 3] - rawCoords[i];
    const dy = rawCoords[i + 4] - rawCoords[i + 1];
    const dz = rawCoords[i + 5] - rawCoords[i + 2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    distances.push(0, len);
  }
  bufGeom.setAttribute(
    'lineDistance',
    new THREE.Float32BufferAttribute(distances, 1),
  );

  const mat = new CartoHairlineMaterial(params);
  return new THREE.LineSegments(bufGeom, mat);
}
