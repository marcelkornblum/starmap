import React, { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GALACTIC_FRAME } from '../../../config/referenceFrames';
import { CONTROLS_DAMPING_FACTOR } from '../engineConfig';
import { GalaxyScene } from './GalaxyScene';
import { GalacticCameraController } from './GalacticCameraController';
import { StandaloneSceneShell } from './StandaloneSceneShell';
import { resolveCenterCoords } from './cameraControllerUtils';
import { useGalaxyViewCamera } from './useGalaxyViewCamera';
import { useGalacticCeilingDistance } from './useGalacticCeilingDistance';
import type {
  GalacticSceneContentProps,
  GalacticViewSceneProps,
} from './spatialSceneTypes';

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
  const viewportAspect = useThree((s) =>
    s.size ? Math.round((s.size.width / Math.max(1, s.size.height)) * 20) / 20 : undefined,
  );
  const [maxSafeDistance, setCeilingApertureRadiusPc] = useGalacticCeilingDistance({
    viewportAspect,
    minDistancePc: 2.5,
  });

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
        minCameraDistance={2.5}
        maxCameraDistance={maxSafeDistance}
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
      camera={{
        position: standardCam.position,
        up: standardCam.up,
        fov: standardCam.fov,
        far: GALACTIC_FRAME.camera.far,
      }}
    >
      <GalacticSceneContent {...props} />
    </StandaloneSceneShell>
  );
};

export default GalacticSceneContent;
