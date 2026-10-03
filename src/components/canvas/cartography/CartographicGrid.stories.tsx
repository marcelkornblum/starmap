import type { Meta, StoryObj } from '@storybook/react-vite';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CartographicGrid } from './CartographicGrid';
import { SceneTokenBridge, ThemeTokenBridge } from '../ThemeTokenBridge';
import styles from './StorybookCanvasWrapper.module.css';

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
        <Canvas camera={{ position: [14, 11, 14], fov: 45 }} gl={{ antialias: true, alpha: true }}>
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
 * Zoom-Adaptive Scaling Variant:
 * The instrument maintains an invariant visual footprint on screen.
 * Zooming in and out with OrbitControls modulates the real-world scale (metric volume in parsecs),
 * while dynamic concentric range rings continuously contract and expand according to the
 * logarithmic 1-2-5 progression (Significant vs Insignificant visual hierarchy).
 * The Galactic Centre bearing (+X Core) is styled with its golden accent token.
 */
export const ZoomAdaptiveScaling: Story = {
  args: {
    radius: 10,
    screenConstant: true,
    referenceDistance: 48,
    showFins: true,
    showAxisLines: true,
    showFullDatumCircle: false,
    adaptiveProjection: true,
  },
  render: (args) => (
    <>
      <CartographicGrid {...args} />
      {/* Reference stars at fixed coordinates in space to visualize world-scale zoom dynamics */}
      <group>
        {[
          { id: 'sol', pos: [0, 0, 0] as const, color: '#ffffff' },
          { id: 'alpha-cen', pos: [1.34, -0.62, 0.45] as const, color: '#f59e0b' },
          { id: 'barnard', pos: [-0.25, 1.78, 0.42] as const, color: '#ef4444' },
          { id: 'sirius', pos: [-2.63, 1.84, -1.22] as const, color: '#60a5fa' },
          { id: 'procyon', pos: [2.01, 3.12, -0.85] as const, color: '#fef08a' },
          { id: 'eps-eri', pos: [-3.22, -0.54, 0.92] as const, color: '#f97316' },
          { id: 'vega', pos: [7.54, 3.21, 2.15] as const, color: '#93c5fd' },
          { id: 'altair', pos: [5.12, 1.45, -0.72] as const, color: '#e0e7ff' },
          { id: 'fomalhaut', pos: [7.72, -4.14, 0.52] as const, color: '#c7d2fe' },
          { id: 'arcturus', pos: [11.2, 8.4, 3.5] as const, color: '#fb923c' },
        ].map((star) => (
          <mesh key={star.id} position={star.pos}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color={star.color} />
          </mesh>
        ))}
      </group>
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
