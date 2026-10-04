import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useThree, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { CartographicGrid } from './CartographicGrid';
import { getStandardInitialCamera } from './cartographyMath';
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

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && e.instanceId < count) {
      const star = starsFixture[e.instanceId];
      const ctrl = controls as unknown as { target?: THREE.Vector3; update?: () => void } | null;
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
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CartographicGrid>;

const DEFAULT_OFFSET: [number, number, number] = [35, 45, 12];

/**
 * Default view: Adaptive Zoom Scaling.
 * The instrument maintains an invariant visual footprint on screen.
 * Zooming in and out with OrbitControls modulates the real-world scale (metric volume in parsecs),
 * while dynamic concentric range rings continuously contract and expand according to the
 * logarithmic 1-2-5 progression (Significant vs Insignificant visual hierarchy).
 * The Galactic Centre bearing (+X Core) is styled with its golden accent token.
 * Positioned offset from grid lines on X, Y, and Z dimensions (e.g. [35, 45, 12]) with stars omitted.
 */
export const Default: Story = {
  args: {
    radius: 10,
    screenConstant: true,
    referenceDistance: 34.9,
    showFins: true,
    showAxisLines: true,
    showGalacticPlane: true,
    showFullDatumCircle: true,
    showPlanarGrid: true,
    planarGridGap: 100,
    adaptiveProjection: true,
    position: DEFAULT_OFFSET,
  },
  render: (args) => {
    const target = (args.position instanceof THREE.Vector3
      ? [args.position.x, args.position.y, args.position.z]
      : args.position ?? DEFAULT_OFFSET) as [number, number, number];

    const standardCam = getStandardInitialCamera(28, target);

    return (
      <Canvas
        camera={{
          position: standardCam.position,
          up: standardCam.up,
          fov: standardCam.fov,
        }}
        gl={{ antialias: true, alpha: true }}
      >
        <SceneTokenBridge />
        <CartographicGrid {...args} />
        <OrbitControls
          makeDefault
          target={standardCam.target}
          enableDamping
          dampingFactor={0.05}
          minDistance={4.0}
          maxDistance={250}
        />
      </Canvas>
    );
  },
};

/**
 * Object Scaling:
 * The instrument remains anchored to fixed metric dimensions in 3D world space.
 * 3 orthogonal fins (XY, XZ, YZ) each with a 90-degree curve,
 * alternating concentric range arcs, two extended bearing lines,
 * and Galactic Equator planar footprints.
 */
export const ObjectScaling: Story = {
  name: 'Object Scaling',
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
    position: [0, 0, 0],
  },
  render: (args) => {
    const standardCam = getStandardInitialCamera(20, [0, 0, 0]);
    return (
      <Canvas
        camera={{
          position: standardCam.position,
          up: standardCam.up,
          fov: standardCam.fov,
        }}
        gl={{ antialias: true, alpha: true }}
      >
        <SceneTokenBridge />
        <CartographicGrid {...args} />
        <FixtureStars />
        <OrbitControls
          makeDefault
          target={standardCam.target}
          enableDamping
          dampingFactor={0.05}
          minDistance={4.0}
          maxDistance={250}
        />
      </Canvas>
    );
  },
};
