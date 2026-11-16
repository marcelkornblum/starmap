import { describe, it, expect } from 'vitest';
import {
  patchLineMaterialFragmentShader,
  HAIRLINE_VERT,
  HAIRLINE_FRAG,
  DEFAULT_CARTO_LINE_COLOR,
  DEFAULT_CARTO_LINE_OPACITY,
  DEFAULT_CARTO_RESOLUTION_SCALE,
} from './cartoLineShaders';

describe('cartoLineShaders', () => {
  it('defines default uniform constants', () => {
    expect(DEFAULT_CARTO_LINE_COLOR).toBe(0xffffff);
    expect(DEFAULT_CARTO_LINE_OPACITY).toBe(1.0);
    expect(DEFAULT_CARTO_RESOLUTION_SCALE).toBe(1000.0);
  });

  it('contains expected tokens in hairline shaders', () => {
    expect(HAIRLINE_VERT).toContain('attribute float lineDistance;');
    expect(HAIRLINE_FRAG).toContain('uniform float uResolutionScale;');
    expect(HAIRLINE_FRAG).toContain('gl_FragCoord.w');
  });

  it('patches original LineMaterial shader to insert uResolutionScale and screen distance math', () => {
    const mockShader = `
      uniform float gapSize;
      if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

\t\t\t\tif ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX
    `;
    const patched = patchLineMaterialFragmentShader(mockShader);
    expect(patched).toContain('uniform float uResolutionScale;');
    expect(patched).toContain('float screenDist = vLineDistance * gl_FragCoord.w * uResolutionScale;');
  });
});
