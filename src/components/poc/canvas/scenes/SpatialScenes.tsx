import type React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

import {
  getStandardInitialCamera,
  STANDARD_CAMERA_DISTANCES,
} from '../../../canvas/cartography';
import { SceneTokenBridge } from '../ThemeTokenBridge';
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
} from '../../../../data';

export interface GalacticViewSceneProps {
  initialSelectedId?: string | null;
  onInspectSystem?: (systemId: string) => void;
  className?: string;
  variant?: 'card' | 'fullscreen';
}

export const GalacticViewScene: React.FC<GalacticViewSceneProps> = ({
  initialSelectedId = null,
  onInspectSystem,
  className,
  variant = 'card',
}) => {
  const standardCam = useMemo(
    () => getStandardInitialCamera(STANDARD_CAMERA_DISTANCES.galactic, [0, 0, 0]),
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

          <GalaxyScene
            initialSelectedId={initialSelectedId}
            onInspectSystem={onInspectSystem}
          />
        </Canvas>
      </div>
    </div>
  );
};

export interface SystemViewSceneProps {
  systemId?: string;
  onInspectPlanet?: (planetId: string) => void;
  onNavigateGalaxy?: () => void;
}

export const SystemViewScene: React.FC<SystemViewSceneProps> = ({
  systemId = 'sol',
  onInspectPlanet,
  onNavigateGalaxy: _onNavigateGalaxy,
}) => {
  const standardCam = useMemo(
    () => getStandardInitialCamera(STANDARD_CAMERA_DISTANCES.system, [0, 0, 0]),
    [],
  );

  return (
    <div className={styles.viewportContainer}>
      <div className={styles.canvasWrapper}>
        <Canvas
          flat
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
      </div>
    </div>
  );
};

export interface PlanetaryViewSceneProps {
  planetId?: string;
  onNavigateSystem?: () => void;
  onNavigateGalaxy?: () => void;
}

export const PlanetaryViewScene: React.FC<PlanetaryViewSceneProps> = ({
  planetId = 'earth',
  onNavigateSystem: _onNavigateSystem,
  onNavigateGalaxy: _onNavigateGalaxy,
}) => {
  const isEarth = planetId.toLowerCase() === 'earth';
  const planetDisplayName = isEarth ? 'Earth' : planetId.charAt(0).toUpperCase() + planetId.slice(1);

  const standardCam = useMemo(
    () => getStandardInitialCamera(STANDARD_CAMERA_DISTANCES.planetary, [0, 0, 0]),
    [],
  );

  return (
    <div className={styles.viewportContainer}>
      <div className={styles.canvasWrapper}>
        <Canvas
          flat
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
      </div>
    </div>
  );
};

export const InteractiveNavigator: React.FC = () => {
  const [scale, setScale] = useState<'galaxy' | 'system' | 'planet'>('galaxy');
  const [selectedSystemId, setSelectedSystemId] = useState<string>('sol');
  const [selectedPlanetId, setSelectedPlanetId] = useState<string>('earth');

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
        onNavigateSystem={() => setScale('system')}
        onNavigateGalaxy={() => setScale('galaxy')}
      />
    );
  }

  if (scale === 'system') {
    return (
      <SystemViewScene
        systemId={selectedSystemId}
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
      onInspectSystem={(systemId) => {
        setSelectedSystemId(systemId);
        setScale('system');
      }}
    />
  );
};
