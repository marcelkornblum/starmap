import { resetWebGLSupportedCacheInternal } from './webglSupport';

export const _resetWebGLSupportedForTesting = (): void => {
  resetWebGLSupportedCacheInternal();
};
