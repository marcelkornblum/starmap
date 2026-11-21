import type React from 'react';
import { Canvas } from '@react-three/fiber';
import { SceneTokenBridge } from '../SceneTokenBridge';
import { SafeHtmlPortalOutlet } from '../SafeHtml';
import {
  SpatialEntityStoreContext,
  useOptionalSpatialEntityStoreApi,
} from '../entity/SpatialEntityContext';
import styles from './SpatialScenes.module.css';

export interface StandaloneSceneShellProps {
  readonly className?: string;
  readonly variant?: 'card' | 'fullscreen';
  readonly camera?: {
    readonly position?: readonly [number, number, number];
    readonly up?: readonly [number, number, number];
    readonly fov?: number;
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
  const containerClass = className
    ? `${styles.viewportContainer} ${className}`
    : styles.viewportContainer;

  return (
    <div className={containerClass} data-variant={variant}>
      <div className={styles.canvasWrapper}>
        <Canvas
          flat
          dpr={1}
          frameloop="demand"
          camera={camera}
          gl={{ antialias: true, alpha: true }}
        >
          <SpatialEntityStoreContext.Provider value={outerStore}>
            <SceneTokenBridge />
            {children}
          </SpatialEntityStoreContext.Provider>
        </Canvas>
        <SafeHtmlPortalOutlet />
      </div>
    </div>
  );
};
