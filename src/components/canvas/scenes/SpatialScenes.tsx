import React, { useMemo } from 'react';
import { OrbitControls } from '@react-three/drei';

import {
  getStandardInitialCamera,
  STANDARD_CAMERA_DISTANCES,
} from '../cartography';
import { CONTROLS_DAMPING_FACTOR } from '../engineConfig';
import { GalaxyScene } from './GalaxyScene';
import { SystemScene } from './SystemScene';
import { PlanetScene } from './PlanetScene';
import {
  EARTH_REFERENCE_TARGET,
  SOL_REFERENCE_TARGET,
} from '../../../config/referenceTargets';
import { GalacticCameraController } from './GalacticCameraController';
import { SystemCameraController } from './SystemCameraController';
import { StandaloneSceneShell } from './StandaloneSceneShell';
import {
  useGalaxyViewCamera,
  resolveCenterCoords,
} from './useGalaxyViewCamera';
import { useGalacticCeilingDistance } from './useGalacticCeilingDistance';
import type {
  GalacticSceneContentProps,
  GalacticViewSceneProps,
  SystemSceneContentProps,
  SystemViewSceneProps,
  PlanetarySceneContentProps,
  PlanetaryViewSceneProps,
} from './spatialSceneTypes';

const ORIGIN_COORDS: readonly [number, number, number] = [0, 0, 0];

const getPlanetaryCamera = () =>
  getStandardInitialCamera(STANDARD_CAMERA_DISTANCES.planetary, ORIGIN_COORDS as [number, number, number]);

export const GalacticSceneContent: React.FC<GalacticSceneContentProps> = React.memo(({
  initialSelectedId = null,
  onInspectSystem,
  onSelectSystem,
  onFocusChange,
  centerCoordinates,
  centerId,
  cameraDistance,
  additionalEntities,
}) => {
  const targetCoords = useMemo(() => resolveCenterCoords(centerCoordinates), [centerCoordinates]);
  const hasExplicitCenter = Boolean(centerCoordinates);
  const [maxSafeDistance, setCeilingApertureRadiusPc] = useGalacticCeilingDistance();

  return (
    <>
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
    </>
  );
});

export const GalacticViewScene: React.FC<GalacticViewSceneProps> = (props) => {
  const standardCam = useGalaxyViewCamera(props.centerCoordinates, props.cameraDistance);

  return (
    <StandaloneSceneShell
      className={props.className}
      variant={props.variant}
      camera={{ position: standardCam.position, up: standardCam.up, fov: standardCam.fov }}
    >
      <GalacticSceneContent {...props} />
    </StandaloneSceneShell>
  );
};

export const SystemSceneContent: React.FC<SystemSceneContentProps> = ({
  systemId = SOL_REFERENCE_TARGET.id,
  system,
  centerId,
  centerCoordinates,
  onInspectPlanet,
  onSelectEntity,
}) => {
  const targetCoords = useMemo(() => resolveCenterCoords(centerCoordinates), [centerCoordinates]);
  const standardCam = useMemo(
    () => getStandardInitialCamera(STANDARD_CAMERA_DISTANCES.system, targetCoords),
    [targetCoords],
  );

  return (
    <>
      <ambientLight intensity={0.5} />

      <OrbitControls
        makeDefault
        target={standardCam.target}
        enableDamping
        dampingFactor={CONTROLS_DAMPING_FACTOR}
        minDistance={2.0}
        maxDistance={45}
      />

      <SystemCameraController
        position={standardCam.position}
        target={standardCam.target}
        up={standardCam.up}
      />

      <SystemScene
        systemId={systemId}
        system={system}
        centerId={centerId}
        centerCoordinates={centerCoordinates ? targetCoords : undefined}
        onInspectPlanet={onInspectPlanet}
        onSelectEntity={onSelectEntity}
      />
    </>
  );
};

export const SystemViewScene: React.FC<SystemViewSceneProps> = (props) => {
  const targetCoords = useMemo(() => resolveCenterCoords(props.centerCoordinates), [props.centerCoordinates]);
  const standardCam = useMemo(
    () => getStandardInitialCamera(STANDARD_CAMERA_DISTANCES.system, targetCoords),
    [targetCoords],
  );

  return (
    <StandaloneSceneShell
      className={props.className}
      variant={props.variant}
      camera={{ position: standardCam.position, up: standardCam.up, fov: standardCam.fov }}
    >
      <SystemSceneContent {...props} />
    </StandaloneSceneShell>
  );
};

export const PlanetarySceneContent: React.FC<PlanetarySceneContentProps> = ({
  planetId = EARTH_REFERENCE_TARGET.id,
  planet,
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
