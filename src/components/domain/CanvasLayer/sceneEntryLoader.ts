import type React from 'react';
import { lazy } from 'react';
import type { GalacticSceneContent } from '../../canvas/scenes/GalacticSceneEntry';
import type { SystemSceneContent } from '../../canvas/scenes/SystemSceneEntry';
import type { PlanetarySceneContent } from '../../canvas/scenes/PlanetarySceneEntry';

export type SpatialCanvasScope = 'galaxy' | 'system' | 'planet';

interface LoadedSceneMap {
  galaxy?: typeof GalacticSceneContent;
  system?: typeof SystemSceneContent;
  planet?: typeof PlanetarySceneContent;
}

const loadedScenes: LoadedSceneMap = {};

export function preloadSceneEntry(scope: SpatialCanvasScope): Promise<unknown> {
  if (scope === 'galaxy') {
    if (loadedScenes.galaxy) return Promise.resolve(loadedScenes.galaxy);
    return import('../../canvas/scenes/GalacticSceneEntry').then((m) => {
      loadedScenes.galaxy = m.default;
      return m.default;
    });
  }
  if (scope === 'system') {
    if (loadedScenes.system) return Promise.resolve(loadedScenes.system);
    return import('../../canvas/scenes/SystemSceneEntry').then((m) => {
      loadedScenes.system = m.default;
      return m.default;
    });
  }
  if (loadedScenes.planet) return Promise.resolve(loadedScenes.planet);
  return import('../../canvas/scenes/PlanetarySceneEntry').then((m) => {
    loadedScenes.planet = m.default;
    return m.default;
  });
}

export function getLoadedGalacticScene(): typeof GalacticSceneContent | undefined {
  return loadedScenes.galaxy;
}

export function getLoadedSystemScene(): typeof SystemSceneContent | undefined {
  return loadedScenes.system;
}

export function getLoadedPlanetaryScene(): typeof PlanetarySceneContent | undefined {
  return loadedScenes.planet;
}

export const LazyGalacticSceneContent: React.LazyExoticComponent<typeof GalacticSceneContent> = lazy(
  () =>
    import('../../canvas/scenes/GalacticSceneEntry').then((m) => {
      loadedScenes.galaxy = m.default;
      return m;
    }),
);

export const LazySystemSceneContent: React.LazyExoticComponent<typeof SystemSceneContent> = lazy(
  () =>
    import('../../canvas/scenes/SystemSceneEntry').then((m) => {
      loadedScenes.system = m.default;
      return m;
    }),
);

export const LazyPlanetarySceneContent: React.LazyExoticComponent<typeof PlanetarySceneContent> = lazy(
  () =>
    import('../../canvas/scenes/PlanetarySceneEntry').then((m) => {
      loadedScenes.planet = m.default;
      return m;
    }),
);
