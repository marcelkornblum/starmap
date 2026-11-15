import React from 'react';
import {
  useSpatialEntityStoreApi,
  useOcclusionManager,
  CelestialEntity,
  OcclusionPass,
  ApertureEvaluator,
  JourneyChord,
  type SpatialEntityStore,
} from '../entity';
import { CameraRig } from '../instrument/CameraRig';
import { CartographicInstrument } from '../instrument/CartographicInstrument';
import { CartographicLighting } from '../instrument/CartographicLighting';
import { useCameraTransition } from '../instrument/useCameraTransition';
import { useViewportStoreSync } from './useViewportStoreSync';
import { useViewportPointerHandlers } from './useViewportPointerHandlers';
import type { SpatialViewportProps } from './SpatialViewport';

export interface SpatialViewportContentProps extends SpatialViewportProps {
  readonly outerStore?: SpatialEntityStore;
}

export const SpatialViewportContent: React.FC<SpatialViewportContentProps> = React.memo(({
  entities = [],
  mode = 'explore',
  onInspect,
  onSelect,
  onFocusChange,
  outerStore,
  children,
  showInstrument = true,
  showPlanarFootprint = false,
  debugHitarea = false,
  syncWithUIStore: _syncWithUIStore = true,
  initialSelectedId,
  enableFocusTransition = true,
  focusTransitionDuration,
  onDoubleClick,
  lighting,
  journeyLegs,
  activeJourneyMethod,
}) => {
  const storeApi = useSpatialEntityStoreApi();
  const occlusionManager = useOcclusionManager();
  const { transitionTo } = useCameraTransition();

  useViewportStoreSync({
    storeApi,
    outerStore,
    initialSelectedId,
  });

  const {
    handleEntityClick,
    handleEntityDoubleClick,
    handlePointerMissed,
  } = useViewportPointerHandlers({
    storeApi,
    occlusionManager,
    transitionTo,
    enableFocusTransition,
    focusTransitionDuration,
    onInspect,
    onSelect,
    onFocusChange,
    onDoubleClick,
  });

  return (
    <group
      name="spatial-viewport"
      userData={{ mode }}
      onPointerMissed={handlePointerMissed}
    >
      <OcclusionPass enabled={true} />
      <ApertureEvaluator />

      <CameraRig />
      {lighting !== false && (
        <CartographicLighting
          lightingOverride={typeof lighting === 'object' ? lighting : undefined}
        />
      )}

      {showInstrument && <CartographicInstrument showPlanarFootprint={showPlanarFootprint} />}

      {entities.map((entity) => (
        <CelestialEntity
          key={entity.id}
          {...entity}
          debugHitarea={debugHitarea}
          onClick={handleEntityClick}
          onDoubleClick={handleEntityDoubleClick}
        />
      ))}

      {journeyLegs && journeyLegs.length > 0 ? (
        <JourneyChord legs={journeyLegs} activeMethodId={activeJourneyMethod} />
      ) : null}

      {children}
    </group>
  );
});

SpatialViewportContent.displayName = 'SpatialViewportContent';
