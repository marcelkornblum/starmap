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
    webglSupported = Boolean(
      canvas.getContext('webgl2') || canvas.getContext('webgl'),
    );
  } catch {
    webglSupported = false;
  }
  return webglSupported;
};

export const _resetWebGLSupportedForTesting = (): void => {
  webglSupported = null;
};
