import type React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { SceneOutlet } from './SceneBridge';
import { SceneTokenBridge } from './ThemeTokenBridge';
import { GalaxyScene } from './scenes/GalaxyScene';
import {
  getStandardInitialCamera,
  STANDARD_CAMERA_DISTANCES,
} from './cartography/cartographyMath';
import { CONTROLS_DAMPING_FACTOR } from './engineConfig';
import styles from './GlobalCanvas.module.css';

export interface GlobalCanvasProps {
  className?: string;
  style?: React.CSSProperties;
}

const STANDARD_CAM = getStandardInitialCamera(STANDARD_CAMERA_DISTANCES.galactic, [0, 0, 0], 45);

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
        <directionalLight position={[10, 20, 15]} intensity={0.4} />

        <SceneOutlet fallback={<GalaxyScene />} />

        <OrbitControls
          makeDefault
          target={STANDARD_CAM.target}
          enableDamping
          dampingFactor={CONTROLS_DAMPING_FACTOR}
          minDistance={2.5}
          maxDistance={85}
        />
      </Canvas>
    </div>
  );
};
