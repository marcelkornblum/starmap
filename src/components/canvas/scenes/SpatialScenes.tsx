import type React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

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
import type { SpatialEntityDefinition } from '../entity';
import { GalaxyScene } from './GalaxyScene';
import { SystemScene, type StarDossierData } from './SystemScene';
import { PlanetScene } from './PlanetScene';
import type { PlanetRecord } from '../../../types/astro';

import styles from './SpatialScenes.module.css';

import {
  GalacticCameraController,
  type GalacticCameraControllerProps,
} from './GalacticCameraController';

export { GalacticCameraController, type GalacticCameraControllerProps };

export interface GalacticViewSceneProps {
  initialSelectedId?: string | null;
  onInspectSystem?: (systemId: string) => void;
  onSelectSystem?: (systemId: string | null) => void;
  onFocusChange?: (systemId: string | null) => void;
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

export const GalacticViewScene: React.FC<GalacticViewSceneProps> = ({
  initialSelectedId = null,
  onInspectSystem,
  onSelectSystem,
  onFocusChange,
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

  const hasExplicitCenter = Boolean(centerCoordinates);

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

          <GalacticCameraController
            target={targetCoords}
            distance={cameraDistance}
            hasExplicitCenter={hasExplicitCenter}
          />

          <GalaxyScene
            initialSelectedId={initialSelectedId ?? centerId}
            onInspectSystem={onInspectSystem}
            onSelectSystem={onSelectSystem}
            onFocusChange={onFocusChange}
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
  system?: StarDossierData;
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
  system,
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
            system={system}
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
  planet?: PlanetRecord;
  onNavigateSystem?: () => void;
  onNavigateGalaxy?: () => void;
  className?: string;
  variant?: 'card' | 'fullscreen';
}

export const PlanetaryViewScene: React.FC<PlanetaryViewSceneProps> = ({
  planetId = 'earth',
  planet,
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
            planet={planet}
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
  additionalEntities?: readonly SpatialEntityDefinition[];
}

export const InteractiveNavigator: React.FC<InteractiveNavigatorProps> = ({
  variant = 'card',
  initialScale = 'galaxy',
  initialSystemId = 'sol',
  initialPlanetId = 'earth',
  additionalEntities,
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
      additionalEntities={additionalEntities}
      onInspectSystem={(systemId) => {
        setSelectedSystemId(systemId);
        setScale('system');
      }}
    />
  );
};
