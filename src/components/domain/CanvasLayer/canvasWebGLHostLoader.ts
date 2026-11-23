import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import {
  preloadSceneEntry,
  type SpatialCanvasScope,
} from '../../../services/navigation/scalePreloader';
import type { CanvasWebGLHostProps } from './CanvasWebGLHost';
import { canMountWebGLCanvas } from './webglSupport';

let cachedHostLazy: LazyExoticComponent<ComponentType<CanvasWebGLHostProps>> | null =
  null;

/**
 * Returns the lazily-loaded WebGL host component, warming the initial scene entry in parallel.
 */
export function getWebGLHostLazy(
  initialScope: SpatialCanvasScope,
): LazyExoticComponent<ComponentType<CanvasWebGLHostProps>> {
  if (!cachedHostLazy) {
    cachedHostLazy = lazy(async () => {
      const [hostMod] = await Promise.all([
        import('./CanvasWebGLHost'),
        preloadSceneEntry(initialScope),
      ]);
      return hostMod;
    });
  }
  return cachedHostLazy;
}

/**
 * Eagerly warms the lazy WebGL host and initial scene chunks in parallel with route views.
 */
export function preloadWebGLHost(initialScope: SpatialCanvasScope): void {
  if (!canMountWebGLCanvas()) return;
  getWebGLHostLazy(initialScope);
  void import('./CanvasWebGLHost');
  void preloadSceneEntry(initialScope);
}
