import type React from 'react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import {
  getStandardInitialCamera,
  STANDARD_CAMERA_DISTANCES,
} from '../cartography';
import { SceneTokenBridge } from '../ThemeTokenBridge';
import { SafeHtmlPortalOutlet } from '../SafeHtml';
import { CONTROLS_DAMPING_FACTOR } from '../engineConfig';
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
  className?: string;
  variant?: 'card' | 'fullscreen';
}

const GalacticCameraController: React.FC<{
  target: [number, number, number];
}> = ({ target }) => {
  const three = useThree();
  const camera = three.camera;
  const controls = (three as any).controls as {
    target: THREE.Vector3;
    update?: () => void;
  } | undefined;
  const prevTargetRef = useRef<[number, number, number]>(target);

  useEffect(() => {
    const prev = prevTargetRef.current;
    if (
      prev[0] === target[0] &&
      prev[1] === target[1] &&
      prev[2] === target[2]
    ) {
      return;
    }
    prevTargetRef.current = target;

    const newTarget = new THREE.Vector3(target[0], target[1], target[2]);
    const prevTarget = controls?.target
      ? controls.target.clone()
      : new THREE.Vector3(prev[0], prev[1], prev[2]);
    const delta = newTarget.clone().sub(prevTarget);

    camera.position.add(delta);
    camera.lookAt(newTarget);

    if (controls) {
      controls.target.copy(newTarget);
      controls.update?.();
    }
  }, [target, camera, controls]);

  return null;
};

export const GalacticViewScene: React.FC<GalacticViewSceneProps> = ({
  initialSelectedId = null,
  onInspectSystem,
  onSelectSystem,
  centerCoordinates,
  centerId,
  className,
  variant = 'card',
}) => {
  const targetCoords = useMemo<[number, number, number]>(() => {
    if (!centerCoordinates) return [0, 0, 0];
    if (Array.isArray(centerCoordinates)) {
      return [centerCoordinates[0], centerCoordinates[1], centerCoordinates[2]];
    }
    const c = centerCoordinates as { x: number; y: number; z: number };
    return [c.x, c.y, c.z];
  }, [centerCoordinates]);

  const standardCam = useMemo(
    () => getStandardInitialCamera(STANDARD_CAMERA_DISTANCES.galactic, targetCoords),
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
          <ambientLight intensity={0.4} />

          <OrbitControls
            makeDefault
            target={standardCam.target}
            enableDamping
            dampingFactor={CONTROLS_DAMPING_FACTOR}
            minDistance={2.5}
            maxDistance={85}
          />

          <GalacticCameraController target={targetCoords} />

          <GalaxyScene
            initialSelectedId={initialSelectedId ?? centerId}
            onInspectSystem={onInspectSystem}
            onSelectSystem={onSelectSystem}
          />
        </Canvas>
        <SafeHtmlPortalOutlet />
      </div>
    </div>
  );
};

export interface SystemViewSceneProps {
  systemId?: string;
  onInspectPlanet?: (planetId: string) => void;
  onNavigateGalaxy?: () => void;
  className?: string;
  variant?: 'card' | 'fullscreen';
}

export const SystemViewScene: React.FC<SystemViewSceneProps> = ({
  systemId = 'sol',
  onInspectPlanet,
  onNavigateGalaxy: _onNavigateGalaxy,
  className,
  variant = 'card',
}) => {
  const standardCam = useMemo(
    () => getStandardInitialCamera(STANDARD_CAMERA_DISTANCES.system, [0, 0, 0]),
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
