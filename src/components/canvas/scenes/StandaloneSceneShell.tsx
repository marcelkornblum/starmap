import type React from 'react';
import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveQualityMonitor } from '../AdaptiveQualityMonitor';
import { SceneTokenBridge } from '../SceneTokenBridge';
import { SafeHtmlPortalOutlet } from '../SafeHtml';
import { CrossScaleChoreographyProvider } from '../instrument/CrossScaleChoreographyContext';
import { CameraTransitionProvider } from '../instrument/useCameraTransition';
import { getInitialCanvasDpr } from '../../../services/deviceTierService';
import {
  SpatialEntityStoreContext,
  useOptionalSpatialEntityStoreApi,
} from '../entity/SpatialEntityContext';
import {
  CanvasRouterBridgeContext,
  useOptionalRouter,
} from '../../../hooks/useSpaLocation';
import styles from './SpatialScenes.module.css';

export interface StandaloneSceneShellProps {
  readonly className?: string;
  readonly variant?: 'card' | 'fullscreen';
  readonly camera?: {
    readonly position?: readonly [number, number, number];
    readonly up?: readonly [number, number, number];
    readonly fov?: number;
    readonly far?: number;
  };
  readonly children: React.ReactNode;
}

export const StandaloneSceneShell: React.FC<StandaloneSceneShellProps> = ({
  className,
  variant = 'card',
  camera,
  children,
}) => {
  const outerStore = useOptionalSpatialEntityStoreApi();
  const outerRouter = useOptionalRouter();
  const initialDpr = useMemo(() => getInitialCanvasDpr(), []);
  const containerClass = className
    ? `${styles.viewportContainer} ${className}`
    : styles.viewportContainer;

  return (
    <div className={containerClass} data-variant={variant}>
      <div className={styles.canvasWrapper}>
        <Canvas
          flat
          dpr={initialDpr}
          frameloop="demand"
          camera={camera}
          gl={{ antialias: true, alpha: true }}
        >
          <CanvasRouterBridgeContext.Provider value={outerRouter}>
            <SpatialEntityStoreContext.Provider value={outerStore}>
              <CameraTransitionProvider>
                <CrossScaleChoreographyProvider>
                  <SceneTokenBridge />
                  <AdaptiveQualityMonitor />
                  {children}
                </CrossScaleChoreographyProvider>
              </CameraTransitionProvider>
            </SpatialEntityStoreContext.Provider>
          </CanvasRouterBridgeContext.Provider>
        </Canvas>
        <SafeHtmlPortalOutlet />
      </div>
    </div>
  );
};
