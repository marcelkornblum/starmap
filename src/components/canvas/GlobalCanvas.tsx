import type React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { SceneOutlet } from './SceneBridge';

export interface GlobalCanvasProps {
  className?: string;
  style?: React.CSSProperties;
}

export const GlobalCanvas: React.FC<GlobalCanvasProps> = ({
  className,
  style,
}) => {
  return (
    <div
      data-testid="global-canvas-container"
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'auto',
        overflow: 'hidden',
        ...style,
      }}
    >
      <Canvas
        camera={{ position: [0, 5, 12], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 10]} intensity={1.2} />
        <directionalLight position={[-10, -5, -10]} intensity={0.4} color="#6688aa" />

        <SceneOutlet />

        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      </Canvas>
    </div>
  );
};
