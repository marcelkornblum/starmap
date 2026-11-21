import type { SpatialEntityDefinition } from '../entity';
import type { StarDossierData } from './SystemScene';
import type { ExoplanetRecord } from '../../../types/astro';

export interface GalacticSceneContentProps {
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
}

export interface GalacticViewSceneProps extends GalacticSceneContentProps {
  className?: string;
  variant?: 'card' | 'fullscreen';
}

export interface SystemSceneContentProps {
  systemId?: string;
  system?: StarDossierData;
  centerId?: string;
  centerCoordinates?:
    | readonly [number, number, number]
    | [number, number, number]
    | { x: number; y: number; z: number };
  onInspectPlanet?: (planetId: string) => void;
  onSelectEntity?: (entityId: string | null) => void;
}

export interface SystemViewSceneProps extends SystemSceneContentProps {
  onNavigateGalaxy?: () => void;
  className?: string;
  variant?: 'card' | 'fullscreen';
}

export interface PlanetarySceneContentProps {
  planetId?: string;
  planet?: ExoplanetRecord;
  onInspectSatellite?: (satelliteId: string) => void;
  onSelectEntity?: (entityId: string | null) => void;
}

export interface PlanetaryViewSceneProps extends PlanetarySceneContentProps {
  onNavigateSystem?: () => void;
  onNavigateGalaxy?: () => void;
  className?: string;
  variant?: 'card' | 'fullscreen';
}
