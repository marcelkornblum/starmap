import type { Meta, StoryObj } from '@storybook/react-vite';
import type React from 'react';
import { StoryCanvas } from '../../../../.storybook/helpers/StoryCanvas';
import { DoubleSide } from 'three';
import storyCanvasStyles from '../../../../.storybook/helpers/StoryCanvas.module.css';
import { CameraRig } from './CameraRig';
import { SpatialFrameProvider, GALACTIC_FRAME, SYSTEM_FRAME, PlanarGrid } from './index';
import { useCameraStore } from '../../../stores/useCameraStore';
import type { CardinalDirection } from '../math/cameraMath';

const meta: Meta<typeof CameraRig> = {
  title: 'CANVAS/Instrument',
  component: CameraRig,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof CameraRig>;

const CameraControlsHud: React.FC = () => {
  const mode = useCameraStore((s) => s.mode);
  const isLocked = useCameraStore((s) => s.isLocked);
  const activeCardinal = useCameraStore((s) => s.activeCardinal);
  const toggleLock = useCameraStore((s) => s.toggleLock);
  const requestAxisView = useCameraStore((s) => s.requestAxisView);

  const cardinalButtons: CardinalDirection[] = ['top', 'bottom', 'front', 'back', 'right', 'left'];

  return (
    <div className={storyCanvasStyles.controlsCluster}>
      <div className={storyCanvasStyles.diagnosticsGrid}>
        <span>
          Projection: <strong>{mode.toUpperCase()}</strong>
        </span>
        <span>
          Active Camera: <strong>{isLocked ? 'THREE.OrthographicCamera' : 'THREE.PerspectiveCamera'}</strong>
        </span>
        <span>
          Controls: <strong>{isLocked ? '2D Pan (Tilt Disabled)' : '3D Orbit (Tilt Enabled)'}</strong>
        </span>
        <span>
          Active Axis: <strong>{activeCardinal ? activeCardinal.toUpperCase() : 'Free Space'}</strong>
        </span>
      </div>

      <div className={storyCanvasStyles.controlGroup}>
        <span className={storyCanvasStyles.groupLabel}>Lock State Machine</span>
        <div className={storyCanvasStyles.buttonRow}>
          <button
            type="button"
            className={storyCanvasStyles.demoButton}
            data-active={isLocked}
            onClick={toggleLock}
          >
            {isLocked ? 'Unlock (Return to 3D)' : 'Lock (Orthographic Pan/Zoom)'}
          </button>
        </div>
      </div>

      <div className={storyCanvasStyles.controlGroup}>
        <span className={storyCanvasStyles.groupLabel}>Cardinal Axis Navigation</span>
        <div className={storyCanvasStyles.buttonRow}>
          {cardinalButtons.map((dir) => (
            <button
              key={dir}
              type="button"
              className={storyCanvasStyles.demoButton}
              data-active={activeCardinal === dir}
              onClick={() => requestAxisView(dir)}
            >
              {dir.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className={storyCanvasStyles.controlGroup}>
        <span className={storyCanvasStyles.groupLabel}>Camera Presets</span>
        <div className={storyCanvasStyles.buttonRow}>
          <button
            type="button"
            className={storyCanvasStyles.demoButton}
            onClick={() => useCameraStore.getState().setTopDownView()}
          >
            Top-Down Ecliptic
          </button>
          <button
            type="button"
            className={storyCanvasStyles.demoButton}
            onClick={() => useCameraStore.getState().resetView()}
          >
            Reset View
          </button>
          <button
            type="button"
            className={storyCanvasStyles.demoButton}
            onClick={() => useCameraStore.getState().setOrbitalLockView()}
          >
            Orbital Lock
          </button>
          <button
            type="button"
            className={storyCanvasStyles.demoButton}
            onClick={() => useCameraStore.getState().setRadialView()}
          >
            Radial 3D
          </button>
        </div>
      </div>
    </div>
  );
};

export const CameraRigStory: Story = {
  name: 'CameraRig',
  render: (args) => (
    <StoryCanvas
      title="CameraRig"
      description="Precision camera control system: uninterrupted 3D orbit, discrete snap-on-release, orthographic lock state machine, and dedicated 6-axis navigation."
      frame={GALACTIC_FRAME}
      cameraDistance={32}
      bannerContent={<CameraControlsHud />}
    >
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <CameraRig {...args} />
        <PlanarGrid showPlanarGrid />

        {/* Cardinal calibration markers */}
        {/* Origin (White Sphere) */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* East (+X / Right - Red Box) */}
        <mesh position={[8, 0, 0]}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshBasicMaterial color="#ff5c5c" />
        </mesh>

        {/* West (-X / Left - Orange Box) */}
        <mesh position={[-8, 0, 0]}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshBasicMaterial color="#ff905c" />
        </mesh>

        {/* North (+Y / Back - Blue Box) */}
        <mesh position={[0, 8, 0]}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshBasicMaterial color="#40b0ff" />
        </mesh>

        {/* South (-Y / Front - Cyan Box) */}
        <mesh position={[0, -8, 0]}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshBasicMaterial color="#40e0d0" />
        </mesh>

        {/* Zenith (+Z / Top - Emerald Cone pointing +Z) */}
        <mesh position={[0, 0, 8]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.6, 1.6, 16]} />
          <meshBasicMaterial color="#50e3c2" />
        </mesh>

        {/* Nadir (-Z / Bottom - Purple Cone pointing -Z) */}
        <mesh position={[0, 0, -8]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.6, 1.6, 16]} />
          <meshBasicMaterial color="#d450e3" />
        </mesh>

        {/* Depth-Invariance Verification Objects (3 identical 1.2-unit cubes at different Z depths) */}
        {/* Foreground: Z = +8 (Lime Green) */}
        <mesh position={[4, 4, 8]}>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshBasicMaterial color="#76ff03" wireframe />
        </mesh>

        {/* Focal Plane: Z = 0 (Cyan) */}
        <mesh position={[4, 4, 0]}>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshBasicMaterial color="#00e5ff" wireframe />
        </mesh>

        {/* Background: Z = -8 (Magenta) */}
        <mesh position={[4, 4, -8]}>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshBasicMaterial color="#ff4081" wireframe />
        </mesh>
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};

export const CameraRigSystemStory: Story = {
  name: 'CameraRig (System Frame)',
  render: (args) => (
    <StoryCanvas
      title="CameraRig (System Frame)"
      description="Camera controls, presets, and logarithmic zoom stepping configured for the System reference frame (1.5 AU grid spacing, 2–150 AU distance range)."
      frame={SYSTEM_FRAME}
      cameraDistance={24}
      bannerContent={<CameraControlsHud />}
    >
      <SpatialFrameProvider frame={SYSTEM_FRAME}>
        <CameraRig {...args} />
        <PlanarGrid showPlanarGrid />

        {/* Central Star representation */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshBasicMaterial color="#ffcc00" />
        </mesh>

        {/* Invariable Plane planetary orbit ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[5.95, 6.05, 64]} />
          <meshBasicMaterial color="#00e5ff" side={DoubleSide} />
        </mesh>

        {/* Orbiting planet marker */}
        <mesh position={[6, 0, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshBasicMaterial color="#40c4ff" />
        </mesh>
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
