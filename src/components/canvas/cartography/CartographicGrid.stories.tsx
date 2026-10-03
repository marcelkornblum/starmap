import type { Meta, StoryObj } from '@storybook/react-vite';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CartographicGrid } from './CartographicGrid';
import { CelestialNode } from './CelestialNode';
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
 * 90-degree concentric range arcs on all three axes/planes,
 * two extended bearing lines (+X Core in golden accent, +Y Orbital in white alpha),
 * and the third axis line (+Z Pole) terminating at the radius length.
 */
export const Default: Story = {
  args: {
    radius: 10,
    rangeRings: [2.5, 5, 10],
    majorRingIndex: 2,
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
      {/* Sample galactic neighborhood stellar bodies to observe world-scale dynamics (pure WebGL reticles) */}
      <CelestialNode id="sol" name="Sol" position={[0, 0, 0]} state="focused" spectralType="G2V" showLabel={false} />
      <CelestialNode
        id="alpha-cen"
        name="Alpha Centauri"
        position={[1.34, -0.62, 0.45]}
        state="active"
        spectralType="G2V"
        showLabel={false}
      />
      <CelestialNode
        id="barnard"
        name="Barnard's Star"
        position={[-0.25, 1.78, 0.42]}
        state="passive"
        spectralType="M4V"
        showLabel={false}
      />
      <CelestialNode
        id="sirius"
        name="Sirius"
        position={[-2.63, 1.84, -1.22]}
        state="active"
        spectralType="A1V"
        showLabel={false}
      />
      <CelestialNode
        id="procyon"
        name="Procyon"
        position={[2.01, 3.12, -0.85]}
        state="passive"
        spectralType="F5V"
        showLabel={false}
      />
      <CelestialNode
        id="eps-eri"
        name="Epsilon Eridani"
        position={[-3.22, -0.54, 0.92]}
        state="passive"
        spectralType="K2V"
        showLabel={false}
      />
      <CelestialNode
        id="vega"
        name="Vega"
        position={[7.54, 3.21, 2.15]}
        state="active"
        spectralType="A0V"
        showLabel={false}
      />
      <CelestialNode
        id="altair"
        name="Altair"
        position={[5.12, 1.45, -0.72]}
        state="passive"
        spectralType="A7V"
        showLabel={false}
      />
      <CelestialNode
        id="fomalhaut"
        name="Fomalhaut"
        position={[7.72, -4.14, 0.52]}
        state="passive"
        spectralType="A3V"
        showLabel={false}
      />
      <CelestialNode
        id="arcturus"
        name="Arcturus"
        position={[11.2, 8.4, 3.5]}
        state="passive"
        spectralType="K1III"
        showLabel={false}
      />
    </>
  ),
};

/**
 * Optional full 360-degree datum circles on Z=0 enabled alongside the three orthogonal fins.
 */
export const WithFullDatumCircles: Story = {
  args: {
    radius: 10,
    rangeRings: [2.5, 5, 10],
    majorRingIndex: 2,
    showFins: true,
    showAxisLines: true,
    showFullDatumCircle: true,
    screenConstant: false,
  },
};

/**
 * Macro galactic scale (50 pc aperture) with [10, 25, 50] pc concentric arcs.
 */
export const MacroGalacticScale: Story = {
  args: {
    radius: 50,
    rangeRings: [10, 25, 50],
    majorRingIndex: 2,
    showFins: true,
    showAxisLines: true,
    showFullDatumCircle: false,
    screenConstant: false,
  },
};
