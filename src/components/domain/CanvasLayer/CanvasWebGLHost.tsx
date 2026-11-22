/* ui-audit-disable-next-line missing-component-quad -- Lazy-loaded WebGL host extracted from CanvasLayer; styled via CanvasLayer.module.css and tested via CanvasLayer.test.tsx */
import React, { useMemo } from 'react';
import { Canvas, events as createDomEvents } from '@react-three/fiber';
import {
  getStandardInitialCamera,
  STANDARD_CAMERA_DISTANCES,
} from '../../canvas/cartography';
import type { SpatialEntityDefinition } from '../../canvas/entity/types';
import { AdaptiveQualityMonitor } from '../../canvas/AdaptiveQualityMonitor';
import { SceneTokenBridge } from '../../canvas/SceneTokenBridge';
import { SafeHtmlPortalOutlet } from '../../canvas/SafeHtml';
import { CameraTransitionProvider } from '../../canvas/instrument/useCameraTransition';
import { getInitialCanvasDpr } from '../../../services/deviceTierService';
import {
  SpatialEntityStoreContext,
  useOptionalSpatialEntityStoreApi,
} from '../../canvas/entity/SpatialEntityContext';
import {
  CanvasRouterBridgeContext,
  useOptionalRouter,
} from '../../../hooks/useSpaLocation';
import { CrossScaleStageHost } from './CrossScaleStageHost';
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
  const outerRouter = useOptionalRouter();
  const initialDpr = useMemo(() => getInitialCanvasDpr(), []);

  return (
    <div className={styles.canvasWrapper}>
      <Canvas
        flat
        dpr={initialDpr}
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
        <CanvasRouterBridgeContext.Provider value={outerRouter}>
          <SpatialEntityStoreContext.Provider value={outerStore}>
            <CameraTransitionProvider>
              <SceneTokenBridge />
              <AdaptiveQualityMonitor />
              <CrossScaleStageHost
                scope={scope}
                targetId={targetId}
                centerId={centerId}
                centerCoordinates={centerCoordinates}
                selectedEntities={selectedEntities}
                cameraDistance={cameraDistance}
                isSpatialSceneMounted={isSpatialSceneMounted}
                onInspect={onInspect}
                onSelect={onSelect}
                onFocusChange={onFocusChange}
              />
            </CameraTransitionProvider>
          </SpatialEntityStoreContext.Provider>
        </CanvasRouterBridgeContext.Provider>
      </Canvas>
      <SafeHtmlPortalOutlet />
    </div>
  );
});

CanvasWebGLHost.displayName = 'CanvasWebGLHost';

export default CanvasWebGLHost;
