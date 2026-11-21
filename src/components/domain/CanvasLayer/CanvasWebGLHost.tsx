/* ui-audit-disable-next-line missing-component-quad -- Lazy-loaded WebGL host extracted from CanvasLayer; styled via CanvasLayer.module.css and tested via CanvasLayer.test.tsx */
import React, { Suspense } from 'react';
import { Canvas, events as createDomEvents } from '@react-three/fiber';
import {
  getStandardInitialCamera,
  STANDARD_CAMERA_DISTANCES,
} from '../../canvas/cartography';
import type { SpatialEntityDefinition } from '../../canvas/entity/types';
import { SceneTokenBridge } from '../../canvas/SceneTokenBridge';
import { SafeHtmlPortalOutlet } from '../../canvas/SafeHtml';
import {
  SpatialEntityStoreContext,
  useOptionalSpatialEntityStoreApi,
} from '../../canvas/entity/SpatialEntityContext';
import {
  getLoadedGalacticScene,
  getLoadedSystemScene,
  getLoadedPlanetaryScene,
  LazyGalacticSceneContent,
  LazySystemSceneContent,
  LazyPlanetarySceneContent,
} from './sceneEntryLoader';
import styles from './CanvasLayer.module.css';

export interface CanvasWebGLHostProps {
  readonly scope: 'galaxy' | 'system' | 'planet';
  readonly targetId?: string;
  readonly centerId?: string;
  readonly centerCoordinates?: readonly [number, number, number];
  readonly selectedEntities?: readonly SpatialEntityDefinition[];
  readonly cameraDistance?: number;
  readonly frameloop: 'demand' | 'never';
  readonly isSpatialSceneMounted: boolean;
  readonly onInspect?: (id: string) => void;
  readonly onSelect?: (id: string | null) => void;
  readonly onFocusChange?: (id: string | null) => void;
}

const initialPersistentCam = getStandardInitialCamera(
  STANDARD_CAMERA_DISTANCES.galactic,
  [0, 0, 0],
);

const createDragSafeCanvasEvents: NonNullable<
  React.ComponentProps<typeof Canvas>['events']
> = (store) => {
  const manager = createDomEvents(store);
  if (manager.handlers?.onPointerMove) {
    const rawOnPointerMove = manager.handlers.onPointerMove;
    manager.handlers = {
      ...manager.handlers,
      onPointerMove: (event: Event) => {
        if ('buttons' in event && (event as PointerEvent).buttons > 0) {
          return;
        }
        rawOnPointerMove(event);
      },
    };
  }
  return manager;
};

export const CanvasWebGLHost: React.FC<CanvasWebGLHostProps> = React.memo(({
  scope,
  targetId,
  centerId,
  centerCoordinates,
  selectedEntities,
  cameraDistance,
  frameloop,
  isSpatialSceneMounted,
  onInspect,
  onSelect,
  onFocusChange,
}) => {
  const outerStore = useOptionalSpatialEntityStoreApi();
  const GalacticSceneComponent = getLoadedGalacticScene() ?? LazyGalacticSceneContent;
  const SystemSceneComponent = getLoadedSystemScene() ?? LazySystemSceneContent;
  const PlanetarySceneComponent = getLoadedPlanetaryScene() ?? LazyPlanetarySceneContent;

  return (
    <div className={styles.canvasWrapper}>
      <Canvas
        flat
        dpr={1}
        frameloop={frameloop}
        events={createDragSafeCanvasEvents}
        camera={{
          position: initialPersistentCam.position,
          up: initialPersistentCam.up,
          fov: initialPersistentCam.fov,
        }}
        gl={{ antialias: true, alpha: true }}
        className={styles.persistentCanvas}
      >
        <SpatialEntityStoreContext.Provider value={outerStore}>
          <SceneTokenBridge />
          <Suspense fallback={null}>
            {isSpatialSceneMounted && scope === 'galaxy' && (
              <GalacticSceneComponent
                initialSelectedId={centerId ?? null}
                centerCoordinates={centerCoordinates}
                centerId={centerId}
                cameraDistance={cameraDistance}
                additionalEntities={selectedEntities}
                onInspectSystem={onInspect}
                onSelectSystem={onSelect}
                onFocusChange={onFocusChange}
              />
            )}
            {isSpatialSceneMounted && scope === 'system' && targetId && (
              <SystemSceneComponent
                systemId={targetId}
                centerId={centerId}
                centerCoordinates={centerCoordinates}
                onInspectPlanet={onInspect}
                onSelectEntity={onSelect}
              />
            )}
            {isSpatialSceneMounted && scope === 'planet' && targetId && (
              <PlanetarySceneComponent
                planetId={targetId}
                onInspectSatellite={onInspect}
                onSelectEntity={onSelect}
              />
            )}
          </Suspense>
        </SpatialEntityStoreContext.Provider>
      </Canvas>
      <SafeHtmlPortalOutlet />
    </div>
  );
});

CanvasWebGLHost.displayName = 'CanvasWebGLHost';

export default CanvasWebGLHost;
