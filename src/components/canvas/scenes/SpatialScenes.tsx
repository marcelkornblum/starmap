import type React from 'react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import {
  getStandardInitialCamera,
  STANDARD_CAMERA_DISTANCES,
} from '../cartography';
import {
  computeMaxSafeCameraDistancePc,
  getDeviceTierBudget,
} from '../../../services/deviceTierService';
import { SceneTokenBridge } from '../ThemeTokenBridge';
import { SafeHtmlPortalOutlet } from '../SafeHtml';
import { CONTROLS_DAMPING_FACTOR } from '../engineConfig';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useLazyRef } from '../../../hooks/useLazyRef';
import type { SpatialEntityDefinition } from '../entity';
import { GalaxyScene } from './GalaxyScene';
import { SystemScene } from './SystemScene';
import { PlanetScene } from './PlanetScene';

import styles from './SpatialScenes.module.css';

// -----------------------------------------------------------------------------
// Astronomical Data Fixtures & Helper Utilities (re-exported from src/data)
// -----------------------------------------------------------------------------

export {
  type CandidateSystem,
  CANDIDATE_SYSTEMS,
  type SolPlanetConfig,
  SOL_PLANETS,
  LUNAR_ORBIT,
} from '../../../data';

export interface GalacticViewSceneProps {
  initialSelectedId?: string | null;
  onInspectSystem?: (systemId: string) => void;
  onSelectSystem?: (systemId: string | null) => void;
  centerCoordinates?:
    | readonly [number, number, number]
    | [number, number, number]
    | { x: number; y: number; z: number };
  centerId?: string;
  additionalEntities?: readonly SpatialEntityDefinition[];
  className?: string;
  variant?: 'card' | 'fullscreen';
}

interface OrbitControlsLike {
  target: THREE.Vector3;
  update?: () => void;
}

function isOrbitControlsLike(value: unknown): value is OrbitControlsLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'target' in value &&
    value.target instanceof THREE.Vector3
  );
}

export interface GalacticCameraControllerProps {
  readonly target: [number, number, number];
}

export const GalacticCameraController: React.FC<GalacticCameraControllerProps> = ({
  target,
}) => {
  const three = useThree();
  const camera = three.camera;
  const controls =
    'controls' in three && isOrbitControlsLike(three.controls)
      ? three.controls
      : undefined;
  const recenterTick = useCameraStore((s) => s.recenterTick);
  const prevTargetRef = useRef<[number, number, number]>(target);
  const prevRecenterTickRef = useRef<number>(recenterTick);
  const scratchNewTargetRef = useLazyRef(() => new THREE.Vector3());
  const scratchPrevTargetRef = useLazyRef(() => new THREE.Vector3());
  const scratchDeltaRef = useLazyRef(() => new THREE.Vector3());

  useEffect(() => {
    const prev = prevTargetRef.current;
    const prevTick = prevRecenterTickRef.current;
    const isTargetSame =
      prev[0] === target[0] &&
      prev[1] === target[1] &&
      prev[2] === target[2];
    const isTickSame = recenterTick === prevTick;

    if (isTargetSame && isTickSame) {
      return;
    }

    const newTarget = scratchNewTargetRef.current.set(target[0], target[1], target[2]);

    const prevTarget = controls?.target
      ? scratchPrevTargetRef.current.copy(controls.target)
      : scratchPrevTargetRef.current.set(prev[0], prev[1], prev[2]);
    const delta = scratchDeltaRef.current.copy(newTarget).sub(prevTarget);

    camera.position.add(delta);
    camera.lookAt(newTarget);

    if (controls) {
      controls.target.copy(newTarget);
      controls.update?.();
    }

    prevTargetRef.current = target;
    prevRecenterTickRef.current = recenterTick;
  }, [
    target,
    recenterTick,
    camera,
    controls,
    scratchNewTargetRef,
    scratchPrevTargetRef,
    scratchDeltaRef,
  ]);

  return null;
};

export const GalacticViewScene: React.FC<GalacticViewSceneProps> = ({
  initialSelectedId = null,
  onInspectSystem,
  onSelectSystem,
  centerCoordinates,
  centerId,
  additionalEntities,
  className,
  variant = 'card',
}) => {
  const targetCoords = useMemo<[number, number, number]>(() => {
    if (!centerCoordinates) return [0, 0, 0];
    if ('x' in centerCoordinates) {
      return [centerCoordinates.x, centerCoordinates.y, centerCoordinates.z];
    }
    return [centerCoordinates[0], centerCoordinates[1], centerCoordinates[2]];
  }, [centerCoordinates]);

  const standardCam = useMemo(
    () => getStandardInitialCamera(STANDARD_CAMERA_DISTANCES.galactic, targetCoords),
    [targetCoords],
  );

  const maxSafeDistance = useMemo(
    () => computeMaxSafeCameraDistancePc(getDeviceTierBudget()),
    [],
  );

  const containerClass = className
    ? `${styles.viewportContainer} ${className}`
    : styles.viewportContainer;

  return (
    <div className={containerClass} data-variant={variant}>
      <div className={styles.canvasWrapper}>
        <Canvas
          flat
          dpr={1}
          camera={{
            position: standardCam.position,
            up: standardCam.up,
            fov: standardCam.fov,
          }}
          gl={{ antialias: true, alpha: true }}
        >
          <SceneTokenBridge />
          <ambientLight intensity={0.4} />

          <OrbitControls
            makeDefault
            target={standardCam.target}
            enableDamping
            dampingFactor={CONTROLS_DAMPING_FACTOR}
            minDistance={2.5}
            maxDistance={maxSafeDistance}
          />

          <GalacticCameraController target={targetCoords} />

          <GalaxyScene
            initialSelectedId={initialSelectedId ?? centerId}
            onInspectSystem={onInspectSystem}
            onSelectSystem={onSelectSystem}
            additionalEntities={additionalEntities}
          />
        </Canvas>
        <SafeHtmlPortalOutlet />
      </div>
    </div>
  );
};

export interface SystemViewSceneProps {
  systemId?: string;
  centerId?: string;
  centerCoordinates?:
    | readonly [number, number, number]
    | [number, number, number]
    | { x: number; y: number; z: number };
  onInspectPlanet?: (planetId: string) => void;
  onNavigateGalaxy?: () => void;
  className?: string;
  variant?: 'card' | 'fullscreen';
}

export const SystemViewScene: React.FC<SystemViewSceneProps> = ({
  systemId = 'sol',
  centerId,
  centerCoordinates,
  onInspectPlanet,
  onNavigateGalaxy: _onNavigateGalaxy,
  className,
  variant = 'card',
}) => {
  const targetCoords = useMemo<[number, number, number]>(() => {
    if (!centerCoordinates) return [0, 0, 0];
    if ('x' in centerCoordinates) {
      return [centerCoordinates.x, centerCoordinates.y, centerCoordinates.z];
    }
    return [centerCoordinates[0], centerCoordinates[1], centerCoordinates[2]];
  }, [centerCoordinates]);

  const standardCam = useMemo(
    () => getStandardInitialCamera(STANDARD_CAMERA_DISTANCES.system, targetCoords),
    [targetCoords],
  );

  const containerClass = className
    ? `${styles.viewportContainer} ${className}`
    : styles.viewportContainer;

  return (
    <div className={containerClass} data-variant={variant}>
      <div className={styles.canvasWrapper}>
        <Canvas
          flat
          dpr={1}
          camera={{
            position: standardCam.position,
            up: standardCam.up,
            fov: standardCam.fov,
          }}
          gl={{ antialias: true, alpha: true }}
        >
          <SceneTokenBridge />
          <ambientLight intensity={0.5} />

          <OrbitControls
            makeDefault
            target={standardCam.target}
            enableDamping
            dampingFactor={CONTROLS_DAMPING_FACTOR}
            minDistance={2.0}
            maxDistance={45}
          />

          <SystemScene
            systemId={systemId}
            centerId={centerId}
            centerCoordinates={centerCoordinates ? targetCoords : undefined}
            onInspectPlanet={onInspectPlanet}
          />
        </Canvas>
        <SafeHtmlPortalOutlet />
      </div>
    </div>
  );
};

export interface PlanetaryViewSceneProps {
  planetId?: string;
  onNavigateSystem?: () => void;
  onNavigateGalaxy?: () => void;
  className?: string;
  variant?: 'card' | 'fullscreen';
}

export const PlanetaryViewScene: React.FC<PlanetaryViewSceneProps> = ({
  planetId = 'earth',
  onNavigateSystem: _onNavigateSystem,
  onNavigateGalaxy: _onNavigateGalaxy,
  className,
  variant = 'card',
}) => {
  const isEarth = planetId.toLowerCase() === 'earth';
  const planetDisplayName = isEarth ? 'Earth' : planetId.charAt(0).toUpperCase() + planetId.slice(1);

  const standardCam = useMemo(
    () => getStandardInitialCamera(STANDARD_CAMERA_DISTANCES.planetary, [0, 0, 0]),
    [],
  );

  const containerClass = className
    ? `${styles.viewportContainer} ${className}`
    : styles.viewportContainer;

  return (
    <div className={containerClass} data-variant={variant}>
      <div className={styles.canvasWrapper}>
        <Canvas
          flat
          dpr={1}
          camera={{
            position: standardCam.position,
            up: standardCam.up,
            fov: standardCam.fov,
          }}
          gl={{ antialias: true, alpha: true }}
        >
          <SceneTokenBridge />
          <ambientLight intensity={1.0} />

          <OrbitControls
            makeDefault
            target={standardCam.target}
            enableDamping
            dampingFactor={CONTROLS_DAMPING_FACTOR}
            minDistance={1.2}
            maxDistance={250}
          />

          <PlanetScene
            planetId={planetId}
            planetName={planetDisplayName}
            classification="terrestrial"
          />
        </Canvas>
        <SafeHtmlPortalOutlet />
      </div>
    </div>
  );
};

export interface InteractiveNavigatorProps {
  variant?: 'card' | 'fullscreen';
  initialScale?: 'galaxy' | 'system' | 'planet';
  initialSystemId?: string;
  initialPlanetId?: string;
}

export const InteractiveNavigator: React.FC<InteractiveNavigatorProps> = ({
  variant = 'card',
  initialScale = 'galaxy',
  initialSystemId = 'sol',
  initialPlanetId = 'earth',
}) => {
  const [scale, setScale] = useState<'galaxy' | 'system' | 'planet'>(initialScale);
  const [selectedSystemId, setSelectedSystemId] = useState<string>(initialSystemId);
  const [selectedPlanetId, setSelectedPlanetId] = useState<string>(initialPlanetId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (scale === 'planet') setScale('system');
        else if (scale === 'system') setScale('galaxy');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scale]);

  if (scale === 'planet') {
    return (
      <PlanetaryViewScene
        planetId={selectedPlanetId}
        variant={variant}
        onNavigateSystem={() => setScale('system')}
        onNavigateGalaxy={() => setScale('galaxy')}
      />
    );
  }

  if (scale === 'system') {
    return (
      <SystemViewScene
        systemId={selectedSystemId}
        variant={variant}
        onInspectPlanet={(planetId) => {
          setSelectedPlanetId(planetId);
          setScale('planet');
        }}
        onNavigateGalaxy={() => setScale('galaxy')}
      />
    );
  }

  return (
    <GalacticViewScene
      variant={variant}
      onInspectSystem={(systemId) => {
        setSelectedSystemId(systemId);
        setScale('system');
      }}
    />
  );
};
