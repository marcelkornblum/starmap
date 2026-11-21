import React, { useMemo } from 'react';
import { OrbitControls } from '@react-three/drei';
import {
  getStandardInitialCamera,
  STANDARD_CAMERA_DISTANCES,
} from '../cartography';
import { CONTROLS_DAMPING_FACTOR } from '../engineConfig';
import { SystemScene } from './SystemScene';
import { SOL_REFERENCE_TARGET } from '../../../config/referenceTargets';
import { StandaloneSceneShell } from './StandaloneSceneShell';
import { resolveCenterCoords } from './useGalaxyViewCamera';
import type {
  SystemSceneContentProps,
  SystemViewSceneProps,
} from './spatialSceneTypes';

export const SystemSceneContent: React.FC<SystemSceneContentProps> = React.memo(({
  systemId = SOL_REFERENCE_TARGET.id,
  system,
  centerId,
  centerCoordinates,
  onInspectPlanet,
  onSelectEntity,
}) => (
  <>
    <ambientLight intensity={0.5} />

    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={CONTROLS_DAMPING_FACTOR}
      minDistance={2.0}
      maxDistance={45}
    />

    <SystemScene
      systemId={systemId}
      system={system}
      centerId={centerId}
      centerCoordinates={centerCoordinates}
      onInspectPlanet={onInspectPlanet}
      onSelectEntity={onSelectEntity}
    />
  </>
));

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

export default SystemSceneContent;
