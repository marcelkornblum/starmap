import type React from 'react';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import {
  getStandardInitialCamera,
  STANDARD_CAMERA_DISTANCES,
} from '../cartography';
import {
  computeCeilingMaxCameraDistancePc,
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
  cameraDistance?: number;
  additionalEntities?: readonly SpatialEntityDefinition[];
  className?: string;
  variant?: 'card' | 'fullscreen';
}

interface OrbitControlsLike {
  target: THREE.Vector3;
  update?: () => void;
  addEventListener?: (type: string, listener: (event: unknown) => void) => void;
  removeEventListener?: (type: string, listener: (event: unknown) => void) => void;
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
  readonly distance?: number;
}

export const GalacticCameraController: React.FC<GalacticCameraControllerProps> = ({
  target,
  distance,
}) => {
  const three = useThree();
  const camera = three.camera;
  const controls =
    'controls' in three && isOrbitControlsLike(three.controls)
      ? three.controls
      : undefined;
  const recenterTick = useCameraStore((s) => s.recenterTick);
  const prevTargetRef = useRef<[number, number, number]>([
    Number.NaN,
    Number.NaN,
    Number.NaN,
  ]);
  const prevDistanceRef = useRef<number>(Number.NaN);
  const prevRecenterTickRef = useRef<number>(-1);
  const prevControlsRef = useRef<OrbitControlsLike | undefined>(undefined);
  const hasRestoredRef = useRef(false);

  const scratchNewTargetRef = useLazyRef(() => new THREE.Vector3());
  const scratchPrevTargetRef = useLazyRef(() => new THREE.Vector3());
  const scratchDeltaRef = useLazyRef(() => new THREE.Vector3());
  const scratchOffsetRef = useLazyRef(() => new THREE.Vector3());

  const targetX = target[0];
  const targetY = target[1];
  const targetZ = target[2];

  const saveCurrentGalaxyPose = useCallback(() => {
    const tgt: [number, number, number] = controls?.target
      ? [controls.target.x, controls.target.y, controls.target.z]
      : [targetX, targetY, targetZ];
    const pos: [number, number, number] = [
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ];
    const up: [number, number, number] = [
      camera.up.x,
      camera.up.y,
      camera.up.z,
    ];
    const focalDistance = controls?.target
      ? camera.position.distanceTo(controls.target)
      : camera.position.length();

    useCameraStore.getState().setSavedGalaxyCamera({
      position: pos,
      target: tgt,
      up,
      zoom: camera.zoom,
      focalDistance,
      centerKey: `${tgt[0]},${tgt[1]},${tgt[2]}`,
    });
  }, [camera, controls, targetX, targetY, targetZ]);

  useEffect(() => {
    if (controls?.addEventListener && controls?.removeEventListener) {
      const handleChange = () => {
        saveCurrentGalaxyPose();
      };
      controls.addEventListener('change', handleChange);
      controls.addEventListener('end', handleChange);
      return () => {
        controls.removeEventListener?.('change', handleChange);
        controls.removeEventListener?.('end', handleChange);
        saveCurrentGalaxyPose();
      };
    }
  }, [controls, saveCurrentGalaxyPose]);

  useEffect(() => {
    const prev = prevTargetRef.current;
    const prevDist = prevDistanceRef.current;
    const prevTick = prevRecenterTickRef.current;
    const isTargetSame =
      prev[0] === targetX &&
      prev[1] === targetY &&
      prev[2] === targetZ;
    const isDistSame = distance === prevDist || (distance === undefined && Number.isNaN(prevDist));
    const isTickSame = recenterTick === prevTick;
    const isControlsSame = controls === prevControlsRef.current;

    if (
      isTargetSame &&
      isDistSame &&
      isTickSame &&
      isControlsSame &&
      (hasRestoredRef.current || !useCameraStore.getState().savedGalaxyCamera)
    ) {
      return;
    }

    const saved = useCameraStore.getState().savedGalaxyCamera;
    if (!hasRestoredRef.current && saved && distance === undefined) {
      const isMatch = Math.hypot(
        saved.target[0] - targetX,
        saved.target[1] - targetY,
        saved.target[2] - targetZ,
      ) < 0.05;

      const isTransientZero =
        targetX === 0 &&
        targetY === 0 &&
        targetZ === 0 &&
        (saved.target[0] !== 0 || saved.target[1] !== 0 || saved.target[2] !== 0);

      if (isMatch || isTransientZero) {
        camera.position.set(saved.position[0], saved.position[1], saved.position[2]);
        camera.up.set(saved.up[0], saved.up[1], saved.up[2]);
        camera.zoom = saved.zoom;
        camera.updateProjectionMatrix();

        if (controls) {
          controls.target.set(saved.target[0], saved.target[1], saved.target[2]);
          controls.update?.();
          if (isMatch) {
            hasRestoredRef.current = true;
          }
        } else {
          camera.lookAt(saved.target[0], saved.target[1], saved.target[2]);
        }

        useCameraStore.getState().setCameraPose({
          position: saved.position,
          target: saved.target,
          up: saved.up,
          zoom: saved.zoom,
          focalDistance: saved.focalDistance,
        });

        if (controls && isMatch) {
          saveCurrentGalaxyPose();
        }

        prevTargetRef.current = [saved.target[0], saved.target[1], saved.target[2]];
        prevDistanceRef.current = distance ?? Number.NaN;
        prevRecenterTickRef.current = recenterTick;
        prevControlsRef.current = controls;
        return;
      }
    }

    const isInitialMount = Number.isNaN(prev[0]);
    if (isInitialMount && saved && distance === undefined) {
      // Relative offset preservation for new target
      const relOffsetX = saved.position[0] - saved.target[0];
      const relOffsetY = saved.position[1] - saved.target[1];
      const relOffsetZ = saved.position[2] - saved.target[2];

      camera.position.set(
        targetX + relOffsetX,
        targetY + relOffsetY,
        targetZ + relOffsetZ,
      );
      camera.up.set(saved.up[0], saved.up[1], saved.up[2]);
      camera.zoom = saved.zoom;
      camera.updateProjectionMatrix();

      if (controls) {
        controls.target.set(targetX, targetY, targetZ);
        controls.update?.();
        hasRestoredRef.current = true;
      } else {
        camera.lookAt(targetX, targetY, targetZ);
      }

      useCameraStore.getState().setCameraPose({
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [targetX, targetY, targetZ],
        up: saved.up,
        zoom: saved.zoom,
        focalDistance: Math.hypot(relOffsetX, relOffsetY, relOffsetZ),
      });

      if (controls) {
        saveCurrentGalaxyPose();
      }

      prevTargetRef.current = [targetX, targetY, targetZ];
      prevDistanceRef.current = distance ?? Number.NaN;
      prevRecenterTickRef.current = recenterTick;
      prevControlsRef.current = controls;
      return;
    }

    const newTarget = scratchNewTargetRef.current.set(targetX, targetY, targetZ);

    const prevTarget = Number.isFinite(prev[0])
      ? scratchPrevTargetRef.current.set(prev[0], prev[1], prev[2])
      : controls?.target
        ? scratchPrevTargetRef.current.copy(controls.target)
        : scratchPrevTargetRef.current.set(0, 0, 0);
    const delta = scratchDeltaRef.current.copy(newTarget).sub(prevTarget);

    camera.position.add(delta);
    camera.lookAt(newTarget);

    if (controls) {
      controls.target.copy(newTarget);
    }

    // When distance is provided and finite > 0, scale camera-to-target offset to distance
    if (typeof distance === 'number' && Number.isFinite(distance) && distance > 0) {
      const offset = scratchOffsetRef.current.copy(camera.position).sub(newTarget);
      if (offset.lengthSq() > 1e-6) {
        offset.setLength(distance);
        camera.position.copy(newTarget).add(offset);
      }
    }

    if (controls) {
      controls.update?.();
    }

    const finalTarget: [number, number, number] = controls?.target
      ? [controls.target.x, controls.target.y, controls.target.z]
      : [targetX, targetY, targetZ];
    const finalPos: [number, number, number] = [
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ];
    const finalUp: [number, number, number] = [
      camera.up.x,
      camera.up.y,
      camera.up.z,
    ];
    const finalDist = Math.hypot(
      finalPos[0] - finalTarget[0],
      finalPos[1] - finalTarget[1],
      finalPos[2] - finalTarget[2],
    );
    useCameraStore.getState().setCameraPose({
      position: finalPos,
      target: finalTarget,
      up: finalUp,
      zoom: camera.zoom,
      focalDistance: finalDist,
    });
    saveCurrentGalaxyPose();

    prevTargetRef.current = [targetX, targetY, targetZ];
    prevDistanceRef.current = distance ?? Number.NaN;
    prevRecenterTickRef.current = recenterTick;
    prevControlsRef.current = controls;
  }, [
    targetX,
    targetY,
    targetZ,
    distance,
    recenterTick,
    camera,
    controls,
    saveCurrentGalaxyPose,
    scratchNewTargetRef,
    scratchPrevTargetRef,
    scratchDeltaRef,
    scratchOffsetRef,
  ]);

  return null;
};

export const GalacticViewScene: React.FC<GalacticViewSceneProps> = ({
  initialSelectedId = null,
  onInspectSystem,
  onSelectSystem,
  centerCoordinates,
  centerId,
  cameraDistance,
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

  const resolvedCameraDistance =
    typeof cameraDistance === 'number' && Number.isFinite(cameraDistance) && cameraDistance > 0
      ? cameraDistance
      : STANDARD_CAMERA_DISTANCES.galactic;

  const standardCam = useMemo(() => {
    const saved = useCameraStore.getState().savedGalaxyCamera;
    const isTargetZero = targetCoords[0] === 0 && targetCoords[1] === 0 && targetCoords[2] === 0;
    const isSavedMatch =
      saved &&
      (isTargetZero ||
        Math.hypot(
          saved.target[0] - targetCoords[0],
          saved.target[1] - targetCoords[1],
          saved.target[2] - targetCoords[2],
        ) < 0.05);

    if (saved && isSavedMatch && !cameraDistance) {
      return {
        position: saved.position,
        target: saved.target,
        up: saved.up,
        fov: 45,
      };
    }
    return getStandardInitialCamera(resolvedCameraDistance, targetCoords);
  }, [resolvedCameraDistance, targetCoords, cameraDistance]);

  const [ceilingApertureRadiusPc, setCeilingApertureRadiusPc] = useState<number | null>(null);
  const budget = useMemo(() => getDeviceTierBudget(), []);

  const maxSafeDistance = useMemo(
    () => computeCeilingMaxCameraDistancePc(budget, { ceilingApertureRadiusPc }),
    [budget, ceilingApertureRadiusPc],
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
            enableDamping
            dampingFactor={CONTROLS_DAMPING_FACTOR}
            minDistance={2.5}
            maxDistance={maxSafeDistance}
          />

          <GalacticCameraController target={targetCoords} distance={cameraDistance} />

          <GalaxyScene
            initialSelectedId={initialSelectedId ?? centerId}
            onInspectSystem={onInspectSystem}
            onSelectSystem={onSelectSystem}
            additionalEntities={additionalEntities}
            onCeilingApertureRadiusChange={setCeilingApertureRadiusPc}
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
  onSelectEntity?: (entityId: string | null) => void;
  onNavigateGalaxy?: () => void;
  className?: string;
  variant?: 'card' | 'fullscreen';
}

export const SystemViewScene: React.FC<SystemViewSceneProps> = ({
  systemId = 'sol',
  centerId,
  centerCoordinates,
  onInspectPlanet,
  onSelectEntity,
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
            onSelectEntity={onSelectEntity}
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
