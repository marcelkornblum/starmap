import type React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { SceneOutlet } from './SceneBridge';
import { SceneTokenBridge } from './ThemeTokenBridge';
import { getStandardInitialCamera } from './cartography/cartographyMath';
import styles from './GlobalCanvas.module.css';

export interface GlobalCanvasProps {
  className?: string;
  style?: React.CSSProperties;
}

const STANDARD_CAM = getStandardInitialCamera(14, [0, 0, 0], 50);

export const GlobalCanvas: React.FC<GlobalCanvasProps> = ({
  className,
  style,
}) => {
  return (
    <div
      data-testid="global-canvas-container"
      className={[styles.container, className].filter(Boolean).join(' ')}
      style={style}
    >
      <Canvas
        camera={{
          position: STANDARD_CAM.position,
          up: STANDARD_CAM.up,
          fov: STANDARD_CAM.fov,
        }}
        gl={{ antialias: true, alpha: true }}
      >
        <SceneTokenBridge />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 10]} intensity={1.2} />
        <directionalLight position={[-10, -5, -10]} intensity={0.4} color="#6688aa" />

        <SceneOutlet />

        <OrbitControls makeDefault target={STANDARD_CAM.target} enableDamping dampingFactor={0.05} />
      </Canvas>
    </div>
  );
};
