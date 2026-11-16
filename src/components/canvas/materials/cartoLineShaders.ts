import * as THREE from 'three';
import { CARTO_LINE_CONSTANTS } from '../../../styles/tokens/cartography';

export const DEFAULT_CARTO_LINE_COLOR = 0xffffff;
export const DEFAULT_CARTO_LINE_OPACITY = 1.0;
export const DEFAULT_CARTO_RESOLUTION_SCALE = 1000.0;

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

export function resolveDashGap(style: CartoLineStyle): { dash: number; gap: number } {
  if (style === 'dotted') return { dash: CARTO_LINE_CONSTANTS.dotSize, gap: CARTO_LINE_CONSTANTS.dotGap };
  if (style === 'dashed') return { dash: CARTO_LINE_CONSTANTS.dashSize, gap: CARTO_LINE_CONSTANTS.gapSize };
  return { dash: CARTO_LINE_CONSTANTS.dashSize, gap: 0.0 };
}

export function toCoordinateArray(points: THREE.Vector3[] | number[]): number[] {
  if (points.length === 0 || typeof points[0] === 'number') return points as number[];
  const coords: number[] = [];
  for (const p of points as THREE.Vector3[]) coords.push(p.x, p.y, p.z);
  return coords;
}

/**
 * Patches LineMaterial's fragment shader to evaluate dashes in perspective-invariant
 * screen-space pixels using gl_FragCoord.w and uResolutionScale, while maintaining
 * zero shader recompilation when toggling between solid, dashed, and dotted styles.
 */
export function patchLineMaterialFragmentShader(originalShader: string): string {
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

export const HAIRLINE_VERT = `
attribute float lineDistance;
varying float vLineDistance;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vLineDistance = lineDistance;
}
`;

export const HAIRLINE_FRAG = `
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
