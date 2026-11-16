import type {
  CelestialClassification,
  SpatialEntityDefinition,
} from '../../types/spatial';
import type { CelestialSymbolType } from '../../types/astro';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import type {
  FocusedEntityKind,
} from './detailsEntityTypes';
import type { OrbitalSchematicEntityKind } from './detailsHierarchyTypes';

export interface BreadcrumbRouteLink {
  readonly label: string;
  readonly href?: string;
  readonly reticleType?: CelestialSymbolType;
}

export interface SceneCameraUrlState {
  readonly center?: string;
  readonly x?: number;
  readonly y?: number;
  readonly z?: number;
  readonly az?: number;
  readonly el?: number;
  readonly dist?: number;
  readonly zoom?: number;
}

export type PreviewMode =
  | 'system-orbits'
  | 'planetary-system'
  | 'object-orbit';

export interface PreviewOrbitElement {
  readonly id: string;
  readonly name: string;
  readonly kind: OrbitalSchematicEntityKind;
  readonly orbitRank: number;
  readonly semiMajorAxisAu?: number;
  readonly inclinationDeg?: number;
  readonly eccentricity?: number;
  readonly inHabitableZone: boolean;
}

export interface FocusedPreviewSummary {
  readonly targetId: string;
  readonly targetName: string;
  readonly systemId: string;
  readonly systemName: string;
  readonly focusedKind: FocusedEntityKind;
  readonly previewMode: PreviewMode;
  readonly reticleType?: CelestialClassification;
  readonly primaryInclinationDeg?: number;
  readonly primaryEccentricity?: number;
  readonly primarySemiMajorAxisAu?: number;
  readonly orbitElements: readonly PreviewOrbitElement[];
}

export type MinimapScope = 'galaxy' | 'system' | 'planet';

export interface MinimapMarkerItem {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly role: 'origin' | 'anchor' | 'focused' | 'selected';
  readonly href: string;
  readonly coordinatesPc?: readonly [number, number, number];
  readonly distanceFromOriginPc?: number;
  readonly semiMajorAxisAu?: number;
}

export interface MinimapOrientationSummary {
  readonly scope: MinimapScope;
  readonly anchorId: string;
  readonly anchorName: string;
  readonly systemId: string;
  readonly systemName: string;
  readonly sectorName?: string;
  readonly coordinatesPc?: readonly [number, number, number];
  readonly distanceFromOriginPc?: number;
  readonly outerOrbitalRadiusAu?: number;
  readonly habitableZoneAu?: readonly [number, number];
  readonly parentSemiMajorAxisAu?: number;
  readonly orbitingBodyCount?: number;
  readonly cameraAzimuthDeg?: number;
  readonly cameraElevationDeg?: number;
  readonly cameraDistance?: number;
  readonly focusedMarker: MinimapMarkerItem | null;
  readonly selectedMarkers: readonly MinimapMarkerItem[];
  readonly markers: readonly MinimapMarkerItem[];
}

export interface ResolveGalacticInstrumentApertureInput {
  readonly cameraState?: SceneCameraUrlState;
  readonly corpus?: readonly CompactSearchEntry[];
  readonly focusedEntity?: SpatialEntityDefinition | null;
  readonly centerEntity?: SpatialEntityDefinition | null;
  readonly urlSystemSlug?: string | null;
  readonly liveApertureCenterPc?: readonly [number, number, number] | null;
  readonly liveApertureRadiusPc?: number | null;
  readonly maxActiveEntities?: number;
  readonly viewportWidthPx?: number;
}

export interface GalacticInstrumentApertureResult {
  readonly centerId: string;
  readonly centerName: string;
  readonly centerCoordinatesPc: readonly [number, number, number];
  readonly rawAperturePc: number;
  readonly apertureRadiusPc: number;
  readonly apertureRadiusLy: number;
  readonly apertureIds: Set<string>;
  readonly ceilingApertureRadiusPc?: number | null;
  readonly systemsById: ReadonlyMap<
    string,
    {
      readonly id: string;
      readonly name: string;
      readonly coordinatesPc: readonly [number, number, number];
      readonly entry: CompactSearchEntry;
    }
  >;
}

export interface ExtractGalaxyBodiesInput {
  readonly corpus?: readonly CompactSearchEntry[];
  readonly focusedEntity?: SpatialEntityDefinition | null;
  readonly selectedEntities?: readonly SpatialEntityDefinition[];
  readonly hoveredEntityId?: string | null;
  readonly cameraState?: SceneCameraUrlState;
  readonly centerEntity?: SpatialEntityDefinition | null;
  readonly urlSystemSlug?: string | null;
  readonly hasExplicitFocus?: boolean;
  readonly currentSearch?: string;
  readonly aperture?: GalacticInstrumentApertureResult;
  readonly maxActiveEntities?: number;
}
