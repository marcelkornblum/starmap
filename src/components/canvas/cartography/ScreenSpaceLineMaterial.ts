import * as THREE from 'three';

/**
 * Screen-space line constants guaranteeing visual consistency across all
 * cartographic elements (orbits, drop stalks, bearing lines).
 * Measured in CSS screen pixels.
 */
export const SCREEN_SPACE_LINE_CONSTANTS = {
  /** Screen-space dash length in pixels */
  dashSize: 8.0,
  /** Screen-space gap length in pixels */
  gapSize: 5.0,
  /** Screen-space dot length in pixels for stipple dotted lines */
  dotSize: 2.0,
  /** Screen-space gap length in pixels for stipple dotted lines */
  dotGap: 4.0,
};

export const SCREEN_SPACE_LINE_VERT = `
attribute float lineDistance;
varying float vLineDistance;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vLineDistance = lineDistance;
}
`;

export const SCREEN_SPACE_LINE_FRAG = `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uDashSize;
uniform float uGapSize;
uniform float uResolutionScale;

varying float vLineDistance;

void main() {
  float cycle = uDashSize + uGapSize;
  if (uGapSize > 0.0 && cycle > 0.0) {
    // Exact perspective-invariant distance in CSS screen pixels:
    // vLineDistance is in world units; gl_FragCoord.w is 1/Z_camera;
    // uResolutionScale is cot(fov/2) * (viewportHeight / 2).
    float screenDist = vLineDistance * gl_FragCoord.w * uResolutionScale;
    if (mod(screenDist, cycle) > uDashSize) {
      discard;
    }
  }
  gl_FragColor = vec4(uColor, uOpacity);
}
`;

export interface ScreenSpaceLineMaterialParameters {
  color?: THREE.Color | string;
  opacity?: number;
  dashSize?: number;
  gapSize?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  transparent?: boolean;
  depthWrite?: boolean;
}

/**
 * Custom Three.js ShaderMaterial rendering screen-space invariant dashed, dotted,
 * or solid lines. Dashes maintain constant pixel footprint on screen and do not scale
 * with perspective or camera distance.
 */
export class ScreenSpaceLineMaterial extends THREE.ShaderMaterial {
  constructor(params: ScreenSpaceLineMaterialParameters = {}) {
    const isDotted = params.lineStyle === 'dotted';
    const isDashed =
      params.lineStyle === 'dashed' ||
      (!params.lineStyle && (params.dashSize !== undefined || params.gapSize !== undefined));

    const defaultDash = isDotted
      ? SCREEN_SPACE_LINE_CONSTANTS.dotSize
      : SCREEN_SPACE_LINE_CONSTANTS.dashSize;
    const defaultGap = isDotted
      ? SCREEN_SPACE_LINE_CONSTANTS.dotGap
      : isDashed
        ? SCREEN_SPACE_LINE_CONSTANTS.gapSize
        : 0.0;

    const initialColor =
      params.color instanceof THREE.Color
        ? params.color.clone()
        : new THREE.Color(params.color ?? '#ffffff');

    super({
      uniforms: {
        uColor: { value: initialColor },
        uOpacity: { value: params.opacity ?? 1.0 },
        uDashSize: { value: params.dashSize ?? defaultDash },
        uGapSize: { value: params.gapSize ?? defaultGap },
        uResolutionScale: { value: 1000.0 },
      },
      vertexShader: SCREEN_SPACE_LINE_VERT,
      fragmentShader: SCREEN_SPACE_LINE_FRAG,
      transparent: params.transparent ?? true,
      depthWrite: params.depthWrite ?? false,
    });
  }

  updateResolution(camera: THREE.Camera, height: number): void {
    const proj11 = camera.projectionMatrix.elements[5];
    this.uniforms.uResolutionScale.value = proj11 * (height * 0.5);
  }

  setColor(color: THREE.Color | string): void {
    if (color instanceof THREE.Color) {
      this.uniforms.uColor.value.copy(color);
    } else {
      this.uniforms.uColor.value.set(color);
    }
  }

  setOpacity(opacity: number): void {
    this.uniforms.uOpacity.value = opacity;
  }

  setPattern(dashSize: number, gapSize: number): void {
    this.uniforms.uDashSize.value = dashSize;
    this.uniforms.uGapSize.value = gapSize;
  }
}
