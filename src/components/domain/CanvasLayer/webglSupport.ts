import { extractWebGLGpuTelemetry } from '../../../services/deviceTierProfiles';
import { registerWebGLGpuTelemetry } from '../../../services/deviceTierService';

let webglSupported: boolean | null = null;

export const canMountWebGLCanvas = (): boolean => {
  if (webglSupported !== null) {
    return webglSupported;
  }
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined'
  ) {
    webglSupported = false;
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      registerWebGLGpuTelemetry(
        extractWebGLGpuTelemetry(gl as WebGLRenderingContext | WebGL2RenderingContext),
      );
      try {
        if (typeof (gl as WebGLRenderingContext).getExtension === 'function') {
          (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
        }
      } catch {
        // Ignore probe context-loss cleanup failures
      }
      webglSupported = true;
    } else {
      webglSupported = false;
    }
  } catch {
    webglSupported = false;
  }
  return webglSupported;
};

export const _resetWebGLSupportedForTesting = (): void => {
  webglSupported = null;
};
