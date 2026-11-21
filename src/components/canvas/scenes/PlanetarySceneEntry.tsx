import React, { useMemo } from 'react';
import { OrbitControls } from '@react-three/drei';
import {
  getStandardInitialCamera,
  STANDARD_CAMERA_DISTANCES,
} from '../cartography';
import { CONTROLS_DAMPING_FACTOR } from '../engineConfig';
import { PlanetScene } from './PlanetScene';
import { EARTH_REFERENCE_TARGET } from '../../../config/referenceTargets';
import { formatSlugFallbackTitle } from '../../../utils/starNaming';
import { SystemCameraController } from './SystemCameraController';
import { StandaloneSceneShell } from './StandaloneSceneShell';
import { resolveCenterCoords } from './useGalaxyViewCamera';
import { resolvePlanetaryEntitiesAndTarget } from './sceneTargetHelpers';
import type {
  PlanetarySceneContentProps,
  PlanetaryViewSceneProps,
} from './spatialSceneTypes';

export const PlanetarySceneContent: React.FC<PlanetarySceneContentProps> = ({
  planetId = EARTH_REFERENCE_TARGET.id,
  planet,
  centerId,
  centerCoordinates,
  onInspectSatellite,
  onSelectEntity,
}) => {
  const planetDisplayName = planet?.name ?? formatSlugFallbackTitle(planetId);
  const { targetCoords } = useMemo(
    () =>
      resolvePlanetaryEntitiesAndTarget({
        planetId,
        planetName: planetDisplayName,
        planet,
        centerId,
        centerCoordinates,
      }),
    [planetId, planetDisplayName, planet, centerId, centerCoordinates],
  );
  const hasExplicitCenter = Boolean(centerCoordinates || centerId);
  const standardCam = useMemo(
    () => getStandardInitialCamera(STANDARD_CAMERA_DISTANCES.planetary, targetCoords),
    [targetCoords],
  );

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
        hasExplicitCenter={hasExplicitCenter}
      />

      <PlanetScene
        planetId={planetId}
        planetName={planetDisplayName}
        classification="terrestrial"
        planet={planet}
        centerId={centerId}
        centerCoordinates={targetCoords}
        onInspectSatellite={onInspectSatellite}
        onSelectEntity={onSelectEntity}
      />
    </>
  );
};

export const PlanetaryViewScene: React.FC<PlanetaryViewSceneProps> = (props) => {
  const targetCoords = useMemo(() => resolveCenterCoords(props.centerCoordinates), [props.centerCoordinates]);
  const standardCam = useMemo(
    () => getStandardInitialCamera(STANDARD_CAMERA_DISTANCES.planetary, targetCoords),
    [targetCoords],
  );

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
