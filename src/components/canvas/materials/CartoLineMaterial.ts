import * as THREE from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { CARTO_LINE_CONSTANTS } from '../../../styles/tokens/cartography';
import { NOOP_RAYCAST } from '../engineConfig';
import {
  type CartoLineStyle,
  type CartoLineMaterialParameters,
  DEFAULT_CARTO_LINE_COLOR,
  DEFAULT_CARTO_LINE_OPACITY,
  DEFAULT_CARTO_RESOLUTION_SCALE,
  resolveDashGap,
  toCoordinateArray,
  patchLineMaterialFragmentShader,
  HAIRLINE_VERT,
  HAIRLINE_FRAG,
} from './cartoLineShaders';

/**
 * Wide screen-space line material extending Three.js LineMaterial.
 */
export class CartoLineMaterial extends LineMaterial {
  private _lineStyle: CartoLineStyle;

  constructor(params: CartoLineMaterialParameters = {}) {
    const lineStyle = params.lineStyle ?? 'solid';
    const defaults = resolveDashGap(lineStyle);

    super({
      color: params.color !== undefined ? new THREE.Color(params.color as THREE.ColorRepresentation).getHex() : DEFAULT_CARTO_LINE_COLOR,
      opacity: params.opacity ?? DEFAULT_CARTO_LINE_OPACITY,
      linewidth: params.lineWidth ?? CARTO_LINE_CONSTANTS.hairlineWidth,
      dashed: true,
      dashSize: params.dashSize ?? defaults.dash,
      gapSize: params.gapSize ?? defaults.gap,
      dashOffset: params.dashOffset ?? 0,
      transparent: params.transparent ?? true,
      depthWrite: params.depthWrite ?? false,
      depthTest: params.depthTest ?? true,
    });

    this._lineStyle = lineStyle;
    this.uniforms.uResolutionScale = { value: DEFAULT_CARTO_RESOLUTION_SCALE };
    this.fragmentShader = patchLineMaterialFragmentShader(this.fragmentShader);
  }

  get lineStyle(): CartoLineStyle { return this._lineStyle; }

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
    const { dash, gap } = resolveDashGap(style);
    this.uniforms.dashSize.value = dash;
    this.uniforms.gapSize.value = gap;
  }
}

/**
 * Lightweight screen-space hairline material for standard THREE.Line / LineSegments.
 */
export class CartoHairlineMaterial extends THREE.ShaderMaterial {
  private _lineStyle: CartoLineStyle;

  constructor(params: CartoLineMaterialParameters = {}) {
    const lineStyle = params.lineStyle ?? 'solid';
    const defaults = resolveDashGap(lineStyle);
    const initialColor = params.color instanceof THREE.Color
      ? params.color.clone()
      : new THREE.Color((params.color ?? DEFAULT_CARTO_LINE_COLOR) as THREE.ColorRepresentation);

    super({
      uniforms: {
        uColor: { value: initialColor },
        uOpacity: { value: params.opacity ?? DEFAULT_CARTO_LINE_OPACITY },
        uDashSize: { value: params.dashSize ?? defaults.dash },
        uGapSize: { value: params.gapSize ?? defaults.gap },
        uDashOffset: { value: params.dashOffset ?? 0.0 },
        uResolutionScale: { value: DEFAULT_CARTO_RESOLUTION_SCALE },
      },
      vertexShader: HAIRLINE_VERT,
      fragmentShader: HAIRLINE_FRAG,
      transparent: params.transparent ?? true,
      depthWrite: params.depthWrite ?? false,
      depthTest: params.depthTest ?? true,
    });

    this._lineStyle = lineStyle;
  }

  get lineStyle(): CartoLineStyle { return this._lineStyle; }

  updateResolution(camera: THREE.Camera, widthOrHeight: number, height?: number): void {
    const actualHeight = height ?? widthOrHeight;
    const proj11 = camera.projectionMatrix.elements[5];
    this.uniforms.uResolutionScale.value = proj11 * (actualHeight * 0.5);
  }

  get color(): THREE.Color { return this.uniforms.uColor.value; }

  override set opacity(value: number) {
    super.opacity = value;
    if (this.uniforms?.uOpacity) this.uniforms.uOpacity.value = value;
  }

  override get opacity(): number { return this.uniforms?.uOpacity?.value ?? super.opacity; }

  setColor(color: THREE.Color | string | number): void {
    if (color instanceof THREE.Color) this.uniforms.uColor.value.copy(color);
    else this.uniforms.uColor.value.set(color as THREE.ColorRepresentation);
  }

  setOpacity(opacity: number): void { this.uniforms.uOpacity.value = opacity; }

  setLineWidth(_width: number): void { /* Hairlines are 1px in WebGL */ }

  setPattern(dashSize: number, gapSize: number, dashOffset = 0.0): void {
    this.uniforms.uDashSize.value = dashSize;
    this.uniforms.uGapSize.value = gapSize;
    this.uniforms.uDashOffset.value = dashOffset;
  }

  setStyle(style: CartoLineStyle): void {
    this._lineStyle = style;
    const { dash, gap } = resolveDashGap(style);
    this.uniforms.uDashSize.value = dash;
    this.uniforms.uGapSize.value = gap;
  }
}

/**
 * Creates a LineGeometry populated with positions and computed distances.
 */
export function createCartoLineGeometry(points: THREE.Vector3[] | number[]): LineGeometry {
  const geom = new LineGeometry();
  geom.setPositions(toCoordinateArray(points));
  return geom;
}

/**
 * Creates a LineSegmentsGeometry populated with positions and computed distances.
 */
export function createCartoLineSegmentsGeometry(segments: THREE.Vector3[] | number[]): LineSegmentsGeometry {
  const geom = new LineSegmentsGeometry();
  geom.setPositions(toCoordinateArray(segments));
  return geom;
}

/**
 * Creates an appropriate Line mesh (Line2 or THREE.Line).
 */
export function createCartoLineMesh(
  points: THREE.Vector3[] | number[],
  params: CartoLineMaterialParameters = {},
): Line2 | THREE.Line {
  const width = params.lineWidth ?? CARTO_LINE_CONSTANTS.hairlineWidth;
  if (width > 1.0) {
    const mesh = new Line2(createCartoLineGeometry(points), new CartoLineMaterial(params));
    mesh.raycast = NOOP_RAYCAST;
    mesh.computeLineDistances();
    return mesh;
  }

  const rawCoords = toCoordinateArray(points);
  const bufGeom = new THREE.BufferGeometry();
  bufGeom.setAttribute('position', new THREE.Float32BufferAttribute(rawCoords, 3));

  const distances: number[] = [0];
  let acc = 0;
  for (let i = 3; i < rawCoords.length; i += 3) {
    acc += Math.hypot(rawCoords[i] - rawCoords[i - 3], rawCoords[i + 1] - rawCoords[i - 2], rawCoords[i + 2] - rawCoords[i - 1]);
    distances.push(acc);
  }
  bufGeom.setAttribute('lineDistance', new THREE.Float32BufferAttribute(distances, 1));
  return new THREE.Line(bufGeom, new CartoHairlineMaterial(params));
}

/**
 * Creates an appropriate LineSegments mesh (LineSegments2 or THREE.LineSegments).
 */
export function createCartoLineSegmentsMesh(
  segments: THREE.Vector3[] | number[],
  params: CartoLineMaterialParameters = {},
): LineSegments2 | THREE.LineSegments {
  const width = params.lineWidth ?? CARTO_LINE_CONSTANTS.hairlineWidth;
  if (width > 1.0) {
    const mesh = new LineSegments2(createCartoLineSegmentsGeometry(segments), new CartoLineMaterial(params));
    mesh.computeLineDistances();
    return mesh;
  }

  const rawCoords = toCoordinateArray(segments);
  const bufGeom = new THREE.BufferGeometry();
  bufGeom.setAttribute('position', new THREE.Float32BufferAttribute(rawCoords, 3));

  const distances: number[] = [];
  for (let i = 0; i < rawCoords.length; i += 6) {
    const len = Math.hypot(rawCoords[i + 3] - rawCoords[i], rawCoords[i + 4] - rawCoords[i + 1], rawCoords[i + 5] - rawCoords[i + 2]);
    distances.push(0, len);
  }
  bufGeom.setAttribute('lineDistance', new THREE.Float32BufferAttribute(distances, 1));
  return new THREE.LineSegments(bufGeom, new CartoHairlineMaterial(params));
}
