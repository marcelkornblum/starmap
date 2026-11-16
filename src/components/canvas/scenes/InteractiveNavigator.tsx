import type React from 'react';
import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { SceneTokenBridge } from '../ThemeTokenBridge';
import { SafeHtmlPortalOutlet } from '../SafeHtml';
import type { SpatialEntityDefinition } from '../entity';
import {
  GalacticSceneContent,
  SystemSceneContent,
  PlanetarySceneContent,
} from './SpatialScenes';
import {
  EARTH_REFERENCE_TARGET,
  SOL_REFERENCE_TARGET,
} from '../../../config/referenceTargets';
import styles from './SpatialScenes.module.css';

export interface InteractiveNavigatorProps {
  variant?: 'card' | 'fullscreen';
  initialScale?: 'galaxy' | 'system' | 'planet';
  initialSystemId?: string;
  initialPlanetId?: string;
  additionalEntities?: readonly SpatialEntityDefinition[];
  className?: string;
}

export const InteractiveNavigator: React.FC<InteractiveNavigatorProps> = ({
  variant = 'card',
  initialScale = 'galaxy',
  initialSystemId = SOL_REFERENCE_TARGET.id,
  initialPlanetId = EARTH_REFERENCE_TARGET.id,
  additionalEntities,
  className,
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

  const containerClass = className
    ? `${styles.viewportContainer} ${className}`
    : styles.viewportContainer;

  return (
    <div className={containerClass} data-variant={variant}>
      <div className={styles.canvasWrapper}>
        <Canvas
          flat
          dpr={1}
          gl={{ antialias: true, alpha: true }}
        >
          <SceneTokenBridge />
          {scale === 'galaxy' && (
            <GalacticSceneContent
              additionalEntities={additionalEntities}
              onInspectSystem={(systemId) => {
                setSelectedSystemId(systemId);
                setScale('system');
              }}
            />
          )}
          {scale === 'system' && (
            <SystemSceneContent
              systemId={selectedSystemId}
              onInspectPlanet={(planetId) => {
                setSelectedPlanetId(planetId);
                setScale('planet');
              }}
            />
          )}
          {scale === 'planet' && (
            <PlanetarySceneContent
              planetId={selectedPlanetId}
            />
          )}
        </Canvas>
        <SafeHtmlPortalOutlet />
      </div>
    </div>
  );
};
