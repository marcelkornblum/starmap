import React, { useMemo } from 'react';
import { OrbitControls } from '@react-three/drei';
import {
  getStandardInitialCamera,
  STANDARD_CAMERA_DISTANCES,
} from '../cartography';
import { CONTROLS_DAMPING_FACTOR } from '../engineConfig';
import { PlanetScene } from './PlanetScene';
import { EARTH_REFERENCE_TARGET } from '../../../config/referenceTargets';
import { SystemCameraController } from './SystemCameraController';
import { StandaloneSceneShell } from './StandaloneSceneShell';
import type {
  PlanetarySceneContentProps,
  PlanetaryViewSceneProps,
} from './spatialSceneTypes';

const ORIGIN_COORDS: readonly [number, number, number] = [0, 0, 0];

const getPlanetaryCamera = () =>
  getStandardInitialCamera(STANDARD_CAMERA_DISTANCES.planetary, ORIGIN_COORDS as [number, number, number]);

export const PlanetarySceneContent: React.FC<PlanetarySceneContentProps> = ({
  planetId = EARTH_REFERENCE_TARGET.id,
  planet,
  onInspectSatellite,
  onSelectEntity,
}) => {
  const isEarth = planetId.toLowerCase() === EARTH_REFERENCE_TARGET.id;
  const planetDisplayName = isEarth
    ? EARTH_REFERENCE_TARGET.name
    : planetId.charAt(0).toUpperCase() + planetId.slice(1);
  const standardCam = useMemo(() => getPlanetaryCamera(), []);

  return (
    <>
      <ambientLight intensity={1.0} />

      <OrbitControls
        makeDefault
        target={standardCam.target}
        enableDamping
        dampingFactor={CONTROLS_DAMPING_FACTOR}
        minDistance={1.2}
        maxDistance={250}
      />

      <SystemCameraController
        position={standardCam.position}
        target={standardCam.target}
        up={standardCam.up}
      />

      <PlanetScene
        planetId={planetId}
        planetName={planetDisplayName}
        classification="terrestrial"
        planet={planet}
        onInspectSatellite={onInspectSatellite}
        onSelectEntity={onSelectEntity}
      />
    </>
  );
};

export const PlanetaryViewScene: React.FC<PlanetaryViewSceneProps> = (props) => {
  const standardCam = useMemo(() => getPlanetaryCamera(), []);

  return (
    <StandaloneSceneShell
      className={props.className}
      variant={props.variant}
      camera={{ position: standardCam.position, up: standardCam.up, fov: standardCam.fov }}
    >
      <PlanetarySceneContent {...props} />
    </StandaloneSceneShell>
  );
};

export default PlanetarySceneContent;
