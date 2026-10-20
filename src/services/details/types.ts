import type { CelestialClassification } from '../../components/canvas/cartography/reticleGeometry';
import type { SpatialEntityDefinition } from '../../components/canvas/entity/types';
import type { DecodedDetailRecord } from '../../data/detailsRepository';
import type { PlanetCompositionClass } from '../../data/guideCatalog';
import type {
  CircumstellarDiskKind,
  CircumstellarDiskRecord,
  DatasetLayerKind,
  DatasetLayerManifest,
  DatasetLayerTargetType,
  ObservationalConfidence,
  SystemSummaryNode,
} from '../../types/astro';
import type { CompactSearchEntry } from '../../utils/compactDataCodec';

export type { PlanetCompositionClass };

export type HazardSeverity = 'warning' | 'critical';

export interface EntityHazardItem {
  readonly code: string;
  readonly label: string;
  readonly severity: HazardSeverity;
  readonly description: string;
}

export type FocusedEntityKind =
  | 'system'
  | 'star'
  | 'planet'
  | 'belt'
  | 'minor-body'
  | 'structure';

export interface FocusedDiskDetail {
  readonly id: string;
  readonly name: string;
  readonly kind: CircumstellarDiskKind;
  readonly kindLabel: string;
  readonly href: string;
  readonly innerRadiusAu: number;
  readonly outerRadiusAu: number;
  readonly semiMajorAxisAu: number;
  readonly tempK?: number;
  readonly composition: string;
  readonly confidence?: ObservationalConfidence;
  readonly guideHref: string;
}

export interface PlanetCompositionCount {
  readonly composition: PlanetCompositionClass;
  readonly count?: number;
}

export type SystemSummarySegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'spectral-badge'; readonly spectralType: string }
  | { readonly kind: 'planet-type-badge'; readonly composition: PlanetCompositionClass }
  | { readonly kind: 'habitable-badge'; readonly label: string };

export interface FocusedStarDetail {
  readonly id: string;
  readonly name: string;
  readonly href?: string;
  readonly componentDesignation: string;
  readonly spectralType: string;
  readonly mag: number;
  readonly absmag: number;
  readonly massMsun?: number;
  readonly radiusRsun?: number;
  readonly luminosityLsun?: number;
  readonly effectiveTempK?: number;
}

export interface FocusedPlanetDetail {
  readonly id: string;
  readonly name: string;
  readonly href?: string;
  readonly letter?: string;
  readonly composition: PlanetCompositionClass;
  readonly semiMajorAxisAu?: number;
  readonly periodDays?: number;
  readonly eccentricity?: number;
  readonly inclinationDeg?: number;
  readonly massMearth?: number;
  readonly radiusRearth?: number;
  readonly equilibriumTempK?: number;
  readonly esi?: number;
  readonly surfaceGravityG?: number;
  readonly isTidallyLocked?: boolean;
  readonly discoveryYear?: number;
  readonly discoveryMethod?: string;
  readonly isHabitableCandidate: boolean;
  readonly hazardCount?: number;
  readonly hazards?: readonly EntityHazardItem[];
}

export interface FocusedCanonAnnotation {
  readonly layerId: string;
  readonly layerTitle: string;
  readonly layerHref: string;
  readonly href: string;
  readonly kind: DatasetLayerKind;
  readonly targetId: string;
  readonly targetType: DatasetLayerTargetType;
  readonly inUniverseName?: string;
  readonly workTitle?: string;
  readonly text: string;
  readonly creator?: string;
  readonly publicationYear?: string;
  readonly tags: readonly string[];
}

export interface CanonAnnotationOrderOptions {
  readonly kindOrder?: readonly DatasetLayerKind[];
  readonly layerIdOrder?: readonly string[];
}

export interface FocusedStarTelemetry {
  readonly componentDesignation: string;
  readonly spectralType: string;
  readonly mag: number;
  readonly absmag: number;
  readonly massMsun?: number;
  readonly radiusRsun?: number;
  readonly luminosityLsun?: number;
  readonly effectiveTempK?: number;
}

export interface FocusedPlanetTelemetry {
  readonly composition: PlanetCompositionClass;
  readonly isHabitableCandidate: boolean;
  readonly semiMajorAxisAu?: number;
  readonly periodDays?: number;
  readonly eccentricity?: number;
  readonly inclinationDeg?: number;
  readonly massMearth?: number;
  readonly radiusRearth?: number;
  readonly equilibriumTempK?: number;
  readonly esi?: number;
  readonly surfaceGravityG?: number;
  readonly isTidallyLocked: boolean;
  readonly discoveryYear?: number;
  readonly discoveryMethod?: string;
  readonly hazardCount: number;
  readonly hazards: readonly EntityHazardItem[];
}

export interface FocusedMinorBodyTelemetry {
  readonly categoryLabel: string;
  readonly parentBodyName?: string;
}

export interface FocusedStructureTelemetry {
  readonly structureType: string;
  readonly radiusPc?: number;
  readonly dimensionsPc?: readonly [number, number, number];
}

export interface FocusedDiskTelemetry {
  readonly classification: CircumstellarDiskKind;
  readonly classificationLabel: string;
  readonly innerRadiusAu: number;
  readonly outerRadiusAu: number;
  readonly semiMajorAxisAu: number;
  readonly tempK?: number;
  readonly composition: string;
  readonly confidence?: ObservationalConfidence;
}

export interface FocusedEntityDetailsBase {
  readonly id: string;
  readonly systemId: string;
  readonly name: string;
  readonly systemName: string;
  // Detent 1: Peek
  readonly spectralType?: string;
  readonly reticleType: CelestialClassification;
  readonly starCount: number;
  readonly planetCount: number;
  readonly planetCompositionBreakdown: readonly PlanetCompositionCount[];
  readonly planetCompositionSummary: string;
  readonly hasHabitableCandidate: boolean;
  readonly hazardCount: number;
  readonly hazards: readonly EntityHazardItem[];
  readonly hazardSummaryLabel: string;
  readonly systemSummary: string;
  readonly systemSummarySegments: readonly SystemSummarySegment[];
  // Detent 2: Partial
  readonly coordinatesPc: readonly [number, number, number];
  readonly sectorId: string;
  readonly sectorName?: string;
  readonly tags: readonly string[];
  readonly systemDetailsHref?: string;
  readonly directionsHref: string;
  readonly centerHref?: string;
  // Detent 3: Full
  readonly stars: readonly FocusedStarDetail[];
  readonly planets: readonly FocusedPlanetDetail[];
  readonly disks?: readonly FocusedDiskDetail[];
  readonly orbitingBodies?: readonly SystemElementBodyItem[];
  readonly canonAnnotations: readonly FocusedCanonAnnotation[];
}

export interface FocusedSystemEntityDetails extends FocusedEntityDetailsBase {
  readonly focusedKind: 'system';
  readonly starTelemetry?: undefined;
  readonly planetTelemetry?: undefined;
  readonly diskTelemetry?: undefined;
  readonly minorBodyTelemetry?: undefined;
  readonly structureTelemetry?: undefined;
}

export interface FocusedStarEntityDetails extends FocusedEntityDetailsBase {
  readonly focusedKind: 'star';
  readonly starTelemetry: FocusedStarTelemetry;
  readonly planetTelemetry?: undefined;
  readonly diskTelemetry?: undefined;
  readonly minorBodyTelemetry?: undefined;
  readonly structureTelemetry?: undefined;
}

export interface FocusedPlanetEntityDetails extends FocusedEntityDetailsBase {
  readonly focusedKind: 'planet';
  readonly planetTelemetry: FocusedPlanetTelemetry;
  readonly orbitingBodies: readonly SystemElementBodyItem[];
  readonly starTelemetry?: undefined;
  readonly diskTelemetry?: undefined;
  readonly minorBodyTelemetry?: undefined;
  readonly structureTelemetry?: undefined;
}

export interface FocusedBeltEntityDetails extends FocusedEntityDetailsBase {
  readonly focusedKind: 'belt';
  readonly diskTelemetry: FocusedDiskTelemetry;
  readonly orbitingBodies: readonly SystemElementBodyItem[];
  readonly starTelemetry?: undefined;
  readonly planetTelemetry?: undefined;
  readonly minorBodyTelemetry?: undefined;
  readonly structureTelemetry?: undefined;
}

export interface FocusedMinorBodyEntityDetails extends FocusedEntityDetailsBase {
  readonly focusedKind: 'minor-body';
  readonly minorBodyTelemetry: FocusedMinorBodyTelemetry;
  readonly starTelemetry?: undefined;
  readonly planetTelemetry?: undefined;
  readonly diskTelemetry?: undefined;
  readonly structureTelemetry?: undefined;
}

export interface FocusedStructureEntityDetails extends FocusedEntityDetailsBase {
  readonly focusedKind: 'structure';
  readonly structureTelemetry: FocusedStructureTelemetry;
  readonly starTelemetry?: undefined;
  readonly planetTelemetry?: undefined;
  readonly diskTelemetry?: undefined;
  readonly minorBodyTelemetry?: undefined;
}

export type FocusedEntityDetails =
  | FocusedSystemEntityDetails
  | FocusedStarEntityDetails
  | FocusedPlanetEntityDetails
  | FocusedBeltEntityDetails
  | FocusedMinorBodyEntityDetails
  | FocusedStructureEntityDetails;

export interface SystemElementBodyItem {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly categoryLabel: string;
}

export interface SystemBodiesSummary {
  readonly scope: 'system';
  readonly systemId: string;
  readonly systemName: string;
  readonly systemHref: string;
  readonly focusedEntityId?: string;
  readonly selectedEntityIds?: readonly string[];
  readonly stars: readonly FocusedStarDetail[];
  readonly planets: readonly FocusedPlanetDetail[];
  readonly disks?: readonly (FocusedDiskDetail | CircumstellarDiskRecord)[];
  readonly moonsAndDwarfPlanets: readonly SystemElementBodyItem[];
  readonly minorBodiesAndSpacecraft: readonly SystemElementBodyItem[];
  readonly canonAnnotations: readonly FocusedCanonAnnotation[];
}

export interface PlanetaryBodiesSummary {
  readonly scope: 'planet';
  readonly planetId: string;
  readonly planetName: string;
  readonly planetHref: string;
  readonly systemId: string;
  readonly systemName: string;
  readonly systemHref: string;
  readonly focusedEntityId?: string;
  readonly selectedEntityIds?: readonly string[];
  readonly planetDetail?: FocusedPlanetDetail;
  readonly moons: readonly SystemElementBodyItem[];
  readonly minorBodiesAndSpacecraft: readonly SystemElementBodyItem[];
  readonly canonAnnotations: readonly FocusedCanonAnnotation[];
}

export interface GalaxyBodySystemItem {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly tier: 'focused' | 'selected' | 'active';
  readonly reticleType: CelestialClassification;
  readonly spectralType?: string;
  readonly starTypeGuideHref?: string;
  readonly planetCount: number;
  readonly hasHabitableCandidate: boolean;
  readonly habitableZoneGuideHref?: string;
  readonly hazardCount: number;
  readonly hazardSummaryLabel: string;
  readonly hasCriticalHazard: boolean;
  readonly distanceFromFocusPc?: number;
  readonly distanceFromFocusLy?: number;
  readonly distanceGuideHref?: string;
}

export interface GalaxyBodiesSummary {
  readonly scope: 'galaxy';
  readonly centerId: string;
  readonly centerName: string;
  readonly centerCoordinatesPc: readonly [number, number, number];
  readonly apertureRadiusPc: number;
  readonly apertureRadiusLy: number;
  readonly focusedSystemId?: string;
  readonly focusedSystemName?: string;
  readonly selectedEntityIds?: readonly string[];
  readonly hoveredEntityId?: string | null;
  readonly systems: readonly GalaxyBodySystemItem[];
}

export type BodiesPanelSummary =
  | GalaxyBodiesSummary
  | SystemBodiesSummary
  | PlanetaryBodiesSummary;

export interface BuildFocusedEntityDetailsInput {
  readonly focusedEntity: SpatialEntityDefinition | null | undefined;
  readonly corpus?: readonly CompactSearchEntry[];
  readonly summaryNode?: SystemSummaryNode;
  readonly systemDetail?: DecodedDetailRecord;
  readonly entityDetail?: DecodedDetailRecord;
  readonly activeLayers?: readonly DatasetLayerManifest[];
  readonly canonOrderOptions?: CanonAnnotationOrderOptions;
  readonly urlSystemSlug?: string | null;
  readonly urlPlanetSlug?: string | null;
  readonly urlFocusSlug?: string | null;
  readonly hasExplicitFocus?: boolean;
  readonly viewScope?: 'galaxy' | 'system' | 'planet';
  readonly currentPathname?: string;
  readonly currentSearch?: string;
}

export interface BuildSystemBodiesSummaryInput {
  readonly details: FocusedEntityDetails | null;
  readonly corpus?: readonly CompactSearchEntry[];
  readonly selectedEntityIds?: readonly string[];
  readonly focusedEntityId?: string;
}

export interface BuildPlanetaryBodiesSummaryInput {
  readonly details: FocusedEntityDetails | null;
  readonly urlPlanetSlug?: string | null;
  readonly planetEntityDetail?: DecodedDetailRecord;
  readonly corpus?: readonly CompactSearchEntry[];
  readonly activeLayers?: readonly DatasetLayerManifest[];
  readonly selectedEntityIds?: readonly string[];
  readonly focusedEntityId?: string;
}

export interface BreadcrumbRouteLink {
  readonly label: string;
  readonly href?: string;
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

export type OrbitalSchematicRegion =
  | 'habitable-zone'
  | 'asteroid-belt'
  | 'kuiper-belt';

export type OrbitalSchematicEntityKind =
  | 'star'
  | 'planet'
  | 'belt'
  | 'dwarf-planet'
  | 'moon'
  | 'minor-body'
  | 'spacecraft';

export interface OrbitalSchematicItem {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly kind: OrbitalSchematicEntityKind;
  readonly orbitRank: number;
  readonly summaryLabel: string;
  readonly inHabitableZone: boolean;
  readonly region?: OrbitalSchematicRegion;
  readonly isFocused: boolean;
  readonly isSelected: boolean;
  readonly children?: readonly OrbitalSchematicItem[];
  readonly radialSpanAu?: readonly [number, number];
  readonly composition?: string;
}

export interface OrbitalSchematicSummary {
  readonly scope: 'system' | 'planet';
  readonly systemId: string;
  readonly systemName: string;
  readonly planetId?: string;
  readonly planetName?: string;
  readonly habitableZoneAu?: readonly [number, number];
  readonly items: readonly OrbitalSchematicItem[];
}

export type SystemOrbitalSchematicInput =
  | (Partial<SystemBodiesSummary> &
      Pick<SystemBodiesSummary, 'systemId' | 'systemName' | 'stars' | 'planets'> & {
        readonly corpus?: readonly CompactSearchEntry[];
      })
  | (SystemBodiesSummary & {
      readonly corpus?: readonly CompactSearchEntry[];
    });

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
}

export interface GalacticInstrumentApertureResult {
  readonly centerId: string;
  readonly centerName: string;
  readonly centerCoordinatesPc: readonly [number, number, number];
  readonly rawAperturePc: number;
  readonly apertureRadiusPc: number;
  readonly apertureRadiusLy: number;
  readonly apertureIds: Set<string>;
  readonly systemsById: Map<
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
}
