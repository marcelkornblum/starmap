import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { CartographicGrid } from './CartographicGrid';
import { SceneTokenBridge, ThemeTokenBridge } from '../ThemeTokenBridge';
import starsFixture from '../../../../tests/fixtures/stars.fixture.json';
import styles from './StorybookCanvasWrapper.module.css';

interface StarDotProps {
  star: (typeof starsFixture)[0];
  color: string;
  onClick: (star: (typeof starsFixture)[0]) => void;
}

/**
 * Minimalist 3D dot representing a star.
 * Screen-space invariance: The star dot never scales when the user zooms in or out,
 * maintaining a crisp, invariant visual footprint on screen.
 */
const StarDot: React.FC<StarDotProps> = ({ star, color, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => new THREE.Vector3(star.x, star.y, star.z), [star.x, star.y, star.z]);

  useFrame(({ camera }) => {
    if (!meshRef.current) return;
    const dist = camera.position.distanceTo(pos);
    // Invariant visual screen footprint: dots never scale with camera zoom or perspective changes
    const fovFactor = camera instanceof THREE.PerspectiveCamera
      ? Math.tan((camera.fov * Math.PI) / 360) / Math.tan((45 * Math.PI) / 360)
      : 1.0;
    const s = (dist / 16.47) * fovFactor;
    meshRef.current.scale.set(s, s, s);
  });

  return (
    <mesh
      ref={meshRef}
      position={[star.x, star.y, star.z]}
      name={`star-dot-${star.id}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick(star);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
};

/**
 * Minimalist 3D dots for stars in the test fixture.
 * The star dots never scale with camera zoom.
 * Clicking any star focuses the camera and OrbitControls directly on that star,
 * demonstrating how the CartographicGrid dynamically locks its origin to the camera focus point.
 */
const FixtureStars: React.FC = () => {
  const { controls, camera } = useThree();

  const handleStarClick = (star: (typeof starsFixture)[0]) => {
    const ctrl = controls as any;
    if (ctrl && ctrl.target instanceof THREE.Vector3) {
      const offset = camera.position.clone().sub(ctrl.target);
      ctrl.target.set(star.x, star.y, star.z);
      camera.position.copy(ctrl.target).add(offset);
      ctrl.update?.();
    }
  };

  return (
    <group name="fixture-stars">
      {starsFixture.map((star) => {
        const s = star.spect?.charAt(0).toUpperCase();
        const color =
          s === 'O' ? '#9db4ff' :
          s === 'B' ? '#bbccff' :
          s === 'A' ? '#f8f9ff' :
          s === 'F' ? '#ffffed' :
          s === 'G' ? '#fff4e8' :
          s === 'K' ? '#ffd2a1' :
          s === 'M' ? '#ffaa80' : '#ffffff';
        return (
          <StarDot
            key={star.id}
            star={star}
            color={color}
            onClick={handleStarClick}
          />
        );
      })}
    </group>
  );
};

const meta: Meta<typeof CartographicGrid> = {
  title: 'Canvas/Cartography/CartographicGrid',
  component: CartographicGrid,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className={styles.viewportContainer}>
        <ThemeTokenBridge />
        <Canvas camera={{ position: [10.18, 8.0, 10.18], fov: 45 }} gl={{ antialias: true, alpha: true }}>
          <SceneTokenBridge />
          <Story />
          <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
        </Canvas>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CartographicGrid>;

/**
 * Default view: Perspective / non-ortho view.
 * 3 orthogonal fins (XY, XZ, YZ) each with a 90-degree curve,
 * alternating concentric range arcs (dimmer and brighter lines),
 * two extended bearing lines (+X Core in golden accent, +Y Orbital in white alpha),
 * and the third axis line (+Z Pole) terminating at the radius length.
 */
export const Default: Story = {
  args: {
    radius: 10,
    rangeRings: [2, 4, 6, 8],
    showFins: true,
    showAxisLines: true,
    showFullDatumCircle: false,
    screenConstant: false,
  },
};

/**
 * Default view populated with stars from the fixture:
 * Exactly like Default, with each star represented cleanly as a dot in 3D space.
 */
export const WithStars: Story = {
  args: {
    ...Default.args,
  },
  render: (args) => (
    <>
      <CartographicGrid {...args} />
      <FixtureStars />
    </>
  ),
};

/**
 * Zoom-Adaptive Scaling Variant:
 * The instrument maintains an invariant visual footprint on screen.
 * Zooming in and out with OrbitControls modulates the real-world scale (metric volume in parsecs),
 * while dynamic concentric range rings continuously contract and expand according to the
 * logarithmic 1-2-5 progression (Significant vs Insignificant visual hierarchy).
 * The Galactic Centre bearing (+X Core) is styled with its golden accent token.
 * Populated with the same fixture stars to observe world-scale dynamics.
 */
export const ZoomAdaptiveScaling: Story = {
  args: {
    radius: 10,
    screenConstant: true,
    referenceDistance: 34.9,
    showFins: true,
    showAxisLines: true,
    showFullDatumCircle: false,
    adaptiveProjection: true,
  },
  render: (args) => (
    <>
      <CartographicGrid {...args} />
      <FixtureStars />
    </>
  ),
};

/**
 * Optional full 360-degree datum circles on Z=0 enabled alongside the three orthogonal fins.
 */
export const WithFullDatumCircles: Story = {
  args: {
    radius: 10,
    rangeRings: [2, 4, 6, 8],
    showFins: true,
    showAxisLines: true,
    showFullDatumCircle: true,
    screenConstant: false,
  },
};

/**
 * Macro galactic scale (50 pc aperture) with [10, 20, 30, 40] pc concentric arcs.
 */
export const MacroGalacticScale: Story = {
  args: {
    radius: 50,
    rangeRings: [10, 20, 30, 40],
    showFins: true,
    showAxisLines: true,
    showFullDatumCircle: false,
    screenConstant: false,
  },
};
