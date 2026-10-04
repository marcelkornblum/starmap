import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { CartographicGrid } from './CartographicGrid';
import { SceneTokenBridge, ThemeTokenBridge } from '../ThemeTokenBridge';
import starsFixture from '../../../../tests/fixtures/stars.fixture.json';
import styles from './StorybookCanvasWrapper.module.css';

const SHARED_STAR_GEOMETRY = new THREE.SphereGeometry(0.08, 16, 16);
const SHARED_STAR_MATERIAL = new THREE.MeshBasicMaterial();
const scratchStarPos = new THREE.Vector3();

/**
 * Minimalist 3D dots for stars in the test fixture.
 * Rendered using a batched InstancedMesh with a single useFrame loop,
 * maintaining a crisp, invariant visual footprint on screen with zero garbage collection.
 * Clicking any star focuses the camera and OrbitControls directly on that star,
 * demonstrating how the CartographicGrid dynamically locks its origin to the camera focus point.
 */
const FixtureStars: React.FC = () => {
  const { controls, camera } = useThree();
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const count = starsFixture.length;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Initialize positions and spectral colors once
  useEffect(() => {
    if (!instancedRef.current) return;
    const mesh = instancedRef.current;
    const colorObj = new THREE.Color();

    starsFixture.forEach((star, i) => {
      dummy.position.set(star.x, star.y, star.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const s = star.spect?.charAt(0).toUpperCase();
      const hex =
        s === 'O' ? '#9db4ff' :
        s === 'B' ? '#bbccff' :
        s === 'A' ? '#f8f9ff' :
        s === 'F' ? '#ffffed' :
        s === 'G' ? '#fff4e8' :
        s === 'K' ? '#ffd2a1' :
        s === 'M' ? '#ffaa80' : '#ffffff';
      colorObj.set(hex);
      mesh.setColorAt(i, colorObj);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [dummy]);

  // Single useFrame loop updating scale for invariant screen footprint across all stars
  useFrame(({ camera: activeCam }) => {
    if (!instancedRef.current) return;
    const mesh = instancedRef.current;
    const fovFactor =
      activeCam instanceof THREE.PerspectiveCamera
        ? Math.tan((activeCam.fov * Math.PI) / 360) / Math.tan((45 * Math.PI) / 360)
        : 1.0;

    for (let i = 0; i < count; i++) {
      const star = starsFixture[i];
      scratchStarPos.set(star.x, star.y, star.z);
      const dist = activeCam.position.distanceTo(scratchStarPos);
      const s = (dist / 16.47) * fovFactor;
      dummy.position.set(star.x, star.y, star.z);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && e.instanceId < count) {
      const star = starsFixture[e.instanceId];
      const ctrl = controls as any;
      if (ctrl && ctrl.target instanceof THREE.Vector3) {
        const offset = camera.position.clone().sub(ctrl.target);
        ctrl.target.set(star.x, star.y, star.z);
        camera.position.copy(ctrl.target).add(offset);
        ctrl.update?.();
      }
    }
  };

  return (
    <instancedMesh
      ref={instancedRef}
      args={[SHARED_STAR_GEOMETRY, SHARED_STAR_MATERIAL, count]}
      name="fixture-stars"
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    />
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
          <OrbitControls makeDefault enableDamping dampingFactor={0.05} minDistance={4.0} maxDistance={250} />
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
 * two extended bearing lines (+X Core in Solarized yellow accent, +Y Orbital in dashed Solarized red),
 * and the third axis line (+Z Pole) terminating at the radius length.
 */
export const Default: Story = {
  args: {
    radius: 10,
    rangeRings: [2, 4, 6, 8],
    showFins: true,
    showAxisLines: true,
    showGalacticPlane: true,
    showPlanarFootprint: true,
    footprintSize: 0.6,
    showFullDatumCircle: true,
    screenConstant: false,
  },
};

/**
 * Explicit planar footprints stamped on the Galactic Equator (Z=0) datum plane.
 */
export const WithPlanarFootprints: Story = {
  args: {
    radius: 10,
    rangeRings: [2, 4, 6, 8],
    showFins: true,
    showAxisLines: true,
    showGalacticPlane: true,
    showPlanarFootprint: true,
    footprintSize: 0.6,
    footprintClassification: 'stellar-system',
    footprints: [
      { id: 'binary-1', position: [3, 2, 0], classification: 'stellar-system', size: 0.6, multiplicity: 2 },
      { id: 'black-hole-1', position: [-4, 3, 0], classification: 'black-hole', size: 0.6 },
      { id: 'hazard-1', position: [-3, -4, 0], classification: 'hazard', size: 0.5 },
      { id: 'gas-giant-1', position: [4, -3, 0], classification: 'gas-giant', size: 0.5 },
    ],
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
    showFullDatumCircle: true,
    screenConstant: false,
  },
};
