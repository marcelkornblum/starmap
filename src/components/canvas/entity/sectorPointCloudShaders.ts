import * as THREE from 'three';

export const STARFIELD_VERTEX_SHADER = /* glsl */ `
  uniform float uPointSize;
  uniform float uActivePointSize;
  uniform float uBaseOpacity;
  uniform vec3 uFocusCenter;
  uniform float uApertureRadius;
  uniform vec3 uCameraPos;
  uniform float uHorizonRadius;

  varying float vAlpha;
  varying float vLuminance;

  void main() {
    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    float distFromOrigin = distance(worldPos, uFocusCenter);

    if (distFromOrigin > uHorizonRadius) {
      vAlpha = 0.0;
      vLuminance = 0.0;
      gl_PointSize = 0.0;
      gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
      return;
    }

    bool isInsideAperture = distFromOrigin <= uApertureRadius;
    float outerSpan = max(uHorizonRadius - uApertureRadius, 1.0);
    float outerT = clamp((distFromOrigin - uApertureRadius) / outerSpan, 0.0, 1.0);
    float radialFalloff = isInsideAperture ? 1.0 : mix(0.88, 0.45, outerT);

    vLuminance = isInsideAperture ? 1.0 : mix(0.75, 1.0, radialFalloff);

    vec3 camToOrigin = uFocusCenter - uCameraPos;
    float camDist = length(camToOrigin);
    vec3 viewDir = camToOrigin / max(camDist, 0.001);
    vec3 camToStar = worldPos - uCameraPos;
    float alongRay = dot(camToStar, viewDir);
    float perpDist = length(camToStar - viewDir * alongRay);

    float corridorRadius = max(uApertureRadius * 1.4, 5.0);
    float inCorridor = 1.0 - smoothstep(uApertureRadius * 0.8, corridorRadius, perpDist);
    float inFront = 1.0 - smoothstep(max(camDist - uApertureRadius * 1.1, 0.0), camDist, alongRay);
    float fgMask = step(uApertureRadius, distFromOrigin) * step(0.0, alongRay) * inCorridor * inFront;
    float fgFactor = mix(1.0, 0.55, fgMask);

    vAlpha = isInsideAperture ? 1.0 : (uBaseOpacity * radialFalloff * fgFactor);
    gl_PointSize = isInsideAperture ? uActivePointSize : uPointSize;
    gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
  }
`;

export const STARFIELD_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;

  varying float vAlpha;
  varying float vLuminance;

  void main() {
    if (vAlpha <= 0.001) {
      discard;
    }
    float r = length(gl_PointCoord - vec2(0.5));
    if (r > 0.5) {
      discard;
    }
    float disc = smoothstep(0.5, 0.15, r);
    gl_FragColor = vec4(uColor * vLuminance, vAlpha * disc);
  }
`;

/** Default instrument aperture radius (pc) the starfield material is created with. */
export const STARFIELD_DEFAULT_APERTURE_RADIUS = 15.0;

/** Horizon radius expressed as a multiple of the live aperture radius, so the cull sphere scales with zoom. */
export const STARFIELD_HORIZON_APERTURE_RATIO = 2.4;

/** Full point size (px) for stars inside the active instrument aperture. */
export const STARFIELD_ACTIVE_POINT_SIZE = 5.0;

/** Passive point size (px) for stars outside the active instrument aperture. */
export const STARFIELD_PASSIVE_POINT_SIZE = 3.2;

/**
 * Horizon radius (pc) beyond which stars are culled. Tied to the live aperture radius so the
 * fall-off window stays constant relative to the instrument and camera rather than world coordinates.
 */
export function computeStarfieldHorizonRadius(apertureRadius: number): number {
  const safeAperture =
    Number.isFinite(apertureRadius) && apertureRadius > 0
      ? apertureRadius
      : STARFIELD_DEFAULT_APERTURE_RADIUS;
  return safeAperture * STARFIELD_HORIZON_APERTURE_RATIO;
}

export interface StarfieldPointsUniforms {
  [uniform: string]: THREE.IUniform;
  uColor: THREE.IUniform<THREE.Color>;
  uPointSize: THREE.IUniform<number>;
  uActivePointSize: THREE.IUniform<number>;
  uBaseOpacity: THREE.IUniform<number>;
  uFocusCenter: THREE.IUniform<THREE.Vector3>;
  uApertureRadius: THREE.IUniform<number>;
  uCameraPos: THREE.IUniform<THREE.Vector3>;
  uHorizonRadius: THREE.IUniform<number>;
}

export class StarfieldPointsMaterial extends THREE.ShaderMaterial {
  declare uniforms: StarfieldPointsUniforms;
}

export function createStarfieldPointsMaterial(
  pointSize: number = STARFIELD_PASSIVE_POINT_SIZE,
  pointOpacity: number = 0.9,
  activePointSize: number = STARFIELD_ACTIVE_POINT_SIZE,
): StarfieldPointsMaterial {
  const uniforms: StarfieldPointsUniforms = {
    uColor: { value: new THREE.Color(0xffffff) },
    uPointSize: { value: pointSize },
    uActivePointSize: { value: activePointSize },
    uBaseOpacity: { value: pointOpacity },
    uFocusCenter: { value: new THREE.Vector3(0, 0, 0) },
    uApertureRadius: { value: STARFIELD_DEFAULT_APERTURE_RADIUS },
    uCameraPos: { value: new THREE.Vector3(0, -35, 20) },
    uHorizonRadius: { value: computeStarfieldHorizonRadius(STARFIELD_DEFAULT_APERTURE_RADIUS) },
  };
  return new StarfieldPointsMaterial({
    uniforms,
    vertexShader: STARFIELD_VERTEX_SHADER,
    fragmentShader: STARFIELD_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
  });
}
